import { prisma } from '@/lib/prisma';
import { isFailedAttemptJob } from '@/lib/slide-failed-attempt';
import { getD365Config, getD365Token, fetchWithTimeout } from './client';

/** เวลารอ D365 ตอบการโอนย้ายคลังสินค้า (Transfer Journal) */
const TRANSFER_REQUEST_TIMEOUT_MS = 60_000;

export {
  BRANCH_TO_D365_WAREHOUSE,
  D365_SHOWROOM_WAREHOUSE_TO_BRANCH,
  getD365WarehouseForBranch,
  getBranchCodeFromD365Warehouse,
  resolveJobDestWarehouse,
} from './warehouses';
import { getD365WarehouseForBranch, resolveJobDestWarehouse } from './warehouses';

export type D365TransferStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface D365TransferSerial {
  Serial_No: string;
  Serial_Qty: number;
}

export interface D365TransferLine {
  TransfL_LineNo: string;
  TransfL_ItemNo: string;
  TransfLS_Serial: D365TransferSerial[];
}

export interface D365TransferJournalPayload {
  company: string;
  warehouse: string;
  journal: {
    Transf_No: string;
    Transf_Transffrom: string;
    Transf_Transfto: string;
    Transf_PostingDate: string;
    Remark: string;
    TransferLines: D365TransferLine[];
  };
}

export interface D365TransferJournalResponse {
  $id?: string;
  Status?: 'Success' | 'Failed' | string;
  JournalId?: string;
  Transf_No?: string;
  Message?: string;
  [key: string]: unknown;
}

export interface SendTransferOptions {
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  /** แผนที่คลังต้นทางของแต่ละ VIN ก่อนอัปเดตสถานะใน DB (สำรองกรณีไม่มี CarWashItem.fromWarehouseId) */
  preTransferWarehouses?: Record<string, string | null | undefined>;
}

export interface TransferGroupDetail {
  company: string;
  fromWarehouse: string;
  toWarehouse: string;
  transfNo: string;
  vins: string[];
  success: boolean;
  message: string;
}

/** สร้างเลขที่ใบโอนสินค้า (Transf_No) ที่ไม่ซ้ำกันใน D365 */
function buildUniqueTransferNo(jobNumber: string, groupIndex: number): string {
  const digits = jobNumber.replace(/\D/g, '').slice(-6) || '000000';
  const rand = Math.floor(Math.random() * 90 + 10);
  const groupSuffix = groupIndex > 0 ? `G${groupIndex + 1}` : '';
  return `TF${digits}${rand}${groupSuffix}`;
}

async function recordJobTransferState(
  jobId: string,
  status: D365TransferStatus,
  message: string
): Promise<void> {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        d365TransferStatus: status,
        d365TransferMessage: message,
        d365TransferSentAt: new Date(),
      },
    });
  } catch (err) {
    console.error(`[D365 Transfer] บันทึกสถานะโอนคลัง (${status}) ลง Job ไม่สำเร็จ:`, err);
  }
}

/**
 * ส่งใบโอนย้ายคลังที่จอดรถ (Inventory Transfer Journal) ไปยัง D365
 * Endpoint: /api/services/MIS_InventoryServiceGroup/MIS_InventoryService/postTransferJournal
 *
 * หลักการสำคัญ:
 * - อัปเดตเฉพาะคลังที่รถจอดอยู่ (InventLocationId / d365WarehouseId และ currentBranchId)
 * - ไม่แก้ไข d365SiteId (สาขาที่เป็นเจ้าของรถ Original) เพื่อให้หัวบิลและการเปิด PO ยังคงเป็นของสาขาเจ้าของรถต้นสังกัดเสมอ
 * - บันทึกสถานะการโอนคลังลง Job.d365TransferStatus/Message/SentAt เพื่อให้ตรวจสอบและกดส่งใหม่ได้เมื่อล้มเหลว
 */
export async function sendJobToD365TransferJournal(
  jobId: string,
  options?: SendTransferOptions
): Promise<{
  success: boolean;
  status?: D365TransferStatus;
  transferredCount: number;
  message: string;
  details?: TransferGroupDetail[];
}> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      branch: true,
      pickupBranch: true,
      destBranch: true,
      carWashItems: true,
    },
  });

  if (!job) {
    return { success: false, transferredCount: 0, message: 'ไม่พบข้อมูลใบสั่งงาน' };
  }

  if (job.jobType !== 'VEHICLE_SLIDE') {
    return { success: false, transferredCount: 0, message: 'ใบงานนี้ไม่ใช่งานสไลด์รถ' };
  }

  if (isFailedAttemptJob(job)) {
    const msg = 'ใบงานเที่ยวเปล่า (สไลด์ไม่สำเร็จ) ไม่มีการย้ายรถ จึงไม่ต้องโอนคลังใน D365';
    await recordJobTransferState(jobId, 'SKIPPED', msg);
    return { success: true, status: 'SKIPPED', transferredCount: 0, message: msg };
  }

  if (!job.destBranchId || !job.destBranch) {
    const msg = 'ใบงานสไลด์นี้เป็นจุดปักหมุดภายนอก (ไม่ได้ระบุสาขาปลายทางในระบบ) จึงไม่ต้องโอนคลังใน D365';
    await recordJobTransferState(jobId, 'SKIPPED', msg);
    return { success: true, status: 'SKIPPED', transferredCount: 0, message: msg };
  }

  const toWarehouse = resolveJobDestWarehouse(job);
  if (!toWarehouse) {
    const msg = `ไม่พบรหัสคลัง D365 ปลายทาง (สาขา ${job.destBranch.code}) — กรุณาระบุ Warehouse ID ปลายทางในใบงาน`;
    await recordJobTransferState(jobId, 'FAILED', msg);
    return { success: false, status: 'FAILED', transferredCount: 0, message: msg };
  }

  // คัดกรองเฉพาะรถที่ไม่ได้ยกเลิก พร้อมแผนที่คลังต้นทางที่ snapshot ไว้ใน CarWashItem.fromWarehouseId
  const activeItems = (job.carWashItems || []).filter((i) => i.status !== 'CANCELLED');
  const itemFromWarehouseByVin = new Map<string, string>();
  for (const item of activeItems) {
    const vinKey = item.vin.trim().toUpperCase();
    const fromWh = item.fromWarehouseId?.trim();
    if (vinKey && fromWh) {
      itemFromWarehouseByVin.set(vinKey, fromWh);
    }
  }

  const activeVins =
    activeItems.length > 0
      ? activeItems.map((i) => i.vin.trim()).filter(Boolean)
      : job.vin
        ? [job.vin.trim()]
        : [];

  if (activeVins.length === 0) {
    const msg = 'ไม่มีรายการรถที่ต้องโอนย้ายคลัง';
    await recordJobTransferState(jobId, 'SKIPPED', msg);
    return { success: true, status: 'SKIPPED', transferredCount: 0, message: msg };
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { vin: { in: activeVins } },
    select: {
      vin: true,
      d365ItemId: true,
      d365SiteId: true,
      d365WarehouseId: true,
      currentBranchId: true,
    },
  });

  if (vehicles.length === 0) {
    const msg = 'ไม่พบข้อมูลรถในระบบ';
    await recordJobTransferState(jobId, 'FAILED', msg);
    return { success: false, status: 'FAILED', transferredCount: 0, message: msg };
  }

  const fallbackOriginWarehouse = getD365WarehouseForBranch(job.pickupBranch?.code || job.branch?.code);

  // จัดกลุ่มตาม (company เจ้าของรถ Original, fromWarehouse, toWarehouse)
  const groups = new Map<
    string,
    {
      company: string;
      fromWarehouse: string;
      toWarehouse: string;
      items: Array<{ vin: string; itemNo: string }>;
    }
  >();

  const skippedVins: string[] = [];

  for (const v of vehicles) {
    const itemNo = (v.d365ItemId || '').trim();
    if (!itemNo) {
      skippedVins.push(`${v.vin} (ไม่มีรหัสสินค้า d365ItemId)`);
      continue;
    }

    // บริษัทเจ้าของรถ Original ใน D365 (ห้ามเปลี่ยนเป็นสาขาปลายทาง เพราะสต็อกรถใน D365 ผูกอยู่กับ Legal Entity เจ้าของรถ)
    const ownerCompany = (
      v.d365SiteId ||
      job.pickupBranch?.code ||
      job.branch?.code ||
      'GI'
    )
      .trim()
      .toUpperCase();

    // คลังต้นทาง: ลำดับความสำคัญ
    // 1) CarWashItem.fromWarehouseId (snapshot ก่อนย้ายคลัง — แก้ปัญหาอนุมัติรายคันที่รถถูกเปลี่ยนคลังไปแล้ว)
    // 2) preTransferWarehouses จาก caller
    // 3) Vehicle.d365WarehouseId ปัจจุบัน (ถ้ายังไม่ใช่คลังปลายทาง)
    // 4) คลังหลักของสาขาต้นทาง / สาขาเจ้าของรถ
    const snapshotWh = itemFromWarehouseByVin.get(v.vin.trim().toUpperCase());
    const preWh = options?.preTransferWarehouses?.[v.vin]?.trim();
    const currentWh = v.d365WarehouseId?.trim();
    const fromWarehouse: string =
      snapshotWh ||
      (preWh && preWh !== toWarehouse ? preWh : null) ||
      (currentWh && currentWh !== toWarehouse ? currentWh : null) ||
      fallbackOriginWarehouse ||
      getD365WarehouseForBranch(ownerCompany) ||
      '62900';

    if (fromWarehouse === toWarehouse) {
      skippedVins.push(`${v.vin} (อยู่ที่คลัง ${toWarehouse} อยู่แล้ว)`);
      continue;
    }

    const key = `${ownerCompany}|${fromWarehouse}|${toWarehouse}`;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push({ vin: v.vin, itemNo });
    } else {
      groups.set(key, {
        company: ownerCompany,
        fromWarehouse,
        toWarehouse,
        items: [{ vin: v.vin, itemNo }],
      });
    }
  }

  if (groups.size === 0) {
    // อัปเดต d365WarehouseId ให้ตรงกับสาขาปลายทางใน DB ของเราด้วย
    await prisma.vehicle.updateMany({
      where: { vin: { in: activeVins } },
      data: {
        currentBranchId: job.destBranchId,
        d365WarehouseId: toWarehouse,
      },
    });
    const msg =
      skippedVins.length > 0
        ? `อัปเดตที่จอดในระบบแล้ว (ข้ามการยิง D365: ${skippedVins.join(', ')})`
        : 'รถอยู่ที่คลังปลายทางแล้ว';
    await recordJobTransferState(jobId, 'SKIPPED', msg);
    return {
      success: true,
      status: 'SKIPPED',
      transferredCount: 0,
      message: msg,
    };
  }

  // บันทึกสถานะ PENDING ก่อนเริ่มเรียก D365
  await recordJobTransferState(jobId, 'PENDING', 'กำลังส่งใบโอนย้ายคลังไปยัง D365...');

  let url: string;
  let token: string;
  try {
    const cfg = getD365Config();
    token = await getD365Token();
    url = `${cfg.baseUrl}/api/services/MIS_InventoryServiceGroup/MIS_InventoryService/postTransferJournal`;
  } catch (authErr: unknown) {
    const errMsg = authErr instanceof Error ? authErr.message : String(authErr);
    await recordJobTransferState(jobId, 'FAILED', errMsg);
    try {
      await prisma.jobActivity.create({
        data: {
          jobId: job.id,
          action: 'D365_TRANSFER_FAILED',
          actor: options?.actorName || 'ระบบอัตโนมัติ (D365)',
          actorRole: options?.actorRole || 'SYSTEM',
          description: `โอนย้ายคลังที่จอดรถใน D365 ไม่สำเร็จ: ${errMsg}`,
          metadata: JSON.stringify({ toWarehouse, error: errMsg, skippedVins }),
        },
      });
    } catch (actErr) {
      console.error('[D365 Transfer] บันทึก JobActivity ไม่สำเร็จ:', actErr);
    }
    return {
      success: false,
      status: 'FAILED',
      transferredCount: 0,
      message: errMsg,
    };
  }

  const postingDate = (job.completedAt || job.approvedAt || new Date()).toISOString().slice(0, 10);
  const groupList = Array.from(groups.values());

  // ยิง Transfer Journal ทุกกลุ่มแบบขนานด้วย Promise.allSettled
  const settled = await Promise.allSettled(
    groupList.map(async (group, groupIdx): Promise<TransferGroupDetail> => {
      const transfNo = buildUniqueTransferNo(job.jobNumber, groupIdx);
      const payload: D365TransferJournalPayload = {
        company: group.company,
        warehouse: group.fromWarehouse,
        journal: {
          Transf_No: transfNo,
          Transf_Transffrom: group.fromWarehouse,
          Transf_Transfto: group.toWarehouse,
          Transf_PostingDate: postingDate,
          Remark: `Slide ${job.jobNumber}: ${group.fromWarehouse} -> ${group.toWarehouse}`,
          TransferLines: group.items.map((item, idx) => ({
            TransfL_LineNo: String(idx + 1),
            TransfL_ItemNo: item.itemNo,
            TransfLS_Serial: [
              {
                Serial_No: item.vin,
                Serial_Qty: 1,
              },
            ],
          })),
        },
      };

      const vinsInGroup = group.items.map((i) => i.vin);

      try {
        console.log(`[D365 Transfer] กำลังส่งใบโอนย้ายคลัง ${transfNo} สำหรับใบงาน ${job.jobNumber}...`, {
          company: group.company,
          from: group.fromWarehouse,
          to: group.toWarehouse,
          vins: vinsInGroup,
        });

        const res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(payload),
          },
          TRANSFER_REQUEST_TIMEOUT_MS
        );

        const rawText = await res.text().catch(() => '');
        let json: D365TransferJournalResponse = {};
        try {
          json = JSON.parse(rawText);
        } catch {
          json = { Status: res.ok ? 'Success' : 'Failed', Message: rawText || `HTTP ${res.status}` };
        }

        const isSuccess =
          res.ok &&
          json.Status !== 'Failed' &&
          json.Status !== 'Error' &&
          json.Status !== 'FAILED';

        const msg =
          (typeof json.Message === 'string' && json.Message.trim()) ||
          (isSuccess
            ? `โอนย้ายคลัง ${group.fromWarehouse} -> ${group.toWarehouse} สำเร็จ (${transfNo})`
            : `HTTP ${res.status}: โอนย้ายคลังไม่สำเร็จ`);

        if (isSuccess) {
          // อัปเดตเฉพาะที่จอดปัจจุบัน (currentBranchId + d365WarehouseId) โดยไม่แตะ d365SiteId (สาขาเจ้าของรถ Original)
          await prisma.vehicle.updateMany({
            where: { vin: { in: vinsInGroup } },
            data: {
              currentBranchId: job.destBranchId!,
              d365WarehouseId: group.toWarehouse,
            },
          });
        }

        return {
          company: group.company,
          fromWarehouse: group.fromWarehouse,
          toWarehouse: group.toWarehouse,
          transfNo,
          vins: vinsInGroup,
          success: isSuccess,
          message: msg,
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[D365 Transfer] เกิดข้อผิดพลาด (${transfNo}):`, errMsg);
        return {
          company: group.company,
          fromWarehouse: group.fromWarehouse,
          toWarehouse: group.toWarehouse,
          transfNo,
          vins: vinsInGroup,
          success: false,
          message: errMsg,
        };
      }
    })
  );

  const details: TransferGroupDetail[] = settled.map((result, idx) => {
    if (result.status === 'fulfilled') return result.value;
    const group = groupList[idx];
    const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
    return {
      company: group.company,
      fromWarehouse: group.fromWarehouse,
      toWarehouse: group.toWarehouse,
      transfNo: buildUniqueTransferNo(job.jobNumber, idx),
      vins: group.items.map((i) => i.vin),
      success: false,
      message: errMsg,
    };
  });

  const transferredCount = details.reduce(
    (sum, d) => sum + (d.success ? d.vins.length : 0),
    0
  );
  const allSucceeded = details.length > 0 && details.every((d) => d.success);
  const finalStatus: D365TransferStatus = allSucceeded ? 'SUCCESS' : 'FAILED';
  const fromWarehouses = Array.from(new Set(details.map((d) => d.fromWarehouse).filter(Boolean)));
  const fromWarehouseLabel = fromWarehouses.length > 0 ? `คลัง ${fromWarehouses.join(', ')} ➔ ` : '➔ ';
  const summaryMessage = details
    .map((d) => `[${d.company} ${d.fromWarehouse}➔${d.toWarehouse}] ${d.message}`)
    .join(' | ');

  // บันทึกสถานะการโอนคลังลง Job
  await recordJobTransferState(jobId, finalStatus, summaryMessage);

  // บันทึกกิจกรรมลง Timeline ของใบงาน (JobActivity)
  try {
    await prisma.jobActivity.create({
      data: {
        jobId: job.id,
        action: allSucceeded ? 'D365_TRANSFER_SUCCESS' : 'D365_TRANSFER_FAILED',
        actor: options?.actorName || 'ระบบอัตโนมัติ (D365)',
        actorRole: options?.actorRole || 'SYSTEM',
        description: allSucceeded
          ? `โอนย้ายคลังที่จอดรถใน D365 สำเร็จ (${transferredCount} คัน: ${fromWarehouseLabel}คลัง ${toWarehouse})`
          : `โอนย้ายคลังที่จอดรถใน D365 ไม่สำเร็จ: ${summaryMessage}`,
        metadata: JSON.stringify({ fromWarehouses, toWarehouse, details, skippedVins }),
      },
    });
  } catch (actErr) {
    console.error('[D365 Transfer] บันทึก JobActivity ไม่สำเร็จ:', actErr);
  }

  return {
    success: allSucceeded,
    status: finalStatus,
    transferredCount,
    message: summaryMessage,
    details,
  };
}
