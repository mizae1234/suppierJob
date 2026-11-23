import { getWashServiceDisplay, SupplierWashConfig } from '@/lib/car-wash-rates';
import { Vehicle } from '@/types';
import {
  CarCategory,
  SelectedWashItem,
  SupplierServiceOption,
  WashReasonOption,
} from './_types';

export const CAR_WASH_REASONS: WashReasonOption[] = [
  { value: 'ก่อนส่งมอบให้ลูกค้า', label: 'ก่อนส่งมอบให้ลูกค้า', icon: '🚗' },
  { value: 'หลังการซ่อมบำรุง', label: 'หลังการซ่อมบำรุง', icon: '🔧' },
  { value: 'ตามมาตรฐานบริษัท', label: 'ตามมาตรฐานบริษัท', icon: '🏢' },
];

export const getWashReasonItem = (val?: string): WashReasonOption => {
  if (!val) return CAR_WASH_REASONS[0];
  const direct = CAR_WASH_REASONS.find(r => r.value === val);
  if (direct) return direct;
  if (val.includes('ส่งมอบ')) return CAR_WASH_REASONS[0];
  if (val.includes('ซ่อมบำรุง')) return CAR_WASH_REASONS[1];
  if (val.includes('มาตรฐาน')) return CAR_WASH_REASONS[2];
  return { value: val, label: val, icon: '🚗' };
};

export const getBranchShortLabel = (code?: string, name?: string): string => {
  if (code) {
    if (code === 'GI06' || code.startsWith('EV7')) return 'EV7';
    return code;
  }
  return name || 'ต่างสาขา';
};

export const mapSupplierServices = (washConfig: SupplierWashConfig): SupplierServiceOption[] => {
  return washConfig.services.map(s => {
    const meta = getWashServiceDisplay(s.serviceCode);
    return {
      code: s.serviceCode,
      name: meta.name,
      category: meta.category,
      categoryName: meta.categoryName,
      priceType: s.priceType,
      price: s.price,
      minPrice: s.minPrice,
      maxPrice: s.maxPrice,
      defaultRemarks: meta.defaultRemarks,
    };
  });
};

export const getDefaultWashService = (
  categoryServices: SupplierServiceOption[],
  supplierServices: SupplierServiceOption[],
  carCategory: CarCategory,
  mode: 'STOCK' | 'CUSTOM_SERVICE' = 'STOCK'
) => {
  const existing = categoryServices[0] || supplierServices[0];
  if (existing) return existing;

  if (mode === 'CUSTOM_SERVICE') {
    return {
      code: 'VACUUM_CUSTOMER',
      price: 90,
      priceType: 'FIXED' as const,
      minPrice: undefined,
      maxPrice: undefined,
      defaultRemarks: 'หลังการซ่อมบำรุง',
    };
  }

  return {
    code: 'WASH_AND_COAT',
    price: 500,
    priceType: 'FIXED' as const,
    minPrice: undefined,
    maxPrice: undefined,
    defaultRemarks: carCategory === 'NEW_CAR' ? 'ก่อนส่งมอบให้ลูกค้า' : 'หลังการซ่อมบำรุง',
  };
};

export const createWashItemFromVehicle = (
  vehicle: Vehicle,
  categoryServices: SupplierServiceOption[],
  supplierServices: SupplierServiceOption[],
  carCategory: CarCategory
): SelectedWashItem => {
  const defaultSvc = getDefaultWashService(categoryServices, supplierServices, carCategory, 'STOCK');
  return {
    vin: vehicle.vin,
    model: vehicle.model,
    color: vehicle.color,
    licensePlate: vehicle.licensePlate,
    actualWashDate: new Date().toISOString().slice(0, 10),
    washType: defaultSvc.code,
    unitPrice: defaultSvc.price,
    priceType: defaultSvc.priceType,
    minPrice: defaultSvc.minPrice,
    maxPrice: defaultSvc.maxPrice,
    washReason: carCategory === 'NEW_CAR' ? 'ก่อนส่งมอบให้ลูกค้า' : 'หลังการซ่อมบำรุง',
    remarks: '',
  };
};

export const generateCustomServiceVin = (cleanPlateCore: string, providedVin?: string): string => {
  if (providedVin) return providedVin.trim().toUpperCase();
  return `SVC-${cleanPlateCore || 'CAR'}-${Date.now().toString().slice(-4)}`;
};
