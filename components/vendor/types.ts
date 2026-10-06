import { Job } from '@/types';

export interface WorkModalTarget {
  type: 'CAR_WASH' | 'VEHICLE_SLIDE';
  jobId: string;
  jobNumber: string;
  itemId?: string; // Car Wash only
  vin: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  serviceType: string;
  serviceLabel: string;
  unitPrice: number;
  branchName: string;
  routeText?: string;
  rejectReason?: string;
  job: Job;
}
