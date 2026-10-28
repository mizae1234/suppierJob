import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit-log';
import { d365FetchAll } from './client';
import type { D365InventOnHandRow, D365SiteOnHandRow } from './types';
import {
  buildProductNameMap,
  mapInventRowsToVehicles,
  D365_DEFAULT_VEHICLE_TYPE,
  type MapIssue,
  type MapResult,
  type MappedVehicle,
} from './vehicle-mapper';

/**
 * Sync รถในสต็อกจาก D365 (BPC_InventOnHand) → ตาราง Vehicle
 *
 * กติกา:
 * - VIN ใหม่ → สร้าง (source=D365, AVAILABLE)
 * - AVAILABLE → อัปเดตข้อมูล/สาขา
 * - OUT_OF_STOCK → กลับเป็น AVAILABLE (restocked)
 * - สถานะอื่น (IN_WASH / IN_TRANSIT) → ไม่แตะสถานะและสาขา อัปเดตเฉพาะฟิลด์ d365
 * - รถ source=D365 + AVAILABLE ที่ไม่อยู่ใน D365 รอบนี้ → OUT_OF_STOCK (มีเกราะกันพลาด)
 * - รถที่ถูกจองใน D365 ยังนับว่าอยู่ในสต็อก (ใช้ PhysicalInvent ไม่ใช่ AvailPhysical)
 */

export const VEHICLE_STATUS_OUT_OF_STOCK = 'OUT_OF_STOCK';

const LOCK_TIMEOUT_MS = 30 * 60_000;      // RUNNING เกิน 30 นาที ถือว่าค้าง
const WRITE_BATCH_SIZE = 200;             // จำนวน operation ต่อ transaction
const IN_CLAUSE_CHUNK = 1000;             // SQL Server จำกัด parameter ~2100 ต่อ query
const MIN_RATIO_VS_LAST_RUN = 0.5;        // ได้รถน้อยกว่า 50% ของรอบก่อน → ไม่ mark OUT_OF_STOCK
const MAX_STORED_ISSUES = 200;

export type SyncTrigger = 'SCHEDULED' | 'MANUAL';

export interface SyncOptions {
  trigger: SyncTrigger;
  user?: { id?: string; displayName?: string; username?: string; role?: string } | null;
}

export interface SyncSummary {
  runId: string | null;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED_LOCKED';
  fetched: number;
  created: number;
  updated: number;
  restocked: number;
  outOfStock: number;
  skipped: number;
  warnings: number;
  message: string;
  issues: MapIssue[];
}

export const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// ── Fetch ─────────────────────────────────────────────
export async function fetchD365InventoryRows() {
  const [inventRows, productRows] = await Promise.all([
    d365FetchAll<D365InventOnHandRow>('BPC_InventOnHand', {
      $filter: "ItemId eq 'GI-07*' and PhysicalInvent gt 0",
      $select: 'dataAreaId,ItemId,InventSerialId,InventSiteId,InventLocationId,PhysicalInvent,ReservPhysical',
      'cross-company': 'true',
    }),
    // ProductsV2 เป็น master สินค้าระดับ global (ไม่ต้อง cross-company) — เร็วกว่า
    // InventorySitesOnHandV2 มาก (อันนั้น cross-company แล้วค้างเกิน 3 นาที)
    d365FetchAll<{ ProductNumber: string; ProductName: string }>('ProductsV2', {
      $filter: "ProductNumber eq 'GI-07*'",
      $select: 'ProductNumber,ProductName',
    }),
  ]);
  const siteRows: D365SiteOnHandRow[] = productRows.map(p => ({
    ItemNumber: p.ProductNumber,
    ProductName: p.ProductName,
  }) as D365SiteOnHandRow);
  return { inventRows, siteRows };
}

/** ดึง + แมพ โดยไม่เขียน DB (ใช้กับ dry-run script) */
export async function previewD365VehicleSync(): Promise<{ fetched: number; result: MapResult }> {
  const { inventRows, siteRows } = await fetchD365InventoryRows();
  const branches = await prisma.branch.findMany({ select: { id: true, code: true, companyId: true } });
  const result = mapInventRowsToVehicles(inventRows, buildProductNameMap(siteRows), branches);
  return { fetched: inventRows.length, result };
}

// ── Lock ──────────────────────────────────────────────
async function acquireRunLock(trigger: SyncTrigger, triggeredBy: string | null): Promise<string | null> {
  const staleBefore = new Date(Date.now() - LOCK_TIMEOUT_MS);

  // ปิดรอบที่ค้างนานเกินไป (เช่น server restart ระหว่าง sync)
  await prisma.d365SyncRun.updateMany({
    where: { status: 'RUNNING', startedAt: { lt: staleBefore } },
    data: { status: 'FAILED', finishedAt: new Date(), errors: JSON.stringify([{ message: 'หมดเวลา (ค้างเกิน 30 นาที)' }]) },
  });

  // ตรวจ + สร้างรอบ RUNNING ในคำสั่งเดียว (atomic แม้รันหลาย instance):
  // UPDLOCK + HOLDLOCK ล็อกช่วงข้อมูลที่ตรวจไว้จนจบคำสั่ง → อีก instance ต้องรอ แล้วจะเห็นรอบนี้และไม่ insert ซ้ำ
  // เวลาใช้ SYSUTCDATETIME() ให้ตรงกับที่ Prisma เก็บ DateTime เป็น UTC
  const id = randomUUID();
  const staleSeconds = Math.round(LOCK_TIMEOUT_MS / 1000);
  let inserted: number;
  try {
    inserted = await prisma.$executeRaw`
      INSERT INTO [dbo].[D365SyncRun] ([id], [trigger], [triggeredBy], [status], [startedAt])
      SELECT ${id}, ${trigger}, ${triggeredBy}, 'RUNNING', SYSUTCDATETIME()
      WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[D365SyncRun] WITH (UPDLOCK, HOLDLOCK)
        WHERE [status] = 'RUNNING' AND [startedAt] >= DATEADD(SECOND, -CAST(${staleSeconds} AS INT), SYSUTCDATETIME())
      )`;
  } catch (err: unknown) {
    // ชนกับอีก instance จน SQL Server เลือกเป็น deadlock victim → ถือว่ามีรอบอื่นกำลังรัน
    if (err instanceof Error && /deadlock/i.test(err.message)) return null;
    throw err;
  }
  return inserted > 0 ? id : null;
}

// ── Main ──────────────────────────────────────────────
export async function runD365VehicleSync(options: SyncOptions): Promise<SyncSummary> {
  const triggeredBy = options.user ? options.user.displayName || options.user.username || null : null;
  const runId = await acquireRunLock(options.trigger, triggeredBy);

  if (!runId) {
    return {
      runId: null, status: 'SKIPPED_LOCKED', fetched: 0, created: 0, updated: 0,
      restocked: 0, outOfStock: 0, skipped: 0, warnings: 0, issues: [],
      message: 'มีการ Sync กำลังทำงานอยู่ ข้ามรอบนี้',
    };
  }

  const counts = { fetched: 0, created: 0, updated: 0, restocked: 0, outOfStock: 0, skipped: 0 };
  const issues: MapIssue[] = [];
  let status: SyncSummary['status'] = 'SUCCESS';
  let message = '';
  let warningsCount = 0;

  try {
    // 1) ดึงข้อมูลจาก D365 (ถ้าพังตรงนี้ จะไม่มีการเขียน DB เลย)
    const { inventRows, siteRows } = await fetchD365InventoryRows();
    counts.fetched = inventRows.length;

    // 2) แมพข้อมูล
    const branches = await prisma.branch.findMany({ select: { id: true, code: true, companyId: true } });
    const mapped = mapInventRowsToVehicles(inventRows, buildProductNameMap(siteRows), branches);
    counts.skipped = mapped.skipped.length;
    warningsCount = mapped.warnings.length;
    issues.push(...mapped.skipped, ...mapped.warnings);

    // 3) Upsert
    const upsert = await upsertVehicles(mapped.vehicles);
    counts.created = upsert.created;
    counts.updated = upsert.updated;
    counts.restocked = upsert.restocked;

    // 4) Mark OUT_OF_STOCK (มีเกราะกันพลาด)
    const guard = await checkOutOfStockGuard(inventRows.length, runId);
    if (guard.ok) {
      counts.outOfStock = await markOutOfStock(mapped.seenVins);
      message = `Sync สำเร็จ: ใหม่ ${counts.created}, อัปเดต ${counts.updated}, กลับเข้าสต็อก ${counts.restocked}, หมดสต็อก ${counts.outOfStock}, ข้าม ${counts.skipped}`;
    } else {
      status = 'PARTIAL';
      issues.unshift({ message: guard.reason });
      message = `Sync บางส่วน: ${guard.reason}`;
    }
  } catch (err: unknown) {
    status = 'FAILED';
    message = err instanceof Error ? err.message : String(err);
    issues.unshift({ message });
    console.error('[D365 Sync] failed:', err);
  }

  await prisma.d365SyncRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
      ...counts,
      errors: issues.length ? JSON.stringify(issues.slice(0, MAX_STORED_ISSUES)) : null,
    },
  });

  logAudit({
    userId: options.user?.id ?? null,
    userName: triggeredBy ?? 'SYSTEM (D365 Scheduler)',
    userRole: options.user?.role ?? 'SYSTEM',
    action: 'SYNC_D365_VEHICLES',
    entityType: 'D365SyncRun',
    entityId: runId,
    description: message,
    metadata: { trigger: options.trigger, status, ...counts, warnings: warningsCount },
  });

  return { runId, status, ...counts, warnings: warningsCount, message, issues: issues.slice(0, MAX_STORED_ISSUES) };
}

// ── Upsert ────────────────────────────────────────────
/** ฟิลด์ของรถใน DB ที่ sync เขียนทับได้ (ใช้เทียบว่ามีอะไรเปลี่ยนจริงไหม) */
export interface SyncComparableVehicle {
  status: string;
  model: string;
  color: string;
  companyId: string;
  currentBranchId: string;
  source: string;
  d365ItemId: string | null;
  d365SiteId: string | null;
  d365WarehouseId: string | null;
  d365Reserved: boolean;
}

/** ข้อมูลที่ sync จะเขียนลงรถคันที่มีอยู่แล้ว (ไม่รวม lastSyncedAt) — กติกาเดียวกับเดิม */
export function buildSyncUpdateData(current: Pick<SyncComparableVehicle, 'status'>, v: MappedVehicle) {
  const d365Fields = {
    source: 'D365',
    d365ItemId: v.d365ItemId,
    d365SiteId: v.d365SiteId,
    d365WarehouseId: v.d365WarehouseId,
    d365Reserved: v.d365Reserved,
  };
  // ไม่เขียนทับชื่อรุ่น/สีที่ดีอยู่แล้วด้วยรหัสสินค้า กรณีหา ProductName ไม่เจอ
  const nameFields = v.nameResolved ? { model: v.model, color: v.color } : {};

  if (current.status === VEHICLE_STATUS_OUT_OF_STOCK) {
    return {
      ...nameFields, ...d365Fields,
      status: 'AVAILABLE', outOfStockAt: null,
      companyId: v.companyId, currentBranchId: v.currentBranchId,
    };
  }
  if (current.status === 'AVAILABLE') {
    return { ...nameFields, ...d365Fields, companyId: v.companyId, currentBranchId: v.currentBranchId };
  }
  // IN_WASH / IN_TRANSIT ฯลฯ — ระบบเราเป็นตัวหลัก ไม่แตะสถานะและสาขา
  return { ...nameFields, ...d365Fields };
}

/** true = มีอย่างน้อย 1 ฟิลด์ที่ต่างจากค่าใน DB (ต้อง UPDATE จริง) */
export function hasSyncChanges(current: object, data: object): boolean {
  const currentValues = current as Record<string, unknown>;
  return Object.entries(data).some(([key, value]) => {
    const before = currentValues[key] ?? null;
    const after = value ?? null;
    if (before instanceof Date || after instanceof Date) {
      return !(before instanceof Date && after instanceof Date && before.getTime() === after.getTime());
    }
    return before !== after;
  });
}

async function upsertVehicles(vehicles: MappedVehicle[]) {
  const result = { created: 0, updated: 0, restocked: 0 };
  if (vehicles.length === 0) return result;

  // SQL Server เทียบ VIN แบบไม่สนตัวพิมพ์ → ใช้ key แบบ upper-case
  const existing = new Map<string, SyncComparableVehicle>();
  for (const vins of chunk(vehicles.map(v => v.vin), IN_CLAUSE_CHUNK)) {
    const rows = await prisma.vehicle.findMany({
      where: { vin: { in: vins } },
      select: {
        vin: true, status: true, model: true, color: true, companyId: true, currentBranchId: true,
        source: true, d365ItemId: true, d365SiteId: true, d365WarehouseId: true, d365Reserved: true,
      },
    });
    rows.forEach(r => existing.set(r.vin.toUpperCase(), r));
  }

  const now = new Date();
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  const unchangedVins: string[] = []; // ข้อมูลเหมือนเดิม → อัปเดตแค่ lastSyncedAt แบบ bulk

  for (const v of vehicles) {
    const current = existing.get(v.vin.toUpperCase());
    if (!current) {
      result.created++;
      ops.push(prisma.vehicle.create({
        data: {
          vin: v.vin,
          model: v.model,
          color: v.color,
          vehicleType: D365_DEFAULT_VEHICLE_TYPE,
          status: 'AVAILABLE',
          companyId: v.companyId,
          currentBranchId: v.currentBranchId,
          source: 'D365',
          d365ItemId: v.d365ItemId,
          d365SiteId: v.d365SiteId,
          d365WarehouseId: v.d365WarehouseId,
          d365Reserved: v.d365Reserved,
          lastSyncedAt: now,
        },
      }));
      continue;
    }

    if (current.status === VEHICLE_STATUS_OUT_OF_STOCK) result.restocked++;
    else result.updated++;

    const data = buildSyncUpdateData(current, v);
    if (current.status !== VEHICLE_STATUS_OUT_OF_STOCK && !hasSyncChanges(current, data)) {
      unchangedVins.push(v.vin);
      continue;
    }
    ops.push(prisma.vehicle.update({ where: { vin: v.vin }, data: { ...data, lastSyncedAt: now } }));
  }

  for (const batch of chunk(ops, WRITE_BATCH_SIZE)) {
    await prisma.$transaction(batch);
  }
  for (const vins of chunk(unchangedVins, IN_CLAUSE_CHUNK)) {
    await prisma.vehicle.updateMany({ where: { vin: { in: vins } }, data: { lastSyncedAt: now } });
  }
  return result;
}

// ── OUT_OF_STOCK ──────────────────────────────────────
async function checkOutOfStockGuard(fetchedNow: number, currentRunId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (fetchedNow === 0) {
    return { ok: false, reason: 'D365 คืนข้อมูล 0 คัน — ไม่ mark หมดสต็อกเพื่อความปลอดภัย' };
  }
  const lastSuccess = await prisma.d365SyncRun.findFirst({
    where: { status: 'SUCCESS', id: { not: currentRunId } },
    orderBy: { startedAt: 'desc' },
    select: { fetched: true },
  });
  if (lastSuccess && lastSuccess.fetched > 0 && fetchedNow < lastSuccess.fetched * MIN_RATIO_VS_LAST_RUN) {
    return {
      ok: false,
      reason: `จำนวนรถจาก D365 ลดลงผิดปกติ (${fetchedNow} จาก ${lastSuccess.fetched} รอบก่อน) — ไม่ mark หมดสต็อก`,
    };
  }
  return { ok: true };
}

async function markOutOfStock(seenVins: Set<string>): Promise<number> {
  const candidates = await prisma.vehicle.findMany({
    where: { source: 'D365', status: 'AVAILABLE' },
    select: { vin: true },
  });
  const missing = candidates.map(c => c.vin).filter(vin => !seenVins.has(vin.toUpperCase()));
  if (missing.length === 0) return 0;

  const now = new Date();
  let total = 0;
  for (const vins of chunk(missing, IN_CLAUSE_CHUNK)) {
    const res = await prisma.vehicle.updateMany({
      // เช็ก status ซ้ำ เผื่อรถถูกสั่งงานระหว่าง sync
      where: { vin: { in: vins }, source: 'D365', status: 'AVAILABLE' },
      data: { status: VEHICLE_STATUS_OUT_OF_STOCK, outOfStockAt: now },
    });
    total += res.count;
  }
  return total;
}
