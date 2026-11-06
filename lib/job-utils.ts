import { Branch, Company, Job, JobStatus, JobType, Supplier, Vehicle } from '@/types';

/**
 * Short label for identifying a car in the UI.
 * Prefer the license plate; fall back to the last 6 digits of the VIN prefixed with "VIN: " (e.g. "VIN: G04484").
 */
export function getVehicleLabel(vin?: string | null, licensePlate?: string | null): string {
  const plate = licensePlate?.trim();
  if (plate && plate !== '-' && !plate.includes('ป้ายแดง')) return plate;
  return vin ? `VIN: ${vin.slice(-6)}` : '-';
}

/** หารหัส Vendor D365 ของ Supplier สำหรับสาขาที่ระบุ (แต่ละสาขามีรหัสต่างกัน — ไม่เจอคืน null) */
export function getSupplierVendorCode(
  supplier: Pick<Supplier, 'vendorCodes'> | null | undefined,
  branch: { id?: string | null; code?: string | null } | null | undefined,
): string | null {
  if (!supplier?.vendorCodes || !branch) return null;
  const match = supplier.vendorCodes.find(
    (vc) => (!!branch.id && vc.branchId === branch.id) || (!!branch.code && vc.branchCode === branch.code),
  );
  return match?.vendorCode ?? null;
}

/**
 * Supplier work buckets — shared by the supplier dashboard counters and the
 * supplier jobs page tabs so both always show the same numbers.
 */
export type SupplierTabKey = 'verify' | 'progress' | 'waiting' | 'approved' | 'returned' | 'declined';

/** Car-wash: classify one car by its own status + its job status + verifiedAt */
export function classifySupplierItem(
  itemStatus: string,
  jobStatus: string,
  verifiedAt?: string | Date | null
): SupplierTabKey | null {
  if (itemStatus === 'CANCELLED') return 'declined';           // supplier declined this car
  if (itemStatus === 'REJECTED') return 'returned';            // branch sent this car back
  if (itemStatus === 'APPROVED') return 'approved';
  if (jobStatus === 'CANCELLED') return 'declined';            // whole job declined
  if (jobStatus === 'REJECTED') return 'returned';             // whole job sent back
  if (itemStatus === 'COMPLETED') {
    if (['APPROVED', 'INVOICED'].includes(jobStatus)) return 'approved';
    if (['IN_PROGRESS', 'WAITING_APPROVAL'].includes(jobStatus)) return 'waiting';
    return null;
  }
  if (itemStatus === 'PENDING' && ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(jobStatus)) {
    return verifiedAt ? 'progress' : 'verify';
  }
  return null;
}

/** Vehicle slide: classified at job level + verifiedAt */
export function classifySupplierSlide(
  jobStatus: string,
  verifiedAt?: string | Date | null
): SupplierTabKey | null {
  if (['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(jobStatus)) {
    return verifiedAt ? 'progress' : 'verify';
  }
  if (jobStatus === 'WAITING_APPROVAL') return 'waiting';
  if (['APPROVED', 'INVOICED'].includes(jobStatus)) return 'approved';
  if (jobStatus === 'REJECTED') return 'returned';
  if (jobStatus === 'CANCELLED') return 'declined';
  return null;
}

/** Count supplier work per bucket (per car for jobs with carWashItems, fallback per job for legacy slide jobs) */
export function countSupplierTabs(jobs: Job[]): Record<SupplierTabKey, number> {
  const counts: Record<SupplierTabKey, number> = {
    verify: 0,
    progress: 0,
    waiting: 0,
    approved: 0,
    returned: 0,
    declined: 0,
  };
  jobs.forEach(job => {
    if (job.carWashItems && job.carWashItems.length > 0) {
      job.carWashItems.forEach(item => {
        const tab = classifySupplierItem(item.status, job.status, item.verifiedAt || job.verifiedAt);
        if (tab) counts[tab]++;
      });
    } else if (job.jobType === 'VEHICLE_SLIDE') {
      const tab = classifySupplierSlide(job.status, job.verifiedAt);
      if (tab) counts[tab]++;
    }
  });
  return counts;
}

/**
 * Shared Job Status Meta Dictionary
 * Used by both Desktop Admin Dashboard and Mobile Portal
 */
export interface JobStatusMeta {
  label: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
  description: string;
}

export const JOB_STATUS_META: Record<JobStatus, JobStatusMeta> = {
  PENDING_SUPPLIER: {
    label: 'รอรับงาน',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dotColor: 'bg-purple-500',
    description: 'มอบหมายงานแล้ว รอ Supplier กดรับงาน',
  },
  IN_PROGRESS: {
    label: 'กำลังดำเนินงาน',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dotColor: 'bg-blue-500',
    description: 'Supplier กำลังปฏิบัติงาน',
  },
  WAITING_APPROVAL: {
    label: 'รอตรวจรับ',
    bg: 'bg-amber-50',
    text: 'text-amber-800 font-bold',
    border: 'border-amber-300',
    dotColor: 'bg-amber-500',
    description: 'Supplier ส่งรูปหลักฐานแล้ว รอสาขาตรวจรับ',
  },
  APPROVED: {
    label: 'อนุมัติแล้ว',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800 font-bold',
    border: 'border-emerald-200',
    dotColor: 'bg-emerald-600',
    description: 'สาขาตรวจรับผ่าน พร้อมวางบิล',
  },
  REJECTED: {
    label: 'ขอให้แก้ไข',
    bg: 'bg-rose-50',
    text: 'text-rose-700 font-bold',
    border: 'border-rose-200',
    dotColor: 'bg-rose-500',
    description: 'ไม่ผ่านการตรวจรับ ส่งกลับให้แก้ไข',
  },
  INVOICED: {
    label: 'วางบิลแล้ว',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dotColor: 'bg-gray-500',
    description: 'รวมในใบวางบิลเรียบร้อยแล้ว',
  },
  CANCELLED: {
    label: 'ยกเลิก',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-200',
    dotColor: 'bg-gray-400',
    description: 'คำสั่งงานถูกยกเลิก',
  },
};

/**
 * Get status styling & labels safely
 */
export function getJobStatusBadge(status: JobStatus): JobStatusMeta {
  return (
    JOB_STATUS_META[status] || {
      label: status,
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      dotColor: 'bg-gray-400',
      description: '-',
    }
  );
}

/**
 * Get standardized vehicle display info from a job
 */
export function getJobVehicleDisplay(job: Job) {
  const allItems = job.carWashItems || [];
  const activeItems = allItems.filter(i => i.status !== 'CANCELLED');
  const displayItems = activeItems.length > 0 ? activeItems : allItems;

  if (job.jobType === 'CAR_WASH') {
    const count = displayItems.length;
    const firstVin = displayItems[0]?.vin || '-';
    const firstModel = displayItems[0]?.vehicleModel || 'รถยนต์';
    const firstColor = displayItems[0]?.vehicleColor || '';

    return {
      title: `${count} คัน (${firstModel}${firstColor ? ` · ${firstColor}` : ''})`,
      vin: count > 1 ? `${firstVin} (+${count - 1} คัน)` : firstVin,
      summaryText: `สั่งล้าง ${count} คัน`,
      isMulti: count > 1,
    };
  }

  // Vehicle Slide
  if (displayItems.length > 1) {
    const count = displayItems.length;
    const firstVin = displayItems[0]?.vin || job.vin || '-';
    const firstModel = displayItems[0]?.vehicleModel || job.vehicle?.model || 'รถยนต์ขนย้าย';
    const firstColor = displayItems[0]?.vehicleColor || job.vehicle?.color || '';

    return {
      title: `${count} คัน (${firstModel}${firstColor ? ` · ${firstColor}` : ''})`,
      vin: `${firstVin} (+${count - 1} คัน)`,
      summaryText: `${job.originBranchName || job.branchName} ➔ ${job.destBranchName || job.customDestAddress || '-'}`,
      isMulti: true,
    };
  }

  const singleItem = displayItems[0];
  const model = singleItem?.vehicleModel || job.vehicle?.model || 'รถยนต์ขนย้าย';
  const colorVal = singleItem?.vehicleColor || job.vehicle?.color;
  const color = colorVal ? ` · ${colorVal}` : '';
  const vin = singleItem?.vin || job.vin || '-';

  return {
    title: `${model}${color}`,
    vin: vin,
    summaryText: `${job.originBranchName || job.branchName} ➔ ${job.destBranchName || job.customDestAddress || '-'}`,
    isMulti: false,
  };
}

/**
 * Get accurate total cost of a job
 * Deducts cancelled items for CAR_WASH jobs
 */
export function getJobTotalCost(job: Job): number {
  if (job.status === 'CANCELLED') return 0;

  if (job.carWashItems && job.carWashItems.length > 0) {
    const validItems = job.carWashItems.filter(i => i.status !== 'CANCELLED');
    return validItems.reduce((sum, i) => sum + (i.unitPrice || 0), 0);
  }

  return job.actualCost ?? job.estimatedCost ?? 0;
}

/**
 * Get Job Type localized info
 */
export function getJobTypeDisplay(jobType: JobType) {
  if (jobType === 'CAR_WASH') {
    return {
      label: 'ล้างรถ',
      enLabel: 'Car Wash',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    };
  }
  return {
    label: 'รถสไลด์',
    enLabel: 'Vehicle Slide',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
  };
}

// ─────────────────────────────────────────────────────────────
// Schedule date (วันนัดทำงาน) + date-range filtering
// ─────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  // 'YYYY-MM-DD' → local date (avoid UTC shift)
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * วันนัดทำงานของใบงาน
 * - รถสไลด์: วันเวลารับรถ (pickupDateTime)
 * - ล้างรถ: วันนัดล้างที่เร็วที่สุดของรถในใบงาน (ไม่นับคันที่ยกเลิก)
 * - fallback: วันที่สั่งงาน (createdAt)
 */
export function getJobScheduleDate(job: Job): Date {
  if (job.jobType === 'VEHICLE_SLIDE') {
    const pickup = parseDate(job.pickupDateTime);
    if (pickup) return pickup;
  }

  const washDates = (job.carWashItems || [])
    .filter(i => i.status !== 'CANCELLED')
    .map(i => parseDate(i.actualWashDate))
    .filter((d): d is Date => d !== null);
  if (washDates.length > 0) {
    return new Date(Math.min(...washDates.map(d => d.getTime())));
  }

  return parseDate(job.createdAt) || new Date();
}

export type DateRangePreset = 'WINDOW' | 'TODAY' | 'PAST_7' | 'NEXT_MONTH' | 'ALL' | 'CUSTOM';

export const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'ALL', label: 'ทุกช่วงเวลา' },
  { value: 'TODAY', label: 'วันนี้' },
  { value: 'PAST_7', label: 'ย้อนหลัง 7 วัน (งานที่ผ่านมา)' },
  { value: 'NEXT_MONTH', label: 'ล่วงหน้า 1 เดือน (งานที่จะถึง)' },
  { value: 'CUSTOM', label: 'กำหนดเอง...' },
];

export const DEFAULT_DATE_RANGE: DateRangePreset = 'ALL';

/**
 * แปลง preset → ช่วงวันที่ (ใช้วันนี้เป็นตัวตั้ง) — คืนค่า null = ไม่กรอง
 */
export function getDateRange(
  preset: DateRangePreset,
  custom?: { from?: string; to?: string },
  now: Date = new Date()
): { from: Date; to: Date } | null {
  const today = startOfDay(now);
  const plusOneMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const minus7 = new Date(today.getTime() - 7 * DAY_MS);

  switch (preset) {
    case 'WINDOW':
      return { from: minus7, to: endOfDay(plusOneMonth) };
    case 'TODAY':
      return { from: today, to: endOfDay(today) };
    case 'PAST_7':
      return { from: minus7, to: endOfDay(today) };
    case 'NEXT_MONTH':
      return { from: today, to: endOfDay(plusOneMonth) };
    case 'CUSTOM': {
      const from = parseDate(custom?.from);
      const to = parseDate(custom?.to);
      if (!from && !to) return null;
      return {
        from: from ? startOfDay(from) : new Date(0),
        to: to ? endOfDay(to) : new Date(8640000000000000),
      };
    }
    case 'ALL':
    default:
      return null;
  }
}

export function isJobInDateRange(job: Job, range: { from: Date; to: Date } | null): boolean {
  if (!range) return true;
  const t = getJobScheduleDate(job).getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
}

const ACTIVE_STATUSES: JobStatus[] = ['PENDING_SUPPLIER', 'IN_PROGRESS', 'REJECTED'];

export interface ScheduleBadge {
  label: string;
  className: string;
}

/**
 * ป้ายแสดงความใกล้/เลยกำหนด เทียบกับวันนี้
 * - งานที่ยังไม่เสร็จ: เลยกำหนด X วัน (แดง) / วันนี้ (ส้ม) / พรุ่งนี้ / อีก X วัน
 * - งานที่ส่งแล้ว/ปิดแล้ว: แสดงแค่ระยะเวลาแบบสีเทา
 */
export function getScheduleBadge(job: Job, now: Date = new Date()): ScheduleBadge {
  const diffDays = Math.round(
    (startOfDay(getJobScheduleDate(job)).getTime() - startOfDay(now).getTime()) / DAY_MS
  );
  const isActive = ACTIVE_STATUSES.includes(job.status);

  if (diffDays === 0) {
    return {
      label: 'วันนี้',
      className: isActive ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-500 border-gray-200',
    };
  }
  if (diffDays < 0) {
    return isActive
      ? { label: `เลยกำหนด ${Math.abs(diffDays)} วัน`, className: 'bg-red-50 text-red-700 border-red-200' }
      : { label: `${Math.abs(diffDays)} วันก่อน`, className: 'bg-gray-50 text-gray-500 border-gray-200' };
  }
  if (diffDays === 1) {
    return { label: 'พรุ่งนี้', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { label: `อีก ${diffDays} วัน`, className: 'bg-sky-50 text-sky-700 border-sky-200' };
}

/**
 * SlideDirection indicates whether a branch or company is receiving or sending the vehicle in a slide job.
 * - 'INBOUND': Receiving the vehicle (รับเข้า)
 * - 'OUTBOUND': Sending the vehicle out (ส่งออก)
 * - 'INTERNAL': Moving between branches within the same company (ย้ายสาขา)
 * - null: Not a vehicle slide job, or not applicable
 */
export type SlideDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | null;

export function getSlideDirection(
  job: Job,
  branchId?: string | null,
  companyCode?: string | null
): SlideDirection {
  if (job.jobType !== 'VEHICLE_SLIDE') return null;

  // 1. Branch-specific perspective (Priority)
  if (branchId) {
    if (job.destBranchId && job.destBranchId === branchId) {
      return 'INBOUND';
    }
    if (job.originBranchId === branchId || job.branchId === branchId) {
      return 'OUTBOUND';
    }
  }

  // 2. Company-level perspective (Admin / Master view)
  if (companyCode && companyCode !== 'ALL') {
    const isOriginCompany = job.companyCode === companyCode;

    // Check destination company from branch name or branch info
    let isDestCompany = false;
    if (job.destBranchName) {
      if (companyCode === 'GI' && job.destBranchName.startsWith('GI')) {
        isDestCompany = true;
      } else if (companyCode === 'EV7' && job.destBranchName.startsWith('EV7')) {
        isDestCompany = true;
      }
    }

    if (isOriginCompany && isDestCompany) {
      return 'INTERNAL';
    }
    if (isOriginCompany) {
      return 'OUTBOUND';
    }
    if (isDestCompany) {
      return 'INBOUND';
    }
  }

  return null;
}

/**
 * Haversine formula: calculate distance between two GPS coordinates in kilometers
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

import { calculateSlideJobCost } from '@/lib/vehicle-slide-rates';

/**
 * Calculate estimated slide cost based on distance and optional supplier code
 */
export function calculateSlideCost(distanceKm: number, supplierCode?: string): number {
  const result = calculateSlideJobCost({
    distanceKm,
    supplierCodeOrId: supplierCode,
    originMode: 'custom',
    destMode: 'custom',
  });
  return result.costPerCar;
}

export interface BranchCorporateInfo {
  branchId?: string;
  branchCode: string;
  branchName: string;
  nameTh: string;
  nameEn: string;
  address: string;
  taxId: string;
  phone: string;
  department: string;
}

const BRANCH_CORPORATE_DIRECTORY: Record<
  string,
  { nameTh: string; nameEn: string; defaultAddress: string; defaultTaxId?: string }
> = {
  GI: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท จำกัด (สำนักงานใหญ่)',
    nameEn: 'GOLD INTEGRATE CO., LTD. (HEAD OFFICE)',
    defaultAddress: '888 หมู่ 5 ถนนบางนา-ตราด กม.18 ตำบลบางโฉลง อำเภอบางพลี สมุทรปราการ 10540',
  },
  GI01: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท กาญจนาภิเษก - บางแค จำกัด (สาขา GI01)',
    nameEn: 'GOLD INTEGRATE KANJANAPISEK - BANGKAE CO., LTD. (GI01)',
    defaultAddress: 'ถนนกาญจนาภิเษก แขวงบางระมาด เขตตลิ่งชัน กรุงเทพฯ 10170',
  },
  GI02: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท มีนบุรี จำกัด (สาขา GI02)',
    nameEn: 'GOLD INTEGRATE MINBURI CO., LTD. (GI02)',
    defaultAddress: 'ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510',
  },
  GI03: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท เลียบด่วนรามอินทรา จำกัด (สาขา GI03)',
    nameEn: 'GOLD INTEGRATE LIABDUANRAMINDRA CO., LTD. (GI03)',
    defaultAddress: 'ถนนประดิษฐ์มนูธรรม แขวงคลองเจ้าคุณสิงห์ เขตวังทองหลาง กรุงเทพฯ 10310',
  },
  GI04: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท สีลม ซอย 9 จำกัด (สาขา GI04)',
    nameEn: 'GOLD INTEGRATE SILOM SOI 9 CO., LTD. (GI04)',
    defaultAddress: 'อาคาร เค.ซี.ซี. 2 ซอยสีลม 9 แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
  },
  GI05: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท อุบลราชธานี จำกัด (สาขา GI05)',
    nameEn: 'GOLD INTEGRATE UBONRATCHATHANI CO., LTD. (GI05)',
    defaultAddress: '77 หมู่ 26 ถนนชยางกูร ตำบลขามใหญ่ อำเภอเมือง จังหวัดอุบลราชธานี 34000',
  },
  GI06: {
    nameTh: 'บริษัท อีวี เซเว่น จำกัด (สาขา GI06)',
    nameEn: 'EV7 CO., LTD. (GI06)',
    defaultAddress: '99/9 อาคารอีวีทาวเวอร์ ชั้น 12 ถนนพระราม 9 แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ 10310',
    defaultTaxId: '0105565012345',
  },
  EV7: {
    nameTh: 'บริษัท อีวี เซเว่น จำกัด (สาขา GI06)',
    nameEn: 'EV7 CO., LTD. (GI06)',
    defaultAddress: '99/9 อาคารอีวีทาวเวอร์ ชั้น 12 ถนนพระราม 9 แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ 10310',
    defaultTaxId: '0105565012345',
  },
  GI07: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท มหาชัย จำกัด (สาขา GI07)',
    nameEn: 'GOLD INTEGRATE MAHACHAI CO., LTD. (GI07)',
    defaultAddress: 'ถนนพระราม 2 ตำบลมหาชัย อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000',
  },
  GI08: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท ศาลายา จำกัด (สาขา GI08)',
    nameEn: 'GOLD INTEGRATE SALAYA CO., LTD. (GI08)',
    defaultAddress: 'ถนนบรมราชชนนี ตำบลศาลายา อำเภอพุทธมณฑล จังหวัดนครปฐม 73170',
  },
  GI09: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท วิภาวดี จำกัด (สาขา GI09)',
    nameEn: 'GOLD INTEGRATE VIBHAVADI CO., LTD. (GI09)',
    defaultAddress: 'ซอยวิภาวดีรังสิต 22 แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900',
  },
  GI10: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท พิบูลสงคราม จำกัด (สาขา GI10)',
    nameEn: 'GOLD INTEGRATE PIBULONGKRAM CO., LTD. (GI10)',
    defaultAddress: 'ถนนพิบูลสงคราม ตำบลสวนใหญ่ อำเภอเมืองนนทบุรี จังหวัดนนทบุรี 11000',
  },
  GI11: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท อยุธยา จำกัด (สาขา GI11)',
    nameEn: 'GOLD INTEGRATE AYUTTHAYA CO., LTD. (GI11)',
    defaultAddress: 'ถนนสายเอเชีย ตำบลคุ้งลาน อำเภอบางปะอิน จังหวัดพระนครศรีอยุธยา 13160',
  },
  GI12: {
    nameTh: 'บริษัท โกลด์ อินทิเกรท เชียงใหม่ จำกัด (สาขา GI12)',
    nameEn: 'GOLD INTEGRATE CHIANGMAI CO., LTD. (GI12)',
    defaultAddress: 'ถนนเจริญเมือง ตำบลท่าศาลา อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50000',
  },
};

/**
 * ค้นหาข้อมูลหัวบิล (Corporate Letterhead) ของสาขาที่เป็นเจ้าของรถต้นสังกัด (Original Vehicle Owner Branch)
 * ลำดับความสำคัญ:
 * 1) รหัสสาขาต้นสังกัดของรถจาก D365 (`d365SiteId` / `vehicleSiteId`) ซึ่งไม่เปลี่ยนแม้รถจะถูกสไลด์ไปสาขาอื่น
 * 2) กรณีงานสไลด์และไม่มี `d365SiteId`: ใช้สาขาต้นทาง (`originBranch`)
 * 3) สาขาที่รถสังกัดในระบบ (`currentBranch`)
 * 4) สาขาที่เปิดใบสั่งงาน (`job.branch`)
 */
export function getOwnerBranchCorporateInfo(params: {
  job?: Job | null;
  vin?: string | null;
  vehicles?: Vehicle[];
  branches?: Branch[];
  companies?: Company[];
  companyCode?: string | null;
}): BranchCorporateInfo {
  const { job, vin, vehicles = [], branches = [], companies = [], companyCode } = params;

  const activeWashItem =
    job?.carWashItems?.find((i) => i.status !== 'CANCELLED') || job?.carWashItems?.[0];
  const targetVin = (vin || job?.vin || activeWashItem?.vin || '').trim().toUpperCase();

  const matchedVehicle = targetVin
    ? vehicles.find((v) => v.vin.trim().toUpperCase() === targetVin)
    : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobVehicle = job?.vehicle as any;

  // 1) Original owner branch code from D365 (d365SiteId)
  const d365OwnerCode = (
    matchedVehicle?.d365SiteId ||
    jobVehicle?.d365SiteId ||
    activeWashItem?.vehicleSiteId ||
    ''
  )
    .trim()
    .toUpperCase();

  // 2) Origin branch (for slide jobs) or current vehicle branch or ordering branch
  const fallbackBranchCode = (
    d365OwnerCode ||
    (job?.jobType === 'VEHICLE_SLIDE' ? job?.originBranchCode : '') ||
    matchedVehicle?.currentBranchCode ||
    jobVehicle?.currentBranch?.code ||
    activeWashItem?.vehicleBranchCode ||
    job?.branchCode ||
    ''
  )
    .trim()
    .toUpperCase();

  const fallbackBranchId =
    (job?.jobType === 'VEHICLE_SLIDE' ? job?.originBranchId : undefined) ||
    matchedVehicle?.currentBranchId ||
    jobVehicle?.currentBranchId ||
    activeWashItem?.vehicleBranchId ||
    job?.branchId;

  const fallbackBranchName =
    (job?.jobType === 'VEHICLE_SLIDE' ? job?.originBranchName : undefined) ||
    matchedVehicle?.currentBranchName ||
    jobVehicle?.currentBranch?.name ||
    activeWashItem?.vehicleBranchName ||
    job?.branchName;

  // Find Branch object in branches list
  const branchObj =
    (d365OwnerCode
      ? branches.find((b) => b.code.trim().toUpperCase() === d365OwnerCode)
      : undefined) ||
    (fallbackBranchCode
      ? branches.find((b) => b.code.trim().toUpperCase() === fallbackBranchCode)
      : undefined) ||
    (fallbackBranchId
      ? branches.find((b) => b.id === fallbackBranchId || b.code === fallbackBranchId)
      : undefined) ||
    (fallbackBranchName
      ? branches.find((b) => b.name === fallbackBranchName)
      : undefined);

  const resolvedCode = (
    branchObj?.code ||
    d365OwnerCode ||
    fallbackBranchCode ||
    (companyCode === 'EV7' || job?.companyCode === 'EV7' ? 'GI06' : 'GI')
  )
    .trim()
    .toUpperCase();

  const directoryEntry =
    BRANCH_CORPORATE_DIRECTORY[resolvedCode] ||
    (resolvedCode === 'EV7' ? BRANCH_CORPORATE_DIRECTORY.GI06 : BRANCH_CORPORATE_DIRECTORY.GI);

  const isEV7 =
    resolvedCode === 'GI06' ||
    resolvedCode === 'EV7' ||
    companyCode === 'EV7' ||
    job?.companyCode === 'EV7';

  const companyObj = companies.find(
    (c) => c.id === job?.companyId || c.code === (isEV7 ? 'EV7' : 'GI')
  );

  const resolvedAddress =
    branchObj?.address ||
    (d365OwnerCode && d365OwnerCode === activeWashItem?.vehicleBranchCode
      ? activeWashItem?.vehicleBranchAddress
      : undefined) ||
    (d365OwnerCode && d365OwnerCode === jobVehicle?.currentBranch?.code
      ? jobVehicle?.currentBranch?.address
      : undefined) ||
    directoryEntry.defaultAddress ||
    companyObj?.address ||
    '';

  const resolvedNameEn = branchObj?.name
    ? branchObj.code && !branchObj.name.includes(branchObj.code)
      ? `${branchObj.name} (${branchObj.code})`
      : branchObj.name
    : directoryEntry.nameEn;

  return {
    branchId: branchObj?.id || fallbackBranchId,
    branchCode: resolvedCode,
    branchName: branchObj?.name || fallbackBranchName || directoryEntry.nameEn,
    nameTh: directoryEntry.nameTh,
    nameEn: resolvedNameEn,
    address: resolvedAddress,
    taxId:
      directoryEntry.defaultTaxId ||
      companyObj?.taxId ||
      (isEV7 ? '0105565012345' : '0105564098765'),
    phone: branchObj?.phone || '02-000-0000',
    department: 'ฝ่ายบริหารงานยานพาหนะและสั่งจ้างคู่ค้า (Fleet & Vendor Operations)',
  };
}


