import { describe, expect, it } from 'vitest';
import {
  getFailedAttemptFee,
  getFailedAttemptItemPrice,
  SLIDE_FAILED_ATTEMPT_FEE,
} from '@/lib/slide-failed-attempt';
import {
  parseBody,
  createJobSchema,
  updateJobStatusSchema,
  updateCarWashItemStatusSchema,
  addJobItemsSchema,
  failedAttemptSchema,
  verifyVehicleSchema,
  createUserSchema,
  updateUserSchema,
  createBranchSchema,
  updateBranchSchema,
  updateBranchLocationSchema,
  updateSupplierSchema,
  upsertVendorCodeSchema,
  createInvoiceSchema,
} from '@/lib/validation';

function makeJsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('validation: parseBody', () => {
  it('คืน data เมื่อ JSON และ schema ถูกต้อง', async () => {
    const res = await parseBody(
      makeJsonRequest({ status: 'APPROVED', approvedBy: 'สาขา GI01' }),
      updateJobStatusSchema
    );
    expect(res.response).toBeUndefined();
    expect(res.data).toEqual({ status: 'APPROVED', approvedBy: 'สาขา GI01' });
  });

  it('คืน 400 พร้อมข้อความภาษาไทยเมื่อ JSON เสียหาย', async () => {
    const badReq = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-valid-json',
    });
    const res = await parseBody(badReq, updateJobStatusSchema);
    expect(res.data).toBeUndefined();
    expect(res.response?.status).toBe(400);
    const json = await res.response?.json();
    expect(json.error).toContain('JSON');
  });

  it('คืน 400 พร้อมข้อความภาษาไทยระบุชื่อฟิลด์เมื่อ schema ไม่ผ่าน', async () => {
    const res = await parseBody(makeJsonRequest({ status: 'INVALID' }), updateJobStatusSchema);
    expect(res.response?.status).toBe(400);
    const json = await res.response?.json();
    expect(json.error).toContain('ข้อมูลไม่ถูกต้อง');
    expect(json.error).toContain('status');
  });
});

describe('validation: jobs schemas', () => {
  it('createJobSchema: รองรับ CAR_WASH ที่ถูกต้องและปฏิเสธเมื่อไม่มีรายการรถ', () => {
    const valid = createJobSchema.safeParse({
      jobType: 'CAR_WASH',
      companyId: 'comp-1',
      branchId: 'br-1',
      supplierId: 'sup-1',
      carCategory: 'NEW_CAR',
      estimatedCost: 500,
      items: [
        {
          vin: 'VIN0001',
          actualWashDate: '2026-11-21',
          washType: 'WASH_NORMAL',
          unitPrice: 250,
          remarks: 'ล้างส่งมอบ',
        },
      ],
    });
    expect(valid.success).toBe(true);

    const emptyItems = createJobSchema.safeParse({
      jobType: 'CAR_WASH',
      companyId: 'comp-1',
      supplierId: 'sup-1',
      items: [],
    });
    expect(emptyItems.success).toBe(false);
  });

  it('createJobSchema: รองรับ VEHICLE_SLIDE ทั้ง pickupBranchId และ legacy originBranchId', () => {
    const canonical = createJobSchema.safeParse({
      jobType: 'VEHICLE_SLIDE',
      companyId: 'comp-1',
      branchId: 'br-1',
      pickupBranchId: 'br-1',
      destBranchId: 'br-2',
      destWarehouseId: '62010',
      supplierId: 'sup-slide',
      vins: ['VIN001', 'VIN002'],
      distance: 42.5,
      estimatedCost: 2000,
      pricingMode: 'AUTO',
    });
    expect(canonical.success).toBe(true);

    const legacy = createJobSchema.safeParse({
      jobType: 'VEHICLE_SLIDE',
      supplierId: 'sup-slide',
      vin: 'VIN001',
      originBranchId: 'br-1',
      customDestAddress: 'บ้านลูกค้า รามอินทรา',
      customDestLat: 13.81,
      customDestLng: 100.62,
    });
    expect(legacy.success).toBe(true);

    const missingDest = createJobSchema.safeParse({
      jobType: 'VEHICLE_SLIDE',
      supplierId: 'sup-slide',
      vin: 'VIN001',
      pickupBranchId: 'br-1',
    });
    expect(missingDest.success).toBe(false);

    const badCoord = createJobSchema.safeParse({
      jobType: 'VEHICLE_SLIDE',
      supplierId: 'sup-slide',
      vin: 'VIN001',
      pickupBranchId: 'br-1',
      customDestAddress: 'บ้านลูกค้า',
      customDestLat: 120,
    });
    expect(badCoord.success).toBe(false);
  });

  it('updateCarWashItemStatusSchema & addJobItemsSchema', () => {
    expect(updateCarWashItemStatusSchema.safeParse({ status: 'APPROVED' }).success).toBe(true);
    expect(updateCarWashItemStatusSchema.safeParse({ status: 'DONE' }).success).toBe(false);

    expect(addJobItemsSchema.safeParse({ items: [{ vin: 'VIN123' }] }).success).toBe(true);
    expect(addJobItemsSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it('failedAttemptSchema & verifyVehicleSchema', () => {
    const img = 'data:image/jpeg;base64,/9j/4AAQ';
    expect(
      failedAttemptSchema.safeParse({ note: 'รถจอดขวางหน้าทางเข้าออกไม่ได้', photos: [img] }).success
    ).toBe(true);
    expect(failedAttemptSchema.safeParse({ note: 'สั้น', photos: [img] }).success).toBe(false);
    expect(
      failedAttemptSchema.safeParse({ note: 'รถแบตหมดสตาร์ทไม่ได้', photos: ['https://x.com/a.jpg'] })
        .success
    ).toBe(false);
    expect(
      failedAttemptSchema.safeParse({
        note: 'รถแบตหมดสตาร์ทไม่ได้',
        photos: [img, img, img, img, img, img],
      }).success
    ).toBe(false);

    expect(verifyVehicleSchema.safeParse({ photoUrl: img, itemId: 'item-1' }).success).toBe(true);
    expect(verifyVehicleSchema.safeParse({ photoUrl: 'not-an-image' }).success).toBe(false);
  });

  it('updateJobStatusSchema & getFailedAttemptFee: รองรับการแก้ไขค่าเที่ยวเปล่าและบังคับ > 0', () => {
    expect(updateJobStatusSchema.safeParse({ status: 'APPROVED' }).success).toBe(true);
    expect(
      updateJobStatusSchema.safeParse({ status: 'APPROVED', failedAttemptFee: 850 }).success
    ).toBe(true);
    expect(
      updateJobStatusSchema.safeParse({ status: 'APPROVED', failedAttemptFee: '1200.5' }).success
    ).toBe(true);
    expect(
      updateJobStatusSchema.safeParse({ status: 'APPROVED', failedAttemptFee: 0 }).success
    ).toBe(false);
    expect(
      updateJobStatusSchema.safeParse({ status: 'APPROVED', failedAttemptFee: -100 }).success
    ).toBe(false);

    expect(getFailedAttemptFee(null)).toBe(SLIDE_FAILED_ATTEMPT_FEE);
    expect(getFailedAttemptFee({ actualCost: null })).toBe(SLIDE_FAILED_ATTEMPT_FEE);
    expect(getFailedAttemptFee({ actualCost: 0 })).toBe(SLIDE_FAILED_ATTEMPT_FEE);
    expect(getFailedAttemptFee({ actualCost: 750 })).toBe(750);

    const items = [
      { id: 'c1', status: 'CANCELLED' },
      { id: 'c2', status: 'COMPLETED' },
      { id: 'c3', status: 'COMPLETED' },
    ];
    expect(getFailedAttemptItemPrice(items, 'c1', 750)).toBe(0);
    expect(getFailedAttemptItemPrice(items, 'c2', 750)).toBe(750);
    expect(getFailedAttemptItemPrice(items, 'c3', 750)).toBe(0);
  });
});

describe('validation: users, branches, suppliers, invoices schemas', () => {
  it('createUserSchema บังคับ branchId สำหรับ BRANCH และ supplierId สำหรับ SUPPLIER', () => {
    expect(
      createUserSchema.safeParse({
        username: 'branch01',
        password: 'Password1',
        displayName: 'สมชาย',
        role: 'BRANCH',
        branchId: 'br-1',
      }).success
    ).toBe(true);

    expect(
      createUserSchema.safeParse({
        username: 'branch01',
        password: 'Password1',
        displayName: 'สมชาย',
        role: 'BRANCH',
        branchId: '',
      }).success
    ).toBe(false);

    expect(
      createUserSchema.safeParse({
        username: 'sup01',
        password: 'Password1',
        displayName: 'คู่ค้า',
        role: 'SUPPLIER',
        supplierId: null,
      }).success
    ).toBe(false);

    expect(updateUserSchema.safeParse({ displayName: 'ชื่อใหม่', role: 'ADMIN' }).success).toBe(true);
    expect(updateUserSchema.safeParse({ displayName: '' }).success).toBe(false);
  });

  it('branch schemas ตรวจสอบพิกัดและแยก undefined กับ null ได้ใน updateBranchSchema', () => {
    expect(
      createBranchSchema.safeParse({
        companyId: 'comp-1',
        code: 'GI99',
        name: 'สาขาทดสอบ',
        latitude: 13.7563,
        longitude: 100.5018,
      }).success
    ).toBe(true);

    const patchCleared = updateBranchSchema.safeParse({ latitude: null, longitude: '' });
    expect(patchCleared.success).toBe(true);
    if (patchCleared.success) {
      expect(patchCleared.data.latitude).toBeNull();
      expect(patchCleared.data.longitude).toBeNull();
    }

    const patchOmitted = updateBranchSchema.safeParse({ phone: '02-123-4567' });
    expect(patchOmitted.success).toBe(true);
    if (patchOmitted.success) {
      expect(patchOmitted.data.latitude).toBeUndefined();
    }

    expect(updateBranchLocationSchema.safeParse({ latitude: 13.75, longitude: 100.5 }).success).toBe(true);
    expect(updateBranchLocationSchema.safeParse({ latitude: null, longitude: 100.5 }).success).toBe(false);
    expect(updateBranchLocationSchema.safeParse({ latitude: 95, longitude: 100.5 }).success).toBe(false);
  });

  it('supplier & vendor-codes schemas', () => {
    const ok = updateSupplierSchema.safeParse({
      email: 'contact@example.com',
      taxId: '0105565012345',
      phone: '   ',
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.phone).toBeNull();
      expect(ok.data.taxId).toBe('0105565012345');
    }

    expect(updateSupplierSchema.safeParse({ taxId: '12345' }).success).toBe(false);
    expect(updateSupplierSchema.safeParse({ email: 'bad-email' }).success).toBe(false);

    expect(upsertVendorCodeSchema.safeParse({ branchId: 'br-1', vendorCode: 'V000342' }).success).toBe(true);
    expect(upsertVendorCodeSchema.safeParse({ branchId: '', vendorCode: 'V000342' }).success).toBe(false);
  });

  it('createInvoiceSchema', () => {
    expect(
      createInvoiceSchema.safeParse({
        supplierId: 'sup-1',
        companyId: 'comp-1',
        jobIds: ['job-1', 'job-2'],
        dueDate: '2026-12-21',
        notes: 'วางบิลประจำเดือน',
      }).success
    ).toBe(true);

    expect(
      createInvoiceSchema.safeParse({
        supplierId: 'sup-1',
        companyId: 'comp-1',
        jobIds: [],
      }).success
    ).toBe(false);

    expect(
      createInvoiceSchema.safeParse({
        supplierId: 'sup-1',
        companyId: 'comp-1',
        jobIds: ['job-1'],
        dueDate: 'not-a-date',
      }).success
    ).toBe(false);
  });
});
