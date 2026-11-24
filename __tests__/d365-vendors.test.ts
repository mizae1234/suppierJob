import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockD365PostService = vi.fn();

vi.mock('@/lib/d365/client', () => ({
  d365PostService: (...args: unknown[]) => mockD365PostService(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    branch: { findMany: vi.fn() },
    supplier: { findUnique: vi.fn(), update: vi.fn() },
    supplierVendorCode: { create: vi.fn(), update: vi.fn() },
  },
}));

import {
  isVendorUsable,
  normalizeCompany,
  normalizeVendorCode,
  normalizeD365Address,
  buildSupplierProfileUpdate,
  getVendorsFromD365,
  findVendorInCompany,
  GET_VENDORS_SERVICE_PATH,
  type D365VendorRecord,
} from '@/lib/d365/vendors';
import {
  normalizeD365PaymentType,
  parsePaymentTermsDays,
  resolveD365PoPaymentType,
} from '@/lib/d365/po';

describe('d365/vendors', () => {
  beforeEach(() => {
    mockD365PostService.mockReset();
  });

  describe('isVendorUsable', () => {
    const baseVendor: D365VendorRecord = {
      company: 'GI01',
      vendorCode: 'V000100',
      vendorName: 'Test Vendor',
      partyNumber: 'P001',
      isBlocked: false,
      isActive: true,
    };

    it('คืน true เมื่อไม่ถูก block และ active', () => {
      expect(isVendorUsable(baseVendor)).toBe(true);
    });

    it('คืน false เมื่อถูก block หรือ inactive', () => {
      expect(isVendorUsable({ ...baseVendor, isBlocked: true })).toBe(false);
      expect(isVendorUsable({ ...baseVendor, isActive: false })).toBe(false);
      expect(isVendorUsable({ ...baseVendor, isBlocked: true, isActive: false })).toBe(false);
    });
  });

  describe('normalize helpers', () => {
    it('trim และแปลงเป็นตัวพิมพ์ใหญ่', () => {
      expect(normalizeCompany(' gi02 ')).toBe('GI02');
      expect(normalizeVendorCode(' v000357 ')).toBe('V000357');
    });
  });

  describe('getVendorsFromD365 & mapping', () => {
    it('แมปฟิลด์ Vendor จาก D365 ได้ถูกต้อง และกรองแถวที่ว่างหรือข้ามบริษัทออก', async () => {
      mockD365PostService.mockResolvedValueOnce({
        success: true,
        data: [
          {
            company: ' gi02 ',
            vendorAccount: ' v000357 ',
            vendorName: '  บริษัท ทดสอบ จำกัด  ',
            vendorPartyNumber: ' 000012345 ',
            currency: ' THB ',
            phone: '   ',
            isBlocked: false,
            isActive: true,
          },
          {
            // ไม่มี company → ใช้ fallbackCompany
            vendorAccount: 'v000999',
            vendorName: 'Blocked Vendor',
            vendorPartyNumber: 'P999',
            isBlocked: true,
            // ไม่ส่ง isActive → default true
          },
          {
            // company ไม่ตรง → ต้องถูกกรองออก
            company: 'GI99',
            vendorAccount: 'V000888',
            vendorName: 'Other Company',
          },
          {
            // vendorAccount ว่าง → ต้องถูกกรองออก
            company: 'GI02',
            vendorAccount: '   ',
            vendorName: 'Missing Account',
          },
        ],
      });

      const rows = await getVendorsFromD365('gi02');

      expect(mockD365PostService).toHaveBeenCalledWith(GET_VENDORS_SERVICE_PATH, {
        company: 'GI02',
        vendorAccount: '',
      });
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        company: 'GI02',
        vendorCode: 'V000357',
        vendorName: 'บริษัท ทดสอบ จำกัด',
        partyNumber: '000012345',
        searchName: undefined,
        vendorGroup: undefined,
        currency: 'THB',
        paymentTerms: undefined,
        paymentMethod: undefined,
        taxRegistrationNumber: undefined,
        address: undefined,
        phone: undefined,
        email: undefined,
        isBlocked: false,
        isActive: true,
        modifiedDateTime: undefined,
      });
      expect(rows[1].company).toBe('GI02');
      expect(rows[1].vendorCode).toBe('V000999');
      expect(rows[1].isBlocked).toBe(true);
      expect(rows[1].isActive).toBe(true);
      expect(isVendorUsable(rows[0])).toBe(true);
      expect(isVendorUsable(rows[1])).toBe(false);
    });

    it('คืน array ว่างเมื่อ D365 ตอบ success=false และไม่มี data', async () => {
      mockD365PostService.mockResolvedValueOnce({
        success: false,
        message: 'Not found',
        data: [],
      });

      const rows = await getVendorsFromD365('GI01', 'V999999');
      expect(rows).toEqual([]);
    });
  });

  describe('findVendorInCompany', () => {
    it('ค้นหา Vendor ตรงรหัสแบบไม่สนตัวพิมพ์เล็ก/ใหญ่ และคืน null เมื่อไม่พบ', async () => {
      mockD365PostService.mockResolvedValueOnce({
        success: true,
        data: [
          { company: 'GI01', vendorAccount: 'V000342', vendorName: 'Vendor A', vendorPartyNumber: 'P1' },
        ],
      });

      const found = await findVendorInCompany('gi01', ' v000342 ');
      expect(found?.vendorCode).toBe('V000342');

      mockD365PostService.mockResolvedValueOnce({ success: true, data: [] });
      const missing = await findVendorInCompany('GI01', 'V000000');
      expect(missing).toBeNull();
    });
  });

  describe('normalizeD365Address & buildSupplierProfileUpdate', () => {
    it('จัดรูปแบบที่อยู่จาก D365 โดยแทนที่ขึ้นบรรทัดใหม่ด้วยช่องว่างเดียว', () => {
      expect(normalizeD365Address('237 ซอยพระยามนธาตุฯ\r\n  แขวงบางบอน\nเขตบางบอน 10150')).toBe(
        '237 ซอยพระยามนธาตุฯ แขวงบางบอน เขตบางบอน 10150'
      );
      expect(normalizeD365Address('   ')).toBeUndefined();
    });

    it('เลือกข้อมูลจากบริษัท GI ก่อน อัปเดต address/taxId และไม่เขียนทับเบอร์ที่กรอกเอง', () => {
      const update = buildSupplierProfileUpdate(
        { address: 'เดิม', taxId: null, phone: '083-223-2849', email: null },
        [
          {
            company: 'GI01',
            vendorCode: 'V001',
            vendorName: 'Test',
            partyNumber: 'P1',
            address: 'ที่อยู่ GI01',
            taxRegistrationNumber: '1111111111111',
            phone: '02-000-0000',
            email: 'a@example.com',
            isBlocked: false,
            isActive: true,
          },
          {
            company: 'GI',
            vendorCode: 'V002',
            vendorName: 'Test',
            partyNumber: 'P1',
            address: 'ที่อยู่ GI หลัก',
            taxRegistrationNumber: '0105564043587',
            paymentTerms: '30D',
            paymentMethod: 'Transfer',
            phone: '02-111-1111',
            isBlocked: false,
            isActive: true,
          },
        ]
      );

      expect(update).toEqual({
        address: 'ที่อยู่ GI หลัก',
        taxId: '0105564043587',
        paymentTerms: '30D',
        paymentMethod: 'Transfer',
        email: 'a@example.com',
      });
    });

    it('แปลง paymentTerms เป็นจำนวนวันเครดิตสำหรับคำนวณ DueDate ได้ถูกต้อง', () => {
      expect(parsePaymentTermsDays('Cash')).toBe(0);
      expect(parsePaymentTermsDays('CASH')).toBe(0);
      expect(parsePaymentTermsDays('IMMEDIATE')).toBe(0);
      expect(parsePaymentTermsDays('immediate')).toBe(0);
      expect(parsePaymentTermsDays('7D')).toBe(7);
      expect(parsePaymentTermsDays('15D')).toBe(15);
      expect(parsePaymentTermsDays('30D')).toBe(30);
      expect(parsePaymentTermsDays('45D')).toBe(45);
      expect(parsePaymentTermsDays('60D')).toBe(60);
      expect(parsePaymentTermsDays('90D')).toBe(90);
      expect(parsePaymentTermsDays(null)).toBe(30);
      expect(parsePaymentTermsDays('')).toBe(30);
    });

    it('จัดรูปแบบและควบคุมการส่ง PaymentType ตาม Spec D365 (ปิดไว้เป็นค่าว่างจนกว่าจะเปิด flag)', () => {
      expect(normalizeD365PaymentType('7d')).toBe('7D');
      expect(normalizeD365PaymentType('15D')).toBe('15D');
      expect(normalizeD365PaymentType('30 d')).toBe('30D');
      expect(normalizeD365PaymentType('45D')).toBe('45D');
      expect(normalizeD365PaymentType('60D')).toBe('60D');
      expect(normalizeD365PaymentType('90D')).toBe('90D');
      expect(normalizeD365PaymentType('CASH')).toBe('Cash');
      expect(normalizeD365PaymentType('immediate')).toBe('IMMEDIATE');
      expect(normalizeD365PaymentType('UNKNOWN')).toBe('');
      expect(normalizeD365PaymentType(null)).toBe('');

      // ค่าเริ่มต้น (ยังไม่เปิด flag) → ส่งค่าว่าง ""
      expect(resolveD365PoPaymentType('30D', false)).toBe('');
      expect(resolveD365PoPaymentType('Cash', false)).toBe('');

      // เมื่อเปิด flag (D365_SEND_PAYMENT_TYPE=true) → ส่งค่ามาตรฐานตาม Spec
      expect(resolveD365PoPaymentType('30D', true)).toBe('30D');
      expect(resolveD365PoPaymentType('cash', true)).toBe('Cash');
      expect(resolveD365PoPaymentType('immediate', true)).toBe('IMMEDIATE');
      expect(resolveD365PoPaymentType('90D', true)).toBe('90D');
      expect(resolveD365PoPaymentType('OTHER', true)).toBe('');
    });
  });
});
