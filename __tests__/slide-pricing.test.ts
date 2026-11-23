import { describe, expect, it } from 'vitest';
import {
  isManualPricingJob,
  normalizePricingMode,
  getManualPriceDiff,
  SLIDE_PRICING_AUTO,
  SLIDE_PRICING_MANUAL,
} from '@/lib/slide-pricing';

describe('slide-pricing', () => {
  describe('isManualPricingJob', () => {
    it('คืน true เฉพาะเมื่อ pricingMode เป็น MANUAL', () => {
      expect(isManualPricingJob({ pricingMode: 'MANUAL' })).toBe(true);
      expect(isManualPricingJob({ pricingMode: 'AUTO' })).toBe(false);
      expect(isManualPricingJob({ pricingMode: null })).toBe(false);
      expect(isManualPricingJob({})).toBe(false);
      expect(isManualPricingJob(null)).toBe(false);
      expect(isManualPricingJob(undefined)).toBe(false);
    });
  });

  describe('normalizePricingMode', () => {
    it('แปลงค่าอื่นทั้งหมดที่ไม่ใช่ MANUAL เป็น AUTO', () => {
      expect(normalizePricingMode('MANUAL')).toBe(SLIDE_PRICING_MANUAL);
      expect(normalizePricingMode('AUTO')).toBe(SLIDE_PRICING_AUTO);
      expect(normalizePricingMode('manual')).toBe(SLIDE_PRICING_AUTO);
      expect(normalizePricingMode('')).toBe(SLIDE_PRICING_AUTO);
      expect(normalizePricingMode(null)).toBe(SLIDE_PRICING_AUTO);
      expect(normalizePricingMode(undefined)).toBe(SLIDE_PRICING_AUTO);
    });
  });

  describe('getManualPriceDiff', () => {
    it('คำนวณส่วนต่างและเปอร์เซ็นต์ (ทศนิยม 1 ตำแหน่ง) ได้ถูกต้อง', () => {
      expect(getManualPriceDiff(2500, 2000)).toEqual({ diff: 500, percent: 25 });
      expect(getManualPriceDiff(1800, 2000)).toEqual({ diff: -200, percent: -10 });
      expect(getManualPriceDiff(2000, 2000)).toEqual({ diff: 0, percent: 0 });
      expect(getManualPriceDiff(2333, 2000)).toEqual({ diff: 333, percent: 16.7 });
    });

    it('คืน null เมื่อไม่มีราคาตามสัญญาหรือราคาตามสัญญา <= 0', () => {
      expect(getManualPriceDiff(2500, null)).toBeNull();
      expect(getManualPriceDiff(2500, undefined)).toBeNull();
      expect(getManualPriceDiff(2500, 0)).toBeNull();
      expect(getManualPriceDiff(2500, -100)).toBeNull();
    });
  });
});
