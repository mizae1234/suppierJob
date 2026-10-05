import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser, AuditAction } from '@/lib/audit-log';

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
      // Supplier can transition to IN_PROGRESS, WAITING_APPROVAL, or CANCELLED (ปฏิเสธงาน)
      const allowedTransitions = ['IN_PROGRESS', 'WAITING_APPROVAL', 'CANCELLED'];
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: 'Supplier ไม่มีสิทธิ์อนุมัติ หรือแก้ไขสถานะนี้' },
          { status: 403 }
        );
      }
    } else if (user.role === 'BRANCH') {
      // Branch user can approve/reject jobs related to their branch (requester, origin, or destination)
      const isRelatedBranch = 
        job.branchId === user.branchId || 
        job.originBranchId === user.branchId || 
        job.destBranchId === user.branchId;

      if (user.branchId && !isRelatedBranch) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์จัดการงานของสาขาอื่น' }, { status: 403 });
      }

      // Check destination-only branch permissions:
      // Destination branch CANNOT cancel a job (only origin branch or Admin can cancel)
      const isDestinationOnly = 
        job.destBranchId === user.branchId && 
        job.originBranchId !== user.branchId && 
        job.branchId !== user.branchId;

      if (isDestinationOnly && status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'สาขาปลายทางไม่สามารถยกเลิกงานได้ (ดำเนินการได้เฉพาะสาขาต้นทางหรือผู้ดูแลระบบ)' },
          { status: 403 }
        );
      }
    } else if (user.role === 'ADMIN') {
      if (user.companyId && job.companyId !== user.companyId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขงานของบริษัทอื่น' }, { status: 403 });
      }
    }

    // ─── Status Transition & Concurrency Guard ────────
    if (status === 'APPROVED') {
      if (job.status === 'APPROVED') {
        return NextResponse.json(
          { error: `งานนี้ได้รับการอนุมัติเรียบร้อยแล้ว${job.approvedBy ? ` โดย ${job.approvedBy}` : ''}` },
          { status: 400 }
        );
      }
      if (job.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'งานนี้ถูกยกเลิกแล้ว ไม่สามารถอนุมัติได้' },
          { status: 400 }
        );
      }
    }

    if (status === 'CANCELLED' && job.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'งานนี้ถูกยกเลิกไปแล้ว' },
        { status: 400 }
      );
    }

    // ─── Atomic Update with Transaction ──────────────
    const updatedJob = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'WAITING_APPROVAL') {
        updateData.completedAt = new Date();
        if (job.jobType === 'CAR_WASH' && job.carWashItems && job.carWashItems.length > 0) {
          const completedItems = job.carWashItems.filter(c => c.status === 'COMPLETED' || c.status === 'APPROVED');
          const validItems = completedItems.length > 0 
            ? completedItems 
            : job.carWashItems.filter(c => c.status !== 'CANCELLED');
          updateData.actualCost = validItems.reduce((sum, c) => sum + (c.unitPrice || 0), 0);
        } else if (job.jobType === 'VEHICLE_SLIDE' && job.carWashItems && job.carWashItems.length > 0) {
          await tx.carWashItem.updateMany({
            where: { jobId: job.id, status: 'PENDING' },
            data: { status: 'COMPLETED' },
          });
        }
      } else if (status === 'APPROVED') {
        const userBranchLabel = user.branchName || user.branchCode || (user.role === 'ADMIN' ? 'ส่วนกลาง' : '');
        const userName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
        const defaultApprovedBy = userBranchLabel ? `${userBranchLabel} (${userName})` : userName;

        updateData.approvedAt = new Date();
        updateData.approvedBy = approvedBy || defaultApprovedBy;
        if (job.jobType === 'CAR_WASH' && job.carWashItems && job.carWashItems.length > 0) {
          const completedItems = job.carWashItems.filter(c => c.status === 'COMPLETED' || c.status === 'APPROVED');
          const validItems = completedItems.length > 0 
            ? completedItems 
            : job.carWashItems.filter(c => c.status !== 'CANCELLED');
          updateData.actualCost = validItems.reduce((sum, c) => sum + (c.unitPrice || 0), 0);
        } else if (!job.actualCost) {
          updateData.actualCost = job.estimatedCost;
        }

        // Reset vehicle status atomically
        if (job.jobType === 'VEHICLE_SLIDE') {
          const slideVins = job.carWashItems && job.carWashItems.length > 0
            ? job.carWashItems.map(c => c.vin)
            : (job.vin ? [job.vin] : []);

          if (slideVins.length > 0) {
            await tx.vehicle.updateMany({
              where: { vin: { in: slideVins } },
              data: {
                status: 'AVAILABLE',
                ...(job.destBranchId ? { currentBranchId: job.destBranchId } : {}),
              },
            });
          }
          if (job.carWashItems && job.carWashItems.length > 0) {
            await tx.carWashItem.updateMany({
              where: { jobId: job.id, status: { not: 'CANCELLED' } },
              data: { status: 'APPROVED' },
            });
          }
        } else if (job.jobType === 'CAR_WASH' && job.carWashItems.length > 0) {
          // อนุมัติทั้งใบ = อนุมัติทุกคันที่ Supplier ส่งงานแล้ว
          await tx.carWashItem.updateMany({
            where: { jobId: job.id, status: 'COMPLETED' },
            data: { status: 'APPROVED' },
          });
          const vins = job.carWashItems.map(c => c.vin);
          await tx.vehicle.updateMany({
            where: { vin: { in: vins } },
            data: { status: 'AVAILABLE' },
          });
        }
      } else if (status === 'REJECTED') {
        updateData.rejectReason = rejectReason || 'ขอให้แก้ไขรายละเอียดงาน';
      } else if (status === 'CANCELLED') {
        updateData.rejectReason = rejectReason || (user.role === 'SUPPLIER' ? 'Supplier ปฏิเสธงาน' : 'ยกเลิกคำสั่งงาน');
        updateData.actualCost = 0;

        // Reset vehicle status back to AVAILABLE
        if (job.jobType === 'VEHICLE_SLIDE') {
          const slideVins = job.carWashItems && job.carWashItems.length > 0
            ? job.carWashItems.map(c => c.vin)
            : (job.vin ? [job.vin] : []);

          if (slideVins.length > 0) {
            await tx.vehicle.updateMany({
              where: { vin: { in: slideVins } },
              data: { status: 'AVAILABLE' },
            });
          }
          if (job.carWashItems && job.carWashItems.length > 0) {
            await tx.carWashItem.updateMany({
              where: { jobId: job.id },
              data: { status: 'CANCELLED' },
            });
          }
        } else if (job.jobType === 'CAR_WASH' && job.carWashItems && job.carWashItems.length > 0) {
          const vins = job.carWashItems.map(c => c.vin);
          await tx.vehicle.updateMany({
            where: { vin: { in: vins } },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      return tx.job.update({
        where: { id },
        data: updateData,
      });
    });

    // Audit Log: Job Status Change
    const actionMap: Record<string, AuditAction> = {
      APPROVED: 'APPROVE_JOB',
      REJECTED: 'REJECT_JOB',
      CANCELLED: 'CANCEL_JOB',
      WAITING_APPROVAL: 'SUBMIT_JOB',
      IN_PROGRESS: 'UPDATE_JOB',
    };
    const descMap: Record<string, string> = {
      APPROVED: `อนุมัติใบงาน ${job.jobNumber}`,
      REJECTED: `ตีกลับใบงาน ${job.jobNumber}${rejectReason ? ` — ${rejectReason}` : ''}`,
      CANCELLED: `ยกเลิกใบงาน ${job.jobNumber}${rejectReason ? ` — ${rejectReason}` : ''}`,
      WAITING_APPROVAL: `ส่งงานใบงาน ${job.jobNumber} รอตรวจรับ`,
      IN_PROGRESS: `เปลี่ยนสถานะใบงาน ${job.jobNumber} เป็น ${status}`,
    };
    logAuditFromUser(user, {
      action: actionMap[status] || 'UPDATE_JOB',
      entityType: 'Job',
      entityId: id,
      description: descMap[status] || `เปลี่ยนสถานะงาน ${job.jobNumber} เป็น ${status}`,
      metadata: { jobNumber: job.jobNumber, fromStatus: job.status, toStatus: status, rejectReason },
      request,
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
