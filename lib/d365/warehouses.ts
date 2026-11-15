/**
 * รหัสคลังสินค้า D365 (InventLocationId / WarehouseId) — โมดูลนี้ไม่มี dependency ฝั่ง server ใช้ได้ทั้ง client และ server
 */

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

/** รูปแบบรหัสคลังที่ยอมรับ (ตัวอักษร/ตัวเลข/ขีด ไม่เกิน 20 ตัว) */
export const D365_WAREHOUSE_ID_PATTERN = /^[A-Za-z0-9_-]{1,20}$/;

export function normalizeWarehouseId(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function isValidWarehouseId(value: unknown): boolean {
  return D365_WAREHOUSE_ID_PATTERN.test(normalizeWarehouseId(value));
}

/** ดึงรหัสคลัง D365 (InventLocationId) จากรหัสสาขา เช่น GI02 -> 62010 */
export function getD365WarehouseForBranch(branchCode?: string | null): string | null {
  if (!branchCode) return null;
  const normalized = branchCode.trim().toUpperCase();
  return BRANCH_TO_D365_WAREHOUSE[normalized] ?? null;
}

/** รายการคลังที่รู้จักของสาขา (คลังหลักขึ้นก่อน) เช่น GI06 -> [63004, 63001, 63002, 63003] */
export function getKnownWarehousesForBranch(branchCode?: string | null): string[] {
  if (!branchCode) return [];
  const code = branchCode.trim().toUpperCase();
  const list: string[] = [];
  const main = BRANCH_TO_D365_WAREHOUSE[code];
  if (main) list.push(main);
  for (const [wh, br] of Object.entries(D365_SHOWROOM_WAREHOUSE_TO_BRANCH)) {
    if (br === code && !list.includes(wh)) list.push(wh);
  }
  return list;
}

/**
 * คลังปลายทางของใบงานสไลด์: ใช้ค่าที่ผู้สั่งงานระบุ (destWarehouseId) ก่อน
 * ถ้าไม่มี (ใบงานเก่า) ใช้คลังหลักของสาขาปลายทาง
 */
export function resolveJobDestWarehouse(job: {
  destWarehouseId?: string | null;
  destBranch?: { code?: string | null } | null;
}): string | null {
  const explicit = job.destWarehouseId?.trim();
  if (explicit) return explicit;
  return getD365WarehouseForBranch(job.destBranch?.code);
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

