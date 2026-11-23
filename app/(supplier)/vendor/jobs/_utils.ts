import { Job, Vehicle } from '@/types';
import { getJobTotalCost } from '@/lib/job-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
import { WorkModalTarget } from '@/components/vendor';
import { SupplierItemCard } from './_types';

// ─── Google Maps navigation helpers (deep links — no API key needed) ──
// Prefer exact GPS coordinates; fall back to address / name text search.
export function toMapsQuery(lat?: number, lng?: number, ...texts: (string | undefined)[]): string | null {
  if (typeof lat === 'number' && typeof lng === 'number') return `${lat},${lng}`;
  const text = texts.find(t => t && t.trim());
  return text ? text.trim() : null;
}

export function getSlideLocations(job: Job) {
  const pickup = toMapsQuery(
    job.customOriginLat ?? job.pickupBranchLat,
    job.customOriginLng ?? job.pickupBranchLng,
    job.customOriginAddress,
    job.pickupBranchAddress,
    job.pickupBranchName,
  );
  const dropoff = toMapsQuery(
    job.customDestLat ?? job.destBranchLat,
    job.customDestLng ?? job.destBranchLng,
    job.customDestAddress,
    job.destBranchAddress,
    job.destBranchName,
  );
  const pickupLabel = job.customOriginAddress?.split(',')[0] || job.pickupBranchName || job.branchName;
  const dropoffLabel = job.customDestAddress?.split(',')[0] || job.destBranchName || 'ปลายทาง';
  return { pickup, dropoff, pickupLabel, dropoffLabel };
}

export function mapsDirUrl(destination: string, origin?: string | null): string {
  const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving' });
  if (origin) params.set('origin', origin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// ─── เที่ยวเปล่า (สไลด์ไม่สำเร็จ) — ทั้งใบงาน ──
export function canReportFailedAttempt(job: Job): boolean {
  if (job.jobType !== 'VEHICLE_SLIDE') return false;
  if (!['PENDING_SUPPLIER', 'IN_PROGRESS', 'REJECTED'].includes(job.status)) return false;
  const activeItems = (job.carWashItems || []).filter(i => i.status !== 'CANCELLED');
  if (activeItems.some(i => i.status === 'APPROVED')) return false;
  // ส่งงานสไลด์สำเร็จไปแล้วบางคัน (และยังไม่ถูกตีกลับ) → ไม่ใช่เที่ยวเปล่า
  if (job.status !== 'REJECTED' && activeItems.some(i => i.status === 'COMPLETED')) return false;
  return activeItems.length > 0 || Boolean(job.vin);
}

// ─── Modal Target Conversion Helpers ──
export function itemCardToTarget(card: SupplierItemCard): WorkModalTarget {
  const isSlide = card.job.jobType === 'VEHICLE_SLIDE';
  const origin = card.job.pickupBranchName || card.job.branchName;
  const dest = card.job.destBranchName || card.job.customDestAddress || 'ปลายทาง';
  const routeText = isSlide ? `${origin} → ${dest}${card.job.distance ? ` (${card.job.distance} กม.)` : ''}` : undefined;
  const washMeta = !isSlide ? getWashServiceDisplay(card.washType || 'WASH_NORMAL') : null;

  return {
    type: isSlide ? 'VEHICLE_SLIDE' : 'CAR_WASH',
    jobId: card.jobId,
    jobNumber: card.jobNumber,
    itemId: card.itemId,
    vin: card.vin,
    vehicleModel: card.vehicleModel,
    vehicleColor: card.vehicleColor,
    licensePlate: card.licensePlate,
    serviceType: card.washType,
    serviceLabel: isSlide ? 'รถสไลด์ขนส่ง' : (washMeta?.name || 'ล้างรถ'),
    washServiceCategory: washMeta?.categoryName,
    washServiceDescription: washMeta?.defaultRemarks,
    remarks: card.itemRemarks,
    itemRemarks: card.itemRemarks,
    unitPrice: card.unitPrice,
    branchName: card.branchName,
    routeText,
    originName: isSlide ? origin : undefined,
    destName: isSlide ? dest : undefined,
    distance: isSlide ? card.job.distance : undefined,
    rejectReason: card.itemRemarks || card.job.rejectReason,
    job: card.job,
  };
}

export function slideJobToTarget(job: Job, vehicles: Vehicle[]): WorkModalTarget {
  const vehicleObj = vehicles.find(v => v.vin === job.vin) || job.vehicle;
  const cost = getJobTotalCost(job);
  const origin = job.pickupBranchName || job.branchName;
  const dest = job.destBranchName || job.customDestAddress || 'ปลายทาง';
  const routeText = `${origin} → ${dest}${job.distance ? ` (${job.distance} กม.)` : ''}`;

  return {
    type: 'VEHICLE_SLIDE',
    jobId: job.id,
    jobNumber: job.jobNumber,
    vin: job.vin || 'ไม่ระบุ VIN',
    vehicleModel: vehicleObj?.model,
    vehicleColor: vehicleObj?.color,
    licensePlate: vehicleObj?.licensePlate,
    serviceType: 'VEHICLE_SLIDE',
    serviceLabel: 'รถสไลด์ขนส่ง',
    unitPrice: cost,
    branchName: job.branchName,
    routeText,
    originName: origin,
    destName: dest,
    distance: job.distance,
    rejectReason: job.rejectReason,
    job,
  };
}

export function getWashBadgeClass(washType: string): string {
  if (washType === 'POLISH_STAINS' || washType === 'DEEP_CLEAN') {
    return 'bg-amber-100/90 text-amber-900 border-amber-300';
  }
  if (washType === 'WASH_AND_COAT' || washType === 'POLISH') {
    return 'bg-purple-100/90 text-purple-900 border-purple-300';
  }
  if (washType === 'COATING') {
    return 'bg-indigo-100/90 text-indigo-900 border-indigo-300';
  }
  if (washType === 'BIG_SIZE_M8') {
    return 'bg-emerald-100/90 text-emerald-900 border-emerald-300';
  }
  if (washType === 'WASH_INSPECTION') {
    return 'bg-sky-100/90 text-sky-900 border-sky-300';
  }
  if (washType === 'VACUUM_CUSTOMER' || washType === 'VACUUM_CENTER') {
    return 'bg-teal-100/90 text-teal-900 border-teal-300';
  }
  return 'bg-blue-100/90 text-blue-900 border-blue-300';
}
