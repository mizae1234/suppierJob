import { getJobTotalCost } from '@/lib/job-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
import { CarWashItem, Job, JobStatus, Supplier, UserRole } from '@/types';
import { DropdownOption } from '@/components/ui/CustomDropdown';

export type ReportTab = 'overview' | 'wash' | 'slide';
export type CompanyFilter = 'ALL' | 'EV7' | 'GI';
export type SlideDirectionFilter = 'ALL' | 'OUTBOUND' | 'INBOUND';

export interface StatusMeta {
  label: string;
  bg: string;
  text: string;
  dot: string;
}

export const STATUS_MAP: Record<string, StatusMeta> = {
  PENDING_SUPPLIER: { label: 'รอ Supplier รับงาน', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'กำลังทำงาน', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
  WAITING_APPROVAL: { label: 'รอตรวจรับ', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-900 font-bold', dot: 'bg-orange-500' },
  APPROVED: { label: 'Approved พร้อมวางบิล', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-900 font-bold', dot: 'bg-emerald-600' },
  REJECTED: { label: 'ขอแก้ไข', bg: 'bg-red-50 border-red-200', text: 'text-red-800 font-bold', dot: 'bg-red-500' },
  INVOICED: { label: 'วางบิลแล้ว', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500' },
  CANCELLED: { label: 'ยกเลิก', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', dot: 'bg-gray-400' },
};

/** ตัวเลือกสถานะใบงานใน dropdown ของรายงานล้างรถและรถสไลด์ */
export const REPORT_STATUS_OPTIONS: DropdownOption[] = [
  { value: 'ALL', label: 'สถานะทั้งหมด', dot: '#9ca3af' },
  { value: 'WAITING_APPROVAL', label: 'รอตรวจรับ', dot: '#f97316' },
  { value: 'APPROVED', label: 'Approved แล้ว', dot: '#10b981' },
  { value: 'IN_PROGRESS', label: 'กำลังทำงาน', dot: '#f59e0b' },
  { value: 'INVOICED', label: 'วางบิลแล้ว', dot: '#a855f7' },
  { value: 'REJECTED', label: 'ขอแก้ไข', dot: '#ef4444' },
];

export function getStatusMeta(status: string): StatusMeta {
  return (
    STATUS_MAP[status] || {
      label: status,
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-700',
      dot: 'bg-gray-400',
    }
  );
}

export function cleanBranchName(rawName?: string | null): string {
  if (!rawName) return '-';
  return rawName.replace(/\s*CO\.,?\s*LTD\.?/gi, '').trim();
}

export function isApprovedOrInvoiced(status: JobStatus): boolean {
  return status === 'APPROVED' || status === 'INVOICED';
}

export function getSlideJobCarCount(job: Job): number {
  if (job.carWashItems && job.carWashItems.length > 0) return job.carWashItems.length;
  return job.vin ? 1 : 0;
}

export interface OverviewExpenseStats {
  totalExpense: number;
  ev7Expense: number;
  giExpense: number;
  ev7Pct: number;
  giPct: number;
}

export interface BranchExpenseSplit {
  combinedApprovedExpense: number;
  branchWashPct: number;
  branchSlidePct: number;
}

export interface SupplierOverviewStat {
  supplier: Supplier;
  jobsCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalCost: number;
}

export interface BranchWashStat {
  branchName: string;
  jobsCount: number;
  carsCount: number;
  totalCost: number;
}

export interface SupplierWashStat {
  supplierName: string;
  jobsCount: number;
  carsCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalCost: number;
}

export interface DynamicWashServiceStat {
  code: string;
  label: string;
  count: number;
  cost: number;
}

export interface CarModelStat {
  model: string;
  count: number;
  totalCost: number;
}

export interface WashAnalytics {
  washJobs: Job[];
  approvedWashJobs: Job[];
  washTotalExpense: number;
  totalCarsWashed: number;
  avgCostPerCar: number;
  branchWashStats: BranchWashStat[];
  supplierWashStats: SupplierWashStat[];
  dynamicWashServiceStats: DynamicWashServiceStat[];
  carModelStats: CarModelStat[];
  washSupplierOptions: DropdownOption[];
}

export interface BranchSlideStat {
  branchName: string;
  outboundTrips: number;
  outboundCars: number;
  totalCost: number;
}

export interface SupplierSlideStat {
  supplierName: string;
  tripsCount: number;
  carsCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalCost: number;
}

export interface SlideAnalytics {
  slideJobs: Job[];
  approvedSlideJobs: Job[];
  slideTotalExpense: number;
  totalSlideCars: number;
  avgCostPerSlideTrip: number;
  outboundSlideJobsCount: number;
  inboundSlideJobsCount: number;
  branchSlideStats: BranchSlideStat[];
  supplierSlideStats: SupplierSlideStat[];
}

/** กรองรายการงานตามขอบเขตสาขาสำหรับบทบาท BRANCH */
export function scopeJobsByBranch(
  jobs: Job[],
  currentRole: UserRole,
  currentBranchId?: string
): Job[] {
  if (currentRole === 'BRANCH' && currentBranchId) {
    return jobs.filter(
      j =>
        j.branchId === currentBranchId ||
        j.pickupBranchId === currentBranchId ||
        j.destBranchId === currentBranchId
    );
  }
  return jobs;
}

/** กรองรายการงานตามบริษัทที่เลือก (เฉพาะ ADMIN / MASTER) */
export function filterJobsByCompany(
  baseJobs: Job[],
  companyFilter: CompanyFilter,
  currentRole: UserRole
): Job[] {
  if (currentRole === 'BRANCH' || companyFilter === 'ALL') return baseJobs;
  return baseJobs.filter(j => j.companyCode === companyFilter);
}

/** คำนวณยอดค่าใช้จ่ายภาพรวมและสัดส่วน EV7 / GI */
export function computeOverviewExpenseStats(
  baseJobs: Job[],
  filteredJobs: Job[]
): OverviewExpenseStats {
  const totalExpense = filteredJobs
    .filter(j => isApprovedOrInvoiced(j.status))
    .reduce((sum, j) => sum + getJobTotalCost(j), 0);

  const ev7Expense = baseJobs
    .filter(j => isApprovedOrInvoiced(j.status) && j.companyCode === 'EV7')
    .reduce((sum, j) => sum + getJobTotalCost(j), 0);

  const giExpense = baseJobs
    .filter(j => isApprovedOrInvoiced(j.status) && j.companyCode === 'GI')
    .reduce((sum, j) => sum + getJobTotalCost(j), 0);

  const ev7Pct = totalExpense > 0 ? Math.round((ev7Expense / totalExpense) * 100) : 0;
  const giPct = totalExpense > 0 ? Math.round((giExpense / totalExpense) * 100) : 0;

  return { totalExpense, ev7Expense, giExpense, ev7Pct, giPct };
}

/** คำนวณสัดส่วนค่าใช้จ่ายล้างรถ vs รถสไลด์ สำหรับมุมมองสาขา */
export function computeBranchExpenseSplit(
  washTotalExpense: number,
  slideTotalExpense: number
): BranchExpenseSplit {
  const combinedApprovedExpense = washTotalExpense + slideTotalExpense;
  const branchWashPct =
    combinedApprovedExpense > 0 ? Math.round((washTotalExpense / combinedApprovedExpense) * 100) : 0;
  const branchSlidePct =
    combinedApprovedExpense > 0 ? Math.round((slideTotalExpense / combinedApprovedExpense) * 100) : 0;

  return { combinedApprovedExpense, branchWashPct, branchSlidePct };
}

/** คำนวณสรุปผลงาน Supplier ทุกบริการในแท็บภาพรวม */
export function computeSupplierOverviewStats(
  suppliers: Supplier[],
  filteredJobs: Job[]
): SupplierOverviewStat[] {
  return suppliers.map(supplier => {
    const sJobs = filteredJobs.filter(j => j.supplierId === supplier.id);
    const sApproved = sJobs.filter(j => isApprovedOrInvoiced(j.status));
    const sRejected = sJobs.filter(j => j.status === 'REJECTED');
    const totalCost = sApproved.reduce((sum, j) => sum + getJobTotalCost(j), 0);

    return {
      supplier,
      jobsCount: sJobs.length,
      approvedCount: sApproved.length,
      rejectedCount: sRejected.length,
      totalCost,
    };
  });
}

/** คำนวณสถิติทั้งหมดของงานล้างรถ (Car Wash) */
export function computeWashAnalytics(filteredJobs: Job[]): WashAnalytics {
  const washJobs = filteredJobs.filter(j => j.jobType === 'CAR_WASH');
  const approvedWashJobs = washJobs.filter(j => isApprovedOrInvoiced(j.status));
  const washTotalExpense = approvedWashJobs.reduce((sum, j) => sum + getJobTotalCost(j), 0);
  const totalCarsWashed = washJobs.reduce((sum, j) => sum + (j.carWashItems?.length || 0), 0);
  const avgCostPerCar = totalCarsWashed > 0 ? Math.round(washTotalExpense / totalCarsWashed) : 0;

  // แยกตามสาขา
  const branchMap = new Map<string, BranchWashStat>();
  washJobs.forEach(j => {
    const bName = j.branchName || 'ไม่ระบุสาขา';
    const existing = branchMap.get(bName) || {
      branchName: bName,
      jobsCount: 0,
      carsCount: 0,
      totalCost: 0,
    };
    existing.jobsCount += 1;
    existing.carsCount += j.carWashItems?.length || 0;
    if (isApprovedOrInvoiced(j.status)) {
      existing.totalCost += getJobTotalCost(j);
    }
    branchMap.set(bName, existing);
  });
  const branchWashStats = Array.from(branchMap.values()).sort((a, b) => b.carsCount - a.carsCount);

  // แยกตาม Supplier
  const supplierMap = new Map<string, SupplierWashStat>();
  washJobs.forEach(j => {
    const sName = j.supplierName || 'ไม่ระบุ Supplier';
    const existing = supplierMap.get(sName) || {
      supplierName: sName,
      jobsCount: 0,
      carsCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      totalCost: 0,
    };
    existing.jobsCount += 1;
    existing.carsCount += j.carWashItems?.length || 0;
    if (isApprovedOrInvoiced(j.status)) {
      existing.approvedCount += 1;
      existing.totalCost += getJobTotalCost(j);
    } else if (j.status === 'REJECTED') {
      existing.rejectedCount += 1;
    }
    supplierMap.set(sName, existing);
  });
  const supplierWashStats = Array.from(supplierMap.values()).sort(
    (a, b) => b.totalCost - a.totalCost
  );

  // แยกตามบริการคาร์แคร์ที่สั่งทำจริง
  const serviceMap = new Map<string, DynamicWashServiceStat>();
  washJobs.forEach(j => {
    const isApproved = isApprovedOrInvoiced(j.status);
    (j.carWashItems || []).forEach(item => {
      const rawCode = item.washType || 'WASH_NORMAL';
      const meta = getWashServiceDisplay(rawCode);
      const displayLabel = meta.name;

      const existing = serviceMap.get(displayLabel) || {
        code: rawCode,
        label: displayLabel,
        count: 0,
        cost: 0,
      };
      existing.count += 1;
      if (isApproved) {
        existing.cost += item.unitPrice || 0;
      }
      serviceMap.set(displayLabel, existing);
    });
  });
  const dynamicWashServiceStats = Array.from(serviceMap.values()).sort(
    (a, b) => b.count - a.count
  );

  // แยกตามรุ่นรถยนต์
  const modelMap = new Map<string, CarModelStat>();
  washJobs.forEach(j => {
    const isApproved = isApprovedOrInvoiced(j.status);
    (j.carWashItems || []).forEach(item => {
      const modelName = item.vehicleModel?.trim() || 'ไม่ระบุรุ่น';
      const existing = modelMap.get(modelName) || { model: modelName, count: 0, totalCost: 0 };
      existing.count += 1;
      if (isApproved) {
        existing.totalCost += item.unitPrice || 0;
      }
      modelMap.set(modelName, existing);
    });
  });
  const carModelStats = Array.from(modelMap.values()).sort((a, b) => b.count - a.count);

  const washSupplierOptions: DropdownOption[] = [
    { value: 'ALL', label: 'Supplier ทั้งหมด', dot: '#9ca3af' },
    ...supplierWashStats.map(s => ({
      value: s.supplierName,
      label: s.supplierName,
      dot: '#10b981',
    })),
  ];

  return {
    washJobs,
    approvedWashJobs,
    washTotalExpense,
    totalCarsWashed,
    avgCostPerCar,
    branchWashStats,
    supplierWashStats,
    dynamicWashServiceStats,
    carModelStats,
    washSupplierOptions,
  };
}

/** กรองตารางรายการงานล้างรถตามสถานะ Supplier และคำค้นหา */
export function filterWashReportJobs(
  washJobs: Job[],
  filters: {
    status: 'ALL' | JobStatus;
    supplier: string;
    searchQuery: string;
  }
): Job[] {
  const { status, supplier, searchQuery } = filters;

  return washJobs.filter(j => {
    if (status !== 'ALL' && j.status !== status) return false;
    if (supplier !== 'ALL' && (j.supplierName || 'ไม่ระบุ Supplier') !== supplier) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchJobNo = j.jobNumber?.toLowerCase().includes(q);
      const matchSupplier = j.supplierName?.toLowerCase().includes(q);
      const matchBranch = (j.branchName || '').toLowerCase().includes(q);
      const matchVin = j.carWashItems?.some(item => item.vin?.toLowerCase().includes(q));
      const matchPlate = j.carWashItems?.some(item => item.licensePlate?.toLowerCase().includes(q));
      const matchModel = j.carWashItems?.some(item => item.vehicleModel?.toLowerCase().includes(q));
      const matchService = j.carWashItems?.some(item => {
        const sName = getWashServiceDisplay(item.washType).name.toLowerCase();
        return sName.includes(q) || item.washType?.toLowerCase().includes(q);
      });

      if (
        !matchJobNo &&
        !matchSupplier &&
        !matchBranch &&
        !matchVin &&
        !matchPlate &&
        !matchModel &&
        !matchService
      ) {
        return false;
      }
    }

    return true;
  });
}

/** รวมจำนวนบริการล้างรถต่อใบงานเพื่อแสดงเป็น badge */
export function buildWashItemServiceCounts(items: CarWashItem[]): Array<[string, number]> {
  const serviceCounts = new Map<string, number>();
  items.forEach(item => {
    const name = getWashServiceDisplay(item.washType).name;
    serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
  });
  return Array.from(serviceCounts.entries());
}

/** คำนวณสถิติทั้งหมดของงานรถสไลด์ (Vehicle Slide) */
export function computeSlideAnalytics(
  filteredJobs: Job[],
  currentBranchId?: string
): SlideAnalytics {
  const slideJobs = filteredJobs.filter(j => j.jobType === 'VEHICLE_SLIDE');
  const approvedSlideJobs = slideJobs.filter(j => isApprovedOrInvoiced(j.status));
  const slideTotalExpense = approvedSlideJobs.reduce((sum, j) => sum + getJobTotalCost(j), 0);
  const totalSlideCars = slideJobs.reduce((sum, j) => sum + getSlideJobCarCount(j), 0);
  const avgCostPerSlideTrip =
    slideJobs.length > 0 ? Math.round(slideTotalExpense / slideJobs.length) : 0;

  const outboundSlideJobsCount = currentBranchId
    ? slideJobs.filter(j => j.pickupBranchId === currentBranchId).length
    : 0;
  const inboundSlideJobsCount = currentBranchId
    ? slideJobs.filter(j => j.destBranchId === currentBranchId).length
    : 0;

  // แยกตามสาขาต้นทาง
  const branchMap = new Map<string, BranchSlideStat>();
  slideJobs.forEach(j => {
    const bName = j.pickupBranchName || j.branchName || 'ไม่ระบุสาขา';
    const carCount = getSlideJobCarCount(j);

    const existing = branchMap.get(bName) || {
      branchName: bName,
      outboundTrips: 0,
      outboundCars: 0,
      totalCost: 0,
    };
    existing.outboundTrips += 1;
    existing.outboundCars += carCount;
    if (isApprovedOrInvoiced(j.status)) {
      existing.totalCost += getJobTotalCost(j);
    }
    branchMap.set(bName, existing);
  });
  const branchSlideStats = Array.from(branchMap.values()).sort(
    (a, b) => b.outboundCars - a.outboundCars
  );

  // แยกตาม Supplier รถสไลด์
  const supplierMap = new Map<string, SupplierSlideStat>();
  slideJobs.forEach(j => {
    const sName = j.supplierName || 'ไม่ระบุ Supplier';
    const carCount = getSlideJobCarCount(j);

    const existing = supplierMap.get(sName) || {
      supplierName: sName,
      tripsCount: 0,
      carsCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      totalCost: 0,
    };
    existing.tripsCount += 1;
    existing.carsCount += carCount;
    if (isApprovedOrInvoiced(j.status)) {
      existing.approvedCount += 1;
      existing.totalCost += getJobTotalCost(j);
    } else if (j.status === 'REJECTED') {
      existing.rejectedCount += 1;
    }
    supplierMap.set(sName, existing);
  });
  const supplierSlideStats = Array.from(supplierMap.values()).sort(
    (a, b) => b.totalCost - a.totalCost
  );

  return {
    slideJobs,
    approvedSlideJobs,
    slideTotalExpense,
    totalSlideCars,
    avgCostPerSlideTrip,
    outboundSlideJobsCount,
    inboundSlideJobsCount,
    branchSlideStats,
    supplierSlideStats,
  };
}

/** กรองตารางรายการงานรถสไลด์ตามสถานะ ทิศทาง (สาขา) และคำค้นหา */
export function filterSlideReportJobs(
  slideJobs: Job[],
  filters: {
    status: 'ALL' | JobStatus;
    direction: SlideDirectionFilter;
    searchQuery: string;
  },
  currentRole: UserRole,
  currentBranchId?: string
): Job[] {
  const { status, direction, searchQuery } = filters;

  return slideJobs.filter(j => {
    if (status !== 'ALL' && j.status !== status) return false;

    if (currentRole === 'BRANCH' && currentBranchId) {
      const isOutbound = j.pickupBranchId === currentBranchId;
      const isInbound = j.destBranchId === currentBranchId;
      if (direction === 'OUTBOUND' && !isOutbound) return false;
      if (direction === 'INBOUND' && !isInbound) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchJobNo = j.jobNumber?.toLowerCase().includes(q);
      const matchSupplier = j.supplierName?.toLowerCase().includes(q);
      const matchOrigin = (j.pickupBranchName || j.branchName || '').toLowerCase().includes(q);
      const matchDest = (j.destBranchName || j.customDestAddress || '').toLowerCase().includes(q);
      const matchVin =
        j.vin?.toLowerCase().includes(q) ||
        j.carWashItems?.some(item => item.vin?.toLowerCase().includes(q));
      const matchPlate =
        j.vehicle?.licensePlate?.toLowerCase().includes(q) ||
        j.carWashItems?.some(item => item.licensePlate?.toLowerCase().includes(q));
      const matchModel =
        j.vehicle?.model?.toLowerCase().includes(q) ||
        j.carWashItems?.some(item => item.vehicleModel?.toLowerCase().includes(q));

      if (
        !matchJobNo &&
        !matchSupplier &&
        !matchOrigin &&
        !matchDest &&
        !matchVin &&
        !matchPlate &&
        !matchModel
      ) {
        return false;
      }
    }

    return true;
  });
}
