'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  CarWashItem 
} from '@/types';
import { useAuth } from '@/context/AuthContext';

interface CreateCarWashParams {
  companyCode: CompanyCode;
  branchId: string;
  supplierId: string;
  items: Array<{
    vin: string;
    actualWashDate: string;
    washType: 'STANDARD' | 'DEEP_CLEAN' | 'POLISH';
    unitPrice: number;
    remarks?: string;
  }>;
  requestedBy: string;
}

interface CreateVehicleSlideParams {
  companyCode: CompanyCode;
  originBranchId: string;
  destBranchId: string;
  supplierId: string;
  vin: string;
  pickupDateTime: string;
  deliveryDateTime: string;
  contactPerson: string;
  contactPhone: string;
  transferReason: string;
  requestedBy: string;
  estimatedCost: number;
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
  updateJobStatus: (jobId: string, status: JobStatus, options?: { rejectReason?: string; approvedBy?: string }) => Promise<void>;
  addJobEvidence: (jobId: string, evidence: Omit<JobEvidence, 'id' | 'jobId' | 'uploadedAt'>) => Promise<void>;
  createInvoice: (params: CreateInvoiceParams) => Promise<{ success: boolean; error?: string; invoice?: Invoice }>;
  refreshData: () => Promise<void>;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentCompany, setCurrentCompany] = useState<'ALL' | CompanyCode>('ALL');
  const [currentBranchId, setCurrentBranchId] = useState<string>('');
  const [currentSupplierId, setCurrentSupplierId] = useState<string>('');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // ─── Fetch all data from API ─────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [companiesRes, suppliersRes, vehiclesRes, jobsRes, invoicesRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/suppliers'),
        fetch('/api/vehicles'),
        fetch('/api/jobs'),
        fetch('/api/invoices'),
      ]);

      const [companiesData, suppliersData, vehiclesData, jobsData, invoicesData] = await Promise.all([
        companiesRes.json(),
        suppliersRes.json(),
        vehiclesRes.json(),
        jobsRes.json(),
        invoicesRes.json(),
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
      if (vehiclesData.vehicles) setVehicles(vehiclesData.vehicles);
      if (jobsData.jobs) setJobs(jobsData.jobs);
      if (invoicesData.invoices) setInvoices(invoicesData.invoices);
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // ─── Sync user auth data to context ─────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    setCurrentRole(user.role as UserRole);
    if (user.branchId) setCurrentBranchId(user.branchId);
    if (user.supplierId) setCurrentSupplierId(user.supplierId);

    // Set company based on user's role
    if (user.role === 'ADMIN') {
      setCurrentCompany('ALL');
    } else if (user.companyCode) {
      setCurrentCompany(user.companyCode as CompanyCode);
    }

    fetchData();
  }, [isAuthenticated, user, fetchData]);

  const activeBranch = branches.find(b => b.id === currentBranchId);
  const activeSupplier = suppliers.find(s => s.id === currentSupplierId);

  // ─── Filtered data ──────────────────────────────
  const filteredJobs = jobs.filter(job => {
    if (currentCompany !== 'ALL' && job.companyCode !== currentCompany) return false;
    if (currentRole === 'ADMIN') return true;
    if (currentRole === 'BRANCH') {
      return job.branchId === currentBranchId || job.originBranchId === currentBranchId || job.destBranchId === currentBranchId;
    }
    if (currentRole === 'SUPPLIER') return job.supplierId === currentSupplierId;
    return true;
  });

  const filteredVehicles = vehicles.filter(v => {
    if (currentCompany !== 'ALL' && v.companyCode !== currentCompany) return false;
    if (currentRole === 'BRANCH') return v.currentBranchId === currentBranchId;
    return true;
  });

  const waitingApprovalCount = jobs.filter(j => j.status === 'WAITING_APPROVAL').length;

  // ─── Action: Create Car Wash Job (via API) ──────
  const createCarWashJob = async (params: CreateCarWashParams): Promise<Job | null> => {
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
          items: params.items,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData(); // Refresh all data
        return data.job;
      }
    } catch (e) {
      console.error('Create car wash job failed:', e);
    }
    return null;
  };

  // ─── Action: Create Vehicle Slide Job (via API) ─
  const createVehicleSlideJob = async (params: CreateVehicleSlideParams): Promise<Job | null> => {
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
          originBranchId: params.originBranchId,
          destBranchId: params.destBranchId,
          pickupDateTime: params.pickupDateTime,
          deliveryDateTime: params.deliveryDateTime,
          contactPerson: params.contactPerson,
          contactPhone: params.contactPhone,
          transferReason: params.transferReason,
          requestedBy: params.requestedBy,
          estimatedCost: params.estimatedCost,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        return data.job;
      }
    } catch (e) {
      console.error('Create vehicle slide job failed:', e);
    }
    return null;
  };

  // ─── Action: Update Job Status (via API) ────────
  const updateJobStatus = async (
    jobId: string, 
    status: JobStatus, 
    options?: { rejectReason?: string; approvedBy?: string }
  ) => {
    try {
      await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectReason: options?.rejectReason,
          approvedBy: options?.approvedBy,
        }),
      });
      await fetchData();
    } catch (e) {
      console.error('Update job status failed:', e);
    }
  };

  // ─── Action: Add Job Evidence (via API) ─────────
  const addJobEvidence = async (jobId: string, evidence: Omit<JobEvidence, 'id' | 'jobId' | 'uploadedAt'>) => {
    try {
      await fetch(`/api/jobs/${jobId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evidence),
      });
      await fetchData();
    } catch (e) {
      console.error('Add evidence failed:', e);
    }
  };

  // ─── Action: Create Invoice (via API) ───────────
  const createInvoice = async (params: CreateInvoiceParams) => {
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
        await fetchData();
        return { success: true, invoice: data.invoice };
      }
      return { success: false, error: data.error || 'สร้าง Invoice ไม่สำเร็จ' };
    } catch (e) {
      console.error('Create invoice failed:', e);
      return { success: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    }
  };

  // ─── Refresh Data ───────────────────────────────
  const refreshData = async () => {
    await fetchData();
  };

  // ─── Reset Data ─────────────────────────────────
  const resetToDefaultData = () => {
    setJobs([]);
    setVehicles([]);
    setInvoices([]);
    setCurrentRole('ADMIN');
    setCurrentCompany('ALL');
    setCurrentBranchId('');
    setCurrentSupplierId('');
  };

  return (
    <AppContext.Provider
      value={{
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
        addJobEvidence,
        createInvoice,
        refreshData,
        resetToDefaultData,
      }}
    >
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
