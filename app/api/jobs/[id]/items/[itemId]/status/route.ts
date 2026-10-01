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

    if (!status || !['PENDING', 'COMPLETED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'กรุณาระบุสถานะที่ถูกต้อง (PENDING, COMPLETED, REJECTED)' },
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
      // Supplier can only mark items as COMPLETED
      if (status !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'Supplier สามารถส่งงานรายคัน (COMPLETED) เท่านั้น' },
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
      const totalCount = allItems.length;
      const allCompleted = completedCount === totalCount;

      // 3. Auto-transition parent Job status based on item completion
      if (allCompleted && job.status === 'IN_PROGRESS') {
        // All items completed → auto move parent to WAITING_APPROVAL
        await tx.job.update({
          where: { id: jobId },
          data: {
            status: 'WAITING_APPROVAL',
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return {
        item: updatedItem,
        progress: { completed: completedCount, total: totalCount, allCompleted },
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
