import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export type ParseBodyResult<T> =
  | { data: T; response?: never }
  | { data?: never; response: NextResponse };

/**
 * แปลง path ของ ZodIssue เป็นชื่อฟิลด์ที่อ่านง่าย (ใช้ label ภาษาไทยถ้ากำหนดไว้)
 */
function formatIssuePath(path: ReadonlyArray<PropertyKey>, fieldLabels?: Record<string, string>): string {
  if (path.length === 0) return '';
  const dotted = path.map((seg) => String(seg)).join('.');
  const firstKey = String(path[0]);
  if (fieldLabels?.[dotted]) return fieldLabels[dotted];
  if (path.length === 1 && fieldLabels?.[firstKey]) return fieldLabels[firstKey];
  return dotted;
}

/**
 * แปลงข้อความ error จาก Zod เป็นภาษาไทยเมื่อยังเป็นข้อความเริ่มต้นภาษาอังกฤษ
 */
function localizeIssueMessage(issue: z.core.$ZodIssue): string {
  const msg = issue.message;
  // หากเป็นข้อความภาษาไทยที่กำหนดไว้ใน schema แล้ว ใช้ตรงๆ ได้เลย
  if (/[\u0E00-\u0E7F]/.test(msg)) {
    return msg;
  }

  switch (issue.code) {
    case 'invalid_type':
      return 'ประเภทข้อมูลไม่ถูกต้อง';
    case 'invalid_value':
      return 'ค่าที่ระบุไม่ถูกต้อง';
    case 'too_small':
      return 'ข้อมูลสั้นหรือน้อยเกินกำหนด';
    case 'too_big':
      return 'ข้อมูลยาวหรือมากเกินกำหนด';
    case 'invalid_format':
      return 'รูปแบบข้อมูลไม่ถูกต้อง';
    case 'invalid_union':
      return 'ค่าที่ระบุไม่ตรงกับรูปแบบที่รองรับ';
    default:
      return msg || 'ข้อมูลไม่ถูกต้อง';
  }
}

/**
 * สร้างข้อความ error ภาษาไทยรวมรายการฟิลด์ที่ไม่ผ่านการตรวจสอบจาก ZodError
 */
export function formatZodError(error: z.ZodError, fieldLabels?: Record<string, string>): string {
  const parts: string[] = [];
  const seen = new Set<string>();

  for (const issue of error.issues) {
    const field = formatIssuePath(issue.path, fieldLabels);
    const reason = localizeIssueMessage(issue);
    const entry = field ? `${field} (${reason})` : reason;
    if (!seen.has(entry)) {
      seen.add(entry);
      parts.push(entry);
    }
  }

  if (parts.length === 0) {
    return 'ข้อมูลคำขอไม่ถูกต้อง';
  }
  return `ข้อมูลไม่ถูกต้อง: ${parts.join(', ')}`;
}

/**
 * อ่านและตรวจสอบ JSON body ด้วย Zod schema
 * คืน `{ data }` เมื่อผ่าน หรือ `{ response }` (HTTP 400 พร้อมข้อความภาษาไทยระบุฟิลด์ที่ไม่ถูกต้อง)
 */
export async function parseBody<T>(
  request: NextRequest | Request,
  schema: z.ZodType<T>,
  fieldLabels?: Record<string, string>
): Promise<ParseBodyResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      response: NextResponse.json(
        { error: 'รูปแบบข้อมูล JSON ไม่ถูกต้อง' },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: formatZodError(parsed.error, fieldLabels) },
        { status: 400 }
      ),
    };
  }

  return { data: parsed.data };
}

// ─── Shared Zod Field Helpers ────────────────────────────────────────────────

/** ข้อความเสริม (optional/nullable) จำกัดความยาว */
export function optionalString(maxLength: number, label = 'ข้อความ') {
  return z
    .string({ error: `${label}ต้องเป็นข้อความ` })
    .max(maxLength, `${label}ต้องไม่เกิน ${maxLength} ตัวอักษร`)
    .nullish();
}

/** ข้อความที่ไม่ว่างเมื่อระบุค่า (อนุญาต undefined / null / '' ให้เป็นค่าว่าง) */
export function optionalTrimmedId(maxLength = 100) {
  return z
    .string({ error: 'ต้องเป็นข้อความ' })
    .trim()
    .max(maxLength, `ต้องไม่เกิน ${maxLength} ตัวอักษร`)
    .nullish();
}

/**
 * ตัวเลขแบบ optional/nullable ที่ยอมรับทั้ง number และ string ตัวเลข (และถือ '' / null / undefined เป็น undefined)
 * ใช้กับฟิลด์จากฟอร์มที่ส่งเป็น number หรือ string เช่น distance, estimatedCost, latitude, longitude
 */
export function optionalFiniteNumber(options: {
  min?: number;
  max?: number;
  label?: string;
} = {}) {
  const { min, max, label = 'ตัวเลข' } = options;

  let numSchema = z.number({ error: `${label}ต้องเป็นตัวเลข` }).refine(Number.isFinite, {
    message: `${label}ไม่ถูกต้อง`,
  });
  if (min !== undefined) {
    numSchema = numSchema.min(min, `${label}ต้องไม่น้อยกว่า ${min}`);
  }
  if (max !== undefined) {
    numSchema = numSchema.max(max, `${label}ต้องไม่เกิน ${max}`);
  }

  return z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      return Number(trimmed);
    }
    return val;
  }, numSchema.optional());
}

/** ตัวเลขพิกัดที่บังคับ (ปฏิเสธ null / undefined / '' / NaN) */
export function requiredFiniteNumber(min: number, max: number, label: string) {
  return z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return undefined;
        return Number(trimmed);
      }
      return val;
    },
    z
      .number({ error: `กรุณาระบุ${label}เป็นตัวเลข` })
      .refine(Number.isFinite, { message: `${label}ไม่ถูกต้อง` })
      .min(min, `${label}ต้องอยู่ระหว่าง ${min} ถึง ${max}`)
      .max(max, `${label}ต้องอยู่ระหว่าง ${min} ถึง ${max}`)
  );
}

/** วันที่รูปแบบ ISO / YYYY-MM-DD แบบ optional/nullable (อนุญาต '' เป็นค่าว่าง) */
export function optionalDateString(label = 'วันที่') {
  return z
    .string({ error: `${label}ต้องเป็นข้อความ` })
    .max(100, `${label}ยาวเกินกำหนด`)
    .refine(
      (val) => {
        const trimmed = val.trim();
        if (!trimmed) return true;
        return !Number.isNaN(new Date(trimmed).getTime());
      },
      { message: `รูปแบบ${label}ไม่ถูกต้อง` }
    )
    .nullish();
}
