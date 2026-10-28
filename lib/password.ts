import bcrypt from 'bcryptjs';

/**
 * นโยบายรหัสผ่านกลาง (ใช้ทุกจุดที่ตั้ง/เปลี่ยนรหัสผ่าน)
 * - ยาวอย่างน้อย 8 ตัวอักษร
 * - ต้องมีทั้งตัวอักษร (A-Z/a-z) และตัวเลข
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt cost factor สำหรับ hash ใหม่
 * hash เดิมที่ cost 10 ยังตรวจด้วย bcrypt.compare ได้ตามปกติ (cost ถูกเก็บไว้ใน hash)
 */
export const BCRYPT_ROUNDS = 12;

/**
 * bcrypt hash (cost 12) ของสตริงสุ่มที่ไม่มีใครรู้ — ใช้ compare แทนเมื่อไม่พบ user / user ถูกปิดใช้งาน
 * เพื่อให้เวลาตอบสนองของ login ใกล้เคียงกับกรณี user มีอยู่จริง (กัน user enumeration ด้วย timing)
 */
export const DUMMY_PASSWORD_HASH = '$2b$12$jY32oOi0.LMFBL0TB/Rw1.Pr2X0PFxrf7wpDbRkdiifVFKZBih8Ni';

/** คืนข้อความ error (ภาษาไทย) เมื่อรหัสผ่านไม่ผ่านนโยบาย หรือ null เมื่อผ่าน */
export function validatePasswordStrength(pw: unknown): string | null {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN_LENGTH) {
    return `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`;
  }
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข';
  return null;
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}
