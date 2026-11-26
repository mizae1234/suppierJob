import { prisma } from '@/lib/prisma';
import { d365FetchAll, isD365Configured } from './client';
import { getD365WarehouseForBranch } from './warehouses';

export interface RawD365Warehouse {
  WarehouseId?: string | null;
  WarehouseName?: string | null;
  dataAreaId?: string | null;
}

export interface NormalizedD365WarehouseRow {
  warehouseId: string;
  warehouseName: string;
  dataAreaId: string;
}

export interface SyncD365WarehousesSummary {
  companiesSynced: string[];
  fetched: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: Array<{ company: string; message: string }>;
}

/**
 * แปลงและคัดกรองข้อมูลดิบจาก D365 OData `/data/Warehouses`
 */
export function normalizeD365WarehouseRows(
  rows: RawD365Warehouse[],
  fallbackDataAreaId?: string
): NormalizedD365WarehouseRow[] {
  const deduped = new Map<string, NormalizedD365WarehouseRow>();
  const fallbackCode = (fallbackDataAreaId || '').trim().toUpperCase();

  for (const row of rows) {
    const warehouseId = (row.WarehouseId || '').trim();
    const dataAreaId = ((row.dataAreaId || fallbackCode) || '').trim().toUpperCase();
    if (!warehouseId || !dataAreaId) continue;

    const warehouseName = (row.WarehouseName || '').trim() || warehouseId;
    deduped.set(`${dataAreaId}::${warehouseId}`, {
      warehouseId,
      warehouseName,
      dataAreaId,
    });
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const areaCmp = a.dataAreaId.localeCompare(b.dataAreaId, 'en', { numeric: true });
    if (areaCmp !== 0) return areaCmp;
    return a.warehouseId.localeCompare(b.warehouseId, 'en', { numeric: true });
  });
}

/**
 * ดึงข้อมูลคลังสินค้าจาก D365 OData `/data/Warehouses` สำหรับ 1 บริษัทหรือหลายบริษัทพร้อมกัน
 * Spec: GET /data/Warehouses?$filter=dataAreaId eq 'GI01'&$select=WarehouseId,WarehouseName,dataAreaId&cross-company=true
 */
export async function fetchD365WarehousesByCompanies(
  companyCodes: string[]
): Promise<NormalizedD365WarehouseRow[]> {
  const safeCompanies = Array.from(
    new Set(
      companyCodes
        .map((c) => c.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
        .filter(Boolean)
    )
  );
  if (safeCompanies.length === 0) return [];

  const filterExpr = safeCompanies
    .map((code) => `dataAreaId eq '${code.toLowerCase()}'`)
    .join(' or ');

  const rows = await d365FetchAll<RawD365Warehouse>('Warehouses', {
    $filter: filterExpr,
    $select: 'WarehouseId,WarehouseName,dataAreaId',
    'cross-company': 'true',
  });

  return normalizeD365WarehouseRows(
    rows,
    safeCompanies.length === 1 ? safeCompanies[0] : undefined
  );
}

export async function fetchD365WarehousesByCompany(
  companyCode: string
): Promise<NormalizedD365WarehouseRow[]> {
  return fetchD365WarehousesByCompanies([companyCode]);
}

/**
 * ซิงค์ตาราง Master `D365Warehouse` จาก D365 F&O
 * - ถ้าระบุ `company` (เช่น 'GI01'): ซิงค์เฉพาะ Legal Entity นั้น
 * - ถ้าไม่ระบุ `company`: ซิงค์ทุกสาขา (Branch.code) ที่มีในระบบภายใน 1 OData request (cross-company=true)
 */
export async function syncD365Warehouses(options?: {
  company?: string | null;
}): Promise<SyncD365WarehousesSummary> {
  if (!isD365Configured()) {
    throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อ D365 (D365_TENANT_ID / CLIENT_ID / CLIENT_SECRET / BASE_URL)');
  }

  const branches = await prisma.branch.findMany({
    select: { id: true, code: true },
    orderBy: { code: 'asc' },
  });
  const branchIdByCode = new Map<string, string>();
  for (const b of branches) {
    branchIdByCode.set(b.code.trim().toUpperCase(), b.id);
  }

  const requestedCompany = options?.company?.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || '';
  const targetCompanies = requestedCompany
    ? [requestedCompany]
    : Array.from(branchIdByCode.keys()).sort((a, b) =>
        a.localeCompare(b, 'en', { numeric: true })
      );

  const summary: SyncD365WarehousesSummary = {
    companiesSynced: [],
    fetched: 0,
    created: 0,
    updated: 0,
    deactivated: 0,
    errors: [],
  };

  if (targetCompanies.length === 0) return summary;

  // ดึงข้อมูลจาก D365 ในครั้งเดียวสำหรับทุกบริษัทที่ต้องการ (ลด round-trip จาก 13 เหลือ 1)
  let allFetchedRows: NormalizedD365WarehouseRow[] = [];
  try {
    allFetchedRows = await fetchD365WarehousesByCompanies(targetCompanies);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[D365 Warehouse Sync] Failed to fetch from D365:', err);
    summary.errors.push({ company: requestedCompany || 'ALL', message });
    return summary;
  }

  const rowsByCompany = new Map<string, NormalizedD365WarehouseRow[]>();
  for (const row of allFetchedRows) {
    const list = rowsByCompany.get(row.dataAreaId) ?? [];
    list.push(row);
    rowsByCompany.set(row.dataAreaId, list);
  }

  summary.fetched = allFetchedRows.length;
  const now = new Date();

  const existingAll = await prisma.d365Warehouse.findMany({
    where: { dataAreaId: { in: targetCompanies } },
    select: {
      id: true,
      dataAreaId: true,
      warehouseId: true,
      warehouseName: true,
      branchId: true,
      isPrimary: true,
      isActive: true,
    },
  });
  const existingByKey = new Map(existingAll.map((r) => [`${r.dataAreaId}::${r.warehouseId}`, r]));

  const toCreate: Array<{
    warehouseId: string;
    warehouseName: string;
    dataAreaId: string;
    branchId: string | null;
    isPrimary: boolean;
    isActive: boolean;
    lastSyncedAt: Date;
  }> = [];
  const toUpdateChanged: Array<{
    id: string;
    warehouseName: string;
    branchId: string | null;
    isPrimary: boolean;
  }> = [];
  const unchangedIds: string[] = [];
  const deactivateIds: string[] = [];

  for (const companyCode of targetCompanies) {
    const normalized = rowsByCompany.get(companyCode) ?? [];
    summary.companiesSynced.push(companyCode);

    const branchId = branchIdByCode.get(companyCode) ?? null;
    const primaryWarehouseId = getD365WarehouseForBranch(companyCode);
    const seenWhIds = new Set<string>();

    for (const row of normalized) {
      seenWhIds.add(row.warehouseId);
      const isPrimary = primaryWarehouseId === row.warehouseId;
      const existing = existingByKey.get(`${row.dataAreaId}::${row.warehouseId}`);

      if (!existing) {
        toCreate.push({
          warehouseId: row.warehouseId,
          warehouseName: row.warehouseName,
          dataAreaId: row.dataAreaId,
          branchId,
          isPrimary,
          isActive: true,
          lastSyncedAt: now,
        });
      } else if (
        existing.warehouseName !== row.warehouseName ||
        existing.branchId !== branchId ||
        existing.isPrimary !== isPrimary ||
        !existing.isActive
      ) {
        toUpdateChanged.push({
          id: existing.id,
          warehouseName: row.warehouseName,
          branchId,
          isPrimary,
        });
      } else {
        unchangedIds.push(existing.id);
      }
    }

    // Soft-deactivate คลังที่หายไปจาก D365 ในรอบ sync ล่าสุด (เฉพาะบริษัทที่ D365 คืนข้อมูลอย่างน้อย 1 แถว)
    if (normalized.length > 0) {
      for (const existing of existingAll) {
        if (existing.dataAreaId === companyCode && existing.isActive && !seenWhIds.has(existing.warehouseId)) {
          deactivateIds.push(existing.id);
        }
      }
    }
  }

  // Batch insert แถวใหม่ทั้งหมดทีเดียว (ลด SQL round-trip)
  if (toCreate.length > 0) {
    const CHUNK = 100;
    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const created = await prisma.d365Warehouse.createMany({
        data: toCreate.slice(i, i + CHUNK),
      });
      summary.created += created.count;
    }
  }

  // อัปเดตเฉพาะแถวที่ค่าเปลี่ยนจริง
  for (const item of toUpdateChanged) {
    await prisma.d365Warehouse.update({
      where: { id: item.id },
      data: {
        warehouseName: item.warehouseName,
        branchId: item.branchId,
        isPrimary: item.isPrimary,
        isActive: true,
        lastSyncedAt: now,
      },
    });
    summary.updated++;
  }

  // ขยับ lastSyncedAt ให้แถวที่ข้อมูลเหมือนเดิมในคำสั่งเดียว
  if (unchangedIds.length > 0) {
    const touched = await prisma.d365Warehouse.updateMany({
      where: { id: { in: unchangedIds } },
      data: { lastSyncedAt: now },
    });
    summary.updated += touched.count;
  }

  if (deactivateIds.length > 0) {
    const deactivated = await prisma.d365Warehouse.updateMany({
      where: { id: { in: deactivateIds } },
      data: { isActive: false, updatedAt: now },
    });
    summary.deactivated = deactivated.count;
  }

  return summary;
}
