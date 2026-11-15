/**
 * รหัสคลังสินค้า D365 (InventLocationId / WarehouseId) — โมดูลนี้ไม่มี dependency ฝั่ง server ใช้ได้ทั้ง client และ server
 */

export interface D365WarehouseOption {
  warehouseId: string;
  warehouseName: string;
  dataAreaId: string;
  isPrimary?: boolean;
}

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
 * ชื่อคลังสินค้าใน D365 (WarehouseId -> WarehouseName) จากเส้น GET /data/Warehouses
 */
export const D365_WAREHOUSE_NAMES: Record<string, string> = {
  '62001': 'GI-CENTRAL (RAMA 2)-BANGKHUNTHIAN-BANGKOK',
  '62002': 'GI-THE MALL (BANGKAPI)-BANGKAPI-BANGKOK',
  '62003': 'GI-THE MALL (BANGKHAE)-BANGKHAE-BANGKOK',
  '62004': 'GI-SUB (EXPRESSWAY RAMINTRA)-WANGTHONGLANG-BANGKOK',
  '62005': 'GI-THE EMSPHERE-KHLONGTOEI-BANGKOK',
  '62006': 'GI-SUB (BRAVO)-HUAIKHWANG-BANGKOK',
  '62007': 'GI-SUB (SILOM SOI 9)-BANGRAK-BANGKOK',
  '62008': 'GI-SUB (KANCHANAPISEK)-BANGKHAE-BANGKOK',
  '62009': 'GI-SUB (SRINAKARIN ROMKLAO)-SAPHANSUNG-BANGKOK',
  '62010': 'GI-SUB (STA)-MINBURI-BANGKOK',
  '62011': 'GI-SUB (STA)-MUEANG-UBONRATCHATHANI',
  '62012': 'GI-WHOLESALE',
  '62013': 'GI-SUB (VIBHAVADI)-CHATUCHAK-BANGKOK',
  '62014': 'GI-SUB (RATCHAPRUEK)-BANGKRUAI-NONTHABURI',
  '62015': 'GI-SUB (PIBULSONGKRAM)-MUEANG-NONTHABURI',
  '62016': 'GI-SUB (SALAYA)-SAMPHRAN-NAKHONPATHOM',
  '62017': 'GI-SUB (MAHACHAI)-MUEANG-SAMUTSAKHON',
  '62019': 'GI-SUB (AYUTTHAYA)',
  '62020': 'GI-CHIANGMAI-MUEANG-CHIANGMAI',
  '62021': 'GI-BANGNA TOWER-BANGPHLI-SAMUTPRAKAN',
  '62022': 'GI-LIAP KHLONG2-KHLONGSAMWA-BANGKOK',
  '62800': 'CAR RENTAL',
  '62900': 'GI WAREHOUSE',
  '62901': 'In-Transit',
  '62999': 'Head Office',
  '63001': 'EV7-HIRE PURCHASE',
  '63002': 'EV7-RENT(LINEMAN)',
  '63003': 'EV7-FINANCE LEASE (AOT)',
  '63004': 'EV7-RENT(TAXI)',
  WHAChecker: 'WHAChecker',
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
  return typeof value === 'string' ? value.trim() : '';
}

export function isValidWarehouseId(value: unknown): boolean {
  return D365_WAREHOUSE_ID_PATTERN.test(normalizeWarehouseId(value));
}

/** ดึงชื่อคลังสินค้าจากรหัสคลัง เช่น '62008' -> 'GI-SUB (KANCHANAPISEK)-BANGKHAE-BANGKOK' */
export function getD365WarehouseName(warehouseId?: string | null): string | null {
  if (!warehouseId) return null;
  const trimmed = warehouseId.trim();
  return D365_WAREHOUSE_NAMES[trimmed] ?? D365_WAREHOUSE_NAMES[trimmed.toUpperCase()] ?? null;
}

/** ดึงรหัสคลัง D365 (InventLocationId) จากรหัสสาขา เช่น GI02 -> 62010 */
export function getD365WarehouseForBranch(branchCode?: string | null): string | null {
  if (!branchCode) return null;
  const normalized = branchCode.trim().toUpperCase();
  return BRANCH_TO_D365_WAREHOUSE[normalized] ?? null;
}

/** รายการคลังหลักประจำสาขา (คลังหลักขึ้นก่อน) เช่น GI06 -> [63004, 63001, 63002, 63003], GI01 -> [62008] */
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
 * กรองและเรียงลำดับเฉพาะคลังที่เป็นของสาขานั้นจริงๆ (ไม่เอาคลังของสาขาอื่นมาปน)
 */
export function sortWarehouseOptionsForBranch(
  branchCode: string | null | undefined,
  items: Array<{ warehouseId: string; warehouseName: string; dataAreaId?: string }>
): D365WarehouseOption[] {
  const code = (branchCode || '').trim().toUpperCase();
  const branchWarehouses = new Set(getKnownWarehousesForBranch(code));
  const mainId = getD365WarehouseForBranch(code);

  const filtered = items.filter((item) => branchWarehouses.has(item.warehouseId.trim()));

  const mapped: D365WarehouseOption[] = filtered.map((item) => ({
    warehouseId: item.warehouseId.trim(),
    warehouseName:
      item.warehouseName?.trim() ||
      getD365WarehouseName(item.warehouseId) ||
      item.warehouseId.trim(),
    dataAreaId: (item.dataAreaId || code || 'GI').trim().toUpperCase(),
    isPrimary: true,
  }));

  return mapped.sort((a, b) => {
    if (a.warehouseId === mainId && b.warehouseId !== mainId) return -1;
    if (b.warehouseId === mainId && a.warehouseId !== mainId) return 1;
    return a.warehouseId.localeCompare(b.warehouseId);
  });
}

/**
 * รายการคลังประจำสาขาตั้งต้น (เฉพาะคลังของสาขานั้น)
 */
export function getFallbackWarehouseOptionsForBranch(branchCode?: string | null): D365WarehouseOption[] {
  if (!branchCode) return [];
  const code = branchCode.trim().toUpperCase();
  const ids = getKnownWarehousesForBranch(code);
  return sortWarehouseOptionsForBranch(
    code,
    ids.map((id) => ({
      warehouseId: id,
      warehouseName: getD365WarehouseName(id) || id,
      dataAreaId: code,
    }))
  );
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
