'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
// Mock data removed — app now starts with empty data

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
  createCarWashJob: (params: CreateCarWashParams) => Job;
  createVehicleSlideJob: (params: CreateVehicleSlideParams) => Job;
  updateJobStatus: (jobId: string, status: JobStatus, options?: { rejectReason?: string; approvedBy?: string }) => void;
  addJobEvidence: (jobId: string, evidence: Omit<JobEvidence, 'id' | 'jobId' | 'uploadedAt'>) => void;
  createInvoice: (params: CreateInvoiceParams) => { success: boolean; error?: string; invoice?: Invoice };
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  JOBS: 'supplier_mgr_jobs_v1',
  VEHICLES: 'supplier_mgr_vehicles_v1',
  INVOICES: 'supplier_mgr_invoices_v1',
  ROLE: 'supplier_mgr_role_v1',
  COMPANY: 'supplier_mgr_company_v1',
  BRANCH: 'supplier_mgr_branch_v1',
  SUPPLIER: 'supplier_mgr_supplier_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentCompany, setCurrentCompany] = useState<'ALL' | CompanyCode>('ALL');
  const [currentBranchId, setCurrentBranchId] = useState<string>('br-ev7-rm9');
  const [currentSupplierId, setCurrentSupplierId] = useState<string>('sup-001');

  const [companies] = useState<Company[]>([]);
  const [branches] = useState<Branch[]>([]);
  const [suppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedJobs = localStorage.getItem(STORAGE_KEYS.JOBS);
      const savedVehicles = localStorage.getItem(STORAGE_KEYS.VEHICLES);
      const savedInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
      const savedRole = localStorage.getItem(STORAGE_KEYS.ROLE);
      const savedCompany = localStorage.getItem(STORAGE_KEYS.COMPANY);
      const savedBranch = localStorage.getItem(STORAGE_KEYS.BRANCH);
      const savedSupplier = localStorage.getItem(STORAGE_KEYS.SUPPLIER);

      if (savedJobs) setJobs(JSON.parse(savedJobs));
      if (savedVehicles) setVehicles(JSON.parse(savedVehicles));
      if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
      if (savedRole) setCurrentRole(savedRole as UserRole);
      if (savedCompany) setCurrentCompany(savedCompany as 'ALL' | CompanyCode);
      if (savedBranch) setCurrentBranchId(savedBranch);
      if (savedSupplier) setCurrentSupplierId(savedSupplier);
    } catch (e) {
      console.warn('Failed to load storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
      localStorage.setItem(STORAGE_KEYS.ROLE, currentRole);
      localStorage.setItem(STORAGE_KEYS.COMPANY, currentCompany);
      localStorage.setItem(STORAGE_KEYS.BRANCH, currentBranchId);
      localStorage.setItem(STORAGE_KEYS.SUPPLIER, currentSupplierId);
    } catch (e) {
      console.warn('Failed to save storage:', e);
    }
  }, [jobs, vehicles, invoices, currentRole, currentCompany, currentBranchId, currentSupplierId, isLoaded]);

  const activeBranch = branches.find(b => b.id === currentBranchId);
  const activeSupplier = suppliers.find(s => s.id === currentSupplierId);

  // Compute filtered jobs based on active role and company
  const filteredJobs = jobs.filter(job => {
    // Company filter (if ALL, show both, else filter by company)
    if (currentCompany !== 'ALL' && job.companyCode !== currentCompany) {
      return false;
    }

    // Role specific filter:
    if (currentRole === 'ADMIN') {
      return true; // Admin sees all
    } else if (currentRole === 'BRANCH') {
      // Branch user only sees jobs initiated or related to their branch
      return job.branchId === currentBranchId || job.originBranchId === currentBranchId || job.destBranchId === currentBranchId;
    } else if (currentRole === 'SUPPLIER') {
      // Supplier only sees jobs assigned to them
      return job.supplierId === currentSupplierId;
    }

    return true;
  });

  // Filtered vehicles (For branch, only vehicles at their branch)
  const filteredVehicles = vehicles.filter(v => {
    if (currentCompany !== 'ALL' && v.companyCode !== currentCompany) {
      return false;
    }
    if (currentRole === 'BRANCH') {
      return v.currentBranchId === currentBranchId;
    }
    return true;
  });

  const waitingApprovalCount = jobs.filter(j => j.status === 'WAITING_APPROVAL').length;

  // Action: Create Car Wash Job
  const createCarWashJob = (params: CreateCarWashParams): Job => {
    const branch = branches.find(b => b.id === params.branchId);
    const company = companies.find(c => c.code === params.companyCode);
    const supplier = suppliers.find(s => s.id === params.supplierId);
    const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
    const randomSeq = String(Math.floor(Math.random() * 900) + 100);
    const jobNumber = `CW-${params.companyCode}-${dateStr}-${randomSeq}`;

    const jobId = `job-cw-${Date.now()}`;
    const totalCost = params.items.reduce((sum, it) => sum + it.unitPrice, 0);

    const carWashItems: CarWashItem[] = params.items.map((it, idx) => {
      const v = vehicles.find(vec => vec.vin === it.vin);
      return {
        id: `cwi-${Date.now()}-${idx}`,
        jobId,
        vin: it.vin,
        vehicleModel: v?.model,
        vehicleColor: v?.color,
        licensePlate: v?.licensePlate,
        actualWashDate: it.actualWashDate,
        washType: it.washType,
        unitPrice: it.unitPrice,
        status: 'PENDING',
        remarks: it.remarks
      };
    });

    const newJob: Job = {
      id: jobId,
      jobNumber,
      jobType: 'CAR_WASH',
      status: 'PENDING_SUPPLIER',
      companyId: company?.id || 'comp-ev7',
      companyCode: params.companyCode,
      branchId: params.branchId,
      branchName: branch?.name || 'สาขา',
      supplierId: params.supplierId,
      supplierName: supplier?.name || 'Supplier',
      carWashItems,
      requestedBy: params.requestedBy,
      evidences: [],
      estimatedCost: totalCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update vehicle status
    const selectedVins = params.items.map(it => it.vin);
    setVehicles(prev => prev.map(v => 
      selectedVins.includes(v.vin) ? { ...v, status: 'IN_WASH' } : v
    ));

    setJobs(prev => [newJob, ...prev]);
    return newJob;
  };

  // Action: Create Vehicle Slide Job
  const createVehicleSlideJob = (params: CreateVehicleSlideParams): Job => {
    const originBranch = branches.find(b => b.id === params.originBranchId);
    const destBranch = branches.find(b => b.id === params.destBranchId);
    const company = companies.find(c => c.code === params.companyCode);
    const supplier = suppliers.find(s => s.id === params.supplierId);
    const vehicle = vehicles.find(v => v.vin === params.vin);
    const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
    const randomSeq = String(Math.floor(Math.random() * 900) + 100);
    const jobNumber = `VS-${params.companyCode}-${dateStr}-${randomSeq}`;

    const newJob: Job = {
      id: `job-vs-${Date.now()}`,
      jobNumber,
      jobType: 'VEHICLE_SLIDE',
      status: 'PENDING_SUPPLIER',
      companyId: company?.id || 'comp-ev7',
      companyCode: params.companyCode,
      branchId: params.originBranchId,
      branchName: originBranch?.name || 'สาขาต้นทาง',
      supplierId: params.supplierId,
      supplierName: supplier?.name || 'Supplier',
      vin: params.vin,
      vehicle,
      originBranchId: params.originBranchId,
      originBranchName: originBranch?.name,
      destBranchId: params.destBranchId,
      destBranchName: destBranch?.name,
      pickupDateTime: params.pickupDateTime,
      deliveryDateTime: params.deliveryDateTime,
      contactPerson: params.contactPerson,
      contactPhone: params.contactPhone,
      transferReason: params.transferReason,
      requestedBy: params.requestedBy,
      evidences: [],
      estimatedCost: params.estimatedCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update vehicle status to in transit
    setVehicles(prev => prev.map(v => 
      v.vin === params.vin ? { ...v, status: 'IN_TRANSIT' } : v
    ));

    setJobs(prev => [newJob, ...prev]);
    return newJob;
  };

  // Action: Update Job Status (Approve, Reject, Complete, In Progress)
  const updateJobStatus = (
    jobId: string, 
    status: JobStatus, 
    options?: { rejectReason?: string; approvedBy?: string }
  ) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;

      const now = new Date().toISOString();
      const updated: Job = {
        ...job,
        status,
        updatedAt: now,
      };

      if (status === 'IN_PROGRESS') {
        // Supplier accepted and started work
      } else if (status === 'WAITING_APPROVAL') {
        updated.completedAt = now;
      } else if (status === 'APPROVED') {
        updated.approvedAt = now;
        updated.approvedBy = options?.approvedBy || 'Branch Manager';
        updated.actualCost = updated.actualCost || updated.estimatedCost;

        // Reset vehicle status back to AVAILABLE or update branch if vehicle slide
        if (job.jobType === 'VEHICLE_SLIDE' && job.vin && job.destBranchId) {
          const destBranch = branches.find(b => b.id === job.destBranchId);
          setVehicles(vecs => vecs.map(v => {
            if (v.vin === job.vin) {
              return {
                ...v,
                status: 'AVAILABLE',
                currentBranchId: job.destBranchId!,
                currentBranchCode: destBranch?.code || v.currentBranchCode,
                currentBranchName: destBranch?.name || v.currentBranchName,
              };
            }
            return v;
          }));
        } else if (job.jobType === 'CAR_WASH' && job.carWashItems) {
          const washedVins = job.carWashItems.map(c => c.vin);
          setVehicles(vecs => vecs.map(v => 
            washedVins.includes(v.vin) ? { ...v, status: 'AVAILABLE' } : v
          ));
        }
      } else if (status === 'REJECTED') {
        updated.rejectReason = options?.rejectReason || 'ขอให้แก้ไขรายละเอียดงาน';
      }

      return updated;
    }));
  };

  // Action: Add Job Evidence
  const addJobEvidence = (jobId: string, evidence: Omit<JobEvidence, 'id' | 'jobId' | 'uploadedAt'>) => {
    const newEvidence: JobEvidence = {
      ...evidence,
      id: `evi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      jobId,
      uploadedAt: new Date().toISOString()
    };

    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      return {
        ...job,
        evidences: [...job.evidences, newEvidence],
        updatedAt: new Date().toISOString()
      };
    }));
  };

  // Action: Create Invoice
  const createInvoice = (params: CreateInvoiceParams) => {
    const supplier = suppliers.find(s => s.id === params.supplierId);
    const company = companies.find(c => c.code === params.companyCode);

    // 1. Check all selected jobs
    const targetJobs = jobs.filter(j => params.jobIds.includes(j.id));

    if (targetJobs.length === 0) {
      return { success: false, error: 'กรุณาเลือกอย่างน้อย 1 รายการงานที่ต้องการวางบิล' };
    }

    // 2. Validate all jobs are APPROVED
    const unapproved = targetJobs.filter(j => j.status !== 'APPROVED');
    if (unapproved.length > 0) {
      return { success: false, error: 'ทุกงานที่นำมาวางบิลต้องได้รับการ Approve จากสาขาแล้วเท่านั้น' };
    }

    // 3. Validate company isolation: all jobs must match requested companyCode
    const wrongCompany = targetJobs.filter(j => j.companyCode !== params.companyCode);
    if (wrongCompany.length > 0) {
      return { success: false, error: `ไม่สามารถรวมงานข้ามบริษัทได้ ต้องแยกบิลเฉพาะ ${params.companyCode} เท่านั้น` };
    }

    // 4. Validate no double billing: none of the jobs should have invoiceId
    const alreadyInvoiced = targetJobs.filter(j => j.invoiceId || j.status === 'INVOICED');
    if (alreadyInvoiced.length > 0) {
      return { success: false, error: 'มีบางรายการงานที่ถูกวางบิลไปแล้ว ไม่สามารถวางบิลซ้ำได้' };
    }

    // Calculate amounts
    const subtotal = targetJobs.reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);
    const vatAmount = Number((subtotal * 0.07).toFixed(2));
    const totalAmount = Number((subtotal + vatAmount).toFixed(2));

    const dateSeq = new Date().toISOString().slice(2, 7).replace('-', '');
    const randomNum = String(Math.floor(Math.random() * 900) + 100);
    const invoiceNumber = `INV-${params.companyCode}-${dateSeq}-${randomNum}`;
    const invoiceId = `inv-${Date.now()}`;

    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      supplierId: params.supplierId,
      supplierName: supplier?.name || 'Supplier',
      companyId: company?.id || 'comp-ev7',
      companyCode: params.companyCode,
      status: 'SUBMITTED',
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: params.dueDate,
      subtotal,
      vatAmount,
      totalAmount,
      jobIds: params.jobIds,
      jobs: targetJobs,
      notes: params.notes,
      createdAt: new Date().toISOString()
    };

    // Update jobs to INVOICED
    setJobs(prev => prev.map(job => {
      if (params.jobIds.includes(job.id)) {
        return {
          ...job,
          status: 'INVOICED',
          invoiceId: newInvoice.id,
          invoiceNumber: newInvoice.invoiceNumber,
          updatedAt: new Date().toISOString()
        };
      }
      return job;
    }));

    setInvoices(prev => [newInvoice, ...prev]);

    return { success: true, invoice: newInvoice };
  };

  // Action: Reset Data
  const resetToDefaultData = () => {
    localStorage.clear();
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
