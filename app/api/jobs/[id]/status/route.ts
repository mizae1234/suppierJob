import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// PATCH: อัปเดตสถานะงาน พร้อมตรวจสอบสิทธิ์ตามบทบาท (State Transition Guard)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;
    const { status, rejectReason, approvedBy } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'กรุณาระบุสถานะใหม่' }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: { carWashItems: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
    }

    // ─── Authorization Check ─────────────────────────
    if (user.role === 'SUPPLIER') {
      if (job.supplierId !== user.supplierId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขงานของ Supplier อื่น' }, { status: 403 });
      }
      // Supplier can only transition to IN_PROGRESS or WAITING_APPROVAL
      const allowedTransitions = ['IN_PROGRESS', 'WAITING_APPROVAL'];
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: 'Supplier ไม่มีสิทธิ์อนุมัติ ตีกลับ หรือยกเลิกงานนี้' },
          { status: 403 }
        );
      }
    } else if (user.role === 'BRANCH') {
      if (user.companyId && job.companyId !== user.companyId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขงานของบริษัทอื่น' }, { status: 403 });
      }
      // Branch user can approve/reject jobs related to their branch
      const isRelatedBranch = 
        job.branchId === user.branchId || 
        job.originBranchId === user.branchId || 
        job.destBranchId === user.branchId;

      if (user.branchId && !isRelatedBranch) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์จัดการงานของสาขาอื่น' }, { status: 403 });
      }
    } else if (user.role === 'ADMIN') {
      if (user.companyId && job.companyId !== user.companyId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขงานของบริษัทอื่น' }, { status: 403 });
      }
    }

    // ─── Atomic Update with Transaction ──────────────
    const updatedJob = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'WAITING_APPROVAL') {
        updateData.completedAt = new Date();
      } else if (status === 'APPROVED') {
        updateData.approvedAt = new Date();
        updateData.approvedBy = approvedBy || user.displayName || 'Branch Manager';
        if (!job.actualCost) updateData.actualCost = job.estimatedCost;

        // Reset vehicle status atomically
        if (job.jobType === 'VEHICLE_SLIDE' && job.vin && job.destBranchId) {
          await tx.vehicle.update({
            where: { vin: job.vin },
            data: { status: 'AVAILABLE', currentBranchId: job.destBranchId },
          });
        } else if (job.jobType === 'CAR_WASH' && job.carWashItems.length > 0) {
          const vins = job.carWashItems.map(c => c.vin);
          await tx.vehicle.updateMany({
            where: { vin: { in: vins } },
            data: { status: 'AVAILABLE' },
          });
        }
      } else if (status === 'REJECTED') {
        updateData.rejectReason = rejectReason || 'ขอให้แก้ไขรายละเอียดงาน';
      }

      return tx.job.update({
        where: { id },
        data: updateData,
      });
    });

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error) {
    console.error('PATCH /api/jobs/[id]/status error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถอัปเดตสถานะงานได้' },
      { status: 500 }
    );
  }
}
