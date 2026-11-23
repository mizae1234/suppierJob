import type { CompanyCode } from '@/types';
import { MANUAL_PRICE_NOTE_MIN_LENGTH, SlidePricingMode } from '@/lib/slide-pricing';
import { isValidWarehouseId } from '@/lib/d365/warehouses';
import type { CustomDestPoint, CustomOriginPoint, RouteMode, ScheduleContactValues } from './_types';

export const getDefaultDateTimeInput = (hoursFromNow: number): string =>
  new Date(Date.now() + 3600 * 1000 * hoursFromNow).toISOString().slice(0, 16);

export const getBranchShortLabel = (code?: string, name?: string): string => {
  if (code) {
    if (code === 'GI06' || code.startsWith('EV7')) return 'EV7';
    return code;
  }
  return name || 'ต่างสาขา';
};

export interface SlideJobValidationInput {
  selectedVinsCount: number;
  originMode: RouteMode;
  customOrigin: CustomOriginPoint | null;
  destMode: RouteMode;
  destBranchId: string;
  selectedOriginBranchId: string;
  destWarehouseId: string;
  customDest: CustomDestPoint | null;
  selectedSupplierId: string;
  hasVendorCode: boolean;
  contactPhone: string;
  isManualPricing: boolean;
  manualDistance: number;
  manualCost: number;
  manualPriceNote: string;
  estimatedCost: number;
}

export function validateSlideJobForm(
  input: SlideJobValidationInput
): { message: string; type: 'warning' | 'error' } | null {
  if (input.selectedVinsCount === 0) {
    return { message: 'กรุณาเลือกรถ (VIN) อย่างน้อย 1 คันที่ต้องการสไลด์', type: 'warning' };
  }
  if (input.originMode === 'custom' && !input.customOrigin) {
    return { message: 'กรุณาปักหมุดจุดรับรถบนแผนที่', type: 'warning' };
  }
  if (input.destMode === 'branch') {
    if (!input.destBranchId) {
      return { message: 'กรุณาเลือกสาขาปลายทาง', type: 'warning' };
    }
    if (input.destBranchId === input.selectedOriginBranchId && input.originMode === 'branch') {
      return { message: 'สาขาปลายทางต้องไม่ซ้ำกับสาขาต้นทาง', type: 'error' };
    }
    if (!input.destWarehouseId.trim() || !isValidWarehouseId(input.destWarehouseId)) {
      return { message: 'กรุณาเลือก Warehouse ID ปลายทาง (คลัง D365)', type: 'warning' };
    }
  } else if (!input.customDest) {
    return { message: 'กรุณาเลือกจุดปลายทางบนแผนที่', type: 'warning' };
  }
  if (!input.selectedSupplierId) {
    return { message: 'กรุณาเลือก Supplier รถสไลด์', type: 'warning' };
  }
  if (!input.hasVendorCode) {
    return {
      message: 'ไม่สามารถสั่งงานได้ — ต้องเลือก Supplier ที่มีรหัส Vendor D365 ของสาขานี้เท่านั้น',
      type: 'error',
    };
  }
  if (input.contactPhone.replace(/\D/g, '').length !== 10) {
    return { message: 'กรุณากรอกเบอร์โทรผู้ติดต่อให้ครบ 10 หลัก', type: 'warning' };
  }
  if (input.isManualPricing) {
    if (!(input.manualDistance > 0)) {
      return { message: 'กรุณากรอกระยะทาง (กม.) สำหรับการกรอกค่าบริการเอง', type: 'warning' };
    }
    if (!(input.manualCost > 0)) {
      return { message: 'กรุณากรอกค่าใช้จ่ายต่อคันสำหรับการกรอกค่าบริการเอง', type: 'warning' };
    }
    if (input.manualPriceNote.trim().length < MANUAL_PRICE_NOTE_MIN_LENGTH) {
      return {
        message: `กรุณาระบุหมายเหตุการกรอกค่าบริการเองอย่างน้อย ${MANUAL_PRICE_NOTE_MIN_LENGTH} ตัวอักษร`,
        type: 'warning',
      };
    }
  } else if (!(input.estimatedCost > 0)) {
    return {
      message: 'ไม่สามารถคำนวณค่าบริการตามสัญญาได้ กรุณาตรวจสอบเส้นทาง หรือเลือกกรอกค่าบริการเอง',
      type: 'warning',
    };
  }
  return null;
}

export interface BuildSlideJobPayloadInput {
  companyCode: CompanyCode;
  branchId: string;
  pickupBranchId: string;
  destMode: RouteMode;
  destBranchId: string;
  destWarehouseId: string;
  originMode: RouteMode;
  customOrigin: CustomOriginPoint | null;
  customDest: CustomDestPoint | null;
  supplierId: string;
  selectedVins: string[];
  scheduleContact: ScheduleContactValues;
  requestedBy: string;
  requesterPosition: string;
  requesterPhone: string;
  estimatedCost: number;
  distance: number;
  pricingMode: SlidePricingMode;
  isManualPricing: boolean;
  manualPriceNote: string;
}

export function buildSlideJobPayload(input: BuildSlideJobPayloadInput) {
  return {
    companyCode: input.companyCode,
    branchId: input.branchId,
    pickupBranchId: input.pickupBranchId,
    destBranchId: input.destMode === 'branch' ? input.destBranchId : '',
    destWarehouseId: input.destMode === 'branch' ? input.destWarehouseId.trim() : undefined,
    supplierId: input.supplierId,
    vin: input.selectedVins[0],
    vins: input.selectedVins,
    pickupDateTime: input.scheduleContact.pickupDateTime,
    deliveryDateTime: input.scheduleContact.deliveryDateTime,
    contactPerson: input.scheduleContact.contactPerson,
    contactPhone: input.scheduleContact.contactPhone,
    transferReason: input.scheduleContact.transferReason,
    requestedBy: input.requestedBy,
    requesterPosition: input.requesterPosition,
    requesterPhone: input.requesterPhone,
    estimatedCost: input.estimatedCost,
    distance: input.distance,
    pricingMode: input.pricingMode,
    manualPriceNote: input.isManualPricing ? input.manualPriceNote.trim() : undefined,
    ...(input.destMode === 'custom' && input.customDest
      ? {
          customDestAddress: input.customDest.address,
          customDestLat: input.customDest.lat,
          customDestLng: input.customDest.lng,
        }
      : {}),
    ...(input.originMode === 'custom' && input.customOrigin
      ? {
          customOriginAddress: input.customOrigin.address,
          customOriginLat: input.customOrigin.lat,
          customOriginLng: input.customOrigin.lng,
        }
      : {}),
  };
}
