import { describe, expect, it } from 'vitest';
import {
  calculateSlideJobCost,
  getRecommendedSlideSupplier,
  getSlideSupplierInfo,
  isAyutthayaBranch,
  isUbonBranch,
} from '@/lib/vehicle-slide-rates';

describe('vehicle-slide-rates: calculateSlideJobCost', () => {
  describe('SP-SLIDE01 (เอ สไลด์ออน อุบลราชธานี)', () => {
    it('คำนวณช่วงเหมาจ่าย (1-100 กม.) และคูณจำนวนคันถูกต้อง', () => {
      const r1 = calculateSlideJobCost({
        supplierCodeOrId: 'SP-SLIDE01',
        distanceKm: 10,
        originMode: 'branch',
        destMode: 'custom',
        carCount: 2,
      });
      expect(r1.supplierCode).toBe('SP-SLIDE01');
      expect(r1.pricingType).toBe('BRACKET_FIXED');
      expect(r1.costPerCar).toBe(1500);
      expect(r1.totalCost).toBe(3000);

      expect(
        calculateSlideJobCost({
          supplierCodeOrId: 'SP-SLIDE01',
          distanceKm: 25,
          originMode: 'branch',
          destMode: 'custom',
        }).costPerCar
      ).toBe(2000);

      expect(
        calculateSlideJobCost({
          supplierCodeOrId: 'SP-SLIDE01',
          distanceKm: 45,
          originMode: 'branch',
          destMode: 'custom',
        }).costPerCar
      ).toBe(2500);

      expect(
        calculateSlideJobCost({
          supplierCodeOrId: 'SP-SLIDE01',
          distanceKm: 75,
          originMode: 'branch',
          destMode: 'custom',
        }).costPerCar
      ).toBe(3000);

      expect(
        calculateSlideJobCost({
          supplierCodeOrId: 'SP-SLIDE01',
          distanceKm: 100,
          originMode: 'branch',
          destMode: 'custom',
        }).costPerCar
      ).toBe(3500);
    });

    it('คำนวณเรทรายกิโลเมตรเมื่อเกิน 100 กม. (30 / 25 / 23 บาท/กม.)', () => {
      const r200 = calculateSlideJobCost({
        supplierCodeOrId: 'SP-SLIDE01',
        distanceKm: 200,
        originMode: 'branch',
        destMode: 'branch',
      });
      expect(r200.pricingType).toBe('PER_KM');
      expect(r200.costPerCar).toBe(6000); // 200 * 30

      const r400 = calculateSlideJobCost({
        supplierCodeOrId: 'SP-SLIDE01',
        distanceKm: 400,
        originMode: 'branch',
        destMode: 'branch',
      });
      expect(r400.costPerCar).toBe(10000); // 400 * 25

      const r600 = calculateSlideJobCost({
        supplierCodeOrId: 'SP-SLIDE01',
        distanceKm: 600,
        originMode: 'branch',
        destMode: 'branch',
      });
      expect(r600.costPerCar).toBe(13800); // 600 * 23
    });
  });

  describe('SP-SLIDE02 (ตรีเพชร คุ้มยิ้ม อยุธยา)', () => {
    it('คำนวณช่วงเหมาจ่ายและเรท >= 201 กม. (25 บาท/กม.)', () => {
      expect(
        calculateSlideJobCost({
          supplierCodeOrId: 'SP-SLIDE02',
          distanceKm: 50,
          originMode: 'branch',
          destMode: 'custom',
        }).costPerCar
      ).toBe(1500);

      expect(
        calculateSlideJobCost({
          supplierCodeOrId: 'SP-SLIDE02',
          distanceKm: 90,
          originMode: 'branch',
          destMode: 'custom',
        }).costPerCar
      ).toBe(3000);

      expect(
        calculateSlideJobCost({
          supplierCodeOrId: 'SP-SLIDE02',
          distanceKm: 130,
          originMode: 'branch',
          destMode: 'custom',
        }).costPerCar
      ).toBe(4000);

      expect(
        calculateSlideJobCost({
          supplierCodeOrId: 'SP-SLIDE02',
          distanceKm: 200,
          originMode: 'branch',
          destMode: 'custom',
        }).costPerCar
      ).toBe(5000);

      const r250 = calculateSlideJobCost({
        supplierCodeOrId: 'SP-SLIDE02',
        distanceKm: 250,
        originMode: 'branch',
        destMode: 'custom',
      });
      expect(r250.pricingType).toBe('PER_KM');
      expect(r250.costPerCar).toBe(6250);
    });
  });

  describe('SP-SLIDE03 (PCW สไลด์คาร์ กรุงเทพฯ)', () => {
    it('สไลด์ระหว่างสาขาทั่วไป (ไม่เกี่ยวกับอยุธยา) เหมาจ่าย 2,000 บาท/คัน', () => {
      const res = calculateSlideJobCost({
        supplierCodeOrId: 'SP-SLIDE03',
        distanceKm: 35,
        originMode: 'branch',
        destMode: 'branch',
        originBranchCode: 'GI01',
        destBranchCode: 'GI02',
        carCount: 3,
      });
      expect(res.pricingType).toBe('FLAT_BRANCH');
      expect(res.isAyutthayaInvolved).toBe(false);
      expect(res.costPerCar).toBe(2000);
      expect(res.totalCost).toBe(6000);
    });

    it('สไลด์ระหว่างสาขาที่มีอยุธยาเกี่ยวข้อง เหมาจ่าย 3,500 บาท/คัน', () => {
      const res = calculateSlideJobCost({
        supplierCodeOrId: 'SP-SLIDE03',
        distanceKm: 75,
        originMode: 'branch',
        destMode: 'branch',
        originBranchCode: 'GI01',
        destBranchCode: 'GI11',
        destBranchName: 'GOLD INTEGRATE AYUTTHAYA CO.,LTD',
      });
      expect(res.pricingType).toBe('FLAT_BRANCH');
      expect(res.isAyutthayaInvolved).toBe(true);
      expect(res.costPerCar).toBe(3500);
    });

    it('ส่งบ้านลูกค้า / ปักหมุดเอง ใช้ตาราง PCW Tier และเกิน 1,000 กม. เป็น SPECIAL_QUOTE', () => {
      const tier35 = calculateSlideJobCost({
        supplierCodeOrId: 'SP-SLIDE03',
        distanceKm: 35,
        originMode: 'branch',
        destMode: 'custom',
      });
      expect(tier35.pricingType).toBe('BRACKET_FIXED');
      expect(tier35.costPerCar).toBe(2200);
      expect(tier35.isSpecialQuote).toBe(false);

      const over1000 = calculateSlideJobCost({
        supplierCodeOrId: 'SP-SLIDE03',
        distanceKm: 1200,
        originMode: 'branch',
        destMode: 'custom',
      });
      expect(over1000.pricingType).toBe('SPECIAL_QUOTE');
      expect(over1000.isSpecialQuote).toBe(true);
      expect(over1000.costPerCar).toBe(23000);
    });
  });

  describe('Fallback & Helpers', () => {
    it('คำนวณ fallback 50 บาท/กม. ขั้นต่ำ 1,000 บาท เมื่อไม่รู้จัก Supplier', () => {
      const low = calculateSlideJobCost({
        supplierCodeOrId: 'SP-UNKNOWN',
        distanceKm: 5,
        originMode: 'custom',
        destMode: 'custom',
      });
      expect(low.supplierCode).toBe('CUSTOM');
      expect(low.costPerCar).toBe(1000);

      const high = calculateSlideJobCost({
        supplierCodeOrId: 'SP-UNKNOWN',
        distanceKm: 60,
        originMode: 'custom',
        destMode: 'custom',
      });
      expect(high.costPerCar).toBe(3000);
    });

    it('ระบุสาขาและแนะนำ Supplier ได้ถูกต้อง', () => {
      expect(isAyutthayaBranch('สาขาอยุธยา')).toBe(true);
      expect(isUbonBranch('GI-UBON')).toBe(true);
      expect(getSlideSupplierInfo(null, 'PCW สไลด์คาร์')?.code).toBe('SP-SLIDE03');

      expect(getRecommendedSlideSupplier('GI05', 'อุบลราชธานี', 'GI01', 'บางแค')?.recommendedCode).toBe(
        'SP-SLIDE01'
      );
      expect(getRecommendedSlideSupplier('GI11', 'อยุธยา', 'GI01', 'บางแค')?.recommendedCode).toBe(
        'SP-SLIDE02'
      );
      expect(getRecommendedSlideSupplier('GI01', 'บางแค', 'GI02', 'มีนบุรี')?.recommendedCode).toBe(
        'SP-SLIDE03'
      );
    });
  });
});
