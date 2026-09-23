import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH: อัปเดตสถานะงาน (รับงาน, ส่งงาน, อนุมัติ, ตีกลับ)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Build update data
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'WAITING_APPROVAL') {
      updateData.completedAt = new Date();
    } else if (status === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = approvedBy || 'Branch Manager';
      if (!job.actualCost) updateData.actualCost = job.estimatedCost;

      // Reset vehicle status
      if (job.jobType === 'VEHICLE_SLIDE' && job.vin && job.destBranchId) {
        await prisma.vehicle.update({
          where: { vin: job.vin },
          data: { status: 'AVAILABLE', currentBranchId: job.destBranchId },
        });
      } else if (job.jobType === 'CAR_WASH' && job.carWashItems.length > 0) {
        const vins = job.carWashItems.map(c => c.vin);
        await prisma.vehicle.updateMany({
          where: { vin: { in: vins } },
          data: { status: 'AVAILABLE' },
        });
      }
    } else if (status === 'REJECTED') {
      updateData.rejectReason = rejectReason || 'ขอให้แก้ไขรายละเอียดงาน';
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData,
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
