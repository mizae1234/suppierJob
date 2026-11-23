import { z } from 'zod';
import {
  optionalFiniteNumber,
  optionalString,
  requiredFiniteNumber,
} from './parse-body';

/** พิกัดสำหรับ PATCH ที่แยกความต่างระหว่าง undefined (ไม่แก้) กับ null/'' (ล้างค่าพิกัด) */
function patchCoordinate(min: number, max: number, label: string) {
  return z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === null || val === '') return null;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return null;
        return Number(trimmed);
      }
      return val;
    },
    z
      .number({ error: `${label}ต้องเป็นตัวเลข` })
      .refine(Number.isFinite, { message: `${label}ไม่ถูกต้อง` })
      .min(min, `${label}ต้องอยู่ระหว่าง ${min} ถึง ${max}`)
      .max(max, `${label}ต้องอยู่ระหว่าง ${min} ถึง ${max}`)
      .nullable()
      .optional()
  );
}

// ─── POST /api/branches ──────────────────────────────────────────────────────

export const createBranchSchema = z.object({
  companyId: z
    .string({ error: 'กรุณาระบุบริษัท (companyId)' })
    .trim()
    .min(1, 'กรุณาระบุบริษัท (companyId)')
    .max(100),
  code: z
    .string({ error: 'กรุณาระบุรหัสสาขา' })
    .trim()
    .min(1, 'กรุณาระบุรหัสสาขา')
    .max(50, 'รหัสสาขาต้องไม่เกิน 50 ตัวอักษร'),
  name: z
    .string({ error: 'กรุณาระบุชื่อสาขา' })
    .trim()
    .min(1, 'กรุณาระบุชื่อสาขา')
    .max(200, 'ชื่อสาขาต้องไม่เกิน 200 ตัวอักษร'),
  phone: optionalString(50, 'เบอร์โทรศัพท์'),
  address: optionalString(500, 'ที่อยู่'),
  latitude: optionalFiniteNumber({ min: -90, max: 90, label: 'ละติจูด (Latitude)' }),
  longitude: optionalFiniteNumber({ min: -180, max: 180, label: 'ลองจิจูด (Longitude)' }),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

// ─── PATCH /api/branches/[id] ────────────────────────────────────────────────

export const updateBranchSchema = z.object({
  name: z
    .string({ error: 'ชื่อสาขาต้องเป็นข้อความ' })
    .trim()
    .max(200, 'ชื่อสาขาต้องไม่เกิน 200 ตัวอักษร')
    .optional(),
  code: z
    .string({ error: 'รหัสสาขาต้องเป็นข้อความ' })
    .trim()
    .max(50, 'รหัสสาขาต้องไม่เกิน 50 ตัวอักษร')
    .optional(),
  phone: optionalString(50, 'เบอร์โทรศัพท์'),
  address: optionalString(500, 'ที่อยู่'),
  latitude: patchCoordinate(-90, 90, 'ละติจูด (Latitude)'),
  longitude: patchCoordinate(-180, 180, 'ลองจิจูด (Longitude)'),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

// ─── PATCH /api/branches/[id]/location ───────────────────────────────────────

export const updateBranchLocationSchema = z.object({
  latitude: requiredFiniteNumber(-90, 90, 'ละติจูด (Latitude)'),
  longitude: requiredFiniteNumber(-180, 180, 'ลองจิจูด (Longitude)'),
  address: optionalString(500, 'ที่อยู่'),
});

export type UpdateBranchLocationInput = z.infer<typeof updateBranchLocationSchema>;
