import type { Prisma } from '@prisma/client';
import { resolveJobDestWarehouse } from '@/lib/d365/warehouses';
import { recordVehicleSlideLog, getSlideRouteLabels } from '@/lib/vehicle-slide-log';

export interface SlideJobForMovement {
  id: string;
  jobNumber: string;
  jobType: string;
  vin: string | null;
  pickupBranchId: string | null;
  destBranchId: string | null;
  destWarehouseId: string | null;
  customOriginAddress: string | null;
  customOriginLat: number | null;
  customOriginLng: number | null;
  customDestAddress: string | null;
  customDestLat: number | null;
  customDestLng: number | null;
  supplierId: string;
  pickupBranch?: { code?: string; name?: string; address?: string | null } | null;
  destBranch?: { code?: string; name?: string; address?: string | null } | null;
  supplier?: { name?: string } | null;
}

/**
 * บันทึก snapshot ของคลังต้นทาง (Vehicle.d365WarehouseId) ลงใน CarWashItem.fromWarehouseId
 * ต้องเรียกก่อนมีการแก้ Vehicle.d365WarehouseId เสมอ และจะเขียนเฉพาะรายการที่ fromWarehouseId ยังเป็น null
 * คืนค่าแผนที่ vin -> fromWarehouseId (สำหรับใบงานเดี่ยวที่ไม่มี carWashItems ด้วย)
 */
export async function snapshotFromWarehousesInTx(
  tx: Prisma.TransactionClient,
  params: {
    items: Array<{ id: string; vin: string; fromWarehouseId?: string | null }>;
    extraVins?: string[];
  }
): Promise<Record<string, string | null | undefined>> {
  const preTransferWarehouses: Record<string, string | null | undefined> = {};
  const allVins = Array.from(
    new Set([
      ...params.items.map((i) => i.vin).filter(Boolean),
      ...(params.extraVins || []).filter(Boolean),
    ])
  );
  if (allVins.length === 0) return preTransferWarehouses;

  const vehicles = await tx.vehicle.findMany({
    where: { vin: { in: allVins } },
    select: { vin: true, d365WarehouseId: true },
  });
  const whByVin = new Map<string, string | null>(
    vehicles.map((v) => [v.vin.toUpperCase(), v.d365WarehouseId ?? null])
  );

  for (const v of vehicles) {
    preTransferWarehouses[v.vin] = v.d365WarehouseId;
  }

  for (const item of params.items) {
    if (item.fromWarehouseId) {
      // คงค่า snapshot เดิมไว้เสมอ (ห้ามทับหลังรถถูกย้ายคลังไปแล้ว)
      preTransferWarehouses[item.vin] = item.fromWarehouseId;
      continue;
    }
    const currentWh = whByVin.get(item.vin.toUpperCase()) ?? null;
    if (currentWh) {
      await tx.carWashItem.updateMany({
        where: { id: item.id, fromWarehouseId: null },
        data: { fromWarehouseId: currentWh },
      });
      preTransferWarehouses[item.vin] = currentWh;
    }
  }

  return preTransferWarehouses;
}

/**
 * อัปเดตสถานะและที่จอดปัจจุบันของรถเมื่ออนุมัติ (ภายใน transaction)
 * - กฎสำคัญ: อัปเดตเฉพาะ status / currentBranchId / d365WarehouseId โดยไม่แตะ d365SiteId (สาขาเจ้าของรถ Original)
 * - กรณีเที่ยวเปล่า (isFailedAttempt): ปลดล็อกเป็น AVAILABLE อย่างเดียว ไม่ย้ายสาขาหรือคลัง
 */
export async function moveVehiclesOnApprovalInTx(
  tx: Prisma.TransactionClient,
  job: Pick<SlideJobForMovement, 'jobType' | 'destBranchId' | 'destWarehouseId' | 'destBranch'>,
  vins: string[],
  isFailedAttempt: boolean
): Promise<void> {
  const uniqueVins = Array.from(new Set(vins.filter(Boolean)));
  if (uniqueVins.length === 0) return;

  if (job.jobType === 'VEHICLE_SLIDE' && !isFailedAttempt) {
    const destWarehouse = resolveJobDestWarehouse(job);
    await tx.vehicle.updateMany({
      where: { vin: { in: uniqueVins } },
      data: {
        status: 'AVAILABLE',
        ...(job.destBranchId ? { currentBranchId: job.destBranchId } : {}),
        ...(destWarehouse ? { d365WarehouseId: destWarehouse } : {}),
      },
    });
    return;
  }

  await tx.vehicle.updateMany({
    where: { vin: { in: uniqueVins } },
    data: { status: 'AVAILABLE' },
  });
}

/**
 * ปลดล็อกรถกลับเป็น AVAILABLE เมื่อยกเลิกงาน/รายการรถ
 */
export async function releaseVehiclesInTx(
  tx: Prisma.TransactionClient,
  vins: string[]
): Promise<void> {
  const uniqueVins = Array.from(new Set(vins.filter(Boolean)));
  if (uniqueVins.length === 0) return;

  await tx.vehicle.updateMany({
    where: { vin: { in: uniqueVins } },
    data: { status: 'AVAILABLE' },
  });
}

/**
 * บันทึก VehicleSlideLog สำหรับงานสไลด์ (ใช้ร่วมกันระหว่าง status route และ item status route)
 */
export function recordJobSlideMovementLog(
  job: SlideJobForMovement,
  params: {
    vins: string[];
    action: 'IN_TRANSIT' | 'DELIVERED' | 'APPROVED' | 'CANCELLED' | 'FAILED_ATTEMPT_APPROVED';
    actorId: string;
    actorName: string;
    actorRole: string;
    remarks?: string | null;
  }
): void {
  if (job.jobType !== 'VEHICLE_SLIDE' || params.vins.length === 0) return;
  const { originName, destName } = getSlideRouteLabels(job);
  void recordVehicleSlideLog({
    jobId: job.id,
    jobNumber: job.jobNumber,
    vins: params.vins,
    action: params.action,
    pickupBranchId: job.pickupBranchId,
    originName,
    originAddress: job.customOriginAddress || job.pickupBranch?.address,
    originLat: job.customOriginLat,
    originLng: job.customOriginLng,
    destBranchId: job.destBranchId,
    destName,
    destAddress: job.customDestAddress || job.destBranch?.address,
    destLat: job.customDestLat,
    destLng: job.customDestLng,
    distance: null,
    supplierId: job.supplierId,
    supplierName: job.supplier?.name,
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    remarks: params.remarks ?? null,
  });
}
