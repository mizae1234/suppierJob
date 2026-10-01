import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// PATCH: อัปเดตสถานะ CarWashItem รายคัน พร้อมตรวจสอบสิทธิ์
// เมื่อทุกรายการ COMPLETED → Master Job auto-transitions to WAITING_APPROVAL
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id: jobId, itemId } = await params;
    const { status, remarks } = await request.json();

    if (!status || !['PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'กรุณาระบุสถานะที่ถูกต้อง (PENDING, COMPLETED, REJECTED, CANCELLED)' },
        { status: 400 }
      );
    }

    // Load the parent job with all items
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { carWashItems: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
    }

    if (job.jobType !== 'CAR_WASH') {
      return NextResponse.json(
        { error: 'ฟีเจอร์นี้ใช้ได้เฉพาะงาน Car Wash เท่านั้น' },
        { status: 400 }
      );
    }

    // Verify the item belongs to this job
    const item = job.carWashItems.find(i => i.id === itemId);
    if (!item) {
      return NextResponse.json(
        { error: 'ไม่พบรายการรถคันนี้ในใบงาน' },
        { status: 404 }
      );
    }

    // ─── Authorization Check ─────────────────────────
    if (user.role === 'SUPPLIER') {
      if (job.supplierId !== user.supplierId) {
        return NextResponse.json(
          { error: 'คุณไม่มีสิทธิ์แก้ไขงานของ Supplier อื่น' },
          { status: 403 }
        );
      }
      // Supplier can mark items as COMPLETED or CANCELLED (per-item reject)
      if (status !== 'COMPLETED' && status !== 'CANCELLED') {
        return NextResponse.json(
          { error: 'Supplier สามารถส่งงาน (COMPLETED) หรือปฏิเสธรายคัน (CANCELLED) เท่านั้น' },
          { status: 403 }
        );
      }
    } else if (user.role === 'BRANCH') {
      // Branch can approve (COMPLETED) or reject (REJECTED) items
      if (user.companyId && job.companyId !== user.companyId) {
        return NextResponse.json(
          { error: 'คุณไม่มีสิทธิ์แก้ไขงานของบริษัทอื่น' },
          { status: 403 }
        );
      }
    }
    // ADMIN and MASTER can do anything

    // ─── Atomic Update with Transaction ──────────────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the individual item status
      const updatedItem = await tx.carWashItem.update({
        where: { id: itemId },
        data: {
          status,
          remarks: remarks || item.remarks,
        },
      });

      // 2. Re-fetch all items to check overall job progress
      const allItems = await tx.carWashItem.findMany({
        where: { jobId },
      });

      const completedCount = allItems.filter(i => i.status === 'COMPLETED').length;
      const cancelledCount = allItems.filter(i => i.status === 'CANCELLED').length;
      const totalCount = allItems.length;
      const allResolved = (completedCount + cancelledCount) === totalCount;

      // 3. Auto-transition parent Job status when all items have a final status
      if (allResolved && job.status === 'IN_PROGRESS') {
        if (cancelledCount === totalCount) {
          // All items cancelled → cancel the entire job
          await tx.job.update({
            where: { id: jobId },
            data: {
              status: 'CANCELLED',
              actualCost: 0,
              rejectReason: remarks || 'Supplier ปฏิเสธทุกรายการ',
              updatedAt: new Date(),
            },
          });

          await tx.jobActivity.create({
            data: {
              jobId,
              action: 'JOB_CANCELLED',
              actor: 'ระบบอัตโนมัติ',
              actorRole: 'SYSTEM',
              description: `Supplier ปฏิเสธทุกรายการ (${totalCount} คัน) — ระบบยกเลิกใบงานอัตโนมัติ`,
              metadata: JSON.stringify({ completed: completedCount, cancelled: cancelledCount, total: totalCount }),
            },
          });
        } else {
          // Mix of completed + cancelled → move to WAITING_APPROVAL for admin review
          const actualCost = allItems
            .filter(i => i.status === 'COMPLETED')
            .reduce((sum, i) => sum + (i.unitPrice || 0), 0);

          await tx.job.update({
            where: { id: jobId },
            data: {
              status: 'WAITING_APPROVAL',
              actualCost,
              completedAt: new Date(),
              updatedAt: new Date(),
            },
          });

          await tx.jobActivity.create({
            data: {
              jobId,
              action: 'JOB_WAITING_APPROVAL',
              actor: 'ระบบอัตโนมัติ',
              actorRole: 'SYSTEM',
              description: `ทุกรายการมีสถานะแล้ว (เสร็จ ${completedCount} คัน, ปฏิเสธ ${cancelledCount} คัน) — ค่าบริการสุทธิ ฿${actualCost.toLocaleString()} — รอสาขาตรวจรับ`,
              metadata: JSON.stringify({ completed: completedCount, cancelled: cancelledCount, total: totalCount, actualCost }),
            },
          });
        }
      } else if (cancelledCount > 0 || job.actualCost !== null) {
        // Keep actualCost in sync when items are rejected or updated
        const validSum = allItems
          .filter(i => i.status !== 'CANCELLED')
          .reduce((sum, i) => sum + (i.unitPrice || 0), 0);

        await tx.job.update({
          where: { id: jobId },
          data: {
            actualCost: validSum,
            updatedAt: new Date(),
          },
        });
      }

      // 4. Log activity for the item status change
      const actionMap: Record<string, string> = {
        COMPLETED: 'ITEM_COMPLETED',
        REJECTED: 'ITEM_REJECTED',
        CANCELLED: 'ITEM_CANCELLED',
        PENDING: 'ITEM_RESET',
      };

      const descMap: Record<string, string> = {
        COMPLETED: `Supplier ส่งงานรถคัน ${item.vin} เรียบร้อย (${completedCount}/${totalCount})`,
        REJECTED: `สาขาตีกลับรถคัน ${item.vin}${remarks ? ` — เหตุผล: ${remarks}` : ''}`,
        CANCELLED: `Supplier ปฏิเสธรถคัน ${item.vin}${remarks ? ` — เหตุผล: ${remarks}` : ''} (ปฏิเสธ ${cancelledCount}/${totalCount})`,
        PENDING: `รีเซ็ตสถานะรถคัน ${item.vin} กลับเป็นรอดำเนินการ`,
      };

      await tx.jobActivity.create({
        data: {
          jobId,
          action: actionMap[status] || status,
          actor: user.displayName || user.username,
          actorRole: user.role,
          itemId,
          vin: item.vin,
          description: descMap[status] || `อัปเดตสถานะรถคัน ${item.vin} เป็น ${status}`,
          metadata: JSON.stringify({ 
            fromStatus: item.status, 
            toStatus: status,
            remarks: remarks || null,
          }),
        },
      });

      return {
        item: updatedItem,
        progress: { completed: completedCount, cancelled: cancelledCount, total: totalCount, allResolved },
      };
    });

    return NextResponse.json({
      success: true,
      item: result.item,
      progress: result.progress,
    });
  } catch (error) {
    console.error('PATCH /api/jobs/[id]/items/[itemId]/status error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถอัปเดตสถานะรายการได้' },
      { status: 500 }
    );
  }
}
