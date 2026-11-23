import type { UserRole } from '@/types';

export const JOB_STATUSES = [
  'PENDING_SUPPLIER',
  'IN_PROGRESS',
  'WAITING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'INVOICED',
  'CANCELLED',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const CAR_WASH_ITEM_STATUSES = [
  'PENDING',
  'COMPLETED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type CarWashItemStatus = (typeof CAR_WASH_ITEM_STATUSES)[number];

/** สถานะใบงานที่ปิดจบแล้ว — ห้ามแก้ไขสถานะรายการรถรายคัน */
export const CLOSED_JOB_STATUSES_FOR_ITEMS: ReadonlySet<JobStatus> = new Set<JobStatus>([
  'APPROVED',
  'INVOICED',
  'CANCELLED',
]);

const JOB_STATUS_SET: ReadonlySet<string> = new Set(JOB_STATUSES);
const ITEM_STATUS_SET: ReadonlySet<string> = new Set(CAR_WASH_ITEM_STATUSES);

export function isValidJobStatus(value: unknown): value is JobStatus {
  return typeof value === 'string' && JOB_STATUS_SET.has(value);
}

export function isValidCarWashItemStatus(value: unknown): value is CarWashItemStatus {
  return typeof value === 'string' && ITEM_STATUS_SET.has(value);
}

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PENDING_SUPPLIER: 'รอ Supplier รับงาน',
  IN_PROGRESS: 'กำลังดำเนินการ',
  WAITING_APPROVAL: 'รอตรวจรับ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ตีกลับขอแก้ไข',
  INVOICED: 'วางบิลแล้ว',
  CANCELLED: 'ยกเลิกแล้ว',
};

const ITEM_STATUS_LABELS: Record<CarWashItemStatus, string> = {
  PENDING: 'รอดำเนินการ',
  COMPLETED: 'ส่งงานแล้ว',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ตีกลับ',
  CANCELLED: 'ยกเลิกแล้ว',
};

const REVIEWER_JOB_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  PENDING_SUPPLIER: ['CANCELLED'],
  IN_PROGRESS: ['CANCELLED'],
  WAITING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
  REJECTED: ['CANCELLED'],
  APPROVED: [],
  INVOICED: [],
  CANCELLED: [],
};

const SUPPLIER_JOB_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  // Supplier สามารถรับงาน (IN_PROGRESS), ส่งงานตรงกรณีสไลด์ที่ยืนยันรถแล้ว (WAITING_APPROVAL), หรือปฏิเสธงาน (CANCELLED)
  PENDING_SUPPLIER: ['IN_PROGRESS', 'WAITING_APPROVAL', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_APPROVAL', 'CANCELLED'],
  REJECTED: ['WAITING_APPROVAL', 'IN_PROGRESS'],
  WAITING_APPROVAL: [],
  APPROVED: [],
  INVOICED: [],
  CANCELLED: [],
};

/**
 * ตารางการเปลี่ยนสถานะใบงานที่อนุญาตแยกตาม Role
 * หมายเหตุ: สถานะ INVOICED เปลี่ยนผ่านระบบสร้างใบวางบิล (/api/invoices) เท่านั้น ไม่อนุญาตผ่าน status route
 */
export const ALLOWED_TRANSITIONS: Record<UserRole, Record<JobStatus, readonly JobStatus[]>> = {
  SUPPLIER: SUPPLIER_JOB_TRANSITIONS,
  BRANCH: REVIEWER_JOB_TRANSITIONS,
  ADMIN: REVIEWER_JOB_TRANSITIONS,
  MASTER: REVIEWER_JOB_TRANSITIONS,
};

const REVIEWER_ITEM_TRANSITIONS: Record<CarWashItemStatus, readonly CarWashItemStatus[]> = {
  PENDING: ['CANCELLED'],
  COMPLETED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  REJECTED: ['CANCELLED'],
  APPROVED: [],
  CANCELLED: [],
};

const SUPPLIER_ITEM_TRANSITIONS: Record<CarWashItemStatus, readonly CarWashItemStatus[]> = {
  PENDING: ['COMPLETED', 'CANCELLED'],
  REJECTED: ['COMPLETED'],
  COMPLETED: [],
  APPROVED: [],
  CANCELLED: [],
};

/**
 * ตารางการเปลี่ยนสถานะรายการรถรายคัน (CarWashItem) ที่อนุญาตแยกตาม Role
 */
export const ALLOWED_ITEM_TRANSITIONS: Record<
  UserRole,
  Record<CarWashItemStatus, readonly CarWashItemStatus[]>
> = {
  SUPPLIER: SUPPLIER_ITEM_TRANSITIONS,
  BRANCH: REVIEWER_ITEM_TRANSITIONS,
  ADMIN: REVIEWER_ITEM_TRANSITIONS,
  MASTER: REVIEWER_ITEM_TRANSITIONS,
};

export type TransitionValidationResult<T extends string> =
  | { ok: true; from: T; to: T }
  | { ok: false; status: number; error: string };

/**
 * ตรวจสอบความถูกต้องของการเปลี่ยนสถานะใบงาน (Job)
 */
export function validateJobStatusTransition(params: {
  role: UserRole;
  from: string;
  to: unknown;
  approvedBy?: string | null;
}): TransitionValidationResult<JobStatus> {
  const { role, from, to, approvedBy } = params;

  if (!isValidJobStatus(to)) {
    return {
      ok: false,
      status: 400,
      error: `สถานะใบงานไม่ถูกต้อง (${String(to ?? '')})`,
    };
  }

  if (!isValidJobStatus(from)) {
    return {
      ok: false,
      status: 409,
      error: `สถานะปัจจุบันของใบงานไม่ถูกต้อง (${from})`,
    };
  }

  if (to === 'INVOICED') {
    return {
      ok: false,
      status: 400,
      error: 'ไม่สามารถเปลี่ยนสถานะเป็นวางบิล (INVOICED) ผ่านช่องทางนี้ได้ กรุณาดำเนินการผ่านระบบวางบิล',
    };
  }

  if (role === 'SUPPLIER' && !['IN_PROGRESS', 'WAITING_APPROVAL', 'CANCELLED'].includes(to)) {
    return {
      ok: false,
      status: 403,
      error: 'Supplier ไม่มีสิทธิ์อนุมัติ หรือแก้ไขสถานะนี้',
    };
  }

  const allowed = ALLOWED_TRANSITIONS[role]?.[from] ?? [];
  if (allowed.includes(to)) {
    return { ok: true, from, to };
  }

  // ข้อความแจ้งเตือนภาษาไทยที่ชัดเจนตามสาเหตุ
  if (to === 'APPROVED') {
    if (from === 'APPROVED') {
      return {
        ok: false,
        status: 409,
        error: `งานนี้ได้รับการอนุมัติเรียบร้อยแล้ว${approvedBy ? ` โดย ${approvedBy}` : ''}`,
      };
    }
    if (from === 'CANCELLED') {
      return {
        ok: false,
        status: 409,
        error: 'งานนี้ถูกยกเลิกแล้ว ไม่สามารถอนุมัติได้',
      };
    }
    if (from === 'INVOICED') {
      return {
        ok: false,
        status: 409,
        error: 'งานนี้วางบิลเรียบร้อยแล้ว',
      };
    }
    return {
      ok: false,
      status: 409,
      error: `ไม่สามารถอนุมัติใบงานในสถานะ "${JOB_STATUS_LABELS[from]}" ได้ (ต้องอยู่ในสถานะรอตรวจรับเท่านั้น)`,
    };
  }

  if (to === 'CANCELLED') {
    if (from === 'CANCELLED') {
      return {
        ok: false,
        status: 409,
        error: 'งานนี้ถูกยกเลิกไปแล้ว',
      };
    }
    if (from === 'APPROVED' || from === 'INVOICED') {
      return {
        ok: false,
        status: 409,
        error: 'งานนี้ผ่านการตรวจรับแล้ว ไม่สามารถยกเลิกได้',
      };
    }
  }

  if (from === 'APPROVED' || from === 'INVOICED' || from === 'CANCELLED') {
    return {
      ok: false,
      status: 409,
      error: `ใบงานอยู่ในสถานะ "${JOB_STATUS_LABELS[from]}" แล้ว ไม่สามารถเปลี่ยนเป็น "${JOB_STATUS_LABELS[to]}" ได้`,
    };
  }

  return {
    ok: false,
    status: 409,
    error: `ไม่สามารถเปลี่ยนสถานะใบงานจาก "${JOB_STATUS_LABELS[from]}" เป็น "${JOB_STATUS_LABELS[to]}" ได้`,
  };
}

/**
 * ตรวจสอบความถูกต้องของการเปลี่ยนสถานะรายการรถรายคัน (CarWashItem)
 */
export function validateItemStatusTransition(params: {
  role: UserRole;
  jobStatus: string;
  from: string;
  to: unknown;
}): TransitionValidationResult<CarWashItemStatus> {
  const { role, jobStatus, from, to } = params;

  if (!isValidCarWashItemStatus(to)) {
    return {
      ok: false,
      status: 400,
      error: 'กรุณาระบุสถานะที่ถูกต้อง (PENDING, COMPLETED, APPROVED, REJECTED, CANCELLED)',
    };
  }

  if (!isValidCarWashItemStatus(from)) {
    return {
      ok: false,
      status: 409,
      error: `สถานะปัจจุบันของรายการรถไม่ถูกต้อง (${from})`,
    };
  }

  // ป้องกันแก้ไขรายการรถเมื่อใบงานปิดหรือยกเลิกแล้ว
  if (isValidJobStatus(jobStatus) && CLOSED_JOB_STATUSES_FOR_ITEMS.has(jobStatus)) {
    return {
      ok: false,
      status: 409,
      error: `ใบงานอยู่ในสถานะ "${JOB_STATUS_LABELS[jobStatus]}" แล้ว ไม่สามารถแก้ไขสถานะรายการรถได้`,
    };
  }

  if (role === 'SUPPLIER' && to !== 'COMPLETED' && to !== 'CANCELLED') {
    return {
      ok: false,
      status: 403,
      error: 'Supplier สามารถส่งงาน (COMPLETED) หรือปฏิเสธรายคัน (CANCELLED) เท่านั้น',
    };
  }

  if (role !== 'SUPPLIER' && to === 'COMPLETED') {
    return {
      ok: false,
      status: 403,
      error: 'เฉพาะ Supplier เท่านั้นที่สามารถส่งงานรายการรถ (COMPLETED) ได้',
    };
  }

  const allowed = ALLOWED_ITEM_TRANSITIONS[role]?.[from] ?? [];
  if (allowed.includes(to)) {
    return { ok: true, from, to };
  }

  if (from === 'APPROVED') {
    return {
      ok: false,
      status: 409,
      error: to === 'APPROVED'
        ? 'รถคันนี้ได้รับการอนุมัติเรียบร้อยแล้ว'
        : 'รถคันนี้ผ่านการตรวจรับแล้ว ไม่สามารถแก้ไขได้',
    };
  }

  if (from === 'CANCELLED') {
    return {
      ok: false,
      status: 409,
      error: to === 'CANCELLED'
        ? 'รายการนี้ถูกยกเลิกไปแล้ว'
        : 'รายการนี้ถูกยกเลิกไปแล้ว ไม่สามารถเปลี่ยนสถานะได้',
    };
  }

  return {
    ok: false,
    status: 409,
    error: `ไม่สามารถเปลี่ยนสถานะรายการรถจาก "${ITEM_STATUS_LABELS[from]}" เป็น "${ITEM_STATUS_LABELS[to]}" ได้`,
  };
}
