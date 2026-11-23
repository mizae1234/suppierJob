import { VatType, WashCategory } from '@/lib/car-wash-rates';

export type CarCategory = WashCategory; // 'NEW_CAR' | 'SERVICE'

export interface WashReasonOption {
  value: string;
  label: string;
  icon: string;
}

export interface SupplierServiceOption {
  code: string;
  name: string;
  category: CarCategory;
  categoryName: string;
  priceType: 'FIXED' | 'RANGE';
  price: number;
  minPrice?: number;
  maxPrice?: number;
  defaultRemarks?: string;
}

export interface SelectedWashItem {
  vin: string;
  model: string;
  color: string;
  licensePlate?: string;
  actualWashDate: string;
  washType: string;
  unitPrice: number;
  priceType?: 'FIXED' | 'RANGE';
  minPrice?: number;
  maxPrice?: number;
  washReason: string;
  remarks: string;
  isCustomServiceVehicle?: boolean;
  roNumber?: string;
}

export interface CustomServiceVehicleInput {
  licensePlate: string;
  model?: string;
  color?: string;
  vin?: string;
  roNumber?: string;
}

export interface WashOrderFinancials {
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  vatType?: VatType;
}
