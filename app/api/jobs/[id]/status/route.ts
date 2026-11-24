import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { assertCanMutateJob } from '@/lib/job-access';
import { logAuditFromUser, AuditAction } from '@/lib/audit-log';
import {
  isFailedAttemptJob,
  SLIDE_COMPLETION_DELIVERED,
} from '@/lib/slide-failed-attempt';
import { ConflictError, toErrorResponse } from '@/lib/errors';
import { validateJobStatusTransition } from '@/lib/services/jobs/state-machine';
import {
  claimJobForApprovalPo,
  finalizeJobApproval,
  isPoPendingActive,
  resolveApprovedByLabel,
  runAsyncApprovalWithPo,
  STATUS_CONFLICT_MESSAGE,
} from '@/lib/services/jobs/approve-job';
import {
  releaseVehiclesInTx,
  recordJobSlideMovementLog,
} from '@/lib/services/jobs/vehicle-movement';
import { parseBody, updateJobStatusSchema } from '@/lib/validation';

// PATCH: อัปเดตสถานะงาน พร้อมตรวจสอบสิทธิ์ตามบทบาท (State Transition Guard + Optimistic Locking)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;
    const parsed = await parseBody(request, updateJobStatusSchema);
    if (parsed.response) return parsed.response;
    const { status, rejectReason, approvedBy, failedAttemptFee } = parsed.data;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        carWashItems: true,
        pickupBranch: { select: { code: true, name: true, address: true, companyId: true } },
        destBranch: { select: { code: true, name: true, address: true, companyId: true } },
        supplier: { select: { name: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
    }

    // เที่ยวเปล่า (สไลด์ไม่สำเร็จ) ที่ Vendor ส่งแล้ว — รถไม่ถูกย้าย, ไม่ทำ Transfer Journal, PO ยอดตายตัว
    const isFailedAttempt = isFailedAttemptJob(job);

    // ─── Authorization Check ─────────────────────────
    const authError = assertCanMutateJob(user, job);
    if (authError) return authError;

    // ─── State Machine Validation (Unknown status -> 400, Role -> 403, Invalid from->to -> 409) ───
    const transition = validateJobStatusTransition({
      role: user.role,
      from: job.status,
      to: status,
      approvedBy: job.approvedBy,
    });
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: transition.status });
    }
    const nextStatus = transition.to;

    // ป้องกันการเปลี่ยนสถานะระหว่างที่ระบบกำลังเปิด PO ใน D365 อยู่
    if (isPoPendingActive(job)) {
      return NextResponse.json(
        { error: 'ใบงานนี้กำลังส่งเปิด PO ไปยัง D365 อยู่ กรุณารอสักครู่' },
        { status: 409 }
      );
    }

    // ─── Business Guards ─────────────────────────────
    if (user.role === 'SUPPLIER' && nextStatus === 'WAITING_APPROVAL') {
      // ต้องยืนยันตัวรถ (VIN/ทะเบียน + รูป) ก่อนส่งงาน
      const notVerified =
        job.jobType === 'VEHICLE_SLIDE'
          ? !job.verifiedAt
          : job.carWashItems.some((c) => ['PENDING', 'REJECTED'].includes(c.status) && !c.verifiedAt);
      if (notVerified) {
        return NextResponse.json(
          { error: 'กรุณายืนยันตัวรถ (VIN/ทะเบียน) ก่อนส่งงาน' },
          { status: 400 }
        );
      }
    }

    if (nextStatus === 'CANCELLED') {
      const hasVerified = Boolean(job.verifiedAt || job.carWashItems?.some((i) => i.verifiedAt));
      if (hasVerified && user.role !== 'MASTER') {
        return NextResponse.json(
          { error: 'ไม่สามารถยกเลิกใบงานได้ เนื่องจาก Supplier ได้ถ่ายรูปยืนยันตัวรถแล้ว' },
          { status: 400 }
        );
      }
      // Vendor มาหน้างานและส่งเป็นเที่ยวเปล่าแล้ว → ต้องอนุมัติค่าเที่ยวเปล่า ไม่ใช่ยกเลิก
      if (isFailedAttempt && user.role !== 'MASTER') {
        return NextResponse.json(
          {
            error:
              'ไม่สามารถยกเลิกใบงานได้ เนื่องจาก Supplier ส่งงานเที่ยวเปล่า (สไลด์ไม่สำเร็จ) แล้ว กรุณาอนุมัติหรือขอแก้ไข',
          },
          { status: 400 }
        );
      }
    }

    // ─── อนุมัติใบงาน (APPROVED): เปิด D365 PO แบบ Async ผ่าน Next.js after() ────────
    // กฎสำคัญ: ใบงานยังไม่เปลี่ยนเป็น APPROVED บน Kanban จนกว่าการเปิด PO ใน D365 จะสำเร็จ
    if (nextStatus === 'APPROVED') {
      const resolvedApprovedBy = resolveApprovedByLabel(user, approvedBy);
      const resolvedFailedFee =
        isFailedAttempt && typeof failedAttemptFee === 'number'
          ? Math.round(failedAttemptFee * 100) / 100
          : undefined;
      if (isFailedAttempt && resolvedFailedFee !== undefined && resolvedFailedFee <= 0) {
        return NextResponse.json(
          { error: 'ค่าเที่ยวเปล่าต้องมากกว่า 0 บาท' },
          { status: 400 }
        );
      }

      // กรณีใบงานมีเลข PO อยู่แล้ว (เช่น เคยกดส่งซ้ำจนสำเร็จ) → ปิดอนุมัติได้ทันทีโดยไม่ต้องเปิด PO ใหม่
      if (job.d365PoNumber) {
        const finalized = await finalizeJobApproval({
          jobId: id,
          expectedJobStatus: job.status,
          user,
          approvedBy: resolvedApprovedBy,
          failedAttemptFee: resolvedFailedFee,
          request,
        });
        const d365Po = {
          success: true,
          purchId: job.d365PoNumber,
          message: `ใบงานนี้มีเลข PO แล้ว (${job.d365PoNumber})`,
        };
        return NextResponse.json({
          success: true,
          job: finalized.job,
          d365Po,
          d365Transfer: finalized.d365Transfer,
        });
      }

      // จองสถานะ d365PoStatus = 'PENDING' แบบ atomic แล้วตอบ 202 ทันที จากนั้นเปิด PO + ปิดอนุมัติใน after()
      // กรณีเที่ยวเปล่าที่มีการแก้ไขยอด: บันทึก actualCost ไว้ตั้งแต่ขั้นตอนนี้เพื่อให้ D365 PO อ่านยอดใหม่ทันที
      await claimJobForApprovalPo({
        jobId: id,
        expectedStatus: job.status,
        actualCost: resolvedFailedFee,
      });

      const previousPoStatus = job.d365PoStatus ?? null;
      const expectedJobStatus = job.status;
      after(() =>
        runAsyncApprovalWithPo({
          jobId: id,
          jobNumber: job.jobNumber,
          expectedJobStatus,
          previousPoStatus,
          user,
          approvedBy: resolvedApprovedBy,
          failedAttemptFee: resolvedFailedFee,
        })
      );

      return NextResponse.json(
        {
          success: true,
          pending: true,
          message: 'กำลังส่งเปิดใบสั่งซื้อไปยัง D365...',
        },
        { status: 202 }
      );
    }

    // ─── Non-APPROVED Atomic Update with Optimistic Lock ──────────────
    const updatedJob = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updateData: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: now,
      };

      if (nextStatus === 'WAITING_APPROVAL') {
        updateData.completedAt = now;
        if (job.jobType === 'VEHICLE_SLIDE') {
          // ส่งงานสไลด์แบบปกติ (ส่งรถสำเร็จ) → ล้างข้อมูลเที่ยวเปล่าจากรอบก่อน (ถ้ามี) กันยอดค้าง
          updateData.completionType = SLIDE_COMPLETION_DELIVERED;
          updateData.failReasonCode = null;
          updateData.failNote = null;
          if (isFailedAttempt) updateData.actualCost = null;
        }
        if (job.jobType === 'CAR_WASH' && job.carWashItems && job.carWashItems.length > 0) {
          const completedItems = job.carWashItems.filter(
            (c) => c.status === 'COMPLETED' || c.status === 'APPROVED'
          );
          const validItems =
            completedItems.length > 0
              ? completedItems
              : job.carWashItems.filter((c) => c.status !== 'CANCELLED');
          updateData.actualCost = validItems.reduce((sum, c) => sum + (c.unitPrice || 0), 0);
        }
      } else if (nextStatus === 'REJECTED') {
        updateData.rejectReason = rejectReason || 'ขอให้แก้ไขรายละเอียดงาน';
        if (isFailedAttempt) {
          // ตีกลับงานเที่ยวเปล่า → ล้างสถานะเที่ยวเปล่า ให้ Vendor เลือกส่งใหม่ได้ (สไลด์จริง หรือแจ้งเที่ยวเปล่าอีกครั้ง)
          updateData.completionType = null;
          updateData.failReasonCode = null;
          updateData.failNote = null;
          updateData.actualCost = null;
        }
      } else if (nextStatus === 'CANCELLED') {
        updateData.rejectReason =
          rejectReason || (user.role === 'SUPPLIER' ? 'Supplier ปฏิเสธงาน' : 'ยกเลิกคำสั่งงาน');
        updateData.actualCost = 0;
      }

      // Optimistic Lock: ตรวจว่าสถานะปัจจุบันของใบงานยังไม่ถูกเปลี่ยนโดยคำขออื่น
      const locked = await tx.job.updateMany({
        where: { id, status: job.status },
        data: updateData,
      });
      if (locked.count === 0) {
        throw new ConflictError(STATUS_CONFLICT_MESSAGE);
      }

      // Side-effects ของรายการรถและสถานะรถ (ทำหลังได้ lock แถว Job แล้ว)
      if (nextStatus === 'WAITING_APPROVAL') {
        if (job.jobType === 'VEHICLE_SLIDE' && job.carWashItems && job.carWashItems.length > 0) {
          await tx.carWashItem.updateMany({
            where: { jobId: job.id, status: { in: ['PENDING', 'REJECTED'] } },
            data: { status: 'COMPLETED' },
          });
        }
      } else if (nextStatus === 'REJECTED') {
        if (isFailedAttempt && job.carWashItems && job.carWashItems.length > 0) {
          await tx.carWashItem.updateMany({
            where: { jobId: job.id, status: { not: 'CANCELLED' } },
            data: { status: 'REJECTED', remarks: `ตีกลับงานเที่ยวเปล่า: ${updateData.rejectReason}` },
          });
        }
      } else if (nextStatus === 'CANCELLED') {
        const allVins =
          job.carWashItems && job.carWashItems.length > 0
            ? job.carWashItems.map((c) => c.vin)
            : job.vin
              ? [job.vin]
              : [];
        await releaseVehiclesInTx(tx, allVins);
        if (job.carWashItems && job.carWashItems.length > 0) {
          await tx.carWashItem.updateMany({
            where: { jobId: job.id },
            data: {
              status: 'CANCELLED',
              remarks: rejectReason ? `ยกเลิก: ${rejectReason}` : 'ยกเลิกคำสั่งงาน',
            },
          });
        }
      }

      return tx.job.findUniqueOrThrow({ where: { id } });
    });

    // Audit Log: Job Status Change
    const actionMap: Record<string, AuditAction> = {
      REJECTED: 'REJECT_JOB',
      CANCELLED: 'CANCEL_JOB',
      WAITING_APPROVAL: 'SUBMIT_JOB',
      IN_PROGRESS: 'UPDATE_JOB',
    };
    const descMap: Record<string, string> = {
      REJECTED: `ตีกลับใบงาน ${job.jobNumber}${rejectReason ? ` — ${rejectReason}` : ''}`,
      CANCELLED: `ยกเลิกใบงาน ${job.jobNumber}${rejectReason ? ` — ${rejectReason}` : ''}`,
      WAITING_APPROVAL: `ส่งงานใบงาน ${job.jobNumber} รอตรวจรับ`,
      IN_PROGRESS: `เปลี่ยนสถานะใบงาน ${job.jobNumber} เป็น ${nextStatus}`,
    };
    logAuditFromUser(user, {
      action: actionMap[nextStatus] || 'UPDATE_JOB',
      entityType: 'Job',
      entityId: id,
      description: descMap[nextStatus] || `เปลี่ยนสถานะงาน ${job.jobNumber} เป็น ${nextStatus}`,
      metadata: {
        jobNumber: job.jobNumber,
        fromStatus: job.status,
        toStatus: nextStatus,
        rejectReason,
        ...(isFailedAttempt ? { completionType: job.completionType } : {}),
      },
      request,
    });

    // Record VehicleSlideLog if VEHICLE_SLIDE
    if (job.jobType === 'VEHICLE_SLIDE') {
      const vins =
        job.carWashItems && job.carWashItems.length > 0
          ? job.carWashItems.map((c) => c.vin)
          : job.vin
            ? [job.vin]
            : [];

      let slideAction: 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | null = null;
      if (nextStatus === 'IN_PROGRESS') slideAction = 'IN_TRANSIT';
      else if (nextStatus === 'WAITING_APPROVAL') slideAction = 'DELIVERED';
      else if (nextStatus === 'CANCELLED') slideAction = 'CANCELLED';

      if (slideAction && vins.length > 0) {
        recordJobSlideMovementLog(job, {
          vins,
          action: slideAction,
          actorId: user.id,
          actorName: user.displayName || user.username,
          actorRole: user.role,
          remarks: rejectReason || descMap[nextStatus] || null,
        });
      }
    }

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error) {
    if (!(error instanceof ConflictError)) {
      console.error('PATCH /api/jobs/[id]/status error:', error);
    }
    return toErrorResponse(error, 'ไม่สามารถอัปเดตสถานะงานได้');
  }
}
