import { Job, JobStatus, JobType } from '@/types';

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
 */
export function getJobTotalCost(job: Job): number {
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
