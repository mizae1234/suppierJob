'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { Job, JobStatus, JobType, CarWashItem } from '@/types';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import {
  getJobTotalCost,
  getJobScheduleDate,
  getDateRange,
  isJobInDateRange,
  DATE_RANGE_OPTIONS,
  DEFAULT_DATE_RANGE,
  DateRangePreset,
  getSlideDirection,
} from '@/lib/job-utils';
import {
  JobFilters,
  JobTable,
  JobKanbanBoard,
  CompleteJobModal,
  RejectJobModal,
  PhotoLightbox,
  JobDetailDrawer,
  STATUS_MAP,
  SAMPLE_PHOTOS,
} from '@/components/jobs';
import {
  LayoutList,
  Kanban,
  ArrowRight,
} from 'lucide-react';

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialJobId = searchParams.get('jobId') || '';

  const { 
    jobs,
    filteredJobs, 
    currentRole, 
    currentSupplierId, 
    activeBranch,
    currentBranchId,
    currentCompany,
    updateJobStatus, 
    updateCarWashItemStatus,
    addJobEvidence,
    suppliers,
    branches,
    vehicles,
  } = useApp();
  const theme = useTheme();

  // View Mode: Table vs Kanban (default to KANBAN)
  const initialViewParam = searchParams.get('view')?.toUpperCase();
  const [viewMode, setViewMode] = useState<'TABLE' | 'KANBAN'>(
    initialViewParam === 'TABLE' ? 'TABLE' : 'KANBAN'
  );

  // Filters state
  const [searchTags, setSearchTags] = useState<string[]>(() => {
    return initialQuery ? initialQuery.split(',').map(s => s.trim()).filter(Boolean) : [];
  });
  const [typeFilter, setTypeFilter] = useState<'ALL' | JobType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | JobStatus>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  // Date range filter (anchored on today: default = 7 days back → 1 month ahead)
  const [dateRange, setDateRange] = useState<DateRangePreset>(() => {
    const r = searchParams.get('range')?.toUpperCase();
    return DATE_RANGE_OPTIONS.some(o => o.value === r) ? (r as DateRangePreset) : DEFAULT_DATE_RANGE;
  });
  const [customFrom, setCustomFrom] = useState<string>(searchParams.get('from') || '');
  const [customTo, setCustomTo] = useState<string>(searchParams.get('to') || '');

  // Merge-update URL params without dropping others
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    const qs = params.toString();
    router.replace(qs ? `/jobs?${qs}` : '/jobs', { scroll: false });
  };

  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRange(preset);
    updateUrlParams({
      range: preset === DEFAULT_DATE_RANGE ? null : preset,
      from: preset === 'CUSTOM' ? customFrom || null : null,
      to: preset === 'CUSTOM' ? customTo || null : null,
    });
  };

  const handleCustomRangeChange = (from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
    updateUrlParams({ range: 'CUSTOM', from: from || null, to: to || null });
  };

  const activeRange = useMemo(
    () => getDateRange(dateRange, { from: customFrom, to: customTo }),
    [dateRange, customFrom, customTo]
  );

  const rangeSummary = useMemo(() => {
    if (!activeRange) return '';
    const fromOk = activeRange.from.getTime() > 0;
    const toOk = activeRange.to.getTime() < 8640000000000000;
    if (fromOk && toOk) return `${formatThaiDate(activeRange.from)} – ${formatThaiDate(activeRange.to)}`;
    if (fromOk) return `ตั้งแต่ ${formatThaiDate(activeRange.from)}`;
    if (toOk) return `ถึง ${formatThaiDate(activeRange.to)}`;
    return '';
  }, [activeRange]);

  // Sync searchTags when URL query param changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q) {
      setSearchTags(q.split(',').map(s => s.trim()).filter(Boolean));
    } else {
      setSearchTags([]);
    }
  }, [searchParams]);

  // Modal & Drawer states
  const [selectedJob, setSelectedJob] = useState<Job | null>(
    filteredJobs.find(j => j.id === initialJobId) || null
  );
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<Job | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<Job | null>(null);
  const [rejectItemTarget, setRejectItemTarget] = useState<{ job: Job; item: CarWashItem } | null>(null);

  // Active job synchronized with filteredJobs
  const activeJob = useMemo(() => {
    if (!selectedJob) return null;
    return filteredJobs.find(j => j.id === selectedJob.id) || selectedJob;
  }, [selectedJob, filteredJobs]);

  // Filtering
  const displayedJobs = useMemo(() => {
    const filtered = filteredJobs.filter(job => {
      // Date range (scheduled work date)
      if (!isJobInDateRange(job, activeRange)) return false;

      // Search
      if (searchTags.length > 0) {
        const matches = searchTags.some(q => {
          const term = q.toLowerCase();
          const matchesJobNo = job.jobNumber.toLowerCase().includes(term);
          const matchesSupplier = job.supplierName.toLowerCase().includes(term);
          const matchesBranch = job.branchName.toLowerCase().includes(term);
          const matchesVin = job.jobType === 'VEHICLE_SLIDE' 
            ? (job.vin?.toLowerCase().includes(term) || job.vehicle?.licensePlate?.toLowerCase().includes(term) || job.vehicle?.model?.toLowerCase().includes(term))
            : job.carWashItems?.some(it => it.vin?.toLowerCase().includes(term) || it.licensePlate?.toLowerCase().includes(term) || it.vehicleModel?.toLowerCase().includes(term));
          return matchesJobNo || matchesSupplier || matchesBranch || matchesVin;
        });
        if (!matches) return false;
      }

      // Type
      if (typeFilter !== 'ALL' && job.jobType !== typeFilter) return false;

      // Status
      if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;

      // Supplier
      if (supplierFilter !== 'ALL' && job.supplierId !== supplierFilter) return false;

      return true;
    });

    // Sort by scheduled work date (earliest first)
    return filtered
      .map(job => ({ job, t: getJobScheduleDate(job).getTime() }))
      .sort((a, b) => a.t - b.t)
      .map(x => x.job);
  }, [filteredJobs, searchTags, typeFilter, statusFilter, supplierFilter, activeRange]);

  // Job navigation in Drawer
  const currentJobIndex = useMemo(() => {
    if (!activeJob) return -1;
    return displayedJobs.findIndex(j => j.id === activeJob.id);
  }, [activeJob, displayedJobs]);

  const hasPrevJob = currentJobIndex > 0;
  const hasNextJob = currentJobIndex >= 0 && currentJobIndex < displayedJobs.length - 1;

  const goToPrevJob = () => {
    if (hasPrevJob) {
      setSelectedJob(displayedJobs[currentJobIndex - 1]);
    }
  };

  const goToNextJob = () => {
    if (hasNextJob) {
      setSelectedJob(displayedJobs[currentJobIndex + 1]);
    }
  };

  // Supplier action: Accept job
  const handleAcceptJob = async (jobId: string) => {
    await updateJobStatus(jobId, 'IN_PROGRESS');
    if (selectedJob?.id === jobId) {
      setSelectedJob(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
    }
  };

  // Supplier action: Complete with photo (delegated to modal component)
  const handleCompleteJobSubmit = async (data: { photoUrl: string; caption: string; evidenceType: 'AFTER' | 'BEFORE' | 'DROPOFF' }) => {
    if (!showCompleteModal) return;

    await addJobEvidence(showCompleteModal.id, {
      photoUrl: data.photoUrl,
      caption: data.caption,
      evidenceType: data.evidenceType,
      vin: showCompleteModal.vin || showCompleteModal.carWashItems?.[0]?.vin,
    });

    await updateJobStatus(showCompleteModal.id, 'WAITING_APPROVAL');

    if (selectedJob?.id === showCompleteModal.id) {
      setSelectedJob(null);
    }
    setShowCompleteModal(null);
  };

  // Branch action: Approve
  const handleApprove = async (jobId: string, customApprovedBy?: string) => {
    const targetJob = jobs.find(j => j.id === jobId) || selectedJob;
    const isSlide = targetJob?.jobType === 'VEHICLE_SLIDE';
    const myBranchId = activeBranch?.id || currentBranchId;
    const isDest = Boolean(isSlide && targetJob?.destBranchId && targetJob.destBranchId === myBranchId);
    const isOrigin = Boolean(isSlide && targetJob?.destBranchId && (targetJob.originBranchId === myBranchId || targetJob.branchId === myBranchId));

    let approvedByLabel = customApprovedBy;
    if (!approvedByLabel) {
      if (isDest) {
        approvedByLabel = `ตรวจรับรถโดย ${targetJob?.destBranchName || activeBranch?.name || 'สาขาปลายทาง'}`;
      } else if (isOrigin) {
        approvedByLabel = `อนุมัติแทนปลายทางโดย ${targetJob?.originBranchName || activeBranch?.name || 'สาขาต้นทาง'}`;
      } else if (activeBranch?.name) {
        approvedByLabel = `สาขา ${activeBranch.name}`;
      }
    }

    const res = await updateJobStatus(jobId, 'APPROVED', { approvedBy: approvedByLabel || undefined });
    if (res && !res.success) {
      alert(res.error || 'อนุมัติไม่สำเร็จ');
      return;
    }

    if (selectedJob?.id === jobId) {
      setSelectedJob(prev => prev ? { ...prev, status: 'APPROVED', approvedAt: new Date().toISOString() } : null);
    }
  };

  // Branch action: Reject (delegated to modal component)
  const handleRejectSubmit = async (reason: string) => {
    if (!showRejectModal) return;

    await updateJobStatus(showRejectModal.id, 'REJECTED', { rejectReason: reason });

    if (selectedJob?.id === showRejectModal.id) {
      setSelectedJob(null);
    }
    setShowRejectModal(null);
  };

  // Branch action: Approve a single car (job auto-closes when all cars approved)
  const handleApproveItem = async (job: Job, item: CarWashItem) => {
    await updateCarWashItemStatus(job.id, item.id, 'APPROVED');
  };

  // Branch action: Send a single car back to supplier
  const handleRejectItemSubmit = async (reason: string) => {
    if (!rejectItemTarget) return;
    await updateCarWashItemStatus(rejectItemTarget.job.id, rejectItemTarget.item.id, 'REJECTED', reason);
    setRejectItemTarget(null);
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            งานทั้งหมด (All Jobs Management)
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            ค้นหา ตรวจสอบความคืบหน้า และบริหารคำสั่งงานซัพพลายเออร์ทุกประเภท
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-full bg-white border shadow-xs" style={{ borderColor: theme.borderSoft }}>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'KANBAN'
                  ? 'text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={viewMode === 'KANBAN' ? { backgroundColor: theme.primary } : {}}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>คัมบัง (Kanban)</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'TABLE'
                  ? 'text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={viewMode === 'TABLE' ? { backgroundColor: theme.primary } : {}}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>ตาราง (Table)</span>
            </button>
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}>
            พบ {displayedJobs.length} รายการ
            {rangeSummary && (
              <span className="font-normal text-gray-500 ml-1">({rangeSummary})</span>
            )}
          </span>
        </div>
      </div>

      <JobFilters
        searchTags={searchTags}
        onSearchTagsChange={(tags) => {
          setSearchTags(tags);
          updateUrlParams({ q: tags.length > 0 ? tags.join(',') : null });
        }}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        customFrom={customFrom}
        customTo={customTo}
        onCustomRangeChange={handleCustomRangeChange}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        supplierFilter={supplierFilter}
        onSupplierFilterChange={setSupplierFilter}
        suppliers={suppliers}
        theme={theme}
      />

      {/* Jobs Content: Table vs Kanban */}
      {viewMode === 'TABLE' ? (
        <JobTable
          jobs={displayedJobs}
          currentRole={currentRole}
          theme={theme}
          onViewDetail={setSelectedJob}
          onAcceptJob={handleAcceptJob}
          onCompleteJob={setShowCompleteModal}
          onApproveJob={(id) => handleApprove(id)}
          onRejectJob={setShowRejectModal}
        />
      ) : (
        <JobKanbanBoard
          jobs={displayedJobs}
          currentRole={currentRole}
          theme={theme}
          onViewDetail={setSelectedJob}
          onAcceptJob={handleAcceptJob}
          onCompleteJob={setShowCompleteModal}
          onApproveJob={(id) => handleApprove(id)}
          onRejectJob={setShowRejectModal}
          onApproveItem={handleApproveItem}
          onRejectItem={(job, item) => setRejectItemTarget({ job, item })}
        />
      )}

      {/* Complete Job Modal */}
      {showCompleteModal && (
        <CompleteJobModal
          job={showCompleteModal}
          theme={theme}
          onClose={() => setShowCompleteModal(null)}
          onSubmit={handleCompleteJobSubmit}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectJobModal
          job={showRejectModal}
          onClose={() => setShowRejectModal(null)}
          onSubmit={handleRejectSubmit}
        />
      )}

      {/* Per-car Reject Modal */}
      {rejectItemTarget && (
        <RejectJobModal
          job={rejectItemTarget.job}
          vin={rejectItemTarget.item.vin}
          onClose={() => setRejectItemTarget(null)}
          onSubmit={handleRejectItemSubmit}
        />
      )}


      {/* Job Detail Slide-Over Drawer */}
      <JobDetailDrawer
        job={activeJob}
        onClose={() => setSelectedJob(null)}
        onPrevJob={goToPrevJob}
        onNextJob={goToNextJob}
        hasPrevJob={hasPrevJob}
        hasNextJob={hasNextJob}
        currentJobIndex={currentJobIndex}
        totalJobs={displayedJobs.length}
        onApprove={handleApprove}
        onReject={setShowRejectModal}
        onAcceptJob={handleAcceptJob}
        onCompleteJob={setShowCompleteModal}
        onPreviewPhoto={(url) => setPreviewPhotoUrl(url)}
      />
      <PhotoLightbox photoUrl={previewPhotoUrl} onClose={() => setPreviewPhotoUrl(null)} />
    </div>
  );
}

export default function AllJobsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-gray-500">กำลังโหลดรายการงานทั้งหมด...</div>}>
      <JobsContent />
    </Suspense>
  );
}
