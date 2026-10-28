import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * "Active" = a car still has unfinished work and must not be ordered again.
 *
 * Per car (CarWashItem):
 *   PENDING   → supplier hasn't finished          → active
 *   COMPLETED → submitted, waiting branch review   → active
 *   REJECTED  → branch sent back for rework        → active
 *   APPROVED  → branch accepted                    → done
 *   CANCELLED → supplier declined this car         → done
 * Whole job APPROVED / INVOICED / CANCELLED          → done
 */
export const ACTIVE_ITEM_STATUSES = ['PENDING', 'COMPLETED', 'REJECTED'];
export const CLOSED_JOB_STATUSES = ['APPROVED', 'INVOICED', 'CANCELLED'];

export interface ActiveJobRef {
  jobId: string;
  jobNumber: string;
  jobType: string;
  itemId?: string;
  verifiedAt?: string | null;
  canCancel?: boolean;
}

/**
 * SQL Server จำกัด parameter ~2100 ต่อ query → แบ่ง VIN เป็นก้อนละไม่เกินค่านี้
 */
const VIN_CHUNK_SIZE = 1000;

/** prisma ตัวหลัก หรือ transaction client (ใช้ตรวจซ้ำภายใน transaction ตอนสร้างงาน) */
type ActiveJobsClient = Pick<Prisma.TransactionClient, 'carWashItem' | 'job'>;

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Returns a map of VIN → the unfinished job holding that car.
 * Pass `vins` to check specific cars; omit to scan all active jobs.
 */
export async function getActiveJobsByVin(
  vins?: string[],
  client: ActiveJobsClient = prisma
): Promise<Map<string, ActiveJobRef>> {
  const result = new Map<string, ActiveJobRef>();
  if (vins && vins.length === 0) return result;

  // undefined = ไม่กรอง VIN (สแกนงานค้างทั้งหมด) ; มี VIN → แบ่งก้อนกันเกินเพดาน parameter
  const vinChunks: (string[] | undefined)[] = vins ? chunkArray(vins, VIN_CHUNK_SIZE) : [undefined];

  const findItems = (chunk?: string[]) => client.carWashItem.findMany({
    where: {
      ...(chunk ? { vin: { in: chunk } } : {}),
      status: { in: ACTIVE_ITEM_STATUSES },
      job: { status: { notIn: CLOSED_JOB_STATUSES } },
    },
    select: { 
      id: true,
      vin: true, 
      verifiedAt: true,
      job: { select: { id: true, jobNumber: true, jobType: true, verifiedAt: true } } 
    },
  });
  // Legacy single-car slide jobs that only stored Job.vin (no per-car items)
  const findLegacy = (chunk?: string[]) => client.job.findMany({
    where: {
      jobType: 'VEHICLE_SLIDE',
      vin: chunk ? { in: chunk } : { not: null },
      status: { notIn: CLOSED_JOB_STATUSES },
      carWashItems: { none: {} },
    },
    select: { id: true, jobNumber: true, jobType: true, vin: true, verifiedAt: true },
  });

  let items: Awaited<ReturnType<typeof findItems>> = [];
  let legacy: Awaited<ReturnType<typeof findLegacy>> = [];
  if (client === prisma) {
    const [itemChunks, legacyChunks] = await Promise.all([
      Promise.all(vinChunks.map(findItems)),
      Promise.all(vinChunks.map(findLegacy)),
    ]);
    items = itemChunks.flat();
    legacy = legacyChunks.flat();
  } else {
    // ภายใน interactive transaction ใช้ connection เดียว → รันทีละ query
    for (const chunk of vinChunks) items.push(...await findItems(chunk));
    for (const chunk of vinChunks) legacy.push(...await findLegacy(chunk));
  }

  for (const it of items) {
    if (!result.has(it.vin)) {
      const isVerified = Boolean(it.verifiedAt || it.job.verifiedAt);
      result.set(it.vin, { 
        jobId: it.job.id, 
        jobNumber: it.job.jobNumber, 
        jobType: it.job.jobType,
        itemId: it.id,
        verifiedAt: it.verifiedAt ? it.verifiedAt.toISOString() : null,
        canCancel: !isVerified,
      });
    }
  }

  for (const j of legacy) {
    if (j.vin && !result.has(j.vin)) {
      const isVerified = Boolean(j.verifiedAt);
      result.set(j.vin, { 
        jobId: j.id, 
        jobNumber: j.jobNumber, 
        jobType: j.jobType,
        verifiedAt: j.verifiedAt ? j.verifiedAt.toISOString() : null,
        canCancel: !isVerified,
      });
    }
  }

  return result;
}
