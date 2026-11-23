import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { assertCanMutateJob } from '@/lib/job-access';
import { logAuditFromUser } from '@/lib/audit-log';
import { isFailedAttemptJob } from '@/lib/slide-failed-attempt';
import { ConflictError, toErrorResponse } from '@/lib/errors';
import { validateItemStatusTransition } from '@/lib/services/jobs/state-machine';
import {
  claimJobForApprovalPo,
  finalizeJobApproval,
  isPoPendingActive,
  resolveApprovedByLabel,
  runAsyncApprovalWithPo,
  STATUS_CONFLICT_MESSAGE,
} from '@/lib/services/jobs/approve-job';
import {
  snapshotFromWarehousesInTx,
  moveVehiclesOnApprovalInTx,
  releaseVehiclesInTx,
  recordJobSlideMovementLog,
} from '@/lib/services/jobs/vehicle-movement';
import { parseBody, updateCarWashItemStatusSchema } from '@/lib/validation';

// PATCH: อัปเดตสถานะ CarWashItem รายคัน พร้อมตรวจสอบสิทธิ์ + State Machine + Optimistic Locking
// เมื่อทุกรายการ COMPLETED → Master Job auto-transitions to WAITING_APPROVAL
// เมื่อรายการสุดท้ายถูก APPROVED → เปิด D365 PO แบบ Async ผ่าน after() แล้วค่อยปิดใบงานเป็น APPROVED เมื่อ PO สำเร็จ
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id: jobId, itemId } = await params;
    const parsed = await parseBody(request, updateCarWashItemStatusSchema);
    if (parsed.response) return parsed.response;
    const { status, remarks } = parsed.data;

    // Load the parent job with all items
    const job = await prisma.job.findUnique({
      where: { id: jobId },
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

    if (job.jobType !== 'CAR_WASH' && job.jobType !== 'VEHICLE_SLIDE') {
      return NextResponse.json(
        { error: 'ฟีเจอร์นี้ใช้ได้เฉพาะงาน Car Wash หรือ Vehicle Slide เท่านั้น' },
        { status: 400 }
      );
    }

    // Verify the item belongs to this job
    const item = job.carWashItems.find((i) => i.id === itemId);
    if (!item) {
      return NextResponse.json(
        { error: 'ไม่พบรายการรถคันนี้ในใบงาน' },
        { status: 404 }
      );
    }

    // ─── Authorization Check ─────────────────────────
    const authError = assertCanMutateJob(user, job);
    if (authError) return authError;

    // ─── State Machine Validation (Unknown status -> 400, Role -> 403, Closed job / Invalid from->to -> 409) ───
    const transition = validateItemStatusTransition({
      role: user.role,
      jobStatus: job.status,
      from: item.status,
      to: status,
    });
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: transition.status });
    }
    const nextStatus = transition.to;

    // ป้องกันการแก้ไขรายการรถระหว่างที่ระบบกำลังส่งเปิด PO ใน D365 อยู่
    if (isPoPendingActive(job)) {
      return NextResponse.json(
        { error: 'ใบงานนี้กำลังส่งเปิด PO ไปยัง D365 อยู่ กรุณารอสักครู่' },
        { status: 409 }
      );
    }

    // เที่ยวเปล่า (สไลด์ไม่สำเร็จ) คิดเงินต่อใบงาน → ต้องอนุมัติ/ตีกลับทั้งใบ (อนุมัติรายคันจะย้ายสาขารถผิด)
    if (isFailedAttemptJob(job) && job.status === 'WAITING_APPROVAL') {
      return NextResponse.json(
        { error: 'ใบงานนี้ส่งเป็นเที่ยวเปล่า (สไลด์ไม่สำเร็จ) กรุณาอนุมัติหรือขอแก้ไขทั้งใบงาน' },
        { status: 400 }
      );
    }

    // ─── Business Guards ─────────────────────────────
    if (user.role === 'SUPPLIER' && nextStatus === 'COMPLETED' && !item.verifiedAt && !job.verifiedAt) {
      return NextResponse.json(
        { error: 'กรุณายืนยันตัวรถ (VIN/ทะเบียน) ก่อนส่งงาน' },
        { status: 400 }
      );
    }

    if (nextStatus === 'CANCELLED' && item.verifiedAt && user.role !== 'MASTER') {
      return NextResponse.json(
        { error: 'ไม่สามารถยกเลิกรายการนี้ได้ เนื่องจาก Supplier ได้ถ่ายรูปยืนยันตัวรถแล้ว' },
        { status: 400 }
      );
    }

    // ─── ตรวจว่าการอนุมัติรถคันนี้จะทำให้ใบงานครบทุกคัน (allApproved) หรือไม่ ────────
    // หากครบทุกคัน: เปิด PO แบบ Async ผ่าน after() และยังไม่เปลี่ยนสถานะรายการรถคันสุดท้าย/ใบงานเป็น APPROVED จนกว่า PO สำเร็จ
    if (nextStatus === 'APPROVED') {
      const allItemsBefore = await prisma.carWashItem.findMany({ where: { jobId } });
      const simulatedItems = allItemsBefore.map((i) =>
        i.id === itemId ? { ...i, status: 'APPROVED' } : i
      );
      const simApprovedCount = simulatedItems.filter((i) => i.status === 'APPROVED').length;
      const simCancelledCount = simulatedItems.filter((i) => i.status === 'CANCELLED').length;
      const willAllBeApproved =
        simApprovedCount > 0 &&
        simApprovedCount + simCancelledCount === simulatedItems.length &&
        ['IN_PROGRESS', 'WAITING_APPROVAL', 'REJECTED'].includes(job.status);

      if (willAllBeApproved) {
        const autoApprovedBy = resolveApprovedByLabel(user);

        // กรณีใบงานมีเลข PO อยู่แล้ว → ปิดอนุมัติได้ทันที
        if (job.d365PoNumber) {
          const finalized = await finalizeJobApproval({
            jobId,
            expectedJobStatus: job.status,
            user,
            approvedBy: autoApprovedBy,
            triggerItem: {
              itemId,
              expectedItemStatus: item.status,
              remarks: remarks ?? null,
            },
            request,
          });
          const d365Po = {
            success: true,
            purchId: job.d365PoNumber,
            message: `ใบงานนี้มีเลข PO แล้ว (${job.d365PoNumber})`,
          };
          return NextResponse.json({
            success: true,
            item: finalized.triggerItem ?? item,
            progress: { ...finalized.progress, d365Po, d365Transfer: finalized.d365Transfer },
            d365Po,
            d365Transfer: finalized.d365Transfer,
          });
        }

        // จองสถานะ d365PoStatus = 'PENDING' แบบ atomic แล้วตอบ 202 ทันที
        // รายการรถคันสุดท้ายยังคงเป็น COMPLETED จนกว่า PO จะสำเร็จใน after() เพื่อให้ข้อมูลสอดคล้องเสมอ
        await claimJobForApprovalPo({ jobId, expectedStatus: job.status });

        const previousPoStatus = job.d365PoStatus ?? null;
        const expectedJobStatus = job.status;
        const expectedItemStatus = item.status;

        after(() =>
          runAsyncApprovalWithPo({
            jobId,
            jobNumber: job.jobNumber,
            expectedJobStatus,
            previousPoStatus,
            user,
            approvedBy: autoApprovedBy,
            triggerItem: {
              itemId,
              expectedItemStatus,
              remarks: remarks ?? null,
            },
          })
        );

        const completedCount = allItemsBefore.filter((i) => i.status === 'COMPLETED').length;
        const approvedCount = allItemsBefore.filter((i) => i.status === 'APPROVED').length;
        const cancelledCount = allItemsBefore.filter((i) => i.status === 'CANCELLED').length;
        const totalCount = allItemsBefore.length;
        const doneCount = completedCount + approvedCount;

        return NextResponse.json(
          {
            success: true,
            pending: true,
            message: 'กำลังส่งเปิดใบสั่งซื้อไปยัง D365...',
            item,
            progress: {
              completed: doneCount,
              approved: approvedCount,
              cancelled: cancelledCount,
              total: totalCount,
              allResolved: doneCount + cancelledCount === totalCount,
              allApproved: false,
              pending: true,
            },
          },
          { status: 202 }
        );
      }
    }

    // ─── Non-Final Item Update with Optimistic Locking ──────────────
    const result = await prisma.$transaction(async (tx) => {
      // 1. หากเป็นการอนุมัติรถสไลด์รายคัน (ยังไม่ครบทั้งใบ) → snapshot Vehicle.d365WarehouseId ลง CarWashItem.fromWarehouseId ก่อนแก้คลังรถ
      if (nextStatus === 'APPROVED' && job.jobType === 'VEHICLE_SLIDE') {
        await snapshotFromWarehousesInTx(tx, { items: [item] });
      }

      // 2. Optimistic lock รายการรถคันนี้
      const lockedItem = await tx.carWashItem.updateMany({
        where: { id: itemId, status: item.status },
        data: {
          status: nextStatus,
          remarks: remarks || item.remarks,
        },
      });
      if (lockedItem.count === 0) {
        throw new ConflictError(STATUS_CONFLICT_MESSAGE);
      }

      const updatedItem = await tx.carWashItem.findUniqueOrThrow({ where: { id: itemId } });

      // 3. อัปเดตสถานะรถ (เมื่อยกเลิกหรืออนุมัติรายคัน)
      if (nextStatus === 'CANCELLED') {
        await releaseVehiclesInTx(tx, [item.vin]);
      } else if (nextStatus === 'APPROVED') {
        await moveVehiclesOnApprovalInTx(tx, job, [item.vin], false);
      }

      // 4. Re-fetch รายการรถทั้งหมดเพื่อตรวจความคืบหน้ารวมของใบงาน
      const allItems = await tx.carWashItem.findMany({ where: { jobId } });

      const completedCount = allItems.filter((i) => i.status === 'COMPLETED').length;
      const approvedCount = allItems.filter((i) => i.status === 'APPROVED').length;
      const cancelledCount = allItems.filter((i) => i.status === 'CANCELLED').length;
      const totalCount = allItems.length;
      const doneCount = completedCount + approvedCount;
      const allResolved = doneCount + cancelledCount === totalCount;
      const allApproved = approvedCount > 0 && approvedCount + cancelledCount === totalCount;

      // กัน race condition กรณีมีผู้ตรวจรับอนุมัติคันอื่นพร้อมกันจนครบทุกคันระหว่าง transaction นี้
      // ห้ามเปลี่ยนใบงานเป็น APPROVED โดยไม่ผ่าน D365 PO → rollback ให้ผู้ใช้ลองใหม่ (รอบถัดไปจะเข้า async PO flow)
      if (allApproved && ['IN_PROGRESS', 'WAITING_APPROVAL', 'REJECTED'].includes(job.status)) {
        throw new ConflictError(STATUS_CONFLICT_MESSAGE);
      }

      // 5. Auto-transition parent Job status เมื่อทุกรายการมีสถานะครบแล้ว (พร้อม optimistic lock)
      if (allResolved && ['IN_PROGRESS', 'PENDING_SUPPLIER', 'REJECTED'].includes(job.status)) {
        if (cancelledCount === totalCount) {
          const lockedJob = await tx.job.updateMany({
            where: { id: jobId, status: job.status },
            data: {
              status: 'CANCELLED',
              actualCost: 0,
              rejectReason: remarks || 'Supplier ปฏิเสธทุกรายการ',
              updatedAt: new Date(),
            },
          });
          if (lockedJob.count === 0) {
            throw new ConflictError(STATUS_CONFLICT_MESSAGE);
          }

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
          const actualCost = allItems
            .filter((i) => i.status === 'COMPLETED' || i.status === 'APPROVED')
            .reduce((sum: number, i) => sum + (i.unitPrice || 0), 0);

          const lockedJob = await tx.job.updateMany({
            where: { id: jobId, status: job.status },
            data: {
              status: 'WAITING_APPROVAL',
              actualCost,
              completedAt: new Date(),
              updatedAt: new Date(),
            },
          });
          if (lockedJob.count === 0) {
            throw new ConflictError(STATUS_CONFLICT_MESSAGE);
          }

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
        const validSum = allItems
          .filter((i) => i.status !== 'CANCELLED')
          .reduce((sum: number, i) => sum + (i.unitPrice || 0), 0);

        const lockedJob = await tx.job.updateMany({
          where: { id: jobId, status: job.status },
          data: {
            actualCost: validSum,
            updatedAt: new Date(),
          },
        });
        if (lockedJob.count === 0) {
          throw new ConflictError(STATUS_CONFLICT_MESSAGE);
        }
      } else {
        // กรณีอัปเดตเฉพาะสถานะรายคันโดยไม่เปลี่ยนสถานะ/ยอดรวมใบงาน → ขยับ updatedAt เพื่อให้ incremental polling รับรู้
        await tx.job.update({
          where: { id: jobId },
          data: { updatedAt: new Date() },
        });
      }

      // 6. Log activity for the item status change
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
        CANCELLED:
          user.role === 'SUPPLIER'
            ? `Supplier ปฏิเสธรถคัน ${item.vin}${remarks ? ` — เหตุผล: ${remarks}` : ''} (ปฏิเสธ ${cancelledCount}/${totalCount})`
            : `ยกเลิกคำสั่งงานรถคัน ${item.vin}${remarks ? ` — เหตุผล: ${remarks}` : ''}`,
        PENDING: `รีเซ็ตสถานะรถคัน ${item.vin} กลับเป็นรอดำเนินการ`,
      };

      await tx.jobActivity.create({
        data: {
          jobId,
          action: actionMap[nextStatus] || nextStatus,
          actor: user.displayName || user.username,
          actorRole: user.role,
          itemId,
          vin: item.vin,
          description: descMap[nextStatus] || `อัปเดตสถานะรถคัน ${item.vin} เป็น ${nextStatus}`,
          metadata: JSON.stringify({
            fromStatus: item.status,
            toStatus: nextStatus,
            remarks: remarks || null,
          }),
        },
      });

      return {
        item: updatedItem,
        progress: {
          completed: doneCount,
          approved: approvedCount,
          cancelled: cancelledCount,
          total: totalCount,
          allResolved,
          allApproved,
        },
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
      description: `${statusLabel[nextStatus] || nextStatus}รถคัน ${item.vin} ในใบงาน ${job.jobNumber}${remarks ? ` — ${remarks}` : ''}`,
      metadata: {
        jobId,
        jobNumber: job.jobNumber,
        vin: item.vin,
        fromStatus: item.status,
        toStatus: nextStatus,
        remarks,
      },
      request,
    });

    // Record VehicleSlideLog if VEHICLE_SLIDE
    if (job.jobType === 'VEHICLE_SLIDE') {
      let slideAction: 'DELIVERED' | 'APPROVED' | 'CANCELLED' | null = null;
      if (nextStatus === 'COMPLETED') slideAction = 'DELIVERED';
      else if (nextStatus === 'APPROVED') slideAction = 'APPROVED';
      else if (nextStatus === 'CANCELLED') slideAction = 'CANCELLED';

      if (slideAction) {
        recordJobSlideMovementLog(job, {
          vins: [item.vin],
          action: slideAction,
          actorId: user.id,
          actorName: user.displayName || user.username,
          actorRole: user.role,
          remarks:
            remarks ||
            (slideAction === 'DELIVERED'
              ? 'Supplier นำส่งรถถึงปลายทาง'
              : slideAction === 'APPROVED'
                ? 'สาขาตรวจรับรถเรียบร้อย'
                : 'ยกเลิกรายการสไลด์รถ'),
        });
      }
    }

    return NextResponse.json({
      success: true,
      item: result.item,
      progress: result.progress,
    });
  } catch (error) {
    if (!(error instanceof ConflictError)) {
      console.error('PATCH /api/jobs/[id]/items/[itemId]/status error:', error);
    }
    return toErrorResponse(error, 'ไม่สามารถอัปเดตสถานะรายการได้');
  }
}
