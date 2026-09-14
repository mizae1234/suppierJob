'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
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
  Layers
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

  // View Mode: Table vs Kanban
  const [viewMode, setViewMode] = useState<'TABLE' | 'KANBAN'>('TABLE');

  // Filters state
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<'ALL' | JobType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | JobStatus>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  // Modal states
  const [selectedJob, setSelectedJob] = useState<Job | null>(
    filteredJobs.find(j => j.id === initialJobId) || null
  );
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

  // Supplier action: Accept job
  const handleAcceptJob = (jobId: string) => {
    updateJobStatus(jobId, 'IN_PROGRESS');
    if (selectedJob?.id === jobId) {
      setSelectedJob(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
    }
  };

  // Supplier action: Complete with photo
  const handleCompleteJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCompleteModal) return;

    const photo = evidencePhotoUrl.trim() || samplePhotos[0];
    const caption = evidenceCaption.trim() || 'งานเสร็จเรียบร้อย ตรวจสอบความสะอาดพร้อมส่งมอบ';

    addJobEvidence(showCompleteModal.id, {
      photoUrl: photo,
      caption,
      evidenceType,
      vin: showCompleteModal.vin || showCompleteModal.carWashItems?.[0]?.vin,
    });

    updateJobStatus(showCompleteModal.id, 'WAITING_APPROVAL');

    setShowCompleteModal(null);
    setEvidencePhotoUrl('');
    setEvidenceCaption('');
    if (selectedJob?.id === showCompleteModal.id) {
      setSelectedJob(null);
    }
  };

  // Branch action: Approve
  const handleApprove = (jobId: string) => {
    updateJobStatus(jobId, 'APPROVED', { approvedBy: 'สาขาผู้ตรวจรับ' });
    if (selectedJob?.id === jobId) {
      setSelectedJob(prev => prev ? { ...prev, status: 'APPROVED', approvedAt: new Date().toISOString() } : null);
    }
  };

  // Branch action: Reject
  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRejectModal) return;

    updateJobStatus(showRejectModal.id, 'REJECTED', {
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
          <div className="flex items-center p-1 rounded-full bg-white border border-emerald-950/10 shadow-xs">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-[#0f5238] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>ตาราง (Table)</span>
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === 'KANBAN'
                  ? 'bg-[#0f5238] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>คัมบัง (Kanban)</span>
            </button>
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-[#0f5238]">
            พบ {displayedJobs.length} รายการ
          </span>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="p-4 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col lg:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา Job No., VIN, ทะเบียนรถ, สาขา, Supplier..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#f4f9f5] border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-10 px-3 rounded-xl bg-[#f4f9f5] border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
          >
            <option value="ALL">ทุกประเภทงาน</option>
            <option value="CAR_WASH">Car Wash (สั่งล้างรถ)</option>
            <option value="VEHICLE_SLIDE">Vehicle Slide (รถสไลด์)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 rounded-xl bg-[#f4f9f5] border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
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
            className="h-10 px-3 rounded-xl bg-[#f4f9f5] border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
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
        <div className="bg-white rounded-2xl border border-emerald-950/10 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f9f5] border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
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
                    const statusMap: Record<string, { label: string; bg: string; text: string }> = {
                      PENDING_SUPPLIER: { label: 'รอ Supplier รับงาน', bg: 'bg-blue-100', text: 'text-blue-800' },
                      IN_PROGRESS: { label: 'กำลังทำงาน', bg: 'bg-amber-100', text: 'text-amber-800' },
                      WAITING_APPROVAL: { label: 'รอตรวจรับ', bg: 'bg-amber-200', text: 'text-amber-900 font-bold' },
                      APPROVED: { label: 'Approved พร้อมวางบิล', bg: 'bg-emerald-100', text: 'text-emerald-900 font-bold' },
                      REJECTED: { label: 'ขอแก้ไข', bg: 'bg-red-100', text: 'text-red-800 font-bold' },
                      INVOICED: { label: 'วางบิลแล้ว', bg: 'bg-purple-100', text: 'text-purple-800' },
                      CANCELLED: { label: 'ยกเลิก', bg: 'bg-gray-100', text: 'text-gray-600' },
                    };
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
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                <span>Car Wash</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-4 h-4 text-emerald-600" />
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
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#f4f9f5] hover:bg-emerald-100 text-[#0f5238] transition-colors"
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
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
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
                  className={`flex-1 min-w-[280px] max-w-[340px] bg-[#f4f9f5] rounded-3xl border border-gray-200 border-t-4 ${col.borderColor} p-4 flex flex-col gap-3 shadow-xs`}
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
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-[#0f5238]">
                                {job.companyCode}
                              </span>
                              <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                                {job.jobType === 'CAR_WASH' ? (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Car Wash</span>
                                  </>
                                ) : (
                                  <>
                                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
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
                          <div className="font-bold text-xs text-gray-900 group-hover:text-[#0f5238] transition-colors">
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
                              <span className="text-[10px] text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                                มีรูปหลักฐาน ({job.evidences.length})
                              </span>
                            </div>
                          )}

                          {/* Price & Actions Row */}
                          <div
                            className="pt-2 border-t border-gray-100 flex items-center justify-between"
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="font-bold text-[#0f5238] text-xs">
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
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
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
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0f5238] flex items-center justify-center">
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
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
                {/* Quick preset chips */}
                <div className="flex gap-2 mt-2">
                  {samplePhotos.map((url, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setEvidencePhotoUrl(url)}
                      className="w-14 h-10 rounded-lg overflow-hidden border border-gray-200 focus:ring-2 focus:ring-[#0f5238] relative shrink-0"
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
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238] outline-none font-medium"
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
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238] outline-none"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0f5238] text-white hover:bg-[#0a3d28] shadow-xs"
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

      {/* Job Detail Drawer / Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-xs">
                  {selectedJob.companyCode}
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedJob.jobNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#f4f9f5] text-xs">
              <div>
                <span className="text-gray-500">ประเภทงาน:</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedJob.jobType}</p>
              </div>
              <div>
                <span className="text-gray-500">สถานะ:</span>
                <p className="font-bold text-emerald-800 mt-0.5">{selectedJob.status}</p>
              </div>
              <div>
                <span className="text-gray-500">สาขาที่สั่ง:</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedJob.branchName}</p>
              </div>
              <div>
                <span className="text-gray-500">Supplier:</span>
                <p className="font-bold text-gray-900 mt-0.5">{selectedJob.supplierName}</p>
              </div>
              <div>
                <span className="text-gray-500">วันที่สร้าง:</span>
                <p className="font-bold text-gray-900 mt-0.5">{formatThaiDateTime(selectedJob.createdAt)}</p>
              </div>
              <div>
                <span className="text-gray-500">ค่าบริการ:</span>
                <p className="font-bold text-[#0f5238] text-sm mt-0.5">
                  ฿{(selectedJob.actualCost || selectedJob.estimatedCost).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Specific Job Details: Car Wash Items or Slide route */}
            {selectedJob.jobType === 'CAR_WASH' && selectedJob.carWashItems && (
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  รายการรถในคำสั่งล้าง ({selectedJob.carWashItems.length} คัน)
                </h4>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {selectedJob.carWashItems.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-[#fbfdfc] flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-mono font-bold text-gray-900">{item.vin}</span>
                        <span className="text-gray-500 ml-2">({item.vehicleModel} - {item.vehicleColor})</span>
                        {item.licensePlate && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-semibold">
                            {item.licensePlate}
                          </span>
                        )}
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          วันปฏิบัติงานจริง: {formatThaiDate(item.actualWashDate)} • ประเภท: {item.washType}
                        </p>
                      </div>
                      <span className="font-bold text-gray-800">฿{item.unitPrice}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedJob.jobType === 'VEHICLE_SLIDE' && (
              <div className="p-4 rounded-xl border border-gray-100 bg-[#fbfdfc] text-xs flex flex-col gap-2">
                <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  ข้อมูลเส้นทางขนส่งรถสไลด์
                </h4>
                <p><strong>VIN รถ:</strong> <span className="font-mono">{selectedJob.vin}</span> ({selectedJob.vehicle?.model})</p>
                <p><strong>ต้นทาง:</strong> {selectedJob.originBranchName} &rarr; <strong>ปลายทาง:</strong> {selectedJob.destBranchName}</p>
                <p><strong>เวลารับรถ:</strong> {formatThaiDateTime(selectedJob.pickupDateTime)}</p>
                <p><strong>เวลาส่งมอบ:</strong> {formatThaiDateTime(selectedJob.deliveryDateTime)}</p>
                <p><strong>ผู้ติดต่อปลายทาง:</strong> {selectedJob.contactPerson} ({selectedJob.contactPhone})</p>
                <p><strong>เหตุผลการย้าย:</strong> {selectedJob.transferReason}</p>
              </div>
            )}

            {/* Reject Reason if any */}
            {selectedJob.rejectReason && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
                <span className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  ข้อความขอให้แก้ไขจากสาขา:
                </span>
                <p className="mt-1">{selectedJob.rejectReason}</p>
              </div>
            )}

            {/* Photo Evidences Gallery */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider flex items-center justify-between">
                <span>รูปถ่ายหลักฐาน ({selectedJob.evidences.length} รูป)</span>
              </h4>

              {selectedJob.evidences.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                  ยังไม่มีการอัปโหลดรูปหลักฐานจากช่าง
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {selectedJob.evidences.map(evi => (
                    <div key={evi.id} className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex flex-col">
                      <div className="relative h-36 w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={evi.photoUrl} alt={evi.caption} className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold uppercase">
                          {evi.evidenceType}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-gray-800">{evi.caption}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatThaiDateTime(evi.uploadedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                <FileDown className="w-4 h-4" />
                <span>พิมพ์ใบสั่งงาน</span>
              </button>

              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-black"
              >
                ปิดหน้าต่าง
              </button>
            </div>
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
