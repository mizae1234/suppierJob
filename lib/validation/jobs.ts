import { z } from 'zod';
import { JOB_STATUSES, CAR_WASH_ITEM_STATUSES } from '@/lib/services/jobs/state-machine';
import {
  SLIDE_FAIL_NOTE_MIN_LENGTH,
  SLIDE_FAIL_NOTE_MAX_LENGTH,
} from '@/lib/slide-failed-attempt';
import { MANUAL_PRICE_NOTE_MAX_LENGTH } from '@/lib/slide-pricing';
import {
  optionalDateString,
  optionalFiniteNumber,
  optionalString,
  optionalTrimmedId,
} from './parse-body';

// ─── POST /api/jobs (สร้างใบงานล้างรถ / รถสไลด์) ─────────────────────────────

export const carWashJobItemSchema = z.object({
  vin: z
    .string({ error: 'กรุณาระบุเลขตัวถัง (VIN)' })
    .trim()
    .min(1, 'กรุณาระบุเลขตัวถัง (VIN)')
    .max(50, 'เลขตัวถัง (VIN) ต้องไม่เกิน 50 ตัวอักษร'),
  actualWashDate: z
    .string({ error: 'กรุณาระบุวันที่ล้างรถ' })
    .trim()
    .min(1, 'กรุณาระบุวันที่ล้างรถ')
    .max(100, 'วันที่ล้างรถยาวเกินกำหนด')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: 'รูปแบบวันที่ล้างรถไม่ถูกต้อง',
    }),
  washType: optionalString(100, 'ประเภทการล้าง'),
  unitPrice: optionalFiniteNumber({ min: 0, max: 1_000_000, label: 'ราคาต่อคัน' }),
  remarks: optionalString(1000, 'หมายเหตุ'),
  model: optionalString(200, 'รุ่นรถ'),
  color: optionalString(100, 'สีรถ'),
  licensePlate: optionalString(50, 'ทะเบียนรถ'),
  isCustomServiceVehicle: z.boolean().optional(),
});

export const createCarWashJobSchema = z.object({
  jobType: z.literal('CAR_WASH'),
  companyId: z
    .string({ error: 'กรุณาระบุบริษัท (companyId)' })
    .trim()
    .min(1, 'กรุณาระบุบริษัท (companyId)')
    .max(100),
  branchId: optionalTrimmedId(100),
  supplierId: z
    .string({ error: 'กรุณาระบุ Supplier (supplierId)' })
    .trim()
    .min(1, 'กรุณาระบุ Supplier (supplierId)')
    .max(100),
  requestedBy: optionalString(200, 'ผู้สั่งงาน'),
  requesterPosition: optionalString(200, 'ตำแหน่งผู้สั่งงาน'),
  requesterPhone: optionalString(50, 'เบอร์โทรผู้สั่งงาน'),
  estimatedCost: optionalFiniteNumber({ min: 0, max: 100_000_000, label: 'ค่าบริการประมาณการ' }),
  carCategory: z.enum(['NEW_CAR', 'SERVICE'], { error: 'ประเภทกลุ่มรถไม่ถูกต้อง' }).nullish(),
  transferReason: optionalString(1000, 'เหตุผล'),
  items: z
    .array(carWashJobItemSchema, { error: 'กรุณาระบุรายการรถที่ต้องการล้าง' })
    .min(1, 'กรุณาเลือกรถอย่างน้อย 1 คัน')
    .max(200, 'สั่งล้างรถได้สูงสุด 200 คันต่อใบงาน'),
});

export const createVehicleSlideJobSchema = z
  .object({
    jobType: z.literal('VEHICLE_SLIDE'),
    companyId: optionalTrimmedId(100),
    branchId: optionalTrimmedId(100),
    supplierId: z
      .string({ error: 'กรุณาระบุ Supplier (supplierId)' })
      .trim()
      .min(1, 'กรุณาระบุ Supplier (supplierId)')
      .max(100),
    vin: optionalTrimmedId(50),
    vins: z
      .array(
        z.string({ error: 'เลขตัวถัง (VIN) ต้องเป็นข้อความ' }).trim().min(1, 'เลขตัวถัง (VIN) ห้ามว่าง').max(50)
      )
      .max(50, 'สั่งรถสไลด์ได้สูงสุด 50 คันต่อใบงาน')
      .optional(),
    pickupBranchId: optionalTrimmedId(100),
    // legacy alias — คงไว้รองรับ 1 release ก่อนตัดออก (client ใหม่ส่ง pickupBranchId)
    originBranchId: optionalTrimmedId(100),
    destBranchId: optionalTrimmedId(100),
    destWarehouseId: optionalString(50, 'รหัสคลัง D365 ปลายทาง'),
    customDestAddress: optionalString(500, 'ที่อยู่ปลายทาง'),
    customDestLat: optionalFiniteNumber({ min: -90, max: 90, label: 'ละติจูดปลายทาง' }),
    customDestLng: optionalFiniteNumber({ min: -180, max: 180, label: 'ลองจิจูดปลายทาง' }),
    customOriginAddress: optionalString(500, 'ที่อยู่จุดรับรถ'),
    customOriginLat: optionalFiniteNumber({ min: -90, max: 90, label: 'ละติจูดจุดรับรถ' }),
    customOriginLng: optionalFiniteNumber({ min: -180, max: 180, label: 'ลองจิจูดจุดรับรถ' }),
    pickupDateTime: optionalDateString('วันเวลารับรถ'),
    deliveryDateTime: optionalDateString('วันเวลาส่งมอบ'),
    contactPerson: optionalString(200, 'ผู้ติดต่อ'),
    contactPhone: optionalString(50, 'เบอร์โทรผู้ติดต่อ'),
    transferReason: optionalString(1000, 'เหตุผลการขนย้าย'),
    requestedBy: optionalString(200, 'ผู้สั่งงาน'),
    requesterPosition: optionalString(200, 'ตำแหน่งผู้สั่งงาน'),
    requesterPhone: optionalString(50, 'เบอร์โทรผู้สั่งงาน'),
    estimatedCost: optionalFiniteNumber({ min: 0, max: 100_000_000, label: 'ค่าบริการประมาณการ' }),
    distance: optionalFiniteNumber({ min: 0, max: 100_000, label: 'ระยะทาง (กม.)' }),
    pricingMode: z.enum(['AUTO', 'MANUAL'], { error: 'โหมดการคิดราคาไม่ถูกต้อง' }).nullish(),
    manualPriceNote: optionalString(MANUAL_PRICE_NOTE_MAX_LENGTH, 'หมายเหตุการกรอกราคาเอง'),
  })
  .superRefine((data, ctx) => {
    const hasVins = (Array.isArray(data.vins) && data.vins.length > 0) || Boolean(data.vin);
    if (!hasVins) {
      ctx.addIssue({
        code: 'custom',
        path: ['vins'],
        message: 'กรุณาระบุเลขตัวถัง (VIN) อย่างน้อย 1 คัน',
      });
    }
    const pickupId = data.pickupBranchId || data.originBranchId;
    if (!pickupId) {
      ctx.addIssue({
        code: 'custom',
        path: ['pickupBranchId'],
        message: 'กรุณาระบุสาขาต้นทาง (pickupBranchId)',
      });
    }
    if (!data.destBranchId && !data.customDestAddress?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['destBranchId'],
        message: 'กรุณาระบุสาขาปลายทางหรือที่อยู่จุดปักหมุดปลายทาง',
      });
    }
  });

export const createJobSchema = z.discriminatedUnion(
  'jobType',
  [createCarWashJobSchema, createVehicleSlideJobSchema],
  { error: 'ประเภทงาน (jobType) ต้องเป็น CAR_WASH หรือ VEHICLE_SLIDE' }
);

export type CreateJobInput = z.infer<typeof createJobSchema>;

// ─── PATCH /api/jobs/[id]/status ─────────────────────────────────────────────

export const updateJobStatusSchema = z.object({
  status: z.enum(JOB_STATUSES, {
    error: 'สถานะใบงานไม่ถูกต้อง',
  }),
  rejectReason: optionalString(1000, 'เหตุผล'),
  approvedBy: optionalString(200, 'ผู้อนุมัติ'),
  failedAttemptFee: optionalFiniteNumber({ max: 1_000_000, label: 'ค่าเที่ยวเปล่า' }).refine(
    (v) => v === undefined || v > 0,
    { message: 'ค่าเที่ยวเปล่าต้องมากกว่า 0 บาท' }
  ),
});

export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;

// ─── PATCH /api/jobs/[id]/items/[itemId]/status ──────────────────────────────

export const updateCarWashItemStatusSchema = z.object({
  status: z.enum(CAR_WASH_ITEM_STATUSES, {
    error: 'สถานะรายการรถต้องเป็น PENDING, COMPLETED, APPROVED, REJECTED หรือ CANCELLED',
  }),
  remarks: optionalString(1000, 'หมายเหตุ'),
});

export type UpdateCarWashItemStatusInput = z.infer<typeof updateCarWashItemStatusSchema>;

// ─── POST /api/jobs/[id]/items ───────────────────────────────────────────────

export const addJobItemInputSchema = z.object({
  vin: z
    .string({ error: 'กรุณาระบุเลขตัวถัง (VIN)' })
    .trim()
    .min(1, 'กรุณาระบุเลขตัวถัง (VIN)')
    .max(50, 'เลขตัวถัง (VIN) ต้องไม่เกิน 50 ตัวอักษร'),
  washType: optionalString(100, 'ประเภทการล้าง'),
  unitPrice: optionalFiniteNumber({ min: 0, max: 1_000_000, label: 'ราคาต่อคัน' }),
  remarks: optionalString(1000, 'หมายเหตุ'),
  actualWashDate: optionalDateString('วันที่ล้างรถ'),
  model: optionalString(200, 'รุ่นรถ'),
  color: optionalString(100, 'สีรถ'),
  licensePlate: optionalString(50, 'ทะเบียนรถ'),
});

export const addJobItemsSchema = z.object({
  items: z
    .array(addJobItemInputSchema, { error: 'กรุณาระบุรายการรถที่ต้องการเพิ่ม' })
    .min(1, 'กรุณาเลือกรถที่ต้องการเพิ่มอย่างน้อย 1 คัน')
    .max(200, 'เพิ่มรถได้สูงสุด 200 คันต่อครั้ง'),
});

export type AddJobItemsInput = z.infer<typeof addJobItemsSchema>;

// ─── POST /api/jobs/[id]/failed-attempt ──────────────────────────────────────

export const failedAttemptSchema = z.object({
  note: z
    .string({ error: 'กรุณาระบุหมายเหตุ / สาเหตุที่สไลด์ไม่ได้' })
    .trim()
    .min(
      SLIDE_FAIL_NOTE_MIN_LENGTH,
      `กรุณาระบุหมายเหตุ / สาเหตุที่สไลด์ไม่ได้ (อย่างน้อย ${SLIDE_FAIL_NOTE_MIN_LENGTH} ตัวอักษร)`
    )
    .max(
      SLIDE_FAIL_NOTE_MAX_LENGTH,
      `หมายเหตุต้องไม่เกิน ${SLIDE_FAIL_NOTE_MAX_LENGTH} ตัวอักษร`
    ),
  photos: z
    .array(
      z
        .string({ error: 'รูปแบบรูปภาพไม่ถูกต้อง' })
        .refine((p) => p.startsWith('data:image/'), {
          message: 'รูปภาพหลักฐานต้องเป็นไฟล์รูปภาพ (data:image/...)',
        }),
      { error: 'กรุณาถ่ายรูปหน้างานอย่างน้อย 1 รูปเพื่อเป็นหลักฐาน' }
    )
    .min(1, 'กรุณาถ่ายรูปหน้างานอย่างน้อย 1 รูปเพื่อเป็นหลักฐาน')
    .max(5, 'แนบรูปได้สูงสุด 5 รูป'),
});

export type FailedAttemptInput = z.infer<typeof failedAttemptSchema>;

// ─── POST /api/jobs/[id]/verify ──────────────────────────────────────────────

export const verifyVehicleSchema = z.object({
  itemId: optionalTrimmedId(100),
  photoUrl: z
    .string({ error: 'กรุณาถ่ายรูปยืนยันตัวรถเพื่อเป็นหลักฐาน' })
    .refine((p) => p.startsWith('data:image/'), {
      message: 'กรุณาถ่ายรูปยืนยันตัวรถเพื่อเป็นหลักฐาน',
    }),
});

export type VerifyVehicleInput = z.infer<typeof verifyVehicleSchema>;
