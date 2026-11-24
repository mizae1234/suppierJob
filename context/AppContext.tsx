'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  UserRole, 
  CompanyCode, 
  Company, 
  Branch, 
  Supplier, 
  Vehicle, 
  Job, 
  Invoice, 
  JobStatus, 
  JobEvidence,
  CarWashItemStatus,
  CarWashItemProgress,
} from '@/types';
import { useAuth } from '@/context/AuthContext';

interface CreateCarWashParams {
  companyCode: CompanyCode;
  branchId: string;
  supplierId: string;
  items: Array<{
    vin: string;
    actualWashDate: string;
    washType: 'STANDARD' | 'DEEP_CLEAN' | 'POLISH' | string;
    unitPrice: number;
    remarks?: string;
    model?: string;
    color?: string;
    licensePlate?: string;
    isCustomServiceVehicle?: boolean;
  }>;
  requestedBy: string;
  requesterPosition?: string;
  requesterPhone?: string;
  estimatedCost?: number;
  carCategory?: 'NEW_CAR' | 'SERVICE';
  transferReason?: string;
}

interface CreateVehicleSlideParams {
  companyCode: CompanyCode;
  branchId?: string;
  pickupBranchId: string;
  destBranchId: string;
  supplierId: string;
  vin?: string;
  vins?: string[];
  pickupDateTime: string;
  deliveryDateTime: string;
  contactPerson: string;
  contactPhone: string;
  transferReason: string;
  requestedBy: string;
  requesterPosition?: string;
  requesterPhone?: string;
  estimatedCost: number;
  distance?: number;
  // วิธีคิดค่าบริการ: AUTO (ตามสัญญา) | MANUAL (กรอกเอง — ต้องมีหมายเหตุ)
  pricingMode?: 'AUTO' | 'MANUAL';
  manualPriceNote?: string;
  // รหัสคลัง D365 ปลายทาง (บังคับเมื่อสไลด์ระหว่างสาขา)
  destWarehouseId?: string;
  // Custom destination (map pin) — optional
  customDestAddress?: string;
  customDestLat?: number;
  customDestLng?: number;
  // Custom pickup point (map pin) — optional
  customOriginAddress?: string;
  customOriginLat?: number;
  customOriginLng?: number;
}

interface CreateInvoiceParams {
  supplierId: string;
  companyCode: CompanyCode;
  jobIds: string[];
  dueDate: string;
  notes?: string;
}

interface AppContextType {
  // Roles & Context
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentCompany: 'ALL' | CompanyCode;
  setCurrentCompany: (company: 'ALL' | CompanyCode) => void;
  currentBranchId: string;
  setCurrentBranchId: (branchId: string) => void;
  currentSupplierId: string;
  setCurrentSupplierId: (supplierId: string) => void;

  // Data
  companies: Company[];
  branches: Branch[];
  suppliers: Supplier[];
  vehicles: Vehicle[];
  jobs: Job[];
  invoices: Invoice[];

  // Helpers / Computed
  isLoaded: boolean;
  /** true เมื่อ API /api/jobs ตัดจำนวนงานตามเพดานสูงสุด (ตัวเลขในรายงานอาจไม่ครบทั้งหมด) */
  jobsTruncated: boolean;
  activeBranch?: Branch;
  activeSupplier?: Supplier;
  filteredJobs: Job[];
  filteredVehicles: Vehicle[];
  waitingApprovalCount: number;

  // Actions
  createCarWashJob: (params: CreateCarWashParams) => Promise<Job | null>;
  createVehicleSlideJob: (params: CreateVehicleSlideParams) => Promise<Job | null>;
  updateJobStatus: (jobId: string, status: JobStatus, options?: { rejectReason?: string; approvedBy?: string; failedAttemptFee?: number }) => Promise<{ success: boolean; pending?: boolean; error?: string; d365Po?: { success: boolean; purchId?: string; message: string } }>;
  updateCarWashItemStatus: (jobId: string, itemId: string, status: CarWashItemStatus, remarks?: string) => Promise<CarWashItemProgress | null>;
  addVehiclesToJob: (
    jobId: string,
    items: {
      vin: string;
      washType?: string;
      unitPrice?: number;
      remarks?: string;
      actualWashDate?: string;
      model?: string;
      color?: string;
      licensePlate?: string;
    }[]
  ) => Promise<{ success: boolean; error?: string; addedCount?: number }>;
  addJobEvidence: (jobId: string, evidence: Omit<JobEvidence, 'id' | 'jobId' | 'uploadedAt'>) => Promise<void>;
  createInvoice: (params: CreateInvoiceParams) => Promise<{ success: boolean; error?: string; invoice?: Invoice }>;
  refreshData: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshJob: (id: string) => Promise<Job | null>;
  refreshJobsAndVehicles: () => Promise<void>;
  resetToDefaultData: () => void;
}

const POLL_INTERVAL_MS = 30_000;        // ดึงเฉพาะงานที่เปลี่ยนทุก 30 วินาที
const FULL_RELOAD_INTERVAL_MS = 300_000; // โหลดเต็มทุก ~5 นาที เพื่อตัดงานที่ถูกลบหรือหลุดขอบเขตสิทธิ์
const FOCUS_DEBOUNCE_MS = 5_000;         // กันยิงซ้ำเมื่อ focus + visibilitychange ทำงานพร้อมกัน

function isSameJobSnapshot(a: Job, b: Job): boolean {
  return (
    a.id === b.id &&
    a.updatedAt === b.updatedAt &&
    a.status === b.status &&
    a.actualCost === b.actualCost &&
    a.d365PoStatus === b.d365PoStatus &&
    a.d365PoNumber === b.d365PoNumber &&
    a.d365PoMessage === b.d365PoMessage &&
    a.d365TransferStatus === b.d365TransferStatus &&
    a.d365TransferMessage === b.d365TransferMessage &&
    (a.evidenceCount ?? a.evidences?.length ?? 0) === (b.evidenceCount ?? b.evidences?.length ?? 0) &&
    (a.carWashItems?.length ?? 0) === (b.carWashItems?.length ?? 0)
  );
}

function areJobListsEqual(prev: Job[], next: Job[]): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (!isSameJobSnapshot(prev[i], next[i])) return false;
  }
  return true;
}

function shouldKeepExistingOverIncoming(existing: Job, incoming: Job): boolean {
  if (incoming.updatedAt < existing.updatedAt) return true;
  // กันผล poll ที่ค้างกลางทางทับสถานะ optimistic d365PoStatus='PENDING' ก่อนเซิร์ฟเวอร์ขยับ updatedAt
  if (
    incoming.updatedAt === existing.updatedAt &&
    existing.d365PoStatus === 'PENDING' &&
    incoming.d365PoStatus !== 'PENDING' &&
    incoming.status !== 'APPROVED'
  ) {
    return true;
  }
  return false;
}

function mergeIncrementalJobs(prev: Job[], delta: Job[]): Job[] {
  if (delta.length === 0) return prev;
  const prevById = new Map<string, Job>();
  for (const job of prev) prevById.set(job.id, job);

  let changed = false;
  const deltaById = new Map<string, Job>();
  const newJobs: Job[] = [];

  for (const job of delta) {
    const existing = prevById.get(job.id);
    if (!existing) {
      changed = true;
      deltaById.set(job.id, job);
      newJobs.push(job);
    } else if (shouldKeepExistingOverIncoming(existing, job)) {
      continue;
    } else if (!isSameJobSnapshot(existing, job)) {
      changed = true;
      deltaById.set(job.id, job);
    }
  }

  if (!changed) return prev;

  const merged = [
    ...newJobs,
    ...prev.map(job => deltaById.get(job.id) ?? job),
  ];
  merged.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));
  return merged;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, selectedCompany } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const userCompanyCode = user?.companyCode;
  const userBranchId = user?.branchId;
  const userSupplierId = user?.supplierId;

  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentCompany, setCurrentCompany] = useState<'ALL' | CompanyCode>('ALL');
  const [currentBranchId, setCurrentBranchId] = useState<string>('');
  const [currentSupplierIdState, setCurrentSupplierIdState] = useState<string>('');
  const currentSupplierId = userRole === 'SUPPLIER' ? (userSupplierId || '') : currentSupplierIdState;

  const setCurrentSupplierId = useCallback((id: string) => {
    if (userRole === 'SUPPLIER') {
      setCurrentSupplierIdState(userSupplierId || '');
      return;
    }
    setCurrentSupplierIdState(id);
  }, [userRole, userSupplierId]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [jobsTruncated, setJobsTruncated] = useState<boolean>(false);

  // ─── Fetch data from API (split so mutations refresh only what they affect) ───
  // Master data: companies (+ flattened branches) and suppliers
  const fetchMasterData = useCallback(async () => {
    try {
      const [companiesRes, suppliersRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/suppliers'),
      ]);
      const [companiesData, suppliersData] = await Promise.all([
        companiesRes.ok ? companiesRes.json().catch(() => ({})) : Promise.resolve({}),
        suppliersRes.ok ? suppliersRes.json().catch(() => ({})) : Promise.resolve({}),
      ]);

      if (companiesData.companies) {
        setCompanies(companiesData.companies);
        // Flatten branches from companies
        const allBranches: Branch[] = companiesData.companies.flatMap((c: Company & { branches: Branch[] }) =>
          c.branches.map((b: Branch) => ({ ...b, companyCode: c.code }))
        );
        setBranches(allBranches);
      }
      if (suppliersData.suppliers) setSuppliers(suppliersData.suppliers);
    } catch (e) {
      console.error('Failed to fetch master data:', e);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicles?scope=all');
      if (!res.ok) return;
      const data = await res.json();
      if (data.vehicles) setVehicles(data.vehicles);
    } catch (e) {
      console.error('Failed to fetch vehicles:', e);
    }
  }, []);

  const isFetchingJobsRef = useRef(false);
  const lastServerTimeRef = useRef<string | null>(null);
  const lastFullLoadAtRef = useRef<number>(0);
  const lastFetchAtRef = useRef<number>(0);
  const pendingPoIdsRef = useRef<Set<string>>(new Set());

  const fetchJobs = useCallback(async (options?: { full?: boolean }) => {
    if (isFetchingJobsRef.current) return;
    isFetchingJobsRef.current = true;
    const now = Date.now();
    lastFetchAtRef.current = now;

    const shouldFullLoad =
      Boolean(options?.full) ||
      !lastServerTimeRef.current ||
      now - lastFullLoadAtRef.current >= FULL_RELOAD_INTERVAL_MS;

    try {
      const url = shouldFullLoad
        ? '/api/jobs?view=list'
        : `/api/jobs?view=list&updatedSince=${encodeURIComponent(lastServerTimeRef.current!)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.serverTime === 'string') {
        lastServerTimeRef.current = data.serverTime;
      }
      if (!Array.isArray(data.jobs)) return;
      const incoming = data.jobs as Job[];

      const pendingPoApproved = incoming.some(
        job => pendingPoIdsRef.current.has(job.id) && job.status === 'APPROVED'
      );
      if (shouldFullLoad) {
        lastFullLoadAtRef.current = Date.now();
        setJobsTruncated(Boolean(data.truncated));
        setJobs(prev => {
          const prevById = new Map(prev.map(j => [j.id, j]));
          const reconciled = incoming.map(job => {
            const existing = prevById.get(job.id);
            if (existing && shouldKeepExistingOverIncoming(existing, job)) {
              return existing;
            }
            return job;
          });
          return areJobListsEqual(prev, reconciled) ? prev : reconciled;
        });
      } else if (incoming.length > 0) {
        setJobs(prev => mergeIncrementalJobs(prev, incoming));
      }
      // หาก incremental/full poll รับรู้ว่า PO ที่รออยู่เพิ่งอนุมัติเสร็จก่อน 5s poller → รีเฟรชรถด้วย
      if (pendingPoApproved) {
        void fetchVehicles();
      }
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    } finally {
      isFetchingJobsRef.current = false;
    }
  }, [fetchVehicles]);

  const refreshJobs = useCallback(async () => {
    await fetchJobs({ full: true });
  }, [fetchJobs]);

  // ดึงใบงานเดียวแบบเต็มจาก /api/jobs/[id] แล้วแทนที่ใน state (ใช้หลัง action ระดับใบงาน)
  const refreshJob = useCallback(async (id: string): Promise<Job | null> => {
    if (!id) return null;
    try {
      const res = await fetch(`/api/jobs/${id}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.job) return null;
      const freshJob = data.job as Job;
      setJobs(prev => {
        const idx = prev.findIndex(j => j.id === freshJob.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = freshJob;
          return next;
        }
        const next = [freshJob, ...prev];
        next.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));
        return next;
      });
      return freshJob;
    } catch (e) {
      console.error('Failed to refresh job:', e);
      return null;
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) return;
      const data = await res.json();
      if (data.invoices) setInvoices(data.invoices);
    } catch (e) {
      console.error('Failed to fetch invoices:', e);
    }
  }, []);

  // Full reload of everything (initial load + refreshData)
  const fetchData = useCallback(async () => {
    try {
      await Promise.all([fetchMasterData(), fetchVehicles(), fetchJobs({ full: true }), fetchInvoices()]);
    } finally {
      setIsLoaded(true);
    }
  }, [fetchMasterData, fetchVehicles, fetchJobs, fetchInvoices]);

  // Job create / status changes can lock or release vehicles → refresh both (incremental jobs + vehicles)
  const fetchJobsAndVehicles = useCallback(async () => {
    await Promise.all([fetchJobs({ full: false }), fetchVehicles()]);
  }, [fetchJobs, fetchVehicles]);

  // ─── ติดตามสถานะ PO ที่กำลังส่งไป D365 เบื้องหลัง ─────
  // เมื่อกดอนุมัติ API จะจอง d365PoStatus=PENDING แล้วตอบ 202 ทันที จากนั้นเปิด PO และปิดอนุมัติใน after()
  // (ใบงานจะยังไม่เปลี่ยนเป็น APPROVED จนกว่า PO สำเร็จ)
  // ดึงเฉพาะงานที่ PENDING ทุก 5 วินาที สูงสุด 48 ครั้ง (~4 นาที เผื่อ PO timeout 120 วินาที + OData recovery)
  const pendingPoJobIds = useMemo(
    () => jobs.filter(j => j.d365PoStatus === 'PENDING').map(j => j.id).sort().join(','),
    [jobs]
  );

  useEffect(() => {
    pendingPoIdsRef.current = new Set(pendingPoJobIds ? pendingPoJobIds.split(',') : []);
  }, [pendingPoJobIds]);

  useEffect(() => {
    if (!pendingPoJobIds) return;
    const ids = pendingPoJobIds.split(',');
    const MAX_POLL_ATTEMPTS = 48; // 48 x 5 วินาที = 4 นาที
    let attempts = 0;
    let cancelled = false;

    const timer = setInterval(async () => {
      attempts++;
      if (attempts >= MAX_POLL_ATTEMPTS) clearInterval(timer);
      const results = await Promise.all(
        ids.map(id =>
          fetch(`/api/jobs/${id}`, { cache: 'no-store' })
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null)
        )
      );
      if (cancelled) return;
      const settled = new Map<string, Job>();
      let hasApproved = false;
      for (const r of results) {
        if (r?.job && r.job.d365PoStatus !== 'PENDING') {
          settled.set(r.job.id, r.job as Job);
          if (r.job.status === 'APPROVED') hasApproved = true;
        }
      }
      if (settled.size > 0) {
        setJobs(prev => prev.map(j => settled.get(j.id) ?? j));
        if (hasApproved) {
          void fetchVehicles();
        }
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pendingPoJobIds, fetchVehicles]);

  // ─── Auto-refresh ใบงานแบบ incremental ทุก 30 วินาที (+ โหลดเต็มทุก ~5 นาที และ debounce focus/visibility) ─────
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshIfVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void fetchJobs({ full: false });
      }
    };

    const interval = setInterval(refreshIfVisible, POLL_INTERVAL_MS);

    // รวม focus + visibilitychange เป็น handler เดียวพร้อม debounce >= 5 วินาทีจากครั้งล่าสุด
    const handleResume = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchAtRef.current < FOCUS_DEBOUNCE_MS) return;
      void fetchJobs({ full: false });
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, [isAuthenticated, fetchJobs]);

  // ─── Sync user auth data to context (อ้างอิงเฉพาะค่า primitive ที่เสถียรแทน user object ทั้งก้อน) ─────────────
  const authSyncKey = isAuthenticated && userId
    ? `${userId}|${userRole || ''}|${userCompanyCode || ''}|${userBranchId || ''}|${userSupplierId || ''}|${selectedCompany || ''}`
    : 'GUEST';
  const [prevAuthSyncKey, setPrevAuthSyncKey] = useState<string | null>(null);
  if (prevAuthSyncKey !== authSyncKey) {
    setPrevAuthSyncKey(authSyncKey);
    if (!isAuthenticated || !userId) {
      setCurrentRole('ADMIN');
      setCurrentCompany('ALL');
      setCurrentBranchId('');
      setCurrentSupplierIdState('');
      setJobsTruncated(false);
    } else {
      setCurrentRole((userRole || 'ADMIN') as UserRole);
      setCurrentBranchId(userBranchId || '');
      setCurrentSupplierIdState(userSupplierId || '');

      // Set company based on user's role + login selection
      if (userRole === 'MASTER') {
        // Master can see everything, allow switching companies
        setCurrentCompany(selectedCompany || 'ALL');
      } else if (userRole === 'ADMIN') {
        // Admin is locked to their company
        if (userCompanyCode) {
          setCurrentCompany(userCompanyCode as CompanyCode);
        } else {
          setCurrentCompany(selectedCompany || 'ALL');
        }
      } else if (userCompanyCode) {
        setCurrentCompany(userCompanyCode as CompanyCode);
      }
    }
  }

  useEffect(() => {
    // รีเซ็ตตัวชี้เวลาเพื่อให้โหลดเต็มใหม่เมื่อเปลี่ยนผู้ใช้หรือบริษัท
    lastServerTimeRef.current = null;
    lastFullLoadAtRef.current = 0;
    lastFetchAtRef.current = 0;
    if (!isAuthenticated || !userId) return;
    fetchData();
  }, [isAuthenticated, userId, userRole, userCompanyCode, userBranchId, userSupplierId, selectedCompany, fetchData]);

  const activeBranch = useMemo(
    () => branches.find(b => b.id === currentBranchId),
    [branches, currentBranchId]
  );
  const effectiveSupplierId = userRole === 'SUPPLIER' ? (userSupplierId || '') : currentSupplierId;
  const activeSupplier = useMemo(
    () => suppliers.find(s => s.id === effectiveSupplierId),
    [suppliers, effectiveSupplierId]
  );

  // ─── Filtered data ──────────────────────────────
  const filteredJobs = useMemo(() => jobs.filter(job => {
    if (currentRole === 'BRANCH') {
      // Branch user sees all jobs involving their branch (requester, origin, or destination)
      // regardless of company code (e.g. EV7 transfers car to GI-อยุธยา)
      return job.branchId === currentBranchId || job.pickupBranchId === currentBranchId || job.destBranchId === currentBranchId;
    }
    if (currentCompany !== 'ALL' && job.companyCode !== currentCompany) return false;
    if (currentRole === 'MASTER') {
      // If MASTER has selected a specific branch, filter by it
      if (currentBranchId) {
        return job.branchId === currentBranchId || job.pickupBranchId === currentBranchId || job.destBranchId === currentBranchId;
      }
      return true;
    }
    if (currentRole === 'SUPPLIER' || userRole === 'SUPPLIER') {
      const sId = userSupplierId || currentSupplierId;
      if (!sId) return false;
      return job.supplierId === sId;
    }
    return true;
  }), [jobs, currentRole, currentBranchId, currentCompany, userRole, userSupplierId, currentSupplierId]);

  const filteredVehicles = useMemo(() => vehicles.filter(v => {
    if (currentCompany !== 'ALL' && v.companyCode !== currentCompany) return false;
    if (currentRole === 'MASTER' && currentBranchId) return v.currentBranchId === currentBranchId;
    if (currentRole === 'BRANCH') return v.currentBranchId === currentBranchId;
    return true;
  }), [vehicles, currentCompany, currentRole, currentBranchId]);

  const waitingApprovalCount = useMemo(
    () => filteredJobs.filter(j => j.status === 'WAITING_APPROVAL').length,
    [filteredJobs]
  );

  // ─── Action: Create Car Wash Job (via API) ──────
  const createCarWashJob = useCallback(async (params: CreateCarWashParams): Promise<Job | null> => {
    const company = companies.find(c => c.code === params.companyCode);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType: 'CAR_WASH',
          companyId: company?.id,
          branchId: params.branchId,
          supplierId: params.supplierId,
          requestedBy: params.requestedBy,
          requesterPosition: params.requesterPosition,
          requesterPhone: params.requesterPhone,
          items: params.items,
          estimatedCost: params.estimatedCost,
          carCategory: params.carCategory,
          transferReason: params.transferReason || (params.carCategory === 'SERVICE' ? 'รถ Service (ศูนย์บริการ)' : 'รถใหม่ (Stock / PDI)'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchJobsAndVehicles(); // New job + vehicles locked to it
        return data.job;
      }
      throw new Error(data.error || 'ไม่สามารถสร้างใบงานได้');
    } catch (e) {
      console.error('Create car wash job failed:', e);
      // Refresh so the form sees which cars just became busy
      fetchJobsAndVehicles();
      throw e;
    }
  }, [companies, fetchJobsAndVehicles]);

  // ─── Action: Create Vehicle Slide Job (via API) ─
  const createVehicleSlideJob = useCallback(async (params: CreateVehicleSlideParams): Promise<Job | null> => {
    const company = companies.find(c => c.code === params.companyCode);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType: 'VEHICLE_SLIDE',
          companyId: company?.id,
          branchId: params.branchId || params.pickupBranchId,
          supplierId: params.supplierId,
          vin: params.vin,
          vins: params.vins,
          pickupBranchId: params.pickupBranchId,
          destBranchId: params.destBranchId || undefined,
          customDestAddress: params.customDestAddress,
          customDestLat: params.customDestLat,
          customDestLng: params.customDestLng,
          customOriginAddress: params.customOriginAddress,
          customOriginLat: params.customOriginLat,
          customOriginLng: params.customOriginLng,
          pickupDateTime: params.pickupDateTime,
          deliveryDateTime: params.deliveryDateTime,
          contactPerson: params.contactPerson,
          contactPhone: params.contactPhone,
          transferReason: params.transferReason,
          requestedBy: params.requestedBy,
          requesterPosition: params.requesterPosition,
          requesterPhone: params.requesterPhone,
          estimatedCost: params.estimatedCost,
          distance: params.distance,
          pricingMode: params.pricingMode,
          manualPriceNote: params.manualPriceNote,
          destWarehouseId: params.destWarehouseId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchJobsAndVehicles();
        return data.job;
      }
      throw new Error(data.error || 'ไม่สามารถสร้างใบงานได้');
    } catch (e) {
      console.error('Create vehicle slide job failed:', e);
      fetchJobsAndVehicles();
      throw e;
    }
  }, [companies, fetchJobsAndVehicles]);

  // ─── Action: Update Job Status (via API) ────────
  const updateJobStatus = useCallback(async (
    jobId: string, 
    status: JobStatus, 
    options?: { rejectReason?: string; approvedBy?: string; failedAttemptFee?: number }
  ): Promise<{ success: boolean; pending?: boolean; error?: string; d365Po?: { success: boolean; purchId?: string; message: string } }> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectReason: options?.rejectReason,
          approvedBy: options?.approvedBy,
          ...(typeof options?.failedAttemptFee === 'number'
            ? { failedAttemptFee: options.failedAttemptFee }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.d365Po) {
          setJobs(prev =>
            prev.map(j =>
              j.id === jobId
                ? {
                    ...j,
                    d365PoStatus: 'FAILED',
                    d365PoMessage: data.d365Po.message,
                  }
                : j
            )
          );
        }
        return {
          success: false,
          error: data.error || 'ไม่สามารถอัปเดตสถานะงานได้',
          d365Po: data.d365Po,
        };
      }

      // 202 Pending: กำลังเปิด PO ใน D365 เบื้องหลัง → ยังไม่เปลี่ยน status เป็น APPROVED (poller จะอัปเดตเมื่อเสร็จ)
      if (res.status === 202 || data.pending) {
        setJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  ...(typeof options?.failedAttemptFee === 'number'
                    ? { actualCost: options.failedAttemptFee }
                    : {}),
                  d365PoStatus: 'PENDING',
                  d365PoMessage: data.message || 'กำลังส่งเปิดใบสั่งซื้อไปยัง D365...',
                  d365PoSentAt: new Date().toISOString(),
                }
              : j
          )
        );
        return { success: true, pending: true };
      }

      // อัปเดต state ทันทีเพื่อให้ UI และเลข PO แสดงผลโดยไม่ต้องรอโหลดข้อมูลรถทั้งหมดซ้ำ
      setJobs(prev =>
        prev.map(j => {
          if (j.id !== jobId) return j;
          return {
            ...j,
            status,
            ...(data.job ? {
              approvedAt: data.job.approvedAt ?? j.approvedAt,
              approvedBy: data.job.approvedBy ?? j.approvedBy,
              actualCost: data.job.actualCost ?? j.actualCost,
              rejectReason: data.job.rejectReason ?? j.rejectReason,
            } : {}),
            ...(data.d365Po ? {
              d365PoNumber: data.d365Po.purchId ?? j.d365PoNumber,
              d365PoStatus: data.d365Po.success ? 'SUCCESS' : 'FAILED',
              d365PoMessage: data.d365Po.message,
            } : {}),
          };
        })
      );
      // ซิงค์ข้อมูลใบงานและรถเบื้องหลังโดยไม่บล็อกปุ่มผู้ใช้
      void fetchJobsAndVehicles();
      return { success: true, d365Po: data.d365Po };
    } catch (e: unknown) {
      console.error('Update job status failed:', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
      };
    }
  }, [fetchJobsAndVehicles]);

  // ─── Action: Update CarWashItem Status (per-VIN) ─
  const updateCarWashItemStatus = useCallback(async (
    jobId: string,
    itemId: string,
    status: CarWashItemStatus,
    remarks?: string
  ): Promise<CarWashItemProgress | null> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.d365Po) {
          setJobs(prev =>
            prev.map(j =>
              j.id === jobId
                ? {
                    ...j,
                    d365PoStatus: 'FAILED',
                    d365PoMessage: data.d365Po.message,
                  }
                : j
            )
          );
        }
        return {
          completed: 0,
          approved: 0,
          cancelled: 0,
          total: 0,
          allResolved: false,
          allApproved: false,
          allCompleted: false,
          error: data.error || 'ไม่สามารถอนุมัติรายการได้',
          d365Po: data.d365Po,
        };
      }
      // 202 Pending: คันสุดท้ายที่ทำให้ปิดใบงาน → กำลังเปิด PO ใน D365 เบื้องหลัง ยังไม่เปลี่ยน status เป็น APPROVED
      if (res.status === 202 || data.pending) {
        setJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  d365PoStatus: 'PENDING',
                  d365PoMessage: data.message || 'กำลังส่งเปิดใบสั่งซื้อไปยัง D365...',
                  d365PoSentAt: new Date().toISOString(),
                }
              : j
          )
        );
        return {
          completed: data.progress?.completed ?? 0,
          approved: data.progress?.approved ?? 0,
          cancelled: data.progress?.cancelled ?? 0,
          total: data.progress?.total ?? 0,
          allResolved: !!data.progress?.allResolved,
          allApproved: false,
          allCompleted: !!data.progress?.allResolved,
          pending: true,
        };
      }
      if (data.success) {
        const d365Po = data.d365Po ?? data.progress?.d365Po;
        // อัปเดตสถานะรถและใบงานใน state ทันทีโดยไม่บล็อกรอ fetch ทั้งระบบ
        setJobs(prev =>
          prev.map(j => {
            if (j.id !== jobId) return j;
            const nextItems = j.carWashItems?.map(it =>
              it.id === itemId ? { ...it, status, remarks: remarks ?? it.remarks } : it
            );
            return {
              ...j,
              carWashItems: nextItems,
              ...(data.progress?.allApproved ? { status: 'APPROVED' as JobStatus } : {}),
              ...(d365Po ? {
                d365PoNumber: d365Po.purchId ?? j.d365PoNumber,
                d365PoStatus: d365Po.success ? 'SUCCESS' : 'FAILED',
                d365PoMessage: d365Po.message,
              } : {}),
            };
          })
        );
        void fetchJobsAndVehicles();
        return {
          ...data.progress,
          allCompleted: !!data.progress?.allResolved,
          d365Po,
        };
      }
    } catch (e) {
      console.error('Update car wash item status failed:', e);
    }
    return null;
  }, [fetchJobsAndVehicles]);

  // ─── Action: Add Vehicles to Existing Job (ก่อน Supplier ยืนยันรถคันแรก) ─
  const addVehiclesToJob = useCallback(async (
    jobId: string,
    items: {
      vin: string;
      washType?: string;
      unitPrice?: number;
      remarks?: string;
      actualWashDate?: string;
      model?: string;
      color?: string;
      licensePlate?: string;
    }[]
  ): Promise<{ success: boolean; error?: string; addedCount?: number }> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'ไม่สามารถเพิ่มรถเข้าใบงานได้' };
      }
      await fetchJobsAndVehicles();
      return { success: true, addedCount: data.addedCount };
    } catch (e: unknown) {
      console.error('Add vehicles to job failed:', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์',
      };
    }
  }, [fetchJobsAndVehicles]);

  // ─── Action: Add Job Evidence (via API) ─────────
  const addJobEvidence = useCallback(async (jobId: string, evidence: Omit<JobEvidence, 'id' | 'jobId' | 'uploadedAt'>) => {
    try {
      await fetch(`/api/jobs/${jobId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evidence),
      });
      // อัปเดตเฉพาะใบงานนี้แทนการโหลดใบงานทั้งหมดซ้ำ
      await refreshJob(jobId);
    } catch (e) {
      console.error('Add evidence failed:', e);
    }
  }, [refreshJob]);

  // ─── Action: Create Invoice (via API) ───────────
  const createInvoice = useCallback(async (params: CreateInvoiceParams) => {
    const company = companies.find(c => c.code === params.companyCode);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: params.supplierId,
          companyId: company?.id,
          jobIds: params.jobIds,
          dueDate: params.dueDate,
          notes: params.notes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Jobs become INVOICED + new invoice → refresh jobs + invoices
        await Promise.all([fetchJobs(), fetchInvoices()]);
        return { success: true, invoice: data.invoice };
      }
      return { success: false, error: data.error || 'สร้าง Invoice ไม่สำเร็จ' };
    } catch (e) {
      console.error('Create invoice failed:', e);
      return { success: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    }
  }, [companies, fetchJobs, fetchInvoices]);

  // ─── Refresh Data ───────────────────────────────
  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // ─── Reset Data ─────────────────────────────────
  const resetToDefaultData = useCallback(() => {
    setJobs([]);
    setVehicles([]);
    setInvoices([]);
    setCurrentRole('ADMIN');
    setCurrentCompany('ALL');
    setCurrentBranchId('');
    setCurrentSupplierId('');
  }, [setCurrentSupplierId]);

  // Memoize the context value so the 29+ consumers only re-render when something they read changes
  const value = useMemo<AppContextType>(() => ({
    isLoaded,
    jobsTruncated,
    currentRole,
    setCurrentRole,
    currentCompany,
    setCurrentCompany,
    currentBranchId,
    setCurrentBranchId,
    currentSupplierId,
    setCurrentSupplierId,
    companies,
    branches,
    suppliers,
    vehicles,
    jobs,
    invoices,
    activeBranch,
    activeSupplier,
    filteredJobs,
    filteredVehicles,
    waitingApprovalCount,
    createCarWashJob,
    createVehicleSlideJob,
    updateJobStatus,
    updateCarWashItemStatus,
    addVehiclesToJob,
    addJobEvidence,
    createInvoice,
    refreshData,
    refreshJobs,
    refreshJob,
    refreshJobsAndVehicles: fetchJobsAndVehicles,
    resetToDefaultData,
  }), [
    isLoaded,
    jobsTruncated,
    currentRole,
    currentCompany,
    currentBranchId,
    currentSupplierId,
    setCurrentSupplierId,
    companies,
    branches,
    suppliers,
    vehicles,
    jobs,
    invoices,
    activeBranch,
    activeSupplier,
    filteredJobs,
    filteredVehicles,
    waitingApprovalCount,
    createCarWashJob,
    createVehicleSlideJob,
    updateJobStatus,
    updateCarWashItemStatus,
    addVehiclesToJob,
    addJobEvidence,
    createInvoice,
    refreshData,
    refreshJobs,
    refreshJob,
    fetchJobsAndVehicles,
    resetToDefaultData,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
