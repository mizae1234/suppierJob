'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { Job, JobStatus, JobType, CompanyCode } from '@/types';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  X, 
  Upload, 
  Check, 
  RotateCcw,
  Receipt,
  FileDown,
  Building2,
  Calendar,
  Phone,
  User,
  ExternalLink,
  LayoutList,
  Kanban,
  Layers,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  CheckCheck,
  MapPin,
  ArrowRight,
  ShieldCheck,
  ImageIcon,
  ZoomIn,
  Car
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
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState('');
  const [evidenceCaption, setEvidenceCaption] = useState('');
  const [evidenceType, setEvidenceType] = useState<'AFTER' | 'BEFORE' | 'DROPOFF'>('AFTER');

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState<Job | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Sample photo helpers
  const samplePhotos = [
    'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80'
  ];

  // Status mapping
  const statusMap: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    PENDING_SUPPLIER: { label: 'รอ Supplier รับงาน', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
    IN_PROGRESS: { label: 'กำลังทำงาน', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
    WAITING_APPROVAL: { label: 'รอตรวจรับ', bg: 'bg-orange-100', text: 'text-orange-900 font-bold', dot: 'bg-orange-500' },
    APPROVED: { label: 'Approved พร้อมวางบิล', bg: 'bg-emerald-100', text: 'text-emerald-900 font-bold', dot: 'bg-emerald-600' },
    REJECTED: { label: 'ขอแก้ไข', bg: 'bg-red-100', text: 'text-red-800 font-bold', dot: 'bg-red-500' },
    INVOICED: { label: 'วางบิลแล้ว', bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
    CANCELLED: { label: 'ยกเลิก', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  };

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

  // Supplier action: Complete with photo
  const handleCompleteJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCompleteModal) return;

    const photo = evidencePhotoUrl.trim() || samplePhotos[0];
    const caption = evidenceCaption.trim() || 'งานเสร็จเรียบร้อย ตรวจสอบความสะอาดพร้อมส่งมอบ';

    await addJobEvidence(showCompleteModal.id, {
      photoUrl: photo,
      caption,
      evidenceType,
      vin: showCompleteModal.vin || showCompleteModal.carWashItems?.[0]?.vin,
    });

    await updateJobStatus(showCompleteModal.id, 'WAITING_APPROVAL');

    setShowCompleteModal(null);
    setEvidencePhotoUrl('');
    setEvidenceCaption('');
    if (selectedJob?.id === showCompleteModal.id) {
      setSelectedJob(null);
    }
  };

  // Branch action: Approve
  const handleApprove = async (jobId: string) => {
    await updateJobStatus(jobId, 'APPROVED', { approvedBy: 'สาขาผู้ตรวจรับ' });
    if (selectedJob?.id === jobId) {
      setSelectedJob(prev => prev ? { ...prev, status: 'APPROVED', approvedAt: new Date().toISOString() } : null);
    }
  };

  // Branch action: Reject
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRejectModal) return;

    await updateJobStatus(showRejectModal.id, 'REJECTED', {
      rejectReason: rejectReason || 'งานไม่ผ่านเกณฑ์ ขอให้ช่างแก้ไขงานซ้ำ'
    });

    setShowRejectModal(null);
    setRejectReason('');
    if (selectedJob?.id === showRejectModal.id) {
      setSelectedJob(null);
    }
  };

  // Kanban Columns Definition
  const kanbanColumns: Array<{
    id: JobStatus;
    title: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    dotColor: string;
  }> = [
    {
      id: 'PENDING_SUPPLIER',
      title: 'รอ Supplier รับงาน',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
      borderColor: 'border-t-blue-500',
      dotColor: 'bg-blue-500',
    },
    {
      id: 'IN_PROGRESS',
      title: 'กำลังปฏิบัติงาน',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      borderColor: 'border-t-amber-500',
      dotColor: 'bg-amber-500',
    },
    {
      id: 'WAITING_APPROVAL',
      title: 'รอสาขาตรวจรับ',
      badgeBg: 'bg-amber-200',
      badgeText: 'text-amber-900 font-bold',
      borderColor: 'border-t-orange-500',
      dotColor: 'bg-orange-500 animate-pulse',
    },
    {
      id: 'APPROVED',
      title: 'Approved (พร้อมวางบิล)',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-900 font-bold',
      borderColor: 'border-t-emerald-600',
      dotColor: 'bg-emerald-600',
    },
    {
      id: 'REJECTED',
      title: 'ขอให้แก้ไข (Reject)',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800 font-bold',
      borderColor: 'border-t-red-500',
      dotColor: 'bg-red-500',
    },
    {
      id: 'INVOICED',
      title: 'วางบิลแล้ว',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800 font-bold',
      borderColor: 'border-t-purple-600',
      dotColor: 'bg-purple-600',
    },
  ];

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

      {/* Filter Toolbar Card */}
      <div className="p-4 rounded-2xl bg-white border shadow-xs flex flex-col lg:flex-row items-center gap-3" style={{ borderColor: theme.borderSoft }}>
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา Job No., VIN, ทะเบียนรถ, สาขา, Supplier..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2"
            style={{ backgroundColor: theme.bgSoft, '--tw-ring-color': theme.primary } as React.CSSProperties}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2"
            style={{ backgroundColor: theme.bgSoft, '--tw-ring-color': theme.primary } as React.CSSProperties}
          >
            <option value="ALL">ทุกประเภทงาน</option>
            <option value="CAR_WASH">Car Wash (สั่งล้างรถ)</option>
            <option value="VEHICLE_SLIDE">Vehicle Slide (รถสไลด์)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2"
            style={{ backgroundColor: theme.bgSoft, '--tw-ring-color': theme.primary } as React.CSSProperties}
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="PENDING_SUPPLIER">รอ Supplier รับงาน</option>
            <option value="IN_PROGRESS">กำลังปฏิบัติงาน</option>
            <option value="WAITING_APPROVAL">รอสาขาตรวจรับ</option>
            <option value="APPROVED">Approved (พร้อมวางบิล)</option>
            <option value="REJECTED">ขอแก้ไข (Reject)</option>
            <option value="INVOICED">วางบิลแล้ว</option>
          </select>

          {/* Supplier Filter */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2"
            style={{ backgroundColor: theme.bgSoft, '--tw-ring-color': theme.primary } as React.CSSProperties}
          >
            <option value="ALL">ทุก Supplier</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Jobs Content: Table vs Kanban */}
      {viewMode === 'TABLE' ? (
        /* Jobs Data Table Card */
        <div className="bg-white rounded-2xl border shadow-xs overflow-hidden" style={{ borderColor: theme.borderSoft }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider" style={{ backgroundColor: theme.bgSoft }}>
                  <th className="py-3.5 px-4">เลขที่ใบสั่งงาน</th>
                  <th className="py-3.5 px-4">ประเภท</th>
                  <th className="py-3.5 px-4">สังกัด / สาขา</th>
                  <th className="py-3.5 px-4">Supplier คู่ค้า</th>
                  <th className="py-3.5 px-4">รายการรถ (VIN)</th>
                  <th className="py-3.5 px-4">สถานะงาน</th>
                  <th className="py-3.5 px-4 text-right">ค่าบริการ</th>
                  <th className="py-3.5 px-4 text-center">การปฏิบัติการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {displayedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      ไม่พบรายการงานที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  displayedJobs.map(job => {
                    const currentStatus = statusMap[job.status] || { label: job.status, bg: 'bg-gray-100', text: 'text-gray-700' };

                    return (
                      <tr key={job.id} className="hover:bg-[#fbfdfc] transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900">{job.jobNumber}</div>
                          <div className="text-[11px] text-gray-400">{formatThaiDate(job.createdAt)}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                            {job.jobType === 'CAR_WASH' ? (
                              <>
                                <Sparkles className="w-4 h-4" style={{ color: theme.iconColor }} />
                                <span>Car Wash</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-4 h-4" style={{ color: theme.iconColor }} />
                                <span>Slide Transport</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                              {job.companyCode}
                            </span>
                            <span className="text-gray-800 font-medium">{job.branchName}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-gray-800 font-medium">{job.supplierName}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          {job.jobType === 'CAR_WASH' ? (
                            <div>
                              <span className="font-semibold text-gray-900">
                                จำนวน {job.carWashItems?.length || 0} คัน
                              </span>
                              <div className="text-[11px] text-gray-500 font-mono truncate max-w-[180px]">
                                {job.carWashItems?.map(i => i.vin.slice(-6)).join(', ')}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono font-semibold text-gray-900">
                                {job.vin}
                              </span>
                              <div className="text-[11px] text-gray-500">
                                ไปยัง: {job.destBranchName}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] ${currentStatus.bg} ${currentStatus.text}`}>
                            {currentStatus.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-gray-900 whitespace-nowrap">
                          ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Detail Button */}
                            <button
                              onClick={() => setSelectedJob(job)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                              style={{ backgroundColor: theme.bgSoft, color: theme.textPrimary }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.badgeBg; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.bgSoft; }}
                            >
                              ดูข้อมูล
                            </button>

                            {/* Role-based Context Actions */}
                            {currentRole === 'SUPPLIER' && job.status === 'PENDING_SUPPLIER' && (
                              <button
                                onClick={() => handleAcceptJob(job.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                              >
                                รับงาน
                              </button>
                            )}

                            {currentRole === 'SUPPLIER' && job.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => setShowCompleteModal(job)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                              >
                                ส่งงาน / แนบรูป
                              </button>
                            )}

                            {currentRole !== 'SUPPLIER' && job.status === 'WAITING_APPROVAL' && (
                              <>
                                <button
                                  onClick={() => handleApprove(job.id)}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold text-white transition-colors"
                                  style={{ backgroundColor: theme.primary }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryHover; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary; }}
                                  title="Approve งาน"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setShowRejectModal(job)}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                                  title="Reject ให้แก้ไข"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4 min-w-[1500px]">
            {kanbanColumns.map(col => {
              const colJobs = displayedJobs.filter(j => j.status === col.id);
              const colTotal = colJobs.reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

              return (
                <div
                  key={col.id}
                  className={`flex-1 min-w-[280px] max-w-[340px] rounded-3xl border border-gray-200 border-t-4 ${col.borderColor} p-4 flex flex-col gap-3 shadow-xs`}
                  style={{ backgroundColor: theme.bgSoft }}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                      <h3 className="font-bold text-xs text-gray-800 tracking-tight">
                        {col.title}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg} ${col.badgeText}`}>
                      {colJobs.length}
                    </span>
                  </div>

                  {/* Column Summary Info */}
                  <div className="text-[11px] text-gray-500 flex items-center justify-between border-b border-gray-200/80 pb-2">
                    <span>ยอดรวมกลุ่มนี้:</span>
                    <span className="font-bold text-gray-800">฿{colTotal.toLocaleString()}</span>
                  </div>

                  {/* Column Cards List */}
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                    {colJobs.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-400 rounded-2xl border border-dashed border-gray-200 bg-white/60">
                        ไม่มีงานในสถานะนี้
                      </div>
                    ) : (
                      colJobs.map(job => (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJob(job)}
                          className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5 cursor-pointer group"
                        >
                          {/* Card Top: Type & Company */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}>
                                {job.companyCode}
                              </span>
                              <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                                {job.jobType === 'CAR_WASH' ? (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
                                    <span>Car Wash</span>
                                  </>
                                ) : (
                                  <>
                                    <Truck className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
                                    <span>Slide</span>
                                  </>
                                )}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {formatThaiDate(job.createdAt)}
                            </span>
                          </div>

                          {/* Job Number */}
                          <div className="font-bold text-xs text-gray-900 transition-colors" style={{ '--hover-color': theme.textPrimary } as React.CSSProperties}>
                            {job.jobNumber}
                          </div>

                          {/* Vehicle Details */}
                          <div className="p-2 rounded-xl bg-[#fbfdfc] border border-gray-100 text-xs">
                            {job.jobType === 'CAR_WASH' ? (
                              <div>
                                <p className="font-semibold text-gray-800">
                                  จำนวน {job.carWashItems?.length || 0} คัน
                                </p>
                                <p className="text-[11px] text-gray-500 truncate font-mono mt-0.5">
                                  {job.carWashItems?.map(i => i.vin.slice(-6)).join(', ')}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="font-mono font-semibold text-gray-800 text-[11px]">
                                  {job.vin}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  ไปยัง: {job.destBranchName}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Branch & Supplier */}
                          <div className="text-[11px] text-gray-500 flex flex-col gap-0.5">
                            <p className="truncate">สาขา: <span className="font-medium text-gray-800">{job.branchName}</span></p>
                            <p className="truncate">คู่ค้า: <span className="font-medium text-gray-800">{job.supplierName}</span></p>
                          </div>

                          {/* Evidence Photo Preview */}
                          {job.evidences.length > 0 && (
                            <div className="flex items-center gap-2 pt-1">
                              <div className="w-12 h-9 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={job.evidences[0].photoUrl} alt="evidence" className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: theme.textPrimary, backgroundColor: theme.bgSoft }}>
                                มีรูปหลักฐาน ({job.evidences.length})
                              </span>
                            </div>
                          )}

                          {/* Price & Actions Row */}
                          <div
                            className="pt-2 border-t border-gray-100 flex items-center justify-between"
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="font-bold text-xs" style={{ color: theme.textPrimary }}>
                              ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                            </span>

                            <div className="flex items-center gap-1">
                              {currentRole === 'SUPPLIER' && job.status === 'PENDING_SUPPLIER' && (
                                <button
                                  onClick={() => handleAcceptJob(job.id)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                                >
                                  รับงาน
                                </button>
                              )}

                              {currentRole === 'SUPPLIER' && job.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={() => setShowCompleteModal(job)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                                >
                                  ส่งงาน
                                </button>
                              )}

                              {currentRole !== 'SUPPLIER' && job.status === 'WAITING_APPROVAL' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(job.id)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-xs"
                                    style={{ backgroundColor: theme.primary }}
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryHover; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary; }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setShowRejectModal(job)}
                                    className="px-1.5 py-1 rounded-lg text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => setSelectedJob(job)}
                                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
                              >
                                ดู
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Complete Job & Attach Evidence Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}>
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  แนบรูปหลักฐาน & ส่งงานเรียบร้อย
                </h3>
              </div>
              <button
                onClick={() => setShowCompleteModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteJobSubmit} className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-gray-600">
                  รหัสงาน: <span className="font-bold text-gray-900">{showCompleteModal.jobNumber}</span>
                </p>
                <p className="text-xs text-gray-600">
                  ประเภท: <span className="font-bold text-gray-900">{showCompleteModal.jobType}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  เลือกรูปตัวอย่าง หรือระบุ URL รูปถ่ายงาน:
                </label>
                <input
                  type="url"
                  value={evidencePhotoUrl}
                  onChange={(e) => setEvidencePhotoUrl(e.target.value)}
                  placeholder="https://... หรือเลือกจากตัวอย่างด้านล่าง"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2"
                  style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
                />
                {/* Quick preset chips */}
                <div className="flex gap-2 mt-2">
                  {samplePhotos.map((url, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setEvidencePhotoUrl(url)}
                      className="w-14 h-10 rounded-lg overflow-hidden border border-gray-200 relative shrink-0 focus:ring-2"
                      style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="sample" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ประเภทรูปถ่าย:
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs outline-none font-medium focus:ring-2"
                  style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
                >
                  <option value="AFTER">รูปหลังทำความสะอาดเสร็จ (After Wash)</option>
                  <option value="BEFORE">รูปก่อนเริ่มงาน (Before)</option>
                  <option value="DROPOFF">รูปส่งมอบรถที่ปลายทาง (Delivery Dropoff)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  คำอธิบายเพิ่มเติม:
                </label>
                <textarea
                  rows={2}
                  value={evidenceCaption}
                  onChange={(e) => setEvidenceCaption(e.target.value)}
                  placeholder="เช่น ทำความสะอาดภายนอกและภายในเรียบร้อย พร้อมส่งมอบ"
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2"
                  style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ backgroundColor: theme.primary }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryHover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary; }}
                >
                  ส่งงานให้สาขาตรวจรับ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  ไม่อนุมัติ / ขอให้แก้ไขงาน (Reject)
                </h3>
              </div>
              <button
                onClick={() => setShowRejectModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="flex flex-col gap-3">
              <p className="text-xs text-gray-600">
                Job No.: <span className="font-bold text-gray-900">{showRejectModal.jobNumber}</span>
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ระบุเหตุผลที่ต้องการให้ Supplier แก้ไข:
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="เช่น พบคราบน้ำมันที่ขอบประตู หรือมีรอยเปื้อนบริเวณเบาะหลัง..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-xs"
                >
                  ยืนยันการ Reject
                </button>
              </div>
            </form>
          </div>
        </div>
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
                    statusMap[activeJob.status]?.bg || 'bg-gray-100'
                  } ${statusMap[activeJob.status]?.text || 'text-gray-700'}`}>
                    {statusMap[activeJob.status]?.label || activeJob.status}
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

      {/* Enlarged Photo Lightbox Modal */}
      {previewPhotoUrl && (
        <div 
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button 
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={previewPhotoUrl} 
              alt="หลักฐานขยาย" 
              className="w-full h-auto max-h-[85vh] object-contain" 
            />
          </div>
        </div>
      )}
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
