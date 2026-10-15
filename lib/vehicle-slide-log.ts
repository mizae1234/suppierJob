import { prisma } from '@/lib/prisma';

export interface VehicleSlideLogInput {
  jobId: string;
  jobNumber: string;
  vins: string[];
  action: 'CREATED' | 'PICKUP_VERIFIED' | 'IN_TRANSIT' | 'DELIVERED' | 'APPROVED' | 'CANCELLED';
  originBranchId?: string | null;
  originName?: string | null;
  originAddress?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destBranchId?: string | null;
  destName?: string | null;
  destAddress?: string | null;
  destLat?: number | null;
  destLng?: number | null;
  distance?: number | null;
  supplierId?: string | null;
  supplierName?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  remarks?: string | null;
}

/**
 * บันทึกประวัติ Log การสไลด์ย้ายรถลงฐานข้อมูล (VehicleSlideLog)
 * ทำงานแบบ Asynchronous ปลอดภัยไม่กระทบ transaction หลัก
 */
export async function recordVehicleSlideLog(input: VehicleSlideLogInput) {
  try {
    if (!input.vins || input.vins.length === 0) return;

    const records = input.vins.map(vin => ({
      vin,
      jobId: input.jobId,
      jobNumber: input.jobNumber,
      action: input.action,
      originBranchId: input.originBranchId || null,
      originName: input.originName || 'ไม่ระบุต้นทาง',
      originAddress: input.originAddress || null,
      originLat: input.originLat ?? null,
      originLng: input.originLng ?? null,
      destBranchId: input.destBranchId || null,
      destName: input.destName || 'ไม่ระบุปลายทาง',
      destAddress: input.destAddress || null,
      destLat: input.destLat ?? null,
      destLng: input.destLng ?? null,
      distance: input.distance ?? null,
      supplierId: input.supplierId || null,
      supplierName: input.supplierName || null,
      actorId: input.actorId || null,
      actorName: input.actorName || null,
      actorRole: input.actorRole || null,
      remarks: input.remarks || null,
    }));

    await prisma.vehicleSlideLog.createMany({
      data: records,
    });
  } catch (error) {
    console.error('recordVehicleSlideLog error:', error);
  }
}

/**
 * ดึงชื่อเรียกต้นทางและปลายทางให้กระชับ ชัดเจน
 */
export function getSlideRouteLabels(job: {
  originBranch?: { code?: string; name?: string; address?: string | null } | null;
  destBranch?: { code?: string; name?: string; address?: string | null } | null;
  customOriginAddress?: string | null;
  customDestAddress?: string | null;
  branch?: { code?: string; name?: string; address?: string | null } | null;
}): { originName: string; destName: string } {
  const originName = job.customOriginAddress
    || (job.originBranch ? (job.originBranch.code ? `สาขา ${job.originBranch.code}` : job.originBranch.name) : null)
    || (job.branch ? (job.branch.code ? `สาขา ${job.branch.code}` : job.branch.name) : null)
    || 'จุดรับรถต้นทาง';

  const destName = job.customDestAddress
    || (job.destBranch ? (job.destBranch.code ? `สาขา ${job.destBranch.code}` : job.destBranch.name) : null)
    || 'จุดส่งมอบปลายทาง';

  return { 
    originName: originName || 'จุดรับรถต้นทาง', 
    destName: destName || 'จุดส่งมอบปลายทาง' 
  };
}
