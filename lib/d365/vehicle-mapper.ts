import type { D365InventOnHandRow, D365SiteOnHandRow } from './types';

/**
 * แปลงข้อมูลจาก D365 → รูปแบบ Vehicle ของระบบเรา (pure functions ไม่แตะ DB)
 */

export const D365_DEFAULT_VEHICLE_TYPE = 'ไม่ระบุ';
export const D365_DEFAULT_COLOR = 'ไม่ระบุ';

export interface BranchRef {
  id: string;
  code: string;
  companyId: string;
}

export interface MappedVehicle {
  vin: string;
  model: string;
  color: string;
  companyId: string;
  currentBranchId: string;
  d365ItemId: string;
  d365SiteId: string;
  d365WarehouseId: string | null;
  d365Reserved: boolean;
  nameResolved: boolean; // false = หา ProductName ไม่เจอ (model = ItemId)
}

export interface MapIssue {
  vin?: string;
  itemId?: string;
  siteId?: string;
  message: string;
}

export interface MapResult {
  vehicles: MappedVehicle[];
  skipped: MapIssue[];   // แถวที่ข้าม (นับเป็น skipped)
  warnings: MapIssue[];  // ใช้ได้แต่มีข้อสังเกต
  /** VIN ทุกคันที่พบใน D365 (รวมคันที่ถูกข้าม) — ใช้กันไม่ให้ถูก mark OUT_OF_STOCK ผิดๆ */
  seenVins: Set<string>;
}

/**
 * แยก ProductName เป็นรุ่น/สี
 * รูปแบบ D365: "<รุ่น>-<สีภายนอก>-<สีภายใน>" เช่น "AION UT 420 STANDARD-Rococo White-Berlin Beige"
 * ตัดจากขวา เพราะชื่อรุ่นอาจมี '-' อยู่ข้างใน
 */
export function parseProductName(productName: string | null | undefined): { model: string; color: string } | null {
  const raw = (productName || '').trim();
  if (!raw) return null;

  const parts = raw.split('-').map(p => p.trim());
  if (parts.length >= 3) {
    const model = parts.slice(0, -2).join('-').trim();
    const color = parts[parts.length - 2];
    if (model) return { model, color: color || D365_DEFAULT_COLOR };
  }
  if (parts.length === 2 && parts[0]) {
    return { model: parts[0], color: parts[1] || D365_DEFAULT_COLOR };
  }

  // รูปแบบเก่าที่คั่นด้วย comma เช่น "AION V 602 LUXURY,Space Black,Midnight Black"
  const commaParts = raw.split(',').map(p => p.trim());
  if (commaParts.length >= 2 && commaParts[0]) {
    return { model: commaParts[0], color: commaParts[1] || D365_DEFAULT_COLOR };
  }

  return { model: raw, color: D365_DEFAULT_COLOR };
}

/** สร้าง Map ItemNumber(ตัวพิมพ์ใหญ่) → ProductName */
export function buildProductNameMap(rows: D365SiteOnHandRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const key = row.ItemNumber?.trim().toUpperCase();
    const name = row.ProductName?.trim();
    if (key && name && !map.has(key)) map.set(key, name);
  }
  return map;
}

export function mapInventRowsToVehicles(
  rows: D365InventOnHandRow[],
  productNames: Map<string, string>,
  branches: BranchRef[],
): MapResult {
  const branchByCode = new Map(branches.map(b => [b.code.trim().toUpperCase(), b]));
  const vehicles = new Map<string, MappedVehicle>();
  const skipped: MapIssue[] = [];
  const warnings: MapIssue[] = [];
  const missingNameItems = new Set<string>();
  const seenVins = new Set<string>();

  for (const row of rows) {
    const vin = (row.InventSerialId || '').trim().toUpperCase();
    const itemId = (row.ItemId || '').trim().toUpperCase();
    const siteId = (row.InventSiteId || '').trim().toUpperCase();

    if (!vin) {
      skipped.push({ itemId, siteId, message: 'ไม่มีเลข Serial/VIN' });
      continue;
    }
    if (!(Number(row.PhysicalInvent) > 0)) {
      skipped.push({ vin, itemId, siteId, message: 'ไม่มีรถอยู่ในคลัง (PhysicalInvent = 0)' });
      continue;
    }
    seenVins.add(vin);

    const branch = branchByCode.get(siteId);
    if (!branch) {
      skipped.push({ vin, itemId, siteId, message: `ไม่พบสาขารหัส "${siteId}" ในระบบ` });
      continue;
    }

    if (vehicles.has(vin)) {
      warnings.push({ vin, itemId, siteId, message: 'VIN ซ้ำหลายแถวใน D365 — ใช้แถวแรก' });
      continue;
    }

    const parsed = parseProductName(productNames.get(itemId));
    if (!parsed) missingNameItems.add(itemId);

    vehicles.set(vin, {
      vin,
      model: parsed?.model || itemId,
      color: parsed?.color || D365_DEFAULT_COLOR,
      companyId: branch.companyId,
      currentBranchId: branch.id,
      d365ItemId: itemId,
      d365SiteId: siteId,
      d365WarehouseId: row.InventLocationId?.trim() || null,
      d365Reserved: Number(row.ReservPhysical) > 0,
      nameResolved: Boolean(parsed),
    });
  }

  for (const itemId of missingNameItems) {
    warnings.push({ itemId, message: 'ไม่พบ ProductName — ใช้รหัสสินค้าเป็นชื่อรุ่นแทน' });
  }

  return { vehicles: [...vehicles.values()], skipped, warnings, seenVins };
}
