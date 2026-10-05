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
}

/**
 * Returns a map of VIN → the unfinished job holding that car.
 * Pass `vins` to check specific cars; omit to scan all active jobs.
 */
export async function getActiveJobsByVin(vins?: string[]): Promise<Map<string, ActiveJobRef>> {
  const result = new Map<string, ActiveJobRef>();
  if (vins && vins.length === 0) return result;

  const items = await prisma.carWashItem.findMany({
    where: {
      ...(vins ? { vin: { in: vins } } : {}),
      status: { in: ACTIVE_ITEM_STATUSES },
      job: { status: { notIn: CLOSED_JOB_STATUSES } },
    },
    select: { vin: true, job: { select: { id: true, jobNumber: true, jobType: true } } },
  });
  for (const it of items) {
    if (!result.has(it.vin)) {
      result.set(it.vin, { jobId: it.job.id, jobNumber: it.job.jobNumber, jobType: it.job.jobType });
    }
  }

  // Legacy single-car slide jobs that only stored Job.vin (no per-car items)
  const legacy = await prisma.job.findMany({
    where: {
      jobType: 'VEHICLE_SLIDE',
      vin: vins ? { in: vins } : { not: null },
      status: { notIn: CLOSED_JOB_STATUSES },
      carWashItems: { none: {} },
    },
    select: { id: true, jobNumber: true, jobType: true, vin: true },
  });
  for (const j of legacy) {
    if (j.vin && !result.has(j.vin)) {
      result.set(j.vin, { jobId: j.id, jobNumber: j.jobNumber, jobType: j.jobType });
    }
  }

  return result;
}
