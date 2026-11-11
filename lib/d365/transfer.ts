import { prisma } from '@/lib/prisma';
import { getD365Config, getD365Token, fetchWithTimeout } from './client';

/** เวลารอ D365 ตอบการโอนย้ายคลังสินค้า (Transfer Journal) */
const TRANSFER_REQUEST_TIMEOUT_MS = 60_000;

/**
 * ตารางแมปรหัสสาขา (Branch.code) -> รหัสคลังสินค้าหลักใน D365 (InventLocationId / WarehouseId)
 * อ้างอิงจากตาราง Warehouses ใน D365 F&O UAT
 */
export const BRANCH_TO_D365_WAREHOUSE: Record<string, string> = {
  GI: '62900',   // GI WAREHOUSE (สำนักงานใหญ่ บางนา-ตราด กม.18)
  GI01: '62008', // GI-SUB (KANCHANAPISEK)-BANGKHAE-BANGKOK
  GI02: '62010', // GI-SUB (STA)-MINBURI-BANGKOK
  GI03: '62004', // GI-SUB (EXPRESSWAY RAMINTRA)-WANGTHONGLANG-BANGKOK
  GI04: '62007', // GI-SUB (SILOM SOI 9)-BANGRAK-BANGKOK
  GI05: '62011', // GI-SUB (STA)-MUEANG-UBONRATCHATHANI
  GI06: '63004', // EV7-RENT(TAXI) (EV7 Co.,Ltd.)
  GI07: '62017', // GI-SUB (MAHACHAI)-MUEANG-SAMUTSAKHON
  GI08: '62016', // GI-SUB (SALAYA)-SAMPHRAN-NAKHONPATHOM
  GI09: '62013', // GI-SUB (VIBHAVADI)-CHATUCHAK-BANGKOK
  GI10: '62015', // GI-SUB (PIBULSONGKRAM)-MUEANG-NONTHABURI
  GI11: '62019', // GI-SUB (AYUTTHAYA)
  GI12: '62020', // GI-CHIANGMAI-MUEANG-CHIANGMAI
};

/**
 * ตารางแมปรหัสคลังสินค้าเฉพาะสาขาโชว์รูม (InventLocationId) -> รหัสสาขา (Branch.code)
 * ใช้ระบุว่าถ้ารถอยู่ในคลังรหัสนี้ แปลว่าปัจจุบันรถจอดอยู่ที่สาขาใด (โดยที่ d365SiteId ยังคงเป็นสาขาเจ้าของรถ Original)
 */
export const D365_SHOWROOM_WAREHOUSE_TO_BRANCH: Record<string, string> = {
  '62008': 'GI01',
  '62010': 'GI02',
  '62004': 'GI03',
  '62007': 'GI04',
  '62011': 'GI05',
  '63001': 'GI06',
  '63002': 'GI06',
  '63003': 'GI06',
  '63004': 'GI06',
  '62017': 'GI07',
  '62016': 'GI08',
  '62013': 'GI09',
  '62015': 'GI10',
  '62019': 'GI11',
  '62020': 'GI12',
};

/** ดึงรหัสคลัง D365 (InventLocationId) จากรหัสสาขา เช่น GI02 -> 62010 */
export function getD365WarehouseForBranch(branchCode?: string | null): string | null {
  if (!branchCode) return null;
  const normalized = branchCode.trim().toUpperCase();
  return BRANCH_TO_D365_WAREHOUSE[normalized] ?? null;
}

/**
 * แปลงรหัสคลัง D365 (InventLocationId) เป็นรหัสสาขาที่รถจอดอยู่
 * - หาก strictShowroomOnly = true (ค่าเริ่มต้นตอนซิงค์รถ): คืนเฉพาะคลังที่เป็นโชว์รูมสาขาชัดเจน
 *   ส่วนคลังกลาง เช่น 62900 จะคืน null เพื่อให้คงสาขาตามต้นสังกัดหรือสาขาที่สไลด์ไปล่าสุด
 */
export function getBranchCodeFromD365Warehouse(
  warehouseId?: string | null,
  strictShowroomOnly = true
): string | null {
  if (!warehouseId) return null;
  const wh = warehouseId.trim();
  if (D365_SHOWROOM_WAREHOUSE_TO_BRANCH[wh]) {
    return D365_SHOWROOM_WAREHOUSE_TO_BRANCH[wh];
  }
  if (!strictShowroomOnly && wh === '62900') {
    return 'GI';
  }
  return null;
}

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
  /** แผนที่คลังต้นทางของแต่ละ VIN ก่อนอัปเดตสถานะใน DB (เผื่อ DB เพิ่งเปลี่ยนเป็นคลังปลายทาง) */
  preTransferWarehouses?: Record<string, string | null | undefined>;
}

/** สร้างเลขที่ใบโอนสินค้า (Transf_No) ที่ไม่ซ้ำกันใน D365 */
function buildUniqueTransferNo(jobNumber: string, groupIndex: number): string {
  const digits = jobNumber.replace(/\D/g, '').slice(-6) || '000000';
  const rand = Math.floor(Math.random() * 90 + 10);
  const groupSuffix = groupIndex > 0 ? `G${groupIndex + 1}` : '';
  return `TF${digits}${rand}${groupSuffix}`;
}

/**
 * ส่งใบโอนย้ายคลังที่จอดรถ (Inventory Transfer Journal) ไปยัง D365
 * Endpoint: /api/services/MIS_InventoryServiceGroup/MIS_InventoryService/postTransferJournal
 *
 * หลักการสำคัญ:
 * - อัปเดตเฉพาะคลังที่รถจอดอยู่ (InventLocationId / d365WarehouseId และ currentBranchId)
 * - ไม่แก้ไข d365SiteId (สาขาที่เป็นเจ้าของรถ Original) เพื่อให้หัวบิลและการเปิด PO ยังคงเป็นของสาขาเจ้าของรถต้นสังกัดเสมอ
 */
export async function sendJobToD365TransferJournal(
  jobId: string,
  options?: SendTransferOptions
): Promise<{
  success: boolean;
  transferredCount: number;
  message: string;
  details?: Array<{
    company: string;
    fromWarehouse: string;
    toWarehouse: string;
    transfNo: string;
    vins: string[];
    success: boolean;
    message: string;
  }>;
}> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      branch: true,
      originBranch: true,
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

  if (!job.destBranchId || !job.destBranch) {
    return {
      success: false,
      transferredCount: 0,
      message: 'ใบงานสไลด์นี้เป็นจุดปักหมุดภายนอก (ไม่ได้ระบุสาขาปลายทางในระบบ) จึงไม่ต้องโอนคลังใน D365',
    };
  }

  const toWarehouse = getD365WarehouseForBranch(job.destBranch.code);
  if (!toWarehouse) {
    return {
      success: false,
      transferredCount: 0,
      message: `ไม่พบรหัสคลัง D365 สำหรับสาขาปลายทาง ${job.destBranch.code}`,
    };
  }

  // คัดกรองเฉพาะรถที่ไม่ได้ยกเลิก
  const activeVins =
    job.carWashItems && job.carWashItems.length > 0
      ? job.carWashItems
          .filter((i) => i.status !== 'CANCELLED')
          .map((i) => i.vin.trim())
          .filter(Boolean)
      : job.vin
        ? [job.vin.trim()]
        : [];

  if (activeVins.length === 0) {
    return { success: false, transferredCount: 0, message: 'ไม่มีรายการรถที่ต้องโอนย้ายคลัง' };
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
    return { success: false, transferredCount: 0, message: 'ไม่พบข้อมูลรถในระบบ' };
  }

  const fallbackOriginWarehouse = getD365WarehouseForBranch(job.originBranch?.code || job.branch?.code);

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
      job.originBranch?.code ||
      job.branch?.code ||
      'GI'
    )
      .trim()
      .toUpperCase();

    // คลังต้นทาง: ใช้ค่าก่อนอัปเดตสถานะ (ถ้ามี) หรือ d365WarehouseId ปัจจุบัน (ถ้ายังไม่ใช่คลังปลายทาง) หรือคลังของสาขาต้นทาง
    const preWh = options?.preTransferWarehouses?.[v.vin]?.trim();
    const currentWh = v.d365WarehouseId?.trim();
    const fromWarehouse: string =
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
    return {
      success: true,
      transferredCount: 0,
      message: skippedVins.length > 0
        ? `อัปเดตที่จอดในระบบแล้ว (ข้ามการยิง D365: ${skippedVins.join(', ')})`
        : 'รถอยู่ที่คลังปลายทางแล้ว',
    };
  }

  const cfg = getD365Config();
  const token = await getD365Token();
  const url = `${cfg.baseUrl}/api/services/MIS_InventoryServiceGroup/MIS_InventoryService/postTransferJournal`;
  const postingDate = (job.completedAt || job.approvedAt || new Date()).toISOString().slice(0, 10);

  const details: Array<{
    company: string;
    fromWarehouse: string;
    toWarehouse: string;
    transfNo: string;
    vins: string[];
    success: boolean;
    message: string;
  }> = [];

  let transferredCount = 0;
  let groupIdx = 0;

  for (const group of groups.values()) {
    const transfNo = buildUniqueTransferNo(job.jobNumber, groupIdx++);
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
        transferredCount += vinsInGroup.length;
        // อัปเดตเฉพาะที่จอดปัจจุบัน (currentBranchId + d365WarehouseId) โดยไม่แตะ d365SiteId (สาขาเจ้าของรถ Original)
        await prisma.vehicle.updateMany({
          where: { vin: { in: vinsInGroup } },
          data: {
            currentBranchId: job.destBranchId,
            d365WarehouseId: group.toWarehouse,
          },
        });
      }

      details.push({
        company: group.company,
        fromWarehouse: group.fromWarehouse,
        toWarehouse: group.toWarehouse,
        transfNo,
        vins: vinsInGroup,
        success: isSuccess,
        message: msg,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[D365 Transfer] เกิดข้อผิดพลาด (${transfNo}):`, errMsg);
      details.push({
        company: group.company,
        fromWarehouse: group.fromWarehouse,
        toWarehouse: group.toWarehouse,
        transfNo,
        vins: vinsInGroup,
        success: false,
        message: errMsg,
      });
    }
  }

  const allSucceeded = details.length > 0 && details.every((d) => d.success);
  const summaryMessage = details
    .map((d) => `[${d.company} ${d.fromWarehouse}➔${d.toWarehouse}] ${d.message}`)
    .join(' | ');

  // บันทึกกิจกรรมลง Timeline ของใบงาน (JobActivity)
  try {
    await prisma.jobActivity.create({
      data: {
        jobId: job.id,
        action: allSucceeded ? 'D365_TRANSFER_SUCCESS' : 'D365_TRANSFER_FAILED',
        actor: options?.actorName || 'ระบบอัตโนมัติ (D365)',
        actorRole: options?.actorRole || 'SYSTEM',
        description: allSucceeded
          ? `โอนย้ายคลังที่จอดรถใน D365 สำเร็จ (${transferredCount} คัน ➔ คลัง ${toWarehouse})`
          : `โอนย้ายคลังที่จอดรถใน D365 ไม่สำเร็จ: ${summaryMessage}`,
        metadata: JSON.stringify({ toWarehouse, details, skippedVins }),
      },
    });
  } catch (actErr) {
    console.error('[D365 Transfer] บันทึก JobActivity ไม่สำเร็จ:', actErr);
  }

  return {
    success: allSucceeded,
    transferredCount,
    message: summaryMessage,
    details,
  };
}
