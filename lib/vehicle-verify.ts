/**
 * ยืนยันตัวรถก่อนเริ่มงาน (Supplier Check-in)
 * ใช้ได้ทั้งฝั่ง server (ตรวจจริง) — ห้ามส่งค่า VIN/ทะเบียนที่ถูกต้องกลับไปให้ client เทียบเอง
 */

export const VIN_SUFFIX_LENGTH = 6;

export type VerifyMethod = 'VIN' | 'PLATE';

/** ตัดช่องว่าง/ขีด/จุด และทำเป็นตัวพิมพ์ใหญ่ (คงตัวอักษรไทยไว้) */
export function normalizeIdentifier(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z\u0E00-\u0E7F]/g, '');
}

/**
 * ดึง "หมวด + เลข" ของป้ายทะเบียน (ตัดชื่อจังหวัดท้ายป้ายออก)
 * เช่น "กข-9988 กทม" → "กข9988", "1กข 234 กรุงเทพมหานคร" → "1กข234"
 */
export function plateCore(plate: string): string | null {
  const match = plate
    .toUpperCase()
    .trim()
    .match(/^([0-9]?[\u0E01-\u0E2EA-Z]{1,3})[\s\-.]*([0-9]{1,4})/);
  return match ? `${match[1]}${match[2]}` : null;
}

/** ป้ายแดง / ไม่มีทะเบียน → ใช้ยืนยันด้วยทะเบียนไม่ได้ */
export function hasUsablePlate(plate?: string | null): boolean {
  if (!plate) return false;
  const n = normalizeIdentifier(plate);
  if (!n || n.includes('ป้ายแดง') || n === '-') return false;
  return plateCore(plate) !== null;
}

/**
 * ตรวจค่าที่ Supplier กรอก เทียบกับรถคันจริง
 * - VIN: ยอมรับ 6 ตัวท้ายขึ้นไป (ต้องเป็นส่วนท้ายของ VIN)
 * - PLATE: ยอมรับ "หมวด+เลข" (มีหรือไม่มีจังหวัดก็ได้)
 */
export function matchVehicleIdentifier(
  input: string,
  vehicle: { vin: string; licensePlate?: string | null }
): VerifyMethod | null {
  const value = normalizeIdentifier(input);
  if (!value) return null;

  const vin = normalizeIdentifier(vehicle.vin);
  if (value.length >= VIN_SUFFIX_LENGTH && /^[0-9A-Z]+$/.test(value) && vin.endsWith(value)) {
    return 'VIN';
  }

  if (vehicle.licensePlate && hasUsablePlate(vehicle.licensePlate)) {
    const full = normalizeIdentifier(vehicle.licensePlate);
    const core = plateCore(vehicle.licensePlate);
    if (value === full || (core && value === normalizeIdentifier(core))) {
      return 'PLATE';
    }
  }

  return null;
}
