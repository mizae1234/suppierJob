import { randomInt } from 'crypto';

/**
 * สร้างเลข Invoice ชุดแรกของระบบในรูปแบบ INV-<COMPANY>-<YYMM>-<SUFFIX>
 * ใช้ตอนอนุมัติใบงาน (APPROVED) และเป็น fallback ตอนสร้างใบวางบิลหากไม่มีเลขเดิม
 */
export function generateInitialInvoiceNumber(
  companyCode: string,
  now: Date = new Date()
): string {
  const normalizedCode = (companyCode || 'GI').trim().toUpperCase() || 'GI';
  const dateSeq = now.toISOString().slice(2, 7).replace('-', '');
  const uniqueSuffix = `${Date.now().toString().slice(-4)}${randomInt(100, 1000)}`;
  return `INV-${normalizedCode}-${dateSeq}-${uniqueSuffix}`;
}
