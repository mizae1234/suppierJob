/**
 * วิธีคิดค่าบริการรถสไลด์
 * - AUTO   = ระบบคำนวณระยะทางจากแผนที่ และราคาต่อคันตามสัญญา Supplier (ค่าเริ่มต้น)
 * - MANUAL = พนักงานกรอกระยะทางและราคาต่อคันเอง (เช่น Supplier คิดระยะจากจุดจอดรถ → จุดรับ → จุดส่ง)
 */
export type SlidePricingMode = 'AUTO' | 'MANUAL';

export const SLIDE_PRICING_AUTO: SlidePricingMode = 'AUTO';
export const SLIDE_PRICING_MANUAL: SlidePricingMode = 'MANUAL';

export const MANUAL_PRICE_NOTE_MIN_LENGTH = 5;
export const MANUAL_PRICE_NOTE_MAX_LENGTH = 500;

/** ใบงานนี้กรอกราคาเองหรือไม่ (ใบงานเก่าที่ไม่มีค่า = AUTO) */
export function isManualPricingJob(job: { pricingMode?: string | null } | null | undefined): boolean {
  return job?.pricingMode === SLIDE_PRICING_MANUAL;
}

export function normalizePricingMode(value: unknown): SlidePricingMode {
  return value === SLIDE_PRICING_MANUAL ? SLIDE_PRICING_MANUAL : SLIDE_PRICING_AUTO;
}

/** ส่วนต่างราคาที่กรอกเองเทียบกับราคาตามสัญญา (ต่อคัน) */
export function getManualPriceDiff(manualCost: number, contractCost?: number | null) {
  if (!contractCost || contractCost <= 0) return null;
  const diff = manualCost - contractCost;
  const percent = Math.round((diff / contractCost) * 1000) / 10;
  return { diff, percent };
}

