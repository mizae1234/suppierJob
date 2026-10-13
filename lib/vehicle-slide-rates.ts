/**
 * Master Data & Pricing Engine สำหรับบริการรถสไลด์ขนส่งรถยนต์ (Vehicle Slide)
 * อ้างอิงตามสัญญาและตารางราคาจริงของแต่ละซัพพลายเออร์:
 * - SP-SLIDE01: เอ-สไลด์ออน (อุบลราชธานี)
 * - SP-SLIDE02: ตรีเพชร คุ้มยิ้ม สไลด์คาร์ (อยุธยา)
 * - SP-SLIDE03: PCW สไลด์คาร์ (กรุงเทพฯ & ทั่วประเทศ)
 */

export type SlideSupplierCode = 'SP-SLIDE01' | 'SP-SLIDE02' | 'SP-SLIDE03';

export interface SlideSupplierInfo {
  code: SlideSupplierCode;
  name: string;
  shortName: string;
  showroomLabel: string;
  phone: string;
  areaDescription: string;
  vatType: 'NO_VAT' | 'VAT_7';
  vatRate: number;
}

export const SLIDE_SUPPLIERS: Record<SlideSupplierCode, SlideSupplierInfo> = {
  'SP-SLIDE01': {
    code: 'SP-SLIDE01',
    name: 'เอ สไลด์ออน (อุบลราชธานี)',
    shortName: 'เอ-สไลด์ออน',
    showroomLabel: 'อุบลราชธานี',
    phone: '066-052-5522',
    areaDescription: 'อุบลราชธานี และภาคตะวันออกเฉียงเหนือ',
    vatType: 'NO_VAT',
    vatRate: 0,
  },
  'SP-SLIDE02': {
    code: 'SP-SLIDE02',
    name: 'ตรีเพชร คุ้มยิ้ม สไลด์คาร์ (อยุธยา)',
    shortName: 'ตรีเพชร คุ้มยิ้ม',
    showroomLabel: 'พระนครศรีอยุธยา',
    phone: '083-223-2849, 092-950-0223',
    areaDescription: 'พระนครศรีอยุธยา และพื้นที่ใกล้เคียง',
    vatType: 'NO_VAT',
    vatRate: 0,
  },
  'SP-SLIDE03': {
    code: 'SP-SLIDE03',
    name: 'PCW สไลด์คาร์ (กรุงเทพฯ)',
    shortName: 'PCW สไลด์คาร์',
    showroomLabel: 'กรุงเทพฯ, ปริมณฑล, อยุธยา',
    phone: '081-000-0000',
    areaDescription: 'กรุงเทพฯ ปริมณฑล และส่งมอบทั่วประเทศ',
    vatType: 'NO_VAT',
    vatRate: 0,
  },
};

/**
 * PCW Customer Delivery / Custom Pin Mileage Tier Table (36 Tiers)
 */
export interface PCWTier {
  minKm: number;
  maxKm: number;
  cost: number;
}

export const PCW_TIER_TABLE: PCWTier[] = [
  { minKm: 1, maxKm: 10, cost: 1500 },
  { minKm: 11, maxKm: 20, cost: 1800 },
  { minKm: 21, maxKm: 30, cost: 2000 },
  { minKm: 31, maxKm: 40, cost: 2200 },
  { minKm: 41, maxKm: 50, cost: 2500 },
  { minKm: 51, maxKm: 60, cost: 2800 },
  { minKm: 61, maxKm: 70, cost: 3000 },
  { minKm: 71, maxKm: 80, cost: 3300 },
  { minKm: 81, maxKm: 90, cost: 3500 },
  { minKm: 91, maxKm: 100, cost: 3800 },
  { minKm: 101, maxKm: 120, cost: 4000 },
  { minKm: 121, maxKm: 140, cost: 4500 },
  { minKm: 141, maxKm: 160, cost: 5000 },
  { minKm: 161, maxKm: 180, cost: 5500 },
  { minKm: 181, maxKm: 200, cost: 6000 },
  { minKm: 201, maxKm: 220, cost: 6500 },
  { minKm: 221, maxKm: 240, cost: 7000 },
  { minKm: 241, maxKm: 260, cost: 7500 },
  { minKm: 261, maxKm: 280, cost: 8000 },
  { minKm: 281, maxKm: 300, cost: 8500 },
  { minKm: 301, maxKm: 320, cost: 9000 },
  { minKm: 321, maxKm: 340, cost: 9500 },
  { minKm: 341, maxKm: 360, cost: 10000 },
  { minKm: 361, maxKm: 380, cost: 10500 },
  { minKm: 381, maxKm: 400, cost: 11000 },
  { minKm: 401, maxKm: 420, cost: 11500 },
  { minKm: 421, maxKm: 440, cost: 12000 },
  { minKm: 441, maxKm: 460, cost: 12500 },
  { minKm: 461, maxKm: 480, cost: 13000 },
  { minKm: 481, maxKm: 500, cost: 13500 },
  { minKm: 501, maxKm: 600, cost: 14000 },
  { minKm: 601, maxKm: 700, cost: 15000 },
  { minKm: 701, maxKm: 800, cost: 17000 },
  { minKm: 801, maxKm: 900, cost: 19000 },
  { minKm: 901, maxKm: 1000, cost: 23000 },
];

/**
 * ตรวจสอบว่าสาขาหรือข้อความที่ระบุคือ สาขาอยุธยา หรือไม่
 */
export function isAyutthayaBranch(branchCodeOrName?: string | null): boolean {
  if (!branchCodeOrName) return false;
  const s = branchCodeOrName.trim().toLowerCase();
  return (
    s.includes('ayutthaya') ||
    s.includes('ayuthaya') ||
    s.includes('อยุธยา') ||
    s === 'gi-ayutthaya'
  );
}

/**
 * ตรวจสอบว่าสาขาหรือข้อความที่ระบุคือ สาขาอุบลราชธานี หรือไม่
 */
export function isUbonBranch(branchCodeOrName?: string | null): boolean {
  if (!branchCodeOrName) return false;
  const s = branchCodeOrName.trim().toLowerCase();
  return s.includes('ubon') || s.includes('อุบล') || s === 'gi-ubon';
}

/**
 * ค้นหา Slide Supplier Meta จาก Code, UUID หรือชื่อ
 */
export function getSlideSupplierInfo(
  supplierCodeOrId?: string | null,
  supplierName?: string | null
): SlideSupplierInfo | null {
  if (!supplierCodeOrId && !supplierName) return null;

  // 1. Direct match by code
  if (supplierCodeOrId && supplierCodeOrId in SLIDE_SUPPLIERS) {
    return SLIDE_SUPPLIERS[supplierCodeOrId as SlideSupplierCode];
  }

  // 2. Substring match by code in supplierCodeOrId
  const foundCode = (Object.keys(SLIDE_SUPPLIERS) as SlideSupplierCode[]).find((c) =>
    supplierCodeOrId?.includes(c)
  );
  if (foundCode) return SLIDE_SUPPLIERS[foundCode];

  // 3. Match by name keywords
  const textToSearch = `${supplierCodeOrId || ''} ${supplierName || ''}`.toLowerCase();
  if (textToSearch.includes('เอ-สไลด์') || textToSearch.includes('เอ สไลด์') || textToSearch.includes('a slide') || textToSearch.includes('อุบล')) {
    return SLIDE_SUPPLIERS['SP-SLIDE01'];
  }
  if (textToSearch.includes('ตรีเพชร') || textToSearch.includes('คุ้มยิ้ม') || textToSearch.includes('tri petch')) {
    return SLIDE_SUPPLIERS['SP-SLIDE02'];
  }
  if (textToSearch.includes('pcw') || textToSearch.includes('พีซีดับบลิว')) {
    return SLIDE_SUPPLIERS['SP-SLIDE03'];
  }

  return null;
}

export interface SlideCalculationInput {
  supplierCodeOrId?: string | null;
  supplierName?: string | null;
  distanceKm: number;
  originMode: 'branch' | 'custom';
  destMode: 'branch' | 'custom';
  originBranchCode?: string | null;
  originBranchName?: string | null;
  destBranchCode?: string | null;
  destBranchName?: string | null;
  carCount?: number;
}

export interface SlideCalculationResult {
  supplierCode: SlideSupplierCode | 'CUSTOM';
  supplierName: string;
  costPerCar: number;
  totalCost: number;
  formulaBadge: string;
  formulaDetail: string;
  pricingType: 'FLAT_BRANCH' | 'BRACKET_FIXED' | 'PER_KM' | 'SPECIAL_QUOTE';
  isSpecialQuote: boolean;
  isAyutthayaInvolved: boolean;
  isBranchToBranch: boolean;
  distanceKm: number;
  carCount: number;
}

/**
 * คำนวณอัตราค่าบริการรถสไลด์ตามสัญญาของแต่ละเจ้า
 */
export function calculateSlideJobCost(input: SlideCalculationInput): SlideCalculationResult {
  const dist = Math.max(0, Number(input.distanceKm) || 0);
  const cars = Math.max(1, input.carCount || 1);
  const supplierInfo = getSlideSupplierInfo(input.supplierCodeOrId, input.supplierName);

  const isBranchToBranch = input.originMode === 'branch' && input.destMode === 'branch';

  const isOriginAyutthaya =
    input.originMode === 'branch' &&
    (isAyutthayaBranch(input.originBranchCode) || isAyutthayaBranch(input.originBranchName));

  const isDestAyutthaya =
    input.destMode === 'branch' &&
    (isAyutthayaBranch(input.destBranchCode) || isAyutthayaBranch(input.destBranchName));

  const isAyutthayaInvolved = isOriginAyutthaya || isDestAyutthaya;

  // ─────────────────────────────────────────────────────────────
  // 1. SP-SLIDE01: เอ-สไลด์ออน (อุบลราชธานี)
  // ─────────────────────────────────────────────────────────────
  if (supplierInfo?.code === 'SP-SLIDE01') {
    let costPerCar = 1500;
    let formulaBadge = 'เหมาจ่าย 1-15 กม. ฿1,500';
    let formulaDetail = 'อัตราเหมาจ่ายเริ่มต้น 1-15 กม. = 1,500 บาท/คัน';
    let pricingType: SlideCalculationResult['pricingType'] = 'BRACKET_FIXED';

    if (dist <= 15) {
      costPerCar = 1500;
      formulaBadge = 'เหมา 1-15 กม. ฿1,500';
      formulaDetail = 'ระยะทาง 1-15 กม. คิดเหมาจ่ายตามสัญญา 1,500 บาท/คัน';
    } else if (dist <= 30) {
      costPerCar = 2000;
      formulaBadge = 'เหมา 16-30 กม. ฿2,000';
      formulaDetail = 'ระยะทาง 16-30 กม. คิดเหมาจ่ายตามสัญญา 2,000 บาท/คัน';
    } else if (dist <= 50) {
      costPerCar = 2500;
      formulaBadge = 'เหมา 31-50 กม. ฿2,500';
      formulaDetail = 'ระยะทาง 31-50 กม. คิดเหมาจ่ายตามสัญญา 2,500 บาท/คัน';
    } else if (dist <= 80) {
      costPerCar = 3000;
      formulaBadge = 'เหมา 51-80 กม. ฿3,000';
      formulaDetail = 'ระยะทาง 51-80 กม. คิดเหมาจ่ายตามสัญญา 3,000 บาท/คัน';
    } else if (dist <= 100) {
      costPerCar = 3500;
      formulaBadge = 'เหมา 81-100 กม. ฿3,500';
      formulaDetail = 'ระยะทาง 81-100 กม. คิดเหมาจ่ายตามสัญญา 3,500 บาท/คัน';
    } else if (dist <= 300) {
      pricingType = 'PER_KM';
      costPerCar = Math.round(dist * 30);
      formulaBadge = `กม.ละ 30 บาท (${dist.toFixed(0)} กม.)`;
      formulaDetail = `ระยะทาง 101-300 กม. คิดอัตรากิโลเมตรละ 30 บาท (${dist.toFixed(1)} กม. × 30)`;
    } else if (dist <= 500) {
      pricingType = 'PER_KM';
      costPerCar = Math.round(dist * 25);
      formulaBadge = `กม.ละ 25 บาท (${dist.toFixed(0)} กม.)`;
      formulaDetail = `ระยะทาง 301-500 กม. คิดอัตรากิโลเมตรละ 25 บาท (${dist.toFixed(1)} กม. × 25)`;
    } else {
      pricingType = 'PER_KM';
      costPerCar = Math.round(dist * 23);
      formulaBadge = `กม.ละ 23 บาท (${dist.toFixed(0)} กม.)`;
      formulaDetail = `ระยะทางมากกว่า 500 กม. คิดอัตรากิโลเมตรละ 23 บาท (${dist.toFixed(1)} กม. × 23)`;
    }

    return {
      supplierCode: 'SP-SLIDE01',
      supplierName: supplierInfo.name,
      costPerCar,
      totalCost: costPerCar * cars,
      formulaBadge,
      formulaDetail,
      pricingType,
      isSpecialQuote: false,
      isAyutthayaInvolved,
      isBranchToBranch,
      distanceKm: dist,
      carCount: cars,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SP-SLIDE02: ตรีเพชร คุ้มยิ้ม สไลด์คาร์ (อยุธยา)
  // ─────────────────────────────────────────────────────────────
  if (supplierInfo?.code === 'SP-SLIDE02') {
    let costPerCar = 1500;
    let formulaBadge = 'เหมาในเขต (<=50 กม.) ฿1,500';
    let formulaDetail = 'อัตราเหมาจ่ายภายในเขตพื้นที่ (ระยะทาง <= 50 กม.) = 1,500 บาท/คัน';
    let pricingType: SlideCalculationResult['pricingType'] = 'BRACKET_FIXED';

    if (dist <= 50) {
      costPerCar = 1500;
      formulaBadge = 'เหมาในเขต <=50 กม. ฿1,500';
      formulaDetail = 'ภายในเขตพื้นที่ (ระยะทาง <= 50 กม.) อัตราเหมาจ่าย 1,500 บาท/คัน';
    } else if (dist <= 100) {
      costPerCar = 3000;
      formulaBadge = 'เหมา 51-100 กม. ฿3,000';
      formulaDetail = 'นอกเขตพื้นที่ (ระยะทาง 51 - 100 กม.) อัตราเหมาจ่าย 3,000 บาท/คัน';
    } else if (dist <= 150) {
      costPerCar = 4000;
      formulaBadge = 'เหมา 101-150 กม. ฿4,000';
      formulaDetail = 'นอกเขตพื้นที่ (ระยะทาง 101 - 150 กม.) อัตราเหมาจ่าย 4,000 บาท/คัน';
    } else if (dist <= 200) {
      costPerCar = 5000;
      formulaBadge = 'เหมา 151-200 กม. ฿5,000';
      formulaDetail = 'นอกเขตพื้นที่ (ระยะทาง 151 - 200 กม.) อัตราเหมาจ่าย 5,000 บาท/คัน';
    } else {
      pricingType = 'PER_KM';
      costPerCar = Math.round(dist * 25);
      formulaBadge = `กม.ละ 25 บาท (${dist.toFixed(0)} กม.)`;
      formulaDetail = `นอกเขตพื้นที่ (ระยะทาง >= 201 กม. ขึ้นไป) คิดอัตรากิโลเมตรละ 25 บาท (${dist.toFixed(1)} กม. × 25)`;
    }

    return {
      supplierCode: 'SP-SLIDE02',
      supplierName: supplierInfo.name,
      costPerCar,
      totalCost: costPerCar * cars,
      formulaBadge,
      formulaDetail,
      pricingType,
      isSpecialQuote: false,
      isAyutthayaInvolved,
      isBranchToBranch,
      distanceKm: dist,
      carCount: cars,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. SP-SLIDE03: PCW สไลด์คาร์ (กรุงเทพฯ & ทั่วประเทศ)
  // ─────────────────────────────────────────────────────────────
  if (supplierInfo?.code === 'SP-SLIDE03') {
    // Mode A: Branch to Branch Transfer
    if (isBranchToBranch) {
      if (isAyutthayaInvolved) {
        return {
          supplierCode: 'SP-SLIDE03',
          supplierName: supplierInfo.name,
          costPerCar: 3500,
          totalCost: 3500 * cars,
          formulaBadge: 'ย้ายระหว่างสาขา (มีอยุธยา) ฿3,500',
          formulaDetail: 'เหมาจ่ายย้ายระหว่างสาขาที่มีสาขาอยุธยาเกี่ยวข้อง 3,500 บาท/เที่ยว/คัน',
          pricingType: 'FLAT_BRANCH',
          isSpecialQuote: false,
          isAyutthayaInvolved: true,
          isBranchToBranch: true,
          distanceKm: dist,
          carCount: cars,
        };
      } else {
        return {
          supplierCode: 'SP-SLIDE03',
          supplierName: supplierInfo.name,
          costPerCar: 2000,
          totalCost: 2000 * cars,
          formulaBadge: 'ย้ายระหว่างสาขา (กทม./ทั่วไป) ฿2,000',
          formulaDetail: 'เหมาจ่ายย้ายระหว่างสาขาทั่วไป (ไม่ใช่สาขาอยุธยา) 2,000 บาท/เที่ยว/คัน',
          pricingType: 'FLAT_BRANCH',
          isSpecialQuote: false,
          isAyutthayaInvolved: false,
          isBranchToBranch: true,
          distanceKm: dist,
          carCount: cars,
        };
      }
    }

    // Mode B: Customer Delivery / Custom Pin / Non-branch Transfer (Tier Table)
    if (dist > 1000) {
      return {
        supplierCode: 'SP-SLIDE03',
        supplierName: supplierInfo.name,
        costPerCar: 23000,
        totalCost: 23000 * cars,
        formulaBadge: 'ระยะทางเกิน 1,000 กม. (ติดต่อราคาพิเศษ)',
        formulaDetail: 'ระยะทางขนส่งมากกว่า 1,000 กม. ตามสัญญาต้องติดต่อขอราคาพิเศษ (แสดงราคาฐาน 1,000 กม. ฿23,000)',
        pricingType: 'SPECIAL_QUOTE',
        isSpecialQuote: true,
        isAyutthayaInvolved,
        isBranchToBranch: false,
        distanceKm: dist,
        carCount: cars,
      };
    }

    // Match tier
    const matchedTier = PCW_TIER_TABLE.find(
      (t) => dist >= t.minKm && dist <= t.maxKm
    ) || (dist <= 1 ? PCW_TIER_TABLE[0] : PCW_TIER_TABLE[PCW_TIER_TABLE.length - 1]);

    const tierCost = matchedTier.cost;
    const formulaBadge = `ส่งบ้านลูกค้า (${matchedTier.minKm}-${matchedTier.maxKm} กม.) ฿${tierCost.toLocaleString()}`;
    const formulaDetail = `อัตราค่าบริการส่งมอบบ้านลูกค้า/ปลายทางอิสระ ระยะทาง ${dist.toFixed(1)} กม. (ช่วง ${matchedTier.minKm}-${matchedTier.maxKm} กม.) = ${tierCost.toLocaleString()} บาท/คัน`;

    return {
      supplierCode: 'SP-SLIDE03',
      supplierName: supplierInfo.name,
      costPerCar: tierCost,
      totalCost: tierCost * cars,
      formulaBadge,
      formulaDetail,
      pricingType: 'BRACKET_FIXED',
      isSpecialQuote: false,
      isAyutthayaInvolved,
      isBranchToBranch: false,
      distanceKm: dist,
      carCount: cars,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Fallback: Default rate calculation (฿50/km)
  // ─────────────────────────────────────────────────────────────
  const fallbackCost = Math.max(1000, Math.round(dist * 50));
  return {
    supplierCode: 'CUSTOM',
    supplierName: input.supplierName || 'ซัพพลายเออร์ทั่วไป',
    costPerCar: fallbackCost,
    totalCost: fallbackCost * cars,
    formulaBadge: `ประมาณการ 50 บ./กม. (${dist.toFixed(0)} กม.)`,
    formulaDetail: `คำนวณตามระยะทางมาตรฐาน: ${dist.toFixed(1)} กม. × 50 บาท (ขั้นต่ำ 1,000 บาท)`,
    pricingType: 'PER_KM',
    isSpecialQuote: false,
    isAyutthayaInvolved,
    isBranchToBranch,
    distanceKm: dist,
    carCount: cars,
  };
}

/**
 * แนะนำ Supplier ที่เหมาะสมตามสาขาต้นทางและปลายทาง
 */
export function getRecommendedSlideSupplier(
  originBranchCode?: string | null,
  originBranchName?: string | null,
  destBranchCode?: string | null,
  destBranchName?: string | null
): {
  recommendedCode: SlideSupplierCode;
  reason: string;
} | null {
  const originIsUbon = isUbonBranch(originBranchCode) || isUbonBranch(originBranchName);
  const destIsUbon = isUbonBranch(destBranchCode) || isUbonBranch(destBranchName);

  if (originIsUbon || destIsUbon) {
    return {
      recommendedCode: 'SP-SLIDE01',
      reason: 'แนะนำสำหรับเส้นทางสาขาอุบลราชธานีและภาคอีสาน',
    };
  }

  const originIsAyutthaya = isAyutthayaBranch(originBranchCode) || isAyutthayaBranch(originBranchName);
  const destIsAyutthaya = isAyutthayaBranch(destBranchCode) || isAyutthayaBranch(destBranchName);

  if (originIsAyutthaya && !destIsAyutthaya) {
    // If moving from Ayutthaya to BKK, PCW has flat 3,500, or Tri Petch has bracket
    return {
      recommendedCode: 'SP-SLIDE02',
      reason: 'แนะนำสำหรับเส้นทางที่มีจุดรับ/ส่งประจำสาขาอยุธยา',
    };
  }

  if (originIsAyutthaya || destIsAyutthaya) {
    return {
      recommendedCode: 'SP-SLIDE02',
      reason: 'แนะนำสำหรับพื้นที่พระนครศรีอยุธยา',
    };
  }

  // Bangkok / Central default
  return {
    recommendedCode: 'SP-SLIDE03',
    reason: 'แนะนำสำหรับสาขากรุงเทพฯ, ปริมณฑล และส่งมอบบ้านลูกค้า',
  };
}
