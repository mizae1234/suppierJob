import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/session';
import { logAuditFromUser } from '@/lib/audit-log';
import { sendJobToD365PurchaseOrder } from '@/lib/d365/po';
import { sendJobToD365TransferJournal, type D365TransferStatus } from '@/lib/d365/transfer';
import { getFailedAttemptFee, isFailedAttemptJob } from '@/lib/slide-failed-attempt';
import { ConflictError } from '@/lib/errors';
import {
  snapshotFromWarehousesInTx,
  moveVehiclesOnApprovalInTx,
  recordJobSlideMovementLog,
} from './vehicle-movement';

/** สถานะ PENDING ที่ค้างนานเกินนี้ถือว่าหลุด (เช่น server restart) → ให้จองซ้ำได้ */
export const PO_PENDING_STALE_MS = 4 * 60_000;

export const STATUS_CONFLICT_MESSAGE = 'สถานะใบงานมีการเปลี่ยนแปลง กรุณารีเฟรช';

export function isPoPendingActive(job: {
  d365PoStatus?: string | null;
  d365PoSentAt?: Date | null;
}): boolean {
  if (job.d365PoStatus !== 'PENDING') return false;
  if (!job.d365PoSentAt) return false;
  return Date.now() - job.d365PoSentAt.getTime() < PO_PENDING_STALE_MS;
}

/**
 * สร้างชื่อผู้อนุมัติที่แสดงในใบงานและส่งเป็นฟิลด์ Approval ไป D365
 */
export function resolveApprovedByLabel(
  user: Pick<SessionUser, 'role' | 'branchName' | 'branchCode' | 'displayName' | 'firstName' | 'lastName' | 'username'>,
  customApprovedBy?: string | null
): string {
  if (customApprovedBy?.trim()) return customApprovedBy.trim();
  const userBranchLabel =
    user.branchName || user.branchCode || (user.role === 'ADMIN' ? 'ส่วนกลาง' : '');
  const userName =
    user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
  return userBranchLabel ? `${userBranchLabel} (${userName})` : userName;
}

/**
 * จองใบงานแบบ atomic เพื่อเริ่มเปิด PO ใน D365 แบบ asynchronous (ผ่าน Next.js after())
 * - ตรวจว่า job.status ยังตรงกับ expectedStatus และไม่มีการส่ง PO ค้างอยู่ (d365PoStatus != 'PENDING' หรือ stale แล้ว)
 * - ยังไม่เปลี่ยน job.status เป็น APPROVED (Kanban จะยังคงอยู่ที่รอตรวจรับจนกว่า PO จะสำเร็จ)
 */
export async function claimJobForApprovalPo(params: {
  jobId: string;
  expectedStatus: string;
  actualCost?: number;
}): Promise<void> {
  const { jobId, expectedStatus, actualCost } = params;
  const staleCutoff = new Date(Date.now() - PO_PENDING_STALE_MS);

  const claimed = await prisma.job.updateMany({
    where: {
      id: jobId,
      status: expectedStatus,
      OR: [
        { d365PoStatus: null },
        { d365PoStatus: { not: 'PENDING' } },
        { d365PoSentAt: null },
        { d365PoSentAt: { lt: staleCutoff } },
      ],
    },
    data: {
      d365PoStatus: 'PENDING',
      d365PoMessage: 'กำลังส่งเปิดใบสั่งซื้อไปยัง D365...',
      d365PoSentAt: new Date(),
      ...(typeof actualCost === 'number' && Number.isFinite(actualCost) && actualCost > 0
        ? { actualCost }
        : {}),
      updatedAt: new Date(),
    },
  });

  if (claimed.count === 0) {
    const latest = await prisma.job.findUnique({
      where: { id: jobId },
      select: { status: true, d365PoStatus: true, d365PoSentAt: true },
    });
    if (latest && latest.status === expectedStatus && isPoPendingActive(latest)) {
      throw new ConflictError('ใบงานนี้กำลังส่งเปิด PO ไปยัง D365 อยู่ กรุณารอสักครู่');
    }
    throw new ConflictError(STATUS_CONFLICT_MESSAGE);
  }
}

export interface FinalizeApprovalParams {
  jobId: string;
  expectedJobStatus: string;
  user: SessionUser;
  approvedBy: string;
  /** ค่าเที่ยวเปล่าที่แก้ไขก่อนอนุมัติ (เฉพาะงานเที่ยวเปล่า) */
  failedAttemptFee?: number;
  /** หากเป็นการอนุมัติรายคันที่ทำให้ใบงานครบทุกคัน ให้ระบุรายการคันสุดท้ายเพื่อเปลี่ยนเป็น APPROVED ใน transaction เดียวกัน */
  triggerItem?: {
    itemId: string;
    expectedItemStatus: string;
    remarks?: string | null;
  };
  request?: NextRequest | null;
}

export interface FinalizeApprovalResult {
  job: Awaited<ReturnType<typeof prisma.job.findUniqueOrThrow>>;
  triggerItem?: Awaited<ReturnType<typeof prisma.carWashItem.findUnique>>;
  progress?: {
    completed: number;
    approved: number;
    cancelled: number;
    total: number;
    allResolved: boolean;
    allApproved: boolean;
  };
  d365Transfer?: {
    success: boolean;
    transferredCount: number;
    status?: D365TransferStatus;
    message: string;
  };
}

/**
 * ปิดการอนุมัติใบงานหลังเปิด PO สำเร็จแล้ว (ใช้ร่วมกันทั้ง whole-job approve และ final-item auto-approve):
 * 1) ตรวจ optimistic lock ของ Job (และ triggerItem ถ้ามี)
 * 2) snapshot Vehicle.d365WarehouseId ลง CarWashItem.fromWarehouseId ก่อนแก้คลังรถ
 * 3) เปลี่ยนสถานะใบงานเป็น APPROVED, อนุมัติรายการรถที่เกี่ยวข้อง, ย้ายสาขา/คลังรถ (ยกเว้นเที่ยวเปล่า)
 * 4) บันทึก JobActivity, AuditLog, VehicleSlideLog
 * 5) ส่ง D365 Inventory Transfer Journal (เฉพาะงานรถสไลด์ปกติ ไม่ใช่เที่ยวเปล่า)
 *
 * หมายเหตุสำหรับการอนุมัติรายคันที่ทำให้ครบทั้งใบงาน:
 * เราเลือกเก็บสถานะรายการรถคันสุดท้ายไว้เป็น COMPLETED จนกว่าการเปิด PO จะสำเร็จ แล้วจึงเปลี่ยนทั้งรายการรถและใบงานเป็น APPROVED
 * พร้อมกันใน transaction เดียว เพื่อให้ข้อมูลสอดคล้องเสมอ (หาก PO ล้มเหลว รถคันสุดท้ายยังไม่ถูกย้ายสาขา และผู้ใช้กดอนุมัติซ้ำได้ทันที)
 */
export async function finalizeJobApproval(
  params: FinalizeApprovalParams
): Promise<FinalizeApprovalResult> {
  const { jobId, expectedJobStatus, user, approvedBy, failedAttemptFee, triggerItem, request } = params;

  const jobSnapshot = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      carWashItems: true,
      pickupBranch: { select: { code: true, name: true, address: true, companyId: true } },
      destBranch: { select: { code: true, name: true, address: true, companyId: true } },
      supplier: { select: { name: true } },
    },
  });

  if (!jobSnapshot) {
    throw new ConflictError('ไม่พบใบงานนี้', 404);
  }

  const isFailedAttempt = isFailedAttemptJob(jobSnapshot);
  const actorName = user.displayName || user.username;

  let preTransferWarehouses: Record<string, string | null | undefined> = {};

  const txResult = await prisma.$transaction(async (tx) => {
    const now = new Date();

    // โหลดรายการรถล่าสุดใน transaction เพื่อให้การคำนวณยอดและ snapshot แม่นยำ
    const currentItems = await tx.carWashItem.findMany({ where: { jobId } });

    // 1) กรณีอนุมัติรายคันที่เป็นคันสุดท้าย → lock และอัปเดต item นั้นก่อน (พร้อมตรวจว่ายังครบทุกคันจริง)
    let updatedTriggerItem: (typeof currentItems)[number] | null = null;
    if (triggerItem) {
      const targetItem = currentItems.find((i) => i.id === triggerItem.itemId);
      if (!targetItem) {
        throw new ConflictError('ไม่พบรายการรถคันนี้ในใบงาน', 404);
      }

      // Snapshot คลังต้นทางของรถที่ยังไม่เคยบันทึกก่อนมีการย้ายคลัง
      if (jobSnapshot.jobType === 'VEHICLE_SLIDE' && !isFailedAttempt) {
        preTransferWarehouses = await snapshotFromWarehousesInTx(tx, {
          items: currentItems.filter((i) => i.status !== 'CANCELLED'),
          extraVins: jobSnapshot.vin ? [jobSnapshot.vin] : [],
        });
      }

      const itemLocked = await tx.carWashItem.updateMany({
        where: { id: triggerItem.itemId, status: triggerItem.expectedItemStatus },
        data: {
          status: 'APPROVED',
          remarks: triggerItem.remarks || targetItem.remarks,
        },
      });
      if (itemLocked.count === 0) {
        throw new ConflictError(STATUS_CONFLICT_MESSAGE);
      }

      updatedTriggerItem = await tx.carWashItem.findUnique({ where: { id: triggerItem.itemId } });
    } else if (jobSnapshot.jobType === 'VEHICLE_SLIDE' && !isFailedAttempt) {
      // Whole-job approval: snapshot fromWarehouseId ก่อนย้ายคลังรถทุกคัน
      preTransferWarehouses = await snapshotFromWarehousesInTx(tx, {
        items: currentItems.filter((i) => i.status !== 'CANCELLED'),
        extraVins: jobSnapshot.vin ? [jobSnapshot.vin] : [],
      });
    }

    const itemsAfterTrigger = triggerItem
      ? await tx.carWashItem.findMany({ where: { jobId } })
      : currentItems;

    // 2) คำนวณ actualCost ตามประเภทงาน
    let actualCost: number;
    if (isFailedAttempt) {
      actualCost =
        typeof failedAttemptFee === 'number' && Number.isFinite(failedAttemptFee) && failedAttemptFee > 0
          ? failedAttemptFee
          : getFailedAttemptFee(jobSnapshot);
    } else if (triggerItem) {
      actualCost = itemsAfterTrigger
        .filter((i) => i.status === 'APPROVED')
        .reduce((sum, i) => sum + (i.unitPrice || 0), 0);
    } else if (jobSnapshot.jobType === 'CAR_WASH' && itemsAfterTrigger.length > 0) {
      const completedItems = itemsAfterTrigger.filter(
        (c) => c.status === 'COMPLETED' || c.status === 'APPROVED'
      );
      const validItems =
        completedItems.length > 0
          ? completedItems
          : itemsAfterTrigger.filter((c) => c.status !== 'CANCELLED');
      actualCost = validItems.reduce((sum, c) => sum + (c.unitPrice || 0), 0);
    } else {
      actualCost = jobSnapshot.actualCost || jobSnapshot.estimatedCost || 0;
    }

    // 3) Optimistic lock เปลี่ยนสถานะใบงานเป็น APPROVED
    const jobLocked = await tx.job.updateMany({
      where: { id: jobId, status: expectedJobStatus },
      data: {
        status: 'APPROVED',
        actualCost,
        approvedAt: now,
        approvedBy,
        completedAt: jobSnapshot.completedAt || now,
        updatedAt: now,
      },
    });
    if (jobLocked.count === 0) {
      throw new ConflictError(STATUS_CONFLICT_MESSAGE);
    }

    // 4) อัปเดตรายการรถและย้ายสาขา/คลังรถ (ไม่แตะ d365SiteId)
    if (triggerItem) {
      const approvedVins = itemsAfterTrigger
        .filter((i) => i.status === 'APPROVED')
        .map((i) => i.vin);
      await moveVehiclesOnApprovalInTx(tx, jobSnapshot, approvedVins, isFailedAttempt);

      const completedCount = itemsAfterTrigger.filter((i) => i.status === 'COMPLETED').length;
      const approvedCount = itemsAfterTrigger.filter((i) => i.status === 'APPROVED').length;
      const cancelledCount = itemsAfterTrigger.filter((i) => i.status === 'CANCELLED').length;
      const totalCount = itemsAfterTrigger.length;
      const doneCount = completedCount + approvedCount;
      const allResolved = doneCount + cancelledCount === totalCount;
      const allApproved = approvedCount > 0 && approvedCount + cancelledCount === totalCount;

      if (!allApproved) {
        throw new ConflictError(STATUS_CONFLICT_MESSAGE);
      }

      await tx.jobActivity.create({
        data: {
          jobId,
          action: 'JOB_APPROVED',
          actor: 'ระบบอัตโนมัติ',
          actorRole: 'SYSTEM',
          description: `อนุมัติครบทุกคัน (${approvedCount} คัน${cancelledCount ? `, ปฏิเสธ ${cancelledCount} คัน` : ''}) — ค่าบริการสุทธิ ฿${actualCost.toLocaleString()} — ปิดใบงานอัตโนมัติ`,
          metadata: JSON.stringify({
            approved: approvedCount,
            cancelled: cancelledCount,
            total: totalCount,
            actualCost,
          }),
        },
      });

      if (updatedTriggerItem) {
        await tx.jobActivity.create({
          data: {
            jobId,
            action: 'ITEM_APPROVED',
            actor: actorName,
            actorRole: user.role,
            itemId: triggerItem.itemId,
            vin: updatedTriggerItem.vin,
            description: `สาขาอนุมัติรถคัน ${updatedTriggerItem.vin} (อนุมัติแล้ว ${approvedCount}/${totalCount - cancelledCount})`,
            metadata: JSON.stringify({
              fromStatus: triggerItem.expectedItemStatus,
              toStatus: 'APPROVED',
              remarks: triggerItem.remarks || null,
            }),
          },
        });
      }

      const updatedJob = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
      return {
        job: updatedJob,
        triggerItem: updatedTriggerItem,
        progress: {
          completed: doneCount,
          approved: approvedCount,
          cancelled: cancelledCount,
          total: totalCount,
          allResolved,
          allApproved,
        },
      };
    }

    // Whole-job approval: อัปเดต items และ vehicles ทั้งใบงาน
    if (jobSnapshot.jobType === 'VEHICLE_SLIDE') {
      const slideVins =
        itemsAfterTrigger.length > 0
          ? itemsAfterTrigger.filter((c) => c.status !== 'CANCELLED').map((c) => c.vin)
          : jobSnapshot.vin
            ? [jobSnapshot.vin]
            : [];
      await moveVehiclesOnApprovalInTx(tx, jobSnapshot, slideVins, isFailedAttempt);
      if (itemsAfterTrigger.length > 0) {
        await tx.carWashItem.updateMany({
          where: { jobId, status: { not: 'CANCELLED' } },
          data: { status: 'APPROVED' },
        });
      }
    } else if (jobSnapshot.jobType === 'CAR_WASH' && itemsAfterTrigger.length > 0) {
      await tx.carWashItem.updateMany({
        where: { jobId, status: 'COMPLETED' },
        data: { status: 'APPROVED' },
      });
      await moveVehiclesOnApprovalInTx(
        tx,
        jobSnapshot,
        itemsAfterTrigger.map((c) => c.vin),
        false
      );
    }

    const updatedJob = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
    return { job: updatedJob, triggerItem: null, progress: undefined };
  });

  const approvedFailedFee = isFailedAttempt ? getFailedAttemptFee(txResult.job) : 0;

  // 5) Audit Log (นอก transaction)
  if (triggerItem && txResult.triggerItem) {
    logAuditFromUser(user, {
      action: 'UPDATE_ITEM_STATUS',
      entityType: 'CarWashItem',
      entityId: triggerItem.itemId,
      description: `อนุมัติรถคัน ${txResult.triggerItem.vin} ในใบงาน ${jobSnapshot.jobNumber}${triggerItem.remarks ? ` — ${triggerItem.remarks}` : ''}`,
      metadata: {
        jobId,
        jobNumber: jobSnapshot.jobNumber,
        vin: txResult.triggerItem.vin,
        fromStatus: triggerItem.expectedItemStatus,
        toStatus: 'APPROVED',
        remarks: triggerItem.remarks,
        autoApprovedJob: true,
      },
      request: request ?? null,
    });
  } else {
    logAuditFromUser(user, {
      action: 'APPROVE_JOB',
      entityType: 'Job',
      entityId: jobId,
      description: isFailedAttempt
        ? `อนุมัติค่าเที่ยวเปล่า (สไลด์ไม่สำเร็จ) ใบงาน ${jobSnapshot.jobNumber} — ${approvedFailedFee.toLocaleString()} บาท`
        : `อนุมัติใบงาน ${jobSnapshot.jobNumber}`,
      metadata: {
        jobNumber: jobSnapshot.jobNumber,
        fromStatus: expectedJobStatus,
        toStatus: 'APPROVED',
        ...(isFailedAttempt
          ? { completionType: jobSnapshot.completionType, actualCost: approvedFailedFee }
          : {}),
      },
      request: request ?? null,
    });
  }

  // 6) VehicleSlideLog
  if (jobSnapshot.jobType === 'VEHICLE_SLIDE') {
    const slideVins = triggerItem && txResult.triggerItem
      ? [txResult.triggerItem.vin]
      : jobSnapshot.carWashItems.length > 0
        ? jobSnapshot.carWashItems.map((c) => c.vin)
        : jobSnapshot.vin
          ? [jobSnapshot.vin]
          : [];
    recordJobSlideMovementLog(jobSnapshot, {
      vins: slideVins,
      action: isFailedAttempt ? 'FAILED_ATTEMPT_APPROVED' : 'APPROVED',
      actorId: user.id,
      actorName,
      actorRole: user.role,
      remarks: triggerItem
        ? triggerItem.remarks || 'สาขาตรวจรับรถเรียบร้อย'
        : isFailedAttempt
          ? `อนุมัติค่าเที่ยวเปล่า (สไลด์ไม่สำเร็จ) ใบงาน ${jobSnapshot.jobNumber} — ${approvedFailedFee.toLocaleString()} บาท`
          : `อนุมัติใบงาน ${jobSnapshot.jobNumber}`,
    });
  }

  // 7) D365 Inventory Transfer Journal (เฉพาะงานรถสไลด์ปกติ ไม่ใช่เที่ยวเปล่า)
  let d365Transfer: FinalizeApprovalResult['d365Transfer'];
  if (jobSnapshot.jobType === 'VEHICLE_SLIDE' && !isFailedAttempt) {
    try {
      d365Transfer = await sendJobToD365TransferJournal(jobId, {
        actorId: user.id,
        actorName,
        actorRole: user.role,
        preTransferWarehouses,
      });
      console.log(`[ApproveJob] D365 Transfer result for ${jobSnapshot.jobNumber}:`, d365Transfer);
    } catch (transferErr) {
      console.error(`[ApproveJob] D365 Transfer Journal failed for ${jobSnapshot.jobNumber}:`, transferErr);
    }
  }

  return {
    job: txResult.job,
    triggerItem: txResult.triggerItem,
    progress: txResult.progress,
    d365Transfer,
  };
}

/**
 * งานเบื้องหลังที่รันใน Next.js after() หลัง claimJobForApprovalPo และตอบ 202 แล้ว:
 * 1) เปิด PO ใน D365 (alreadyClaimed: true)
 * 2) หากสำเร็จ → เรียก finalizeJobApproval (เปลี่ยนเป็น APPROVED + ย้ายรถ + ส่ง Transfer Journal)
 * 3) หากล้มเหลว → คงใบงานไว้สถานะเดิม (WAITING_APPROVAL/IN_PROGRESS) และ d365PoStatus = FAILED
 */
export async function runAsyncApprovalWithPo(params: {
  jobId: string;
  jobNumber: string;
  expectedJobStatus: string;
  previousPoStatus: string | null;
  user: SessionUser;
  approvedBy: string;
  failedAttemptFee?: number;
  triggerItem?: {
    itemId: string;
    expectedItemStatus: string;
    remarks?: string | null;
  };
}): Promise<void> {
  const { jobId, jobNumber, expectedJobStatus, previousPoStatus, user, approvedBy, failedAttemptFee, triggerItem } = params;

  let poResult: { success: boolean; purchId?: string; message: string };
  try {
    poResult = await sendJobToD365PurchaseOrder(jobId, {
      trigger: 'AUTO_APPROVE',
      actorId: user.id,
      actorName: approvedBy,
      actorRole: user.role,
      alreadyClaimed: true,
      previousPoStatus,
    });
    console.log(`[AsyncApprove] D365 PO result for ${jobNumber}:`, poResult);
  } catch (poErr) {
    const msg = poErr instanceof Error ? poErr.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ D365';
    console.error(`[AsyncApprove] Unexpected D365 PO error for ${jobNumber}:`, poErr);
    // กันสถานะค้าง PENDING กรณีเกิด error นอก try/catch ของ po.ts
    await prisma.job
      .updateMany({
        where: { id: jobId, d365PoStatus: 'PENDING' },
        data: {
          d365PoStatus: 'FAILED',
          d365PoMessage: msg,
          d365PoSentAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .catch((dbErr) => console.error('[AsyncApprove] Failed to mark PO FAILED:', dbErr));
    return;
  }

  if (!poResult.success) {
    // po.ts บันทึก d365PoStatus = 'FAILED' เรียบร้อยแล้ว → ไม่เปลี่ยนสถานะใบงานเป็น APPROVED
    return;
  }

  try {
    await finalizeJobApproval({
      jobId,
      expectedJobStatus,
      user,
      approvedBy,
      failedAttemptFee,
      triggerItem,
    });
  } catch (finalizeErr) {
    console.error(`[AsyncApprove] Finalize approval failed after PO success for ${jobNumber}:`, finalizeErr);
  }
}
