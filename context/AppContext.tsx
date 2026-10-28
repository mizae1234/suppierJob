'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  CarWashItem,
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
  originBranchId: string;
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
  activeBranch?: Branch;
  activeSupplier?: Supplier;
  filteredJobs: Job[];
  filteredVehicles: Vehicle[];
  waitingApprovalCount: number;

  // Actions
  createCarWashJob: (params: CreateCarWashParams) => Promise<Job | null>;
  createVehicleSlideJob: (params: CreateVehicleSlideParams) => Promise<Job | null>;
  updateJobStatus: (jobId: string, status: JobStatus, options?: { rejectReason?: string; approvedBy?: string }) => Promise<{ success: boolean; error?: string }>;
  updateCarWashItemStatus: (jobId: string, itemId: string, status: CarWashItemStatus, remarks?: string) => Promise<CarWashItemProgress | null>;
  addJobEvidence: (jobId: string, evidence: Omit<JobEvidence, 'id' | 'jobId' | 'uploadedAt'>) => Promise<void>;
  createInvoice: (params: CreateInvoiceParams) => Promise<{ success: boolean; error?: string; invoice?: Invoice }>;
  refreshData: () => Promise<void>;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, selectedCompany } = useAuth();

  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentCompany, setCurrentCompany] = useState<'ALL' | CompanyCode>('ALL');
  const [currentBranchId, setCurrentBranchId] = useState<string>('');
  const [currentSupplierIdState, setCurrentSupplierIdState] = useState<string>('');
  const currentSupplierId = user?.role === 'SUPPLIER' ? (user.supplierId || '') : currentSupplierIdState;

  const setCurrentSupplierId = useCallback((id: string) => {
    if (user?.role === 'SUPPLIER') {
      setCurrentSupplierIdState(user.supplierId || '');
      return;
    }
    setCurrentSupplierIdState(id);
  }, [user]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // ─── Fetch data from API (split so mutations refresh only what they affect) ───
  // Master data: companies (+ flattened branches) and suppliers
  const fetchMasterData = useCallback(async () => {
    try {
      const [companiesRes, suppliersRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/suppliers'),
      ]);
      const [companiesData, suppliersData] = await Promise.all([
        companiesRes.json(),
        suppliersRes.json(),
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
      const data = await res.json();
      if (data.vehicles) setVehicles(data.vehicles);
    } catch (e) {
      console.error('Failed to fetch vehicles:', e);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (data.invoices) setInvoices(data.invoices);
    } catch (e) {
      console.error('Failed to fetch invoices:', e);
    }
  }, []);

  // Full reload of everything (initial load + refreshData)
  const fetchData = useCallback(async () => {
    try {
      await Promise.all([fetchMasterData(), fetchVehicles(), fetchJobs(), fetchInvoices()]);
    } finally {
      setIsLoaded(true);
    }
  }, [fetchMasterData, fetchVehicles, fetchJobs, fetchInvoices]);

  // Job create / status changes can lock or release vehicles → refresh both
  const fetchJobsAndVehicles = useCallback(async () => {
    await Promise.all([fetchJobs(), fetchVehicles()]);
  }, [fetchJobs, fetchVehicles]);

  // ─── ติดตามสถานะ PO ที่กำลังส่งไป D365 เบื้องหลัง ─────
  // หลังอนุมัติ ระบบส่ง PO แบบ background (after()) → งานจะอยู่สถานะ PENDING ชั่วครู่
  // ดึงเฉพาะงานนั้นทุก 5 วินาที (สูงสุด ~1 นาที) จนได้ผลลัพธ์ แล้วอัปเดตเฉพาะงานนั้นใน state
  const pendingPoJobIds = useMemo(
    () => jobs.filter(j => j.d365PoStatus === 'PENDING').map(j => j.id).sort().join(','),
    [jobs]
  );

  useEffect(() => {
    if (!pendingPoJobIds) return;
    const ids = pendingPoJobIds.split(',');
    let attempts = 0;
    let cancelled = false;

    const timer = setInterval(async () => {
      attempts++;
      if (attempts >= 12) clearInterval(timer);
      const results = await Promise.all(
        ids.map(id =>
          fetch(`/api/jobs/${id}`)
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null)
        )
      );
      if (cancelled) return;
      const settled = new Map<string, Job>();
      for (const r of results) {
        if (r?.job && r.job.d365PoStatus !== 'PENDING') settled.set(r.job.id, r.job as Job);
      }
      if (settled.size > 0) {
        setJobs(prev => prev.map(j => settled.get(j.id) ?? j));
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pendingPoJobIds]);

  // ─── Sync user auth data to context ─────────────
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCurrentRole('ADMIN');
      setCurrentCompany('ALL');
      setCurrentBranchId('');
      setCurrentSupplierId('');
      return;
    }

    setCurrentRole(user.role as UserRole);
    setCurrentBranchId(user.branchId || '');
    setCurrentSupplierId(user.supplierId || '');

    // Set company based on user's role + login selection
    if (user.role === 'MASTER') {
      // Master can see everything, allow switching companies
      setCurrentCompany(selectedCompany || 'ALL');
    } else if (user.role === 'ADMIN') {
      // Admin is locked to their company
      if (user.companyCode) {
        setCurrentCompany(user.companyCode as CompanyCode);
      } else {
        setCurrentCompany(selectedCompany || 'ALL');
      }
    } else if (user.companyCode) {
      setCurrentCompany(user.companyCode as CompanyCode);
    }

    fetchData();
  }, [isAuthenticated, user, selectedCompany, fetchData]);

  const activeBranch = useMemo(
    () => branches.find(b => b.id === currentBranchId),
    [branches, currentBranchId]
  );
  const effectiveSupplierId = user?.role === 'SUPPLIER' ? (user.supplierId || '') : currentSupplierId;
  const activeSupplier = useMemo(
    () => suppliers.find(s => s.id === effectiveSupplierId),
    [suppliers, effectiveSupplierId]
  );

  const userRole = user?.role;
  const userSupplierId = user?.supplierId;

  // ─── Filtered data ──────────────────────────────
  const filteredJobs = useMemo(() => jobs.filter(job => {
    if (currentRole === 'BRANCH') {
      // Branch user sees all jobs involving their branch (requester, origin, or destination)
      // regardless of company code (e.g. EV7 transfers car to GI-อยุธยา)
      return job.branchId === currentBranchId || job.originBranchId === currentBranchId || job.destBranchId === currentBranchId;
    }
    if (currentCompany !== 'ALL' && job.companyCode !== currentCompany) return false;
    if (currentRole === 'MASTER') {
      // If MASTER has selected a specific branch, filter by it
      if (currentBranchId) {
        return job.branchId === currentBranchId || job.originBranchId === currentBranchId || job.destBranchId === currentBranchId;
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
          branchId: params.originBranchId,
          supplierId: params.supplierId,
          vin: params.vin,
          vins: params.vins,
          originBranchId: params.originBranchId,
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
    options?: { rejectReason?: string; approvedBy?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectReason: options?.rejectReason,
          approvedBy: options?.approvedBy,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'ไม่สามารถอัปเดตสถานะงานได้' };
      }
      // Approve / cancel / reject can release or move vehicles → refresh jobs + vehicles
      await fetchJobsAndVehicles();
      return { success: true };
    } catch (e: any) {
      console.error('Update job status failed:', e);
      return { success: false, error: e?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
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
      if (data.success) {
        // Item cancel / approve releases the vehicle → refresh jobs + vehicles
        await fetchJobsAndVehicles();
        return { ...data.progress, allCompleted: !!data.progress?.allResolved };
      }
    } catch (e) {
      console.error('Update car wash item status failed:', e);
    }
    return null;
  }, [fetchJobsAndVehicles]);

  // ─── Action: Add Job Evidence (via API) ─────────
  const addJobEvidence = useCallback(async (jobId: string, evidence: Omit<JobEvidence, 'id' | 'jobId' | 'uploadedAt'>) => {
    try {
      await fetch(`/api/jobs/${jobId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evidence),
      });
      // Evidence only adds a photo to the job → jobs only
      await fetchJobs();
    } catch (e) {
      console.error('Add evidence failed:', e);
    }
  }, [fetchJobs]);

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
    addJobEvidence,
    createInvoice,
    refreshData,
    resetToDefaultData,
  }), [
    isLoaded,
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
    addJobEvidence,
    createInvoice,
    refreshData,
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
