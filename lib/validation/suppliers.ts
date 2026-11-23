import { z } from 'zod';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAX_ID_PATTERN = /^\d{13}$/;

/** แปลงข้อความ optional/nullable สำหรับฟิลด์ Supplier (ว่าง/null → null) */
function supplierOptionalString(maxLength: number, label: string) {
  return z
    .union([
      z.null(),
      z
        .string({ error: `รูปแบบข้อมูล${label}ไม่ถูกต้อง` })
        .transform((s) => s.trim())
        .refine((s) => s.length <= maxLength, {
          message: `${label}ต้องไม่เกิน ${maxLength} ตัวอักษร`,
        })
        .transform((s) => (s ? s : null)),
    ])
    .optional();
}

// ─── PATCH /api/suppliers/[id] ───────────────────────────────────────────────

export const updateSupplierSchema = z.object({
  phone: supplierOptionalString(50, 'เบอร์โทรศัพท์'),
  email: z
    .union([
      z.null(),
      z
        .string({ error: 'รูปแบบข้อมูลอีเมลไม่ถูกต้อง' })
        .transform((s) => s.trim())
        .refine((s) => s.length <= 120, {
          message: 'อีเมลต้องไม่เกิน 120 ตัวอักษร',
        })
        .refine((s) => s === '' || EMAIL_PATTERN.test(s), {
          message: 'รูปแบบอีเมลไม่ถูกต้อง',
        })
        .transform((s) => (s ? s : null)),
    ])
    .optional(),
  address: supplierOptionalString(500, 'ที่อยู่'),
  bankName: supplierOptionalString(120, 'ชื่อธนาคาร'),
  bankAccount: supplierOptionalString(50, 'เลขที่บัญชีธนาคาร'),
  taxId: z
    .union([
      z.null(),
      z
        .string({ error: 'รูปแบบข้อมูลเลขประจำตัวผู้เสียภาษีไม่ถูกต้อง' })
        .transform((s) => s.trim())
        .refine((s) => s === '' || TAX_ID_PATTERN.test(s), {
          message: 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก',
        })
        .transform((s) => (s ? s : null)),
    ])
    .optional(),
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// ─── PUT /api/suppliers/[id]/vendor-codes ────────────────────────────────────

export const upsertVendorCodeSchema = z.object({
  branchId: z
    .string({ error: 'กรุณาระบุสาขา' })
    .trim()
    .min(1, 'กรุณาระบุสาขา')
    .max(100),
  vendorCode: z
    .string({ error: 'กรุณาระบุรหัส Vendor' })
    .trim()
    .min(1, 'กรุณาระบุรหัส Vendor')
    .max(50, 'รหัส Vendor ต้องไม่เกิน 50 ตัวอักษร'),
});

export type UpsertVendorCodeInput = z.infer<typeof upsertVendorCodeSchema>;
