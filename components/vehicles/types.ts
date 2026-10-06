export interface VehicleRecord {
  id: string;
  vin: string;
  vehicleModel: string;
  vehicleColor: string;
  licensePlate: string;
  vehicleType: string;
  jobId: string;
  jobNumber: string;
  jobType: 'CAR_WASH' | 'VEHICLE_SLIDE';
  serviceType: string;
  serviceDate: string;
  unitPrice: number;
  itemStatus: string;
  jobStatus: string;
  companyCode: string;
  branchName: string;
  supplierName: string;
  invoiceNumber: string | null;
  remarks: string | null;
}
