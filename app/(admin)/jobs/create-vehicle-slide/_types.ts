export type RouteMode = 'branch' | 'custom';

export type MapPickerMode = 'origin' | 'dest' | 'branch' | null;

export interface CustomOriginPoint {
  lat: number;
  lng: number;
  address: string;
}

export interface CustomDestPoint {
  lat: number;
  lng: number;
  address: string;
  distance: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
}

export interface OriginWarehouseGroup {
  warehouseId: string;
  warehouseName: string | null;
  labels: string[];
}

export interface ScheduleContactValues {
  pickupDateTime: string;
  deliveryDateTime: string;
  contactPerson: string;
  contactPhone: string;
  transferReason: string;
}
