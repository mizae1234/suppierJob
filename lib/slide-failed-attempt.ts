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

/** ค่าเที่ยวเปล่า (บาท) — ตายตัวต่อ 1 ใบงาน */
export const SLIDE_FAILED_ATTEMPT_FEE = 500;

export const SLIDE_FAILED_ATTEMPT_LABEL = 'เที่ยวเปล่า (สไลด์ไม่สำเร็จ)';

/** หมายเหตุที่ Vendor ต้องพิมพ์เอง (บังคับ) */
export const SLIDE_FAIL_NOTE_MIN_LENGTH = 5;
export const SLIDE_FAIL_NOTE_MAX_LENGTH = 1000;

export function isFailedAttemptJob(job: { completionType?: string | null } | null | undefined): boolean {
  return job?.completionType === SLIDE_COMPLETION_FAILED_ATTEMPT;
}

/**
 * ราคาต่อคันเมื่อแสดงแยกรายคันในใบงานเที่ยวเปล่า:
 * คันแรกที่ไม่ถูกยกเลิกรับยอดทั้งหมด คันอื่นเป็น 0 — ยอดรวมทั้งใบจึงเท่ากับค่าเที่ยวเปล่าเสมอ
 */
export function getFailedAttemptItemPrice<T extends { id: string; status?: string | null }>(
  items: T[],
  itemId: string
): number {
  const firstActive = items.find(i => i.status !== 'CANCELLED');
  return firstActive && firstActive.id === itemId ? SLIDE_FAILED_ATTEMPT_FEE : 0;
}

