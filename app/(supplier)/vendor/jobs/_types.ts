import { Job, JobStatus, CarWashItemStatus } from '@/types';

// returned = สาขาตรวจรับไม่ผ่าน ตีกลับให้แก้ไข | declined = Supplier ปฏิเสธรับงานเอง
export type TabKey = 'verify' | 'progress' | 'waiting' | 'approved' | 'returned' | 'declined';

export const VALID_TABS: TabKey[] = ['verify', 'progress', 'waiting', 'approved', 'returned', 'declined'];

export type TabCounts = Record<TabKey, number>;

// ─── Item-level virtual card type for Supplier display ──
export interface SupplierItemCard {
  // Item-level data
  itemId: string;
  vin: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  washType: string;
  unitPrice: number;
  itemStatus: CarWashItemStatus;
  itemRemarks?: string;
  actualWashDate: string;
  verifiedAt?: string; // ยืนยันตัวรถแล้วเมื่อ (ขั้นตอนแรกก่อนเริ่มงาน)
  // Parent job reference
  jobId: string;
  jobNumber: string;
  jobStatus: JobStatus;
  branchName: string;
  supplierName: string;
  companyCode: string;
  supplierId: string;
  totalItemsInJob: number;
  completedItemsInJob: number;
  job: Job; // Full reference
}

export interface VendorJobCardActions {
  submittingId: string | null;
  onOpenPhotoForWash: (card: SupplierItemCard) => void;
  onOpenRejectForWash: (card: SupplierItemCard) => void;
  onOpenPhotoForSlide: (job: Job) => void;
  onOpenRejectForSlide: (job: Job) => void;
  onReportFailedAttempt: (job: Job) => void;
}
