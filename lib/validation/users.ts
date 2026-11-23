import { z } from 'zod';
import { optionalString, optionalTrimmedId } from './parse-body';

export const USER_ROLES = ['MASTER', 'ADMIN', 'BRANCH', 'SUPPLIER'] as const;

// ─── POST /api/users ─────────────────────────────────────────────────────────

export const createUserSchema = z
  .object({
    username: z
      .string({ error: 'กรุณากรอกชื่อผู้ใช้ (Username)' })
      .trim()
      .min(3, 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร')
      .max(100, 'ชื่อผู้ใช้ต้องไม่เกิน 100 ตัวอักษร'),
    password: z
      .string({ error: 'กรุณากรอกรหัสผ่าน' })
      .min(1, 'กรุณากรอกรหัสผ่าน')
      .max(200, 'รหัสผ่านยาวเกินกำหนด'),
    displayName: z
      .string({ error: 'กรุณากรอกชื่อที่แสดง (Display Name)' })
      .trim()
      .min(1, 'กรุณากรอกชื่อที่แสดง (Display Name)')
      .max(200, 'ชื่อที่แสดงต้องไม่เกิน 200 ตัวอักษร'),
    firstName: optionalString(100, 'ชื่อจริง'),
    lastName: optionalString(100, 'นามสกุล'),
    position: optionalString(150, 'ตำแหน่งงาน'),
    phone: optionalString(50, 'เบอร์โทรศัพท์'),
    role: z.enum(USER_ROLES, { error: 'บทบาท (Role) ไม่ถูกต้อง' }),
    companyId: optionalTrimmedId(100),
    branchId: optionalTrimmedId(100),
    supplierId: optionalTrimmedId(100),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'BRANCH' && !data.branchId) {
      ctx.addIssue({
        code: 'custom',
        path: ['branchId'],
        message: 'ผู้ใช้งานระดับสาขาจำเป็นต้องระบุสาขา',
      });
    }
    if (data.role === 'SUPPLIER' && !data.supplierId) {
      ctx.addIssue({
        code: 'custom',
        path: ['supplierId'],
        message: 'ผู้ใช้งานคู่ค้าจำเป็นต้องระบุ Supplier',
      });
    }
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ─── PUT /api/users/[id] ─────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  displayName: z
    .string({ error: 'กรุณากรอกชื่อที่แสดง (Display Name)' })
    .trim()
    .min(1, 'กรุณากรอกชื่อที่แสดง (Display Name)')
    .max(200, 'ชื่อที่แสดงต้องไม่เกิน 200 ตัวอักษร'),
  firstName: optionalString(100, 'ชื่อจริง'),
  lastName: optionalString(100, 'นามสกุล'),
  position: optionalString(150, 'ตำแหน่งงาน'),
  phone: optionalString(50, 'เบอร์โทรศัพท์'),
  role: z.enum(USER_ROLES, { error: 'บทบาท (Role) ไม่ถูกต้อง' }).optional(),
  companyId: optionalTrimmedId(100),
  branchId: optionalTrimmedId(100),
  supplierId: optionalTrimmedId(100),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ─── PATCH /api/users/[id]/status ────────────────────────────────────────────

export const toggleUserStatusSchema = z.object({
  isActive: z.boolean({ error: 'สถานะการใช้งานต้องเป็น true หรือ false' }).optional(),
});

export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>;
