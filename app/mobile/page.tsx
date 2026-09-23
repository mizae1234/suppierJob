'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Job, JobStatus } from '@/types';
import { getJobTotalCost } from '@/lib/job-utils';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { SupplierGreeting } from '@/components/mobile/SupplierGreeting';
import { ActionAlertBanner } from '@/components/mobile/ActionAlertBanner';
import { JobCounterGrid } from '@/components/mobile/JobCounterGrid';
import { RecentJobsSection } from '@/components/mobile/RecentJobsSection';
import { MyJobsTab } from '@/components/mobile/MyJobsTab';
import { BillingTab } from '@/components/mobile/BillingTab';
import { ProfileTab } from '@/components/mobile/ProfileTab';
import { BottomNavBar } from '@/components/mobile/BottomNavBar';
import { SubmitEvidenceModal } from '@/components/mobile/SubmitEvidenceModal';
import { ViewEvidenceModal } from '@/components/mobile/ViewEvidenceModal';
import { JobDetailDrawer } from '@/components/mobile/JobDetailDrawer';
import { Monitor } from 'lucide-react';

export default function MobileSupplierPortalPage() {
  const router = useRouter();
  const {
    jobs,
    suppliers,
    branches,
    currentRole,
    currentSupplierId,
    setCurrentSupplierId,
    updateJobStatus,
    invoices,
    createInvoice,
    setCurrentRole,
  } = useApp();

  // Tab State: 'HOME' | 'MY_JOBS' | 'INVOICES' | 'PROFILE'
  const [activeTab, setActiveTab] = useState<'HOME' | 'MY_JOBS' | 'INVOICES' | 'PROFILE'>('HOME');

  // Branch Filter in Header
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Search & Filter State in 'MY_JOBS' tab
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<'ALL' | JobStatus>('ALL');

  // Modal / Drawer Target Job States
  const [activeSubmitJob, setActiveSubmitJob] = useState<Job | null>(null);
  const [activeViewJob, setActiveViewJob] = useState<Job | null>(null);
  const [activeDetailJob, setActiveDetailJob] = useState<Job | null>(null);

  // Active Supplier details from context
  const activeSupplier = useMemo(() => {
    return suppliers.find(s => s.id === currentSupplierId) || suppliers[0] || {
      id: 'sup-001',
      name: 'ABC Transport & Wash Hub',
      code: 'SUP-001',
      phone: '081-999-8888',
      email: 'contact@abctransport.co.th',
      services: ['CAR_WASH', 'VEHICLE_SLIDE'],
      isActive: true
    };
  }, [suppliers, currentSupplierId]);

  // Filter jobs for current supplier & selected branch
  const supplierJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchSupplier = j.supplierId === activeSupplier.id || j.supplierName?.toLowerCase().includes(activeSupplier.name.toLowerCase());
      const matchBranch = selectedBranchId === 'ALL' || j.branchId === selectedBranchId;
      return matchSupplier && matchBranch;
    });
  }, [jobs, activeSupplier, selectedBranchId]);

  // Computed Counters
  const newJobs = useMemo(() => supplierJobs.filter(j => j.status === 'PENDING_SUPPLIER'), [supplierJobs]);
  const inProgressJobs = useMemo(() => supplierJobs.filter(j => j.status === 'IN_PROGRESS'), [supplierJobs]);
  const waitingApprovalJobs = useMemo(() => supplierJobs.filter(j => j.status === 'WAITING_APPROVAL'), [supplierJobs]);
  const approvedJobs = useMemo(() => supplierJobs.filter(j => j.status === 'APPROVED'), [supplierJobs]);
  const readyToInvoiceJobs = useMemo(() => supplierJobs.filter(j => j.status === 'APPROVED' && !j.invoiceId), [supplierJobs]);

  const readyToInvoiceAmount = useMemo(() => {
    return readyToInvoiceJobs.reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [readyToInvoiceJobs]);

  // Recent jobs (sorted by last updated time)
  const recentJobs = useMemo(() => {
    return [...supplierJobs]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);
  }, [supplierJobs]);

  // Filtered jobs in MyJobs tab
  const filteredMyJobs = useMemo(() => {
    return supplierJobs.filter(j => {
      const q = jobSearchQuery.trim().toLowerCase();
      const matchQuery = !q ||
        j.jobNumber.toLowerCase().includes(q) ||
        (j.vin && j.vin.toLowerCase().includes(q)) ||
        (j.carWashItems && j.carWashItems.some(it => it.vin.toLowerCase().includes(q))) ||
        (j.vehicle?.model && j.vehicle.model.toLowerCase().includes(q));

      const matchStatus = jobStatusFilter === 'ALL' || j.status === jobStatusFilter;
      return matchQuery && matchStatus;
    });
  }, [supplierJobs, jobSearchQuery, jobStatusFilter]);

  // Invoices for this supplier
  const supplierInvoices = useMemo(() => {
    return invoices.filter(i => i.supplierId === activeSupplier.id);
  }, [invoices, activeSupplier]);

  // Handlers
  const handleAcceptJob = async (job: Job) => {
    await updateJobStatus(job.id, 'IN_PROGRESS');
    alert(`รับงาน ${job.jobNumber} เรียบร้อยแล้ว! สถานะเปลี่ยนเป็น "กำลังดำเนินงาน"`);
  };

  const handleCounterSelect = (key: 'NEW' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'APPROVED' | 'INVOICES') => {
    if (key === 'INVOICES') {
      setActiveTab('INVOICES');
    } else {
      setActiveTab('MY_JOBS');
      const map: Record<string, JobStatus> = {
        NEW: 'PENDING_SUPPLIER',
        IN_PROGRESS: 'IN_PROGRESS',
        WAITING_APPROVAL: 'WAITING_APPROVAL',
        APPROVED: 'APPROVED',
      };
      setJobStatusFilter(map[key]);
    }
  };

  const handleCreateInvoice = async (jobIds: string[], dueDate: string, notes?: string) => {
    const res = await createInvoice({
      supplierId: activeSupplier.id,
      companyCode: 'EV7',
      jobIds,
      dueDate,
      notes,
    });
    if (res.success) {
      alert(`ออกใบวางบิลสำเร็จ! เลขที่เอกสาร: ${res.invoice?.invoiceNumber}`);
    } else {
      alert(res.error || 'ไม่สามารถออกใบวางบิลได้');
    }
  };

  const handleQuickSubmit = () => {
    const target = inProgressJobs[0] || newJobs[0] || recentJobs[0];
    if (target) {
      setActiveSubmitJob(target);
    } else {
      alert('ไม่มีงานที่กำลังปฏิบัติการสำหรับส่งมอบในขณะนี้');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] sm:py-6 flex flex-col items-center justify-center font-sans antialiased text-slate-800">
      {/* Standalone Mobile Phone Canvas Frame */}
      <div className="w-full max-w-[430px] min-h-screen sm:min-h-[880px] bg-[#f8f9fa] sm:rounded-[40px] sm:shadow-[0_25px_70px_rgba(0,0,0,0.4)] relative flex flex-col justify-between overflow-hidden pb-28 border-x sm:border border-gray-200">
        
        {/* 1. Header with CI & Navigation Controls */}
        <MobileHeader
          supplierName={activeSupplier.name}
          pendingNotificationCount={waitingApprovalJobs.length}
          onNotificationClick={() => {
            setActiveTab('MY_JOBS');
            setJobStatusFilter('WAITING_APPROVAL');
          }}
          onProfileClick={() => setActiveTab('PROFILE')}
        />

        {/* 2. Scrollable Body Content */}
        <main className="flex-1 overflow-y-auto px-4 pt-3.5 space-y-4 text-slate-800">
          {/* TAB 1: HOME */}
          {activeTab === 'HOME' && (
            <>
              <SupplierGreeting
                supplierName={activeSupplier.name}
                branches={branches}
                selectedBranchId={selectedBranchId}
                onSelectBranch={setSelectedBranchId}
              />

              <ActionAlertBanner
                newJobsCount={newJobs.length}
                onClick={() => {
                  setActiveTab('MY_JOBS');
                  setJobStatusFilter('PENDING_SUPPLIER');
                }}
              />

              <JobCounterGrid
                newCount={newJobs.length}
                inProgressCount={inProgressJobs.length}
                waitingApprovalCount={waitingApprovalJobs.length}
                approvedCount={approvedJobs.length}
                readyToInvoiceCount={readyToInvoiceJobs.length}
                readyToInvoiceAmount={readyToInvoiceAmount}
                isSlideTypeInProgress={inProgressJobs.some(j => j.jobType === 'VEHICLE_SLIDE')}
                onSelectFilter={handleCounterSelect}
              />

              <RecentJobsSection
                jobs={recentJobs}
                onViewAll={() => {
                  setActiveTab('MY_JOBS');
                  setJobStatusFilter('ALL');
                }}
                onAcceptJob={handleAcceptJob}
                onSubmitEvidence={(job) => setActiveSubmitJob(job)}
                onViewEvidence={(job) => setActiveViewJob(job)}
                onViewDetail={(job) => setActiveDetailJob(job)}
              />
            </>
          )}

          {/* TAB 2: MY JOBS */}
          {activeTab === 'MY_JOBS' && (
            <MyJobsTab
              jobs={filteredMyJobs}
              searchQuery={jobSearchQuery}
              onSearchChange={setJobSearchQuery}
              statusFilter={jobStatusFilter}
              onStatusFilterChange={setJobStatusFilter}
              onAcceptJob={handleAcceptJob}
              onSubmitEvidence={(job) => setActiveSubmitJob(job)}
              onViewEvidence={(job) => setActiveViewJob(job)}
              onViewDetail={(job) => setActiveDetailJob(job)}
            />
          )}

          {/* TAB 3: INVOICES & BILLING */}
          {activeTab === 'INVOICES' && (
            <BillingTab
              supplier={activeSupplier}
              readyJobs={readyToInvoiceJobs}
              invoices={supplierInvoices}
              onCreateInvoice={handleCreateInvoice}
            />
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === 'PROFILE' && (
            <ProfileTab
              supplier={activeSupplier}
              suppliersList={suppliers}
              currentRole={currentRole}
              onSwitchSupplier={setCurrentSupplierId}
              onSwitchRole={(role) => {
                setCurrentRole(role);
                router.push('/');
              }}
              onSwitchToDesktop={() => {
                setCurrentRole('ADMIN');
                router.push('/');
              }}
            />
          )}
        </main>

        {/* 3. Docked Bottom Navigation Bar */}
        <BottomNavBar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onQuickSubmit={handleQuickSubmit}
          hasActiveWork={inProgressJobs.length > 0}
        />

        {/* 4. Modals & Drawers */}
        {activeSubmitJob && (
          <SubmitEvidenceModal
            job={activeSubmitJob}
            onClose={() => setActiveSubmitJob(null)}
            onSuccess={() => {
              setActiveSubmitJob(null);
              setActiveTab('MY_JOBS');
              setJobStatusFilter('WAITING_APPROVAL');
            }}
          />
        )}

        {activeViewJob && (
          <ViewEvidenceModal
            job={activeViewJob}
            onClose={() => setActiveViewJob(null)}
          />
        )}

        {activeDetailJob && (
          <JobDetailDrawer
            job={activeDetailJob}
            onClose={() => setActiveDetailJob(null)}
            onOpenSubmit={() => {
              const target = activeDetailJob;
              setActiveDetailJob(null);
              setActiveSubmitJob(target);
            }}
          />
        )}
      </div>

      {/* Floating Shortcut back to Desktop when viewed on big screens */}
      <div className="hidden sm:flex fixed bottom-6 right-6 z-50">
        <Link
          href="/"
          onClick={() => setCurrentRole('ADMIN')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-md text-[#0f5b44] border border-emerald-200 shadow-xl hover:bg-white text-xs font-bold transition-all hover:scale-105"
        >
          <Monitor className="w-4 h-4" />
          <span>กลับหน้า Desktop Portal</span>
        </Link>
      </div>
    </div>
  );
}
