import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';

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

    if (!status || !['PENDING', 'COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'กรุณาระบุสถานะที่ถูกต้อง (PENDING, COMPLETED, APPROVED, REJECTED, CANCELLED)' },
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

    if (job.jobType !== 'CAR_WASH' && job.jobType !== 'VEHICLE_SLIDE') {
      return NextResponse.json(
        { error: 'ฟีเจอร์นี้ใช้ได้เฉพาะงาน Car Wash หรือ Vehicle Slide เท่านั้น' },
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
      if (item.status === 'APPROVED') {
        return NextResponse.json(
          { error: 'รถคันนี้ผ่านการตรวจรับแล้ว ไม่สามารถแก้ไขได้' },
          { status: 400 }
        );
      }
    } else if (user.role === 'BRANCH') {
      // Branch can approve (APPROVED) or reject (REJECTED) items for jobs related to their branch
      const isRelatedBranch = 
        job.branchId === user.branchId || 
        job.originBranchId === user.branchId || 
        job.destBranchId === user.branchId;

      if (user.branchId && !isRelatedBranch) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์จัดการงานของสาขาอื่น' }, { status: 403 });
      }

      const isDestinationOnly = 
        job.destBranchId === user.branchId && 
        job.originBranchId !== user.branchId && 
        job.branchId !== user.branchId;

      if (isDestinationOnly && status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'สาขาปลายทางไม่สามารถยกเลิกรายการได้' },
          { status: 403 }
        );
      }
    }
    // ADMIN and MASTER can do anything

    // Prevent double approve
    if (status === 'APPROVED' && item.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'รถคันนี้ได้รับการอนุมัติเรียบร้อยแล้ว' },
        { status: 400 }
      );
    }

    // Only cars the supplier has submitted can be approved
    if (status === 'APPROVED' && item.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'อนุมัติได้เฉพาะรถที่ Supplier ส่งงานแล้วเท่านั้น' },
        { status: 400 }
      );
    }

    // ─── Atomic Update with Transaction ──────────────
    const result = await prisma.$transaction(async (tx: any) => {
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

      const completedCount = allItems.filter((i: any) => i.status === 'COMPLETED').length;
      const approvedCount = allItems.filter((i: any) => i.status === 'APPROVED').length;
      const cancelledCount = allItems.filter((i: any) => i.status === 'CANCELLED').length;
      const totalCount = allItems.length;
      // "Done" from the supplier's side = submitted (COMPLETED) or already approved
      const doneCount = completedCount + approvedCount;
      const allResolved = (doneCount + cancelledCount) === totalCount;
      const allApproved = approvedCount > 0 && (approvedCount + cancelledCount) === totalCount;

      // 3a. Every car approved (or declined) → auto-approve the whole job
      if (allApproved && ['IN_PROGRESS', 'WAITING_APPROVAL', 'REJECTED'].includes(job.status)) {
        const actualCost = allItems
          .filter((i: any) => i.status === 'APPROVED')
          .reduce((sum: number, i: any) => sum + (i.unitPrice || 0), 0);

        const userBranchLabel = user.branchName || user.branchCode || (user.role === 'ADMIN' ? 'ส่วนกลาง' : '');
        const userName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
        const autoApprovedBy = userBranchLabel ? `${userBranchLabel} (${userName})` : userName;

        await tx.job.update({
          where: { id: jobId },
          data: {
            status: 'APPROVED',
            actualCost,
            approvedAt: new Date(),
            approvedBy: autoApprovedBy,
            completedAt: job.completedAt || new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.vehicle.updateMany({
          where: { vin: { in: allItems.map((i: any) => i.vin) } },
          data: {
            status: 'AVAILABLE',
            ...(job.jobType === 'VEHICLE_SLIDE' && job.destBranchId ? { currentBranchId: job.destBranchId } : {}),
          },
        });

        await tx.jobActivity.create({
          data: {
            jobId,
            action: 'JOB_APPROVED',
            actor: 'ระบบอัตโนมัติ',
            actorRole: 'SYSTEM',
            description: `อนุมัติครบทุกคัน (${approvedCount} คัน${cancelledCount ? `, ปฏิเสธ ${cancelledCount} คัน` : ''}) — ค่าบริการสุทธิ ฿${actualCost.toLocaleString()} — ปิดใบงานอัตโนมัติ`,
            metadata: JSON.stringify({ approved: approvedCount, cancelled: cancelledCount, total: totalCount, actualCost }),
          },
        });
      }
      // 3b. Auto-transition parent Job status when all items have a final status
      else if (allResolved && job.status === 'IN_PROGRESS') {
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
            .filter((i: any) => i.status === 'COMPLETED' || i.status === 'APPROVED')
            .reduce((sum: number, i: any) => sum + (i.unitPrice || 0), 0);

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
              description: `ทุกรายการมีสถานะแล้ว (เสร็จ ${doneCount} คัน, ปฏิเสธ ${cancelledCount} คัน) — ค่าบริการสุทธิ ฿${actualCost.toLocaleString()} — รอสาขาตรวจรับ`,
              metadata: JSON.stringify({ completed: doneCount, cancelled: cancelledCount, total: totalCount, actualCost }),
            },
          });
        }
      } else if (cancelledCount > 0 || job.actualCost !== null) {
        // Keep actualCost in sync when items are rejected or updated
        const validSum = allItems
          .filter((i: any) => i.status !== 'CANCELLED')
          .reduce((sum: number, i: any) => sum + (i.unitPrice || 0), 0);

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
        APPROVED: 'ITEM_APPROVED',
        REJECTED: 'ITEM_REJECTED',
        CANCELLED: 'ITEM_CANCELLED',
        PENDING: 'ITEM_RESET',
      };

      const descMap: Record<string, string> = {
        COMPLETED: `Supplier ส่งงานรถคัน ${item.vin} เรียบร้อย (${doneCount}/${totalCount})`,
        APPROVED: `สาขาอนุมัติรถคัน ${item.vin} (อนุมัติแล้ว ${approvedCount}/${totalCount - cancelledCount})`,
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
        progress: { completed: doneCount, approved: approvedCount, cancelled: cancelledCount, total: totalCount, allResolved, allApproved },
      };
    });

    // Audit Log: UPDATE_ITEM_STATUS
    const statusLabel: Record<string, string> = {
      COMPLETED: 'ส่งงาน',
      APPROVED: 'อนุมัติ',
      CANCELLED: 'ปฏิเสธ',
      REJECTED: 'ตีกลับ',
      PENDING: 'รีเซ็ต',
    };
    logAuditFromUser(user, {
      action: 'UPDATE_ITEM_STATUS',
      entityType: 'CarWashItem',
      entityId: itemId,
      description: `${statusLabel[status] || status}รถคัน ${item.vin} ในใบงาน ${job.jobNumber}${remarks ? ` — ${remarks}` : ''}`,
      metadata: { jobId, jobNumber: job.jobNumber, vin: item.vin, fromStatus: item.status, toStatus: status, remarks },
      request,
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
