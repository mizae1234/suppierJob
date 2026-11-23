import type { Prisma } from '@prisma/client';
import { getActiveJobsByVin, type ActiveJobRef } from '@/lib/active-jobs';
import { getVehicleLabel } from '@/lib/job-utils';
import { AppError, ConflictError } from '@/lib/errors';

export async function buildBusyConflictBody(
  busy: Map<string, ActiveJobRef>,
  client: Pick<Prisma.TransactionClient, 'vehicle'>
) {
  const plates = await client.vehicle.findMany({
    where: { vin: { in: [...busy.keys()] } },
    select: { vin: true, licensePlate: true },
  });
  const plateOf = new Map(plates.map((p) => [p.vin, p.licensePlate]));
  const lines = [...busy.entries()].map(
    ([v, j]) => `${getVehicleLabel(v, plateOf.get(v))} (ใบงาน ${j.jobNumber})`
  );
  return {
    error: `รถต่อไปนี้มีงานที่ยังไม่เสร็จสิ้น สั่งงานซ้ำไม่ได้: ${lines.join(', ')}`,
    busyVins: [...busy.keys()],
  };
}

export function buildOutOfStockBody(outOfStock: { vin: string; licensePlate: string | null }[]) {
  return {
    error: `รถต่อไปนี้ไม่อยู่ในสต็อกแล้ว (ตามข้อมูล D365) สั่งงานไม่ได้: ${outOfStock
      .map((v) => getVehicleLabel(v.vin, v.licensePlate))
      .join(', ')}`,
    outOfStockVins: outOfStock.map((v) => v.vin),
  };
}

/**
 * จองรถภายใน transaction (กัน race เมื่อสั่งงานหรือเพิ่มรถคันเดียวกันพร้อมกัน):
 * 1) เปลี่ยนสถานะรถแบบมีเงื่อนไข (ไม่ใช่ OUT_OF_STOCK เว้นแต่อนุญาต) → แถว Vehicle ถูกล็อกจน commit
 * 2) ตรวจงานค้างซ้ำหลังได้ล็อก — คำขอที่มาทีหลังจะรอจนคำขอแรก commit แล้วเห็นใบงานใหม่ → 409 ConflictError
 */
export async function reserveVehiclesInTx(
  tx: Prisma.TransactionClient,
  vins: string[],
  newStatus: 'IN_WASH' | 'IN_TRANSIT',
  allowsOutOfStock: boolean
): Promise<void> {
  const uniqueVins = [...new Set(vins.filter(Boolean))];
  if (uniqueVins.length === 0) return;

  const res = await tx.vehicle.updateMany({
    where: {
      vin: { in: uniqueVins },
      ...(allowsOutOfStock ? {} : { status: { not: 'OUT_OF_STOCK' } }),
    },
    data: { status: newStatus },
  });

  if (res.count !== uniqueVins.length) {
    const rows = await tx.vehicle.findMany({
      where: { vin: { in: uniqueVins } },
      select: { vin: true, licensePlate: true, status: true },
    });
    const outOfStock = allowsOutOfStock ? [] : rows.filter((r) => r.status === 'OUT_OF_STOCK');
    if (outOfStock.length > 0) {
      throw new ConflictError(buildOutOfStockBody(outOfStock));
    }
    const found = new Set(rows.map((r) => r.vin.toUpperCase()));
    const missing = uniqueVins.filter((v) => !found.has(v.toUpperCase()));
    throw new AppError(
      { error: `ไม่พบข้อมูลรถในระบบ: ${missing.join(', ') || uniqueVins.join(', ')}` },
      400
    );
  }

  const busy = await getActiveJobsByVin(uniqueVins, tx);
  if (busy.size > 0) {
    throw new ConflictError(await buildBusyConflictBody(busy, tx));
  }
}
