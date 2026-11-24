/**
 * งานสไลด์ "เที่ยวเปล่า" (สไลด์ไม่สำเร็จ)
 *
 * กรณี Vendor มาถึงหน้างานแล้วแต่สไลด์รถไม่ได้ (เรียกรถผิด / เกิดเหตุหน้างาน — ไม่ใช่ความผิดของ Vendor)
 * - Vendor ถ่ายรูป + ระบุสาเหตุ แล้วส่งงานในใบงานเดิม
 * - สาขาอนุมัติ → เปิด PO ด้วย ItemNumber เดียวกับงานสไลด์ ยอดตายตัวต่อใบงาน (ไม่คูณจำนวนคัน)
 * - รถไม่ถูกย้ายสาขา และไม่ทำ Transfer Journal ใน D365
 *
 * ไฟล์นี้ใช้ได้ทั้งฝั่ง Server และ Client (ห้าม import prisma)
 */

export const SLIDE_COMPLETION_DELIVERED = 'DELIVERED';
export const SLIDE_COMPLETION_FAILED_ATTEMPT = 'FAILED_ATTEMPT';

/** ค่าเที่ยวเปล่าเริ่มต้น (บาท) — ต่อ 1 ใบงาน (แก้ไขได้ก่อนอนุมัติ) */
export const SLIDE_FAILED_ATTEMPT_FEE = 500;

export const SLIDE_FAILED_ATTEMPT_LABEL = 'เที่ยวเปล่า (สไลด์ไม่สำเร็จ)';

/** หมายเหตุที่ Vendor ต้องพิมพ์เอง (บังคับ) */
export const SLIDE_FAIL_NOTE_MIN_LENGTH = 5;
export const SLIDE_FAIL_NOTE_MAX_LENGTH = 1000;

export function isFailedAttemptJob(job: { completionType?: string | null } | null | undefined): boolean {
  return job?.completionType === SLIDE_COMPLETION_FAILED_ATTEMPT;
}

/**
 * คืนยอดค่าเที่ยวเปล่าของใบงาน (ใช้ actualCost ที่บันทึก/แก้ไขไว้ หากไม่มีหรือ <= 0 จะใช้ค่าเริ่มต้น 500 บาท)
 */
export function getFailedAttemptFee(
  job?: { actualCost?: number | null } | null
): number {
  const cost = job?.actualCost;
  if (typeof cost === 'number' && Number.isFinite(cost) && cost > 0) {
    return cost;
  }
  return SLIDE_FAILED_ATTEMPT_FEE;
}

/**
 * ราคาต่อคันเมื่อแสดงแยกรายคันในใบงานเที่ยวเปล่า:
 * คันแรกที่ไม่ถูกยกเลิกรับยอดทั้งหมด คันอื่นเป็น 0 — ยอดรวมทั้งใบจึงเท่ากับค่าเที่ยวเปล่าเสมอ
 */
export function getFailedAttemptItemPrice<T extends { id: string; status?: string | null }>(
  items: T[],
  itemId: string,
  fee: number = SLIDE_FAILED_ATTEMPT_FEE
): number {
  const firstActive = items.find(i => i.status !== 'CANCELLED');
  return firstActive && firstActive.id === itemId ? fee : 0;
}

