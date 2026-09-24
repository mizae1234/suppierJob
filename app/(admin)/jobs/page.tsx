'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { Job, JobStatus, JobType } from '@/types';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import {
  JobFilters,
  JobTable,
  JobKanbanBoard,
  CompleteJobModal,
  RejectJobModal,
  PhotoLightbox,
  STATUS_MAP,
  SAMPLE_PHOTOS,
} from '@/components/jobs';
import {
  Sparkles,
  Truck,
  AlertCircle,
  X,
  Upload,
  Check,
  Building2,
  Calendar,
  Phone,
  User,
  LayoutList,
  Kanban,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  CheckCheck,
  MapPin,
  ArrowRight,
  ImageIcon,
  ZoomIn,
} from 'lucide-react';

function JobsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialJobId = searchParams.get('jobId') || '';

  const { 
    filteredJobs, 
    currentRole, 
    currentSupplierId, 
    updateJobStatus, 
    addJobEvidence,
    suppliers,
    branches 
  } = useApp();
  const theme = useTheme();

  // View Mode: Table vs Kanban
  const [viewMode, setViewMode] = useState<'TABLE' | 'KANBAN'>('TABLE');

  // Filters state
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<'ALL' | JobType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | JobStatus>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  // Modal & Drawer states
  const [selectedJob, setSelectedJob] = useState<Job | null>(
    filteredJobs.find(j => j.id === initialJobId) || null
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<Job | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<Job | null>(null);

  // Active job synchronized with filteredJobs
  const activeJob = useMemo(() => {
    if (!selectedJob) return null;
    return filteredJobs.find(j => j.id === selectedJob.id) || selectedJob;
  }, [selectedJob, filteredJobs]);

  // Filtering
  const displayedJobs = useMemo(() => {
    return filteredJobs.filter(job => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesJobNo = job.jobNumber.toLowerCase().includes(q);
        const matchesSupplier = job.supplierName.toLowerCase().includes(q);
        const matchesBranch = job.branchName.toLowerCase().includes(q);
        const matchesVin = job.jobType === 'VEHICLE_SLIDE' 
          ? job.vin?.toLowerCase().includes(q) 
          : job.carWashItems?.some(it => it.vin.toLowerCase().includes(q) || it.licensePlate?.toLowerCase().includes(q));
        if (!matchesJobNo && !matchesSupplier && !matchesBranch && !matchesVin) {
          return false;
        }
      }

      // Type
      if (typeFilter !== 'ALL' && job.jobType !== typeFilter) return false;

      // Status
      if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;

      // Supplier
      if (supplierFilter !== 'ALL' && job.supplierId !== supplierFilter) return false;

      return true;
    });
  }, [filteredJobs, searchTerm, typeFilter, statusFilter, supplierFilter]);

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

  const handleCopyText = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1800);
    }
  };

  // Keyboard shortcut: Escape to close drawer, Arrow keys to navigate
  useEffect(() => {
    if (!activeJob) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewPhotoUrl) {
          setPreviewPhotoUrl(null);
        } else {
          setSelectedJob(null);
        }
      } else if (e.key === 'ArrowLeft' && hasPrevJob && !previewPhotoUrl) {
        goToPrevJob();
      } else if (e.key === 'ArrowRight' && hasNextJob && !previewPhotoUrl) {
        goToNextJob();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeJob, hasPrevJob, hasNextJob, currentJobIndex, previewPhotoUrl]);

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
  const handleApprove = async (jobId: string) => {
    await updateJobStatus(jobId, 'APPROVED', { approvedBy: 'สาขาผู้ตรวจรับ' });
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
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}>
            พบ {displayedJobs.length} รายการ
          </span>
        </div>
      </div>

      <JobFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
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


      {/* Job Detail Slide-Over Drawer */}
      {selectedJob && activeJob && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Dimmed Backdrop */}
          <div 
            onClick={() => setSelectedJob(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full pointer-events-auto border-l border-gray-100 animate-slide-in-right">
              
              {/* Sticky Drawer Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                    'rounded-full'
                  }`} style={activeJob.companyCode === 'EV7' ? { backgroundColor: '#dcfce7', color: '#0f5238' } : { backgroundColor: '#dbeafe', color: '#1e3a5f' }}>
                    {activeJob.companyCode}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-gray-900 font-mono">
                      {activeJob.jobNumber}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopyText(activeJob.jobNumber)}
                      title="คัดลอกเลขที่งาน"
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {copiedText === activeJob.jobNumber ? (
                        <CheckCheck className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    STATUS_MAP[activeJob.status]?.bg || 'bg-gray-100'
                  } ${STATUS_MAP[activeJob.status]?.text || 'text-gray-700'}`}>
                    {STATUS_MAP[activeJob.status]?.label || activeJob.status}
                  </span>
                </div>

                {/* Right controls: Prev/Next & Close */}
                <div className="flex items-center gap-2">
                  {currentJobIndex >= 0 && displayedJobs.length > 1 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-100 text-[11px] text-gray-600">
                      <span className="font-medium font-mono">{currentJobIndex + 1} / {displayedJobs.length}</span>
                      <div className="flex items-center ml-1 border-l border-gray-300 pl-1">
                        <button
                          type="button"
                          onClick={goToPrevJob}
                          disabled={!hasPrevJob}
                          title="งานก่อนหน้า (ลูกศรซ้าย)"
                          className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={goToNextJob}
                          disabled={!hasNextJob}
                          title="งานถัดไป (ลูกศรขวา)"
                          className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedJob(null)}
                    title="ปิด (Esc)"
                    className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs">

                {/* Top Highlights Banner */}
                <div className="p-5 rounded-2xl border flex flex-col gap-4" style={{ background: `linear-gradient(to bottom right, ${theme.bgSoft}, ${theme.bgFooter})`, borderColor: theme.borderSoft }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[11px] text-gray-500 font-medium">ยอดค่าบริการสุทธิ:</span>
                      <p className="text-2xl font-black tracking-tight" style={{ color: theme.textPrimary }}>
                        ฿{(activeJob.actualCost || activeJob.estimatedCost).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border shadow-2xs" style={{ borderColor: theme.borderSoft }}>
                      {activeJob.jobType === 'CAR_WASH' ? (
                        <>
                          <Sparkles className="w-4 h-4" style={{ color: theme.iconColor }} />
                          <span className="font-bold text-gray-800">Car Wash (ล้างรถ)</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-gray-800">Vehicle Slide (สไลด์รถ)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t text-xs" style={{ borderColor: theme.borderSoft }}>
                    <div>
                      <span className="text-gray-500 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        สาขาที่สั่งงาน:
                      </span>
                      <p className="font-bold text-gray-900 mt-0.5">{activeJob.branchName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        Supplier คู่ค้า:
                      </span>
                      <p className="font-bold text-gray-900 mt-0.5">{activeJob.supplierName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        วันที่สร้างคำสั่ง:
                      </span>
                      <p className="font-bold text-gray-900 mt-0.5">{formatThaiDateTime(activeJob.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Reject Reason Alert (If Any) */}
                {activeJob.rejectReason && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-800">ข้อความขอให้แก้ไขงานจากสาขา:</p>
                      <p className="mt-1 leading-relaxed">{activeJob.rejectReason}</p>
                    </div>
                  </div>
                )}

                {/* Workflow Lifecycle Stepper */}
                <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                    สถานะการดำเนินงาน (Workflow Lifecycle)
                  </h4>
                  <div className="flex items-center justify-between text-[11px] relative">
                    <div className="absolute top-3 left-3 right-3 h-0.5 bg-gray-200 -z-0" />
                    
                    {/* Step 1 */}
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-[10px]" style={{ backgroundColor: theme.primary }}>
                        ✓
                      </div>
                      <span className="text-gray-700 font-medium">เปิดงาน</span>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        activeJob.status !== 'PENDING_SUPPLIER' 
                          ? 'text-white' 
                          : 'bg-blue-600 text-white ring-4 ring-blue-100'
                      }`}
                        style={activeJob.status !== 'PENDING_SUPPLIER' ? { backgroundColor: theme.primary } : {}}
                      >
                        {activeJob.status !== 'PENDING_SUPPLIER' ? '✓' : '2'}
                      </div>
                      <span className={activeJob.status === 'PENDING_SUPPLIER' ? 'font-bold text-blue-700' : 'text-gray-600'}>
                        รับงาน
                      </span>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        ['WAITING_APPROVAL', 'APPROVED', 'INVOICED'].includes(activeJob.status)
                          ? 'text-white'
                          : activeJob.status === 'IN_PROGRESS'
                            ? 'bg-amber-600 text-white ring-4 ring-amber-100'
                            : 'bg-gray-200 text-gray-500'
                      }`}
                        style={['WAITING_APPROVAL', 'APPROVED', 'INVOICED'].includes(activeJob.status) ? { backgroundColor: theme.primary } : {}}
                      >
                        {['WAITING_APPROVAL', 'APPROVED', 'INVOICED'].includes(activeJob.status) ? '✓' : '3'}
                      </div>
                      <span className={activeJob.status === 'IN_PROGRESS' ? 'font-bold text-amber-700' : 'text-gray-600'}>
                        ดำเนินการ
                      </span>
                    </div>

                    {/* Step 4 */}
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        ['APPROVED', 'INVOICED'].includes(activeJob.status)
                          ? 'text-white'
                          : activeJob.status === 'WAITING_APPROVAL'
                            ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                            : activeJob.status === 'REJECTED'
                              ? 'bg-red-600 text-white ring-4 ring-red-100'
                              : 'bg-gray-200 text-gray-500'
                      }`}
                        style={['APPROVED', 'INVOICED'].includes(activeJob.status) ? { backgroundColor: theme.primary } : {}}
                      >
                        {['APPROVED', 'INVOICED'].includes(activeJob.status) ? '✓' : activeJob.status === 'REJECTED' ? '!' : '4'}
                      </div>
                      <span className={activeJob.status === 'WAITING_APPROVAL' ? 'font-bold text-orange-700' : 'text-gray-600'}>
                        {activeJob.status === 'REJECTED' ? 'ขอแก้ไข' : 'ตรวจรับ'}
                      </span>
                    </div>

                    {/* Step 5 */}
                    <div className="flex flex-col items-center gap-1.5 z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        ['APPROVED', 'INVOICED'].includes(activeJob.status)
                          ? 'text-white ring-4'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                        style={['APPROVED', 'INVOICED'].includes(activeJob.status) ? { backgroundColor: theme.primary, '--tw-ring-color': theme.badgeBg } as React.CSSProperties : {}}
                      >
                        {['APPROVED', 'INVOICED'].includes(activeJob.status) ? '✓' : '5'}
                      </div>
                      <span className={['APPROVED', 'INVOICED'].includes(activeJob.status) ? 'font-bold' : 'text-gray-400'}
                        style={['APPROVED', 'INVOICED'].includes(activeJob.status) ? { color: theme.textPrimary } : {}}
                      >
                        อนุมัติ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specific Job Details: Car Wash Items */}
                {activeJob.jobType === 'CAR_WASH' && activeJob.carWashItems && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" style={{ color: theme.iconColor }} />
                        <span>รายการรถในคำสั่งล้าง ({activeJob.carWashItems.length} คัน)</span>
                      </h4>
                      <span className="text-[11px] text-gray-500">
                        รวม ฿{activeJob.carWashItems.reduce((acc, cur) => acc + cur.unitPrice, 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      {activeJob.carWashItems.map((item, idx) => (
                        <div key={item.id} className="p-3.5 hover:bg-[#fbfdfc] flex items-center justify-between gap-3 text-xs transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-gray-900 text-[13px]">{item.vin}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(item.vin)}
                                title="คัดลอก VIN"
                                className="p-0.5 rounded text-gray-400 hover:text-gray-700 transition-colors"
                              >
                                {copiedText === item.vin ? (
                                  <CheckCheck className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {item.licensePlate && (
                                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-[11px] font-semibold border border-gray-200">
                                  {item.licensePlate}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-gray-600 mt-1">
                              รุ่น: <strong className="text-gray-800">{item.vehicleModel}</strong> {item.vehicleColor && `• สี ${item.vehicleColor}`}
                            </p>
                            
                            <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                              <span>บริการ: <strong style={{ color: theme.textMuted }}>{item.washType}</strong></span>
                              <span>•</span>
                              <span>วันที่ทำจริง: {formatThaiDate(item.actualWashDate)}</span>
                            </div>

                            {item.remarks && (
                              <p className="text-[11px] text-gray-500 italic mt-1 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                &quot;{item.remarks}&quot;
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-sm" style={{ color: theme.textPrimary }}>฿{item.unitPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specific Job Details: Vehicle Slide */}
                {activeJob.jobType === 'VEHICLE_SLIDE' && (
                  <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-4">
                    <h4 className="font-bold text-gray-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <Truck className="w-4 h-4" style={{ color: theme.iconColor }} />
                      <span>ข้อมูลเส้นทางและการขนส่งรถสไลด์</span>
                    </h4>

                    {/* Route Visualizer */}
                    <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs" style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" style={{ color: theme.iconColor }} />
                        <div>
                          <span className="text-[10px] text-gray-500">ต้นทาง (Origin):</span>
                          <p className="font-bold text-gray-900">{activeJob.originBranchName || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 px-2" style={{ color: theme.iconColor }}>
                        <span className="border-b border-dashed w-8" style={{ borderColor: `${theme.primary}88` }} />
                        <ArrowRight className="w-4 h-4" />
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <span className="text-[10px] text-gray-500">ปลายทาง (Destination):</span>
                          <p className="font-bold text-gray-900">{activeJob.destBranchName || '-'}</p>
                        </div>
                        <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-500">ข้อมูลรถที่ขนย้าย:</span>
                        <p className="font-mono font-bold text-gray-900 text-sm mt-0.5">{activeJob.vin}</p>
                        <p className="text-gray-600 text-[11px] mt-0.5">{activeJob.vehicle?.model || 'ไม่ระบุรุ่น'}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-500">ผู้รับมอบปลายทาง:</span>
                        <p className="font-bold text-gray-900 mt-0.5">{activeJob.contactPerson || '-'}</p>
                        {activeJob.contactPhone && (
                          <a 
                            href={`tel:${activeJob.contactPhone}`}
                            className="text-[11px] hover:underline flex items-center gap-1 mt-0.5"
                            style={{ color: theme.textMuted }}
                          >
                            <Phone className="w-3 h-3" />
                            <span>{activeJob.contactPhone}</span>
                          </a>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-500">เวลานัดรับรถ:</span>
                        <p className="font-bold text-gray-900 mt-0.5">{formatThaiDateTime(activeJob.pickupDateTime)}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-500">เวลาส่งมอบโดยประมาณ:</span>
                        <p className="font-bold text-gray-900 mt-0.5">{formatThaiDateTime(activeJob.deliveryDateTime)}</p>
                      </div>
                    </div>

                    {activeJob.transferReason && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-500">เหตุผลในการขนย้าย / หมายเหตุ:</span>
                        <p className="font-medium text-gray-800 mt-0.5">{activeJob.transferReason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Photo Evidences Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-gray-600" />
                      <span>รูปถ่ายหลักฐาน ({activeJob.evidences.length} รูป)</span>
                    </h4>
                  </div>

                  {activeJob.evidences.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400 bg-gray-50/50 flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                      <p>ยังไม่มีการอัปโหลดรูปหลักฐานการปฏิบัติงาน</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeJob.evidences.map(evi => (
                        <div 
                          key={evi.id} 
                          onClick={() => setPreviewPhotoUrl(evi.photoUrl)}
                          className="group relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-2xs cursor-pointer transition-all"
                          style={{ '--hover-border': theme.badgeBg } as React.CSSProperties}
                        >
                          <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={evi.photoUrl} 
                              alt={evi.caption} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-black/60 text-white">
                                <ZoomIn className="w-4 h-4" />
                              </div>
                            </div>
                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold uppercase backdrop-blur-xs">
                              {evi.evidenceType === 'AFTER' ? 'หลังทำเสร็จ' : evi.evidenceType === 'BEFORE' ? 'ก่อนเริ่มงาน' : evi.evidenceType}
                            </span>
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-semibold text-gray-800 line-clamp-1">{evi.caption}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{formatThaiDateTime(evi.uploadedAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Drawer Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-white/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center justify-between shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <Printer className="w-4 h-4 text-gray-500" />
                  <span>พิมพ์ใบสั่งงาน</span>
                </button>

                <div className="flex items-center gap-2">
                  {/* Contextual actions */}
                  {currentRole === 'SUPPLIER' && activeJob.status === 'PENDING_SUPPLIER' && (
                    <button
                      type="button"
                      onClick={() => handleAcceptJob(activeJob.id)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                    >
                      รับงานนี้
                    </button>
                  )}

                  {currentRole === 'SUPPLIER' && activeJob.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      onClick={() => setShowCompleteModal(activeJob)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>ส่งมอบงาน & แนบรูป</span>
                    </button>
                  )}

                  {(currentRole === 'BRANCH' || currentRole === 'ADMIN') && activeJob.status === 'WAITING_APPROVAL' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(activeJob.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors"
                        style={{ backgroundColor: theme.primary }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryHover; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary; }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>อนุมัติงาน</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectModal(activeJob)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        ขอแก้ไข
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedJob(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
