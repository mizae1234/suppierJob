/**
 * Master Data & Rate Cards สำหรับบริการล้างรถของแต่ละ Supplier
 * อ้างอิงตามตารางราคาจริงของบริษัท (Vendor Pricing Matrix)
 */

export type WashServiceCode =
  | 'WASH_INSPECTION'   // ล้างตรวจรอย
  | 'WASH_NORMAL'       // ล้างรถ
  | 'POLISH_STAINS'     // ขัดคราบฝังแน่น รอยต่างๆ
  | 'WASH_AND_COAT'     // ล้าง+ขัดเคลือบ
  | 'COATING'           // เคลือบสี
  | 'BIG_SIZE_M8'       // รถไซส์ใหญ่ (M8)
  | 'VACUUM_CENTER'     // ล้างดูดฝุ่น (รถของศูนย์)
  | 'VACUUM_CUSTOMER';  // ล้างดูดฝุ่น (รถลูกค้า)

export type WashCategory = 'NEW_CAR' | 'SERVICE';
export type VatType = 'VAT_7' | 'NO_VAT';

export interface WashServiceMeta {
  code: WashServiceCode;
  name: string;
  category: WashCategory;
  categoryName: string;
  defaultRemarks?: string;
}

export const WASH_SERVICE_CATALOG: Record<WashServiceCode, WashServiceMeta> = {
  WASH_INSPECTION: {
    code: 'WASH_INSPECTION',
    name: 'ล้างตรวจรอย',
    category: 'NEW_CAR',
    categoryName: 'รถใหม่ (Stock / PDI)',
    defaultRemarks: 'ล้างทำความสะอาดเพื่อตรวจสภาพตัวถัง/รอย',
  },
  WASH_NORMAL: {
    code: 'WASH_NORMAL',
    name: 'ล้างรถ',
    category: 'NEW_CAR',
    categoryName: 'รถใหม่ (Stock / PDI)',
    defaultRemarks: 'ล้างภายนอกทำความสะอาดทั่วไป',
  },
  POLISH_STAINS: {
    code: 'POLISH_STAINS',
    name: 'ขัดคราบฝังแน่น รอยต่างๆ',
    category: 'NEW_CAR',
    categoryName: 'รถใหม่ (Stock / PDI)',
    defaultRemarks: 'ขัดลบรอย/ขจัดคราบฝังแน่นตามสภาพ',
  },
  WASH_AND_COAT: {
    code: 'WASH_AND_COAT',
    name: 'ล้าง+ขัดเคลือบ',
    category: 'NEW_CAR',
    categoryName: 'รถใหม่ (Stock / PDI)',
    defaultRemarks: 'ล้างทำความสะอาด ขัดสีและเคลือบเงา',
  },
  COATING: {
    code: 'COATING',
    name: 'เคลือบสี',
    category: 'NEW_CAR',
    categoryName: 'รถใหม่ (Stock / PDI)',
    defaultRemarks: 'เคลือบสีปกป้องผิวรถ',
  },
  BIG_SIZE_M8: {
    code: 'BIG_SIZE_M8',
    name: 'รถไซส์ใหญ่ (M8)',
    category: 'NEW_CAR',
    categoryName: 'รถใหม่ (Stock / PDI)',
    defaultRemarks: 'ล้าง+ขัดเคลือบสำหรับรถไซส์ใหญ่พิเศษ (M8)',
  },
  VACUUM_CENTER: {
    code: 'VACUUM_CENTER',
    name: 'ล้างดูดฝุ่น (รถของศูนย์)',
    category: 'SERVICE',
    categoryName: 'ศูนย์บริการ (Service)',
    defaultRemarks: 'ล้างทำความสะอาดภายนอก + ดูดฝุ่นภายใน (รถของศูนย์)',
  },
  VACUUM_CUSTOMER: {
    code: 'VACUUM_CUSTOMER',
    name: 'ล้างดูดฝุ่น (รถลูกค้า)',
    category: 'SERVICE',
    categoryName: 'ศูนย์บริการ (Service)',
    defaultRemarks: 'ล้างทำความสะอาดภายนอก + ดูดฝุ่นภายใน (รถลูกค้า)',
  },
};

export interface SupplierServiceRate {
  serviceCode: WashServiceCode;
  priceType: 'FIXED' | 'RANGE';
  price: number;       // ราคาตั้งต้น (Default Unit Price)
  minPrice?: number;   // ราคาต่ำสุด (กรณีเป็นช่วง)
  maxPrice?: number;   // ราคาสูงสุด (กรณีเป็นช่วง)
}

export interface SupplierWashConfig {
  supplierCode: string;
  name: string;
  showrooms: string[];    // Showroom codes / keywords
  showroomLabel: string; // ชื่อสาขาที่แสดงผล
  vatType: VatType;
  vatRate: number;       // 0.07 หรือ 0
  services: SupplierServiceRate[];
}

export const SUPPLIER_WASH_RATES: Record<string, SupplierWashConfig> = {
  'SP-CW001': {
    supplierCode: 'SP-CW001',
    name: 'HI-END CAR WASH & GLASS COATING By นันทิตา xxx',
    showrooms: ['GI-SALAYA', 'Salaya', 'ศาลายา'],
    showroomLabel: 'ศาลายา',
    vatType: 'NO_VAT',
    vatRate: 0,
    services: [
      { serviceCode: 'WASH_INSPECTION', priceType: 'FIXED', price: 50 },
      { serviceCode: 'POLISH_STAINS', priceType: 'RANGE', price: 100, minPrice: 100, maxPrice: 1000 },
      { serviceCode: 'WASH_AND_COAT', priceType: 'FIXED', price: 550 },
      { serviceCode: 'VACUUM_CENTER', priceType: 'FIXED', price: 90 },
      { serviceCode: 'VACUUM_CUSTOMER', priceType: 'FIXED', price: 90 },
    ],
  },
  'SP-CW002': {
    supplierCode: 'SP-CW002',
    name: 'CleanDay Carcare By สุพัตรา xxx',
    showrooms: ['GI-VIPHA', 'GI-PHIBUN', 'Vibhavadi', 'Pibulsongkram', 'วิภาวดี', 'พิบูลสงคราม'],
    showroomLabel: 'วิภาวดี, พิบูลสงคราม',
    vatType: 'NO_VAT',
    vatRate: 0,
    services: [
      { serviceCode: 'WASH_AND_COAT', priceType: 'RANGE', price: 500, minPrice: 500, maxPrice: 600 },
      { serviceCode: 'BIG_SIZE_M8', priceType: 'FIXED', price: 1000 },
    ],
  },
  'SP-CW003': {
    supplierCode: 'SP-CW003',
    name: 'ห้วยคุ้มคาร์แคร์ By ทรงชัย xxx',
    showrooms: ['GI-UBON', 'Ubon Ratchathani', 'อุบลราชธานี'],
    showroomLabel: 'อุบลราชธานี',
    vatType: 'NO_VAT',
    vatRate: 0,
    services: [
      { serviceCode: 'WASH_NORMAL', priceType: 'RANGE', price: 83, minPrice: 83, maxPrice: 143 },
      { serviceCode: 'POLISH_STAINS', priceType: 'RANGE', price: 200, minPrice: 200, maxPrice: 500 },
      { serviceCode: 'WASH_AND_COAT', priceType: 'RANGE', price: 206, minPrice: 206, maxPrice: 1030 },
      { serviceCode: 'COATING', priceType: 'RANGE', price: 206, minPrice: 206, maxPrice: 309 },
      { serviceCode: 'VACUUM_CENTER', priceType: 'RANGE', price: 83, minPrice: 83, maxPrice: 143 },
      { serviceCode: 'VACUUM_CUSTOMER', priceType: 'RANGE', price: 83, minPrice: 83, maxPrice: 143 },
    ],
  },
  'SP-CW004': {
    supplierCode: 'SP-CW004',
    name: 'ทู ไชน์ คาร์ดีเทลลิ่ง By อรรถวิทย์ xxx',
    showrooms: ['GI-MAHACHAI', 'Mahachai', 'มหาชัย'],
    showroomLabel: 'มหาชัย',
    vatType: 'NO_VAT',
    vatRate: 0,
    services: [
      { serviceCode: 'WASH_NORMAL', priceType: 'FIXED', price: 90 },
      { serviceCode: 'WASH_AND_COAT', priceType: 'FIXED', price: 500 },
      { serviceCode: 'VACUUM_CENTER', priceType: 'FIXED', price: 90 },
      { serviceCode: 'VACUUM_CUSTOMER', priceType: 'FIXED', price: 90 },
    ],
  },
  'SP-CW005': {
    supplierCode: 'SP-CW005',
    name: 'บริษัท วอชโมบิล จำกัด',
    showrooms: ['GI-AYUTTHAYA', 'Ayuthaya', 'อยุธยา'],
    showroomLabel: 'อยุธยา',
    vatType: 'VAT_7',
    vatRate: 0.07,
    services: [
      { serviceCode: 'WASH_AND_COAT', priceType: 'FIXED', price: 450 },
      { serviceCode: 'VACUUM_CENTER', priceType: 'FIXED', price: 90 },
      { serviceCode: 'VACUUM_CUSTOMER', priceType: 'FIXED', price: 90 },
    ],
  },
  'SP-CW006': {
    supplierCode: 'SP-CW006',
    name: 'บริษัท เอกชลิต จำกัด',
    showrooms: ['GI-KANJANA', 'Kanchanapisek', 'กาญจนาภิเษก'],
    showroomLabel: 'กาญจนาภิเษก',
    vatType: 'VAT_7',
    vatRate: 0.07,
    services: [
      { serviceCode: 'WASH_AND_COAT', priceType: 'RANGE', price: 650, minPrice: 650, maxPrice: 700 },
      { serviceCode: 'VACUUM_CENTER', priceType: 'FIXED', price: 80 },
      { serviceCode: 'VACUUM_CUSTOMER', priceType: 'FIXED', price: 80 },
    ],
  },
  'SP-CW007': {
    supplierCode: 'SP-CW007',
    name: 'ห้างหุ้นส่วนจำกัด ออโต้คาร์ 108',
    showrooms: ['GI-LIABDUAN', 'GI-VIPHA', 'Exp.Ramintra', 'Vibhavadi', 'เลียบด่วน', 'วิภาวดี'],
    showroomLabel: 'เลียบด่วน รามอินทรา, วิภาวดี',
    vatType: 'VAT_7',
    vatRate: 0.07,
    services: [
      { serviceCode: 'WASH_AND_COAT', priceType: 'FIXED', price: 699 },
      { serviceCode: 'BIG_SIZE_M8', priceType: 'FIXED', price: 934.58 },
    ],
  },
  'SP-CW008': {
    supplierCode: 'SP-CW008',
    name: 'บริษัท ใบ สัย คลีนนิ่ง คาร์ จำกัด',
    showrooms: ['Min Buri', 'GI-VIPHA', 'Vibhavadi', 'มีนบุรี', 'วิภาวดี'],
    showroomLabel: 'มีนบุรี, วิภาวดี',
    vatType: 'VAT_7',
    vatRate: 0.07,
    services: [
      { serviceCode: 'WASH_AND_COAT', priceType: 'FIXED', price: 750 },
      { serviceCode: 'VACUUM_CENTER', priceType: 'FIXED', price: 90 },
      { serviceCode: 'VACUUM_CUSTOMER', priceType: 'FIXED', price: 90 },
    ],
  },
  'SP-CW009': {
    supplierCode: 'SP-CW009',
    name: 'เป็นเอกคาร์แคร์ By เอกสิทธิ์ xxx',
    showrooms: ['GI-CHIANGMAI', 'Chiangmai', 'เชียงใหม่'],
    showroomLabel: 'เชียงใหม่',
    vatType: 'NO_VAT',
    vatRate: 0,
    services: [
      { serviceCode: 'POLISH_STAINS', priceType: 'FIXED', price: 500 },
      { serviceCode: 'WASH_AND_COAT', priceType: 'FIXED', price: 400 },
      { serviceCode: 'VACUUM_CENTER', priceType: 'FIXED', price: 200 },
      { serviceCode: 'VACUUM_CUSTOMER', priceType: 'FIXED', price: 100 },
    ],
  },
};

// Fallback configuration สำหรับ supplier ทั่วไปที่ไม่มีใน Rate card เฉพาะเจาะจง
export const DEFAULT_WASH_CONFIG: SupplierWashConfig = {
  supplierCode: 'DEFAULT',
  name: 'มาตรฐานทั่วไป',
  showrooms: [],
  showroomLabel: 'ทุกสาขา',
  vatType: 'NO_VAT',
  vatRate: 0,
  services: [
    { serviceCode: 'WASH_NORMAL', priceType: 'FIXED', price: 150 },
    { serviceCode: 'WASH_AND_COAT', priceType: 'FIXED', price: 350 },
    { serviceCode: 'POLISH_STAINS', priceType: 'RANGE', price: 500, minPrice: 200, maxPrice: 1000 },
    { serviceCode: 'VACUUM_CENTER', priceType: 'FIXED', price: 90 },
    { serviceCode: 'VACUUM_CUSTOMER', priceType: 'FIXED', price: 90 },
  ],
};

/**
 * ดึงการตั้งค่าและตารางราคาของ Supplier ตาม Code หรือ ID
 */
export function getSupplierWashConfig(supplierCodeOrId?: string, supplierName?: string): SupplierWashConfig {
  if (!supplierCodeOrId) return DEFAULT_WASH_CONFIG;
  if (SUPPLIER_WASH_RATES[supplierCodeOrId]) {
    return SUPPLIER_WASH_RATES[supplierCodeOrId];
  }

  // ค้นหาตามชื่อถ้าส่งรหัส UUID เข้ามา
  if (supplierName) {
    const found = Object.values(SUPPLIER_WASH_RATES).find(cfg =>
      cfg.name.toLowerCase().includes(supplierName.toLowerCase()) ||
      supplierName.toLowerCase().includes(cfg.name.toLowerCase())
    );
    if (found) return found;
  }

  // ค้นหา partial code
  const key = Object.keys(SUPPLIER_WASH_RATES).find(k => supplierCodeOrId.includes(k));
  if (key) return SUPPLIER_WASH_RATES[key];

  return DEFAULT_WASH_CONFIG;
}

/**
 * ดึงชื่อภาษาไทยและรายละเอียดของบริการ
 */
export function getWashServiceDisplay(serviceCode: string): WashServiceMeta {
  const meta = WASH_SERVICE_CATALOG[serviceCode as WashServiceCode];
  if (meta) return meta;

  // Fallback map สำหรับโค้ดเก่า
  if (serviceCode === 'STANDARD') {
    return {
      code: 'WASH_NORMAL',
      name: 'ล้างทำความสะอาดทั่วไป (Standard)',
      category: 'NEW_CAR',
      categoryName: 'รถใหม่ (Stock / PDI)',
      defaultRemarks: 'ล้างทำความสะอาดทั่วไป',
    };
  }
  if (serviceCode === 'DEEP_CLEAN') {
    return {
      code: 'POLISH_STAINS',
      name: 'ขัดคราบฝังแน่น (Deep Clean)',
      category: 'NEW_CAR',
      categoryName: 'รถใหม่ (Stock / PDI)',
      defaultRemarks: 'ขัดคราบฝังแน่น',
    };
  }
  if (serviceCode === 'POLISH') {
    return {
      code: 'WASH_AND_COAT',
      name: 'ล้าง+ขัดเคลือบเงา (Polish & Coat)',
      category: 'NEW_CAR',
      categoryName: 'รถใหม่ (Stock / PDI)',
      defaultRemarks: 'ล้าง+ขัดเคลือบเงา',
    };
  }

  return {
    code: serviceCode as any,
    name: serviceCode,
    category: 'NEW_CAR',
    categoryName: 'ทั่วไป',
  };
}

/**
 * คำนวณสรุปยอดเงินและภาษี (Order Financial Summary)
 */
export function calculateWashOrderFinancials(
  items: Array<{ unitPrice: number }>,
  vatType: VatType
) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.unitPrice) || 0), 0);
  const vatRate = vatType === 'VAT_7' ? 0.07 : 0;
  const vatAmount = subtotal * vatRate;
  const grandTotal = subtotal + vatAmount;

  return {
    subtotal,
    vatType,
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}
