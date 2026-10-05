import { Job, JobStatus, JobType } from '@/types';

/**
 * Short label for identifying a car in the UI.
 * Prefer the license plate; fall back to the last 6 digits of the VIN.
 */
export function getVehicleLabel(vin?: string | null, licensePlate?: string | null): string {
  const plate = licensePlate?.trim();
  if (plate && plate !== '-') return plate;
  return vin ? vin.slice(-6) : '-';
}

/**
 * Supplier work buckets — shared by the supplier dashboard counters and the
 * supplier jobs page tabs so both always show the same numbers.
 */
export type SupplierTabKey = 'progress' | 'waiting' | 'approved' | 'returned' | 'declined';

/** Car-wash: classify one car by its own status + its job status */
export function classifySupplierItem(itemStatus: string, jobStatus: string): SupplierTabKey | null {
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
  if (itemStatus === 'PENDING' && ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(jobStatus)) return 'progress';
  return null;
}

/** Vehicle slide: classified at job level */
export function classifySupplierSlide(jobStatus: string): SupplierTabKey | null {
  if (['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(jobStatus)) return 'progress';
  if (jobStatus === 'WAITING_APPROVAL') return 'waiting';
  if (['APPROVED', 'INVOICED'].includes(jobStatus)) return 'approved';
  if (jobStatus === 'REJECTED') return 'returned';
  if (jobStatus === 'CANCELLED') return 'declined';
  return null;
}

/** Count supplier work per bucket (car wash = per car, slide = per job) */
export function countSupplierTabs(jobs: Job[]): Record<SupplierTabKey, number> {
  const counts: Record<SupplierTabKey, number> = { progress: 0, waiting: 0, approved: 0, returned: 0, declined: 0 };
  jobs.forEach(job => {
    if (job.jobType === 'CAR_WASH' && job.carWashItems && job.carWashItems.length > 0) {
      job.carWashItems.forEach(item => {
        const tab = classifySupplierItem(item.status, job.status);
        if (tab) counts[tab]++;
      });
    } else if (job.jobType === 'VEHICLE_SLIDE') {
      const tab = classifySupplierSlide(job.status);
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
  if (job.jobType === 'CAR_WASH') {
    const items = job.carWashItems || [];
    const count = items.length;
    const firstVin = items[0]?.vin || '-';
    const firstModel = items[0]?.vehicleModel || 'รถยนต์';
    const firstColor = items[0]?.vehicleColor || '';

    return {
      title: `${count} คัน (${firstModel}${firstColor ? ` · ${firstColor}` : ''})`,
      vin: count > 1 ? `${firstVin} (+${count - 1} คัน)` : firstVin,
      summaryText: `สั่งล้าง ${count} คัน`,
      isMulti: count > 1,
    };
  }

  // Vehicle Slide
  const model = job.vehicle?.model || 'รถยนต์ขนย้าย';
  const color = job.vehicle?.color ? ` · ${job.vehicle.color}` : '';
  const vin = job.vin || '-';

  return {
    title: `${model}${color}`,
    vin: vin,
    summaryText: `${job.originBranchName || job.branchName} ➔ ${job.destBranchName || '-'}`,
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
 * SlideDirection indicates whether a branch is receiving or sending the vehicle in a slide job.
 * - 'INBOUND': The given branch is the destination branch (รับเข้า)
 * - 'OUTBOUND': The given branch is the origin branch (ส่งออก)
 * - null: Not a vehicle slide job, destination is external/map pin, or the branch is neither
 */
export type SlideDirection = 'INBOUND' | 'OUTBOUND' | null;

export function getSlideDirection(job: Job, branchId?: string | null): SlideDirection {
  if (job.jobType !== 'VEHICLE_SLIDE' || !branchId) return null;
  if (job.destBranchId && job.destBranchId === branchId) {
    return 'INBOUND';
  }
  if (job.originBranchId === branchId || job.branchId === branchId) {
    return 'OUTBOUND';
  }
  return null;
}
