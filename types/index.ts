export type CompanyCode = 'EV7' | 'GI';

export type UserRole = 'MASTER' | 'ADMIN' | 'BRANCH' | 'SUPPLIER';

export type JobType = 'CAR_WASH' | 'VEHICLE_SLIDE';

export type JobStatus = 
  | 'PENDING_SUPPLIER'  // มอบหมายงานแล้ว รอ Supplier รับงาน
  | 'IN_PROGRESS'       // Supplier กำลังทำงาน
  | 'WAITING_APPROVAL'  // แนบรูป ส่งงานแล้ว รอสาขาตรวจรับ
  | 'APPROVED'          // สาขาตรวจรับผ่าน พร้อมวางบิล
  | 'REJECTED'          // ไม่ผ่าน ขอให้แก้ไข
  | 'INVOICED'          // วางบิลแล้ว
  | 'CANCELLED';        // ยกเลิก

export type InvoiceStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'PAID'
  | 'CANCELLED';

export interface Company {
  id: string;
  code: CompanyCode;
  name: string;
  taxId?: string;
  address?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  companyCode?: string;
  companyName?: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  activeJobsCount?: number;
  vehiclesCount?: number;
  usersCount?: number;
  totalJobsCount?: number;
  _count?: {
    vehicles?: number;
    users?: number;
    jobs?: number;
    originJobs?: number;
    destJobs?: number;
  };
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  taxId?: string;
  phone: string;
  email: string;
  address?: string;
  services: string[]; // ['CAR_WASH', 'VEHICLE_SLIDE']
  bankName?: string;
  bankAccount?: string;
  isActive: boolean;
}

export interface Vehicle {
  vin: string;
  model: string;
  color: string;
  companyId: string;
  companyCode: CompanyCode;
  currentBranchId: string;
  currentBranchCode: string;
  currentBranchName: string;
  vehicleType: 'Sedan' | 'SUV' | 'Hatchback' | 'Commercial' | 'MPV';
  licensePlate?: string;
  mileage?: number;
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'IN_WASH' | 'MAINTENANCE';
}

export interface CarWashItem {
  id: string;
  jobId: string;
  vin: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  actualWashDate: string; // YYYY-MM-DD
  washType: 'STANDARD' | 'DEEP_CLEAN' | 'POLISH';
  unitPrice: number;
  status: CarWashItemStatus;
  remarks?: string;
}

// PENDING = รอ Supplier | COMPLETED = Supplier ส่งงานแล้ว (รอตรวจรับ)
// APPROVED = สาขาอนุมัติคันนี้แล้ว | REJECTED = สาขาตีกลับ | CANCELLED = Supplier ปฏิเสธ
export type CarWashItemStatus = 'PENDING' | 'COMPLETED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface CarWashItemProgress {
  completed: number;   // submitted or approved
  approved: number;
  cancelled: number;
  total: number;
  allResolved: boolean;
  allApproved: boolean;
  allCompleted: boolean;
}

export interface JobEvidence {
  id: string;
  jobId: string;
  vin?: string;
  photoUrl: string;
  caption: string;
  evidenceType: 'BEFORE' | 'AFTER' | 'PICKUP' | 'DROPOFF' | 'GENERAL';
  uploadedAt: string;
}

export interface Job {
  id: string;
  jobNumber: string;
  jobType: JobType;
  status: JobStatus;
  companyId: string;
  companyCode: CompanyCode;
  branchId: string;
  branchName: string;
  supplierId: string;
  supplierName: string;
  
  // สำหรับ Vehicle Slide
  vin?: string;
  vehicle?: Vehicle;
  originBranchId?: string;
  originBranchName?: string;
  originBranchAddress?: string;
  originBranchLat?: number;
  originBranchLng?: number;
  destBranchId?: string;
  destBranchName?: string;
  destBranchAddress?: string;
  destBranchLat?: number;
  destBranchLng?: number;
  customDestAddress?: string;
  customDestLat?: number;
  customDestLng?: number;
  // จุดรับรถแบบปักหมุดเอง (ใช้แทนที่อยู่สาขาต้นทาง)
  customOriginAddress?: string;
  customOriginLat?: number;
  customOriginLng?: number;
  pickupDateTime?: string;
  deliveryDateTime?: string;
  contactPerson?: string;
  contactPhone?: string;
  transferReason?: string;
  distance?: number;

  // สำหรับ Car Wash
  carWashItems?: CarWashItem[];

  // การตรวจรับและส่งมอบ — Snapshot ข้อมูลผู้สั่งงาน
  requestedById?: string;
  requestedBy: string;
  requesterPosition?: string;
  requesterPhone?: string;
  completedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectReason?: string;

  // หลักฐานภาพถ่าย
  evidences: JobEvidence[];

  // บันทึกกิจกรรม / Timeline
  activities?: JobActivity[];

  // การเงิน & วางบิล
  estimatedCost: number;
  actualCost?: number;
  invoiceId?: string;
  invoiceNumber?: string;

  createdAt: string;
  updatedAt: string;
}

export interface JobActivity {
  id: string;
  jobId: string;
  action: string;
  actor?: string;
  actorRole?: string;
  itemId?: string;
  vin?: string;
  description: string;
  metadata?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  companyId: string;
  companyCode: CompanyCode;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  jobIds: string[];
  jobs?: Job[];
  notes?: string;
  createdAt: string;
}
