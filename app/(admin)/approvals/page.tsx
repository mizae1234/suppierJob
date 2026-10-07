'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import { getJobTotalCost, getVehicleLabel, getSlideDirection } from '@/lib/job-utils';
import { useToast } from '@/components/ui/Toast';
import { 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Check, 
  Sparkles, 
  Truck, 
  Eye, 
  Clock, 
  Image as ImageIcon,
  Building2,
  Calendar,
  MapPin,
  Car,
  Send,
  RotateCcw,
  CheckCheck,
  Camera,
  Ban,
} from 'lucide-react';
import type { Job, CarWashItemStatus } from '@/types';
import {
  ApprovalRejectModal,
  ProxyApprovalModal,
  CarWashItemReviewCard,
} from '@/components/approvals';

function ApprovalsContent() {
  const searchParams = useSearchParams();
  const highlightedJobId = searchParams.get('jobId');

  const { 
    jobs, 
    filteredJobs,
    updateJobStatus,
    updateCarWashItemStatus, 
    currentRole,
    activeBranch,
    currentBranchId,
    currentCompany
  } = useApp();
  const { showToast } = useToast();

  const displayList = filteredJobs || jobs;
  const waitingJobs = displayList.filter(j => j.status === 'WAITING_APPROVAL');
  const recentApprovedJobs = displayList.filter(j => j.status === 'APPROVED');
  const rejectedJobs = displayList.filter(j => j.status === 'REJECTED');

  // Also include jobs that are IN_PROGRESS but have some items COMPLETED (partial submissions)
  const partiallyCompletedJobs = displayList.filter(j => 
    j.status === 'IN_PROGRESS' && 
    j.carWashItems &&
    j.carWashItems.some(i => i.status === 'COMPLETED' || i.status === 'APPROVED')
  );

  const [activeTab, setActiveTab] = useState<'WAITING' | 'PARTIAL' | 'APPROVED' | 'REJECTED'>('WAITING');
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; caption: string; type: string } | null>(null);

  // Reject modal state
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);

  // Item-level action states
  const [approvingItemId, setApprovingItemId] = useState<string | null>(null);
  const [approvingJobId, setApprovingJobId] = useState<string | null>(null);

  // Confirmation modal for proxy approval (origin branch approves on behalf of dest branch)
  const [confirmProxyJob, setConfirmProxyJob] = useState<Job | null>(null);

  const handleApprove = async (job: Job, proxyApproval = false) => {
    setApprovingJobId(job.id);
    try {
      const isSlide = job.jobType === 'VEHICLE_SLIDE';
      const myBranchId = activeBranch?.id || currentBranchId;
      const isDest = Boolean(isSlide && job.destBranchId && job.destBranchId === myBranchId);
      const isOrigin = Boolean(isSlide && ((job.originBranchId && job.originBranchId === myBranchId) || (job.branchId && job.branchId === myBranchId)));

      let approvedByLabel = '';
      if (isDest) {
        approvedByLabel = `ตรวจรับรถโดย ${job.destBranchName || activeBranch?.name || 'สาขาปลายทาง'}`;
      } else if (isOrigin && job.destBranchId) {
        approvedByLabel = `อนุมัติแทนปลายทางโดย ${job.originBranchName || activeBranch?.name || 'สาขาต้นทาง'}`;
      } else if (activeBranch?.name) {
        approvedByLabel = `สาขา ${activeBranch.name}`;
      }

      const res = await updateJobStatus(job.id, 'APPROVED', { approvedBy: approvedByLabel || undefined });
      if (res && !res.success) {
        showToast(res.error || 'อนุมัติไม่สำเร็จ', 'error');
      } else {
        showToast(
          proxyApproval 
            ? `อนุมัติแทนสาขาปลายทางเรียบร้อย (${job.jobNumber})` 
            : isDest 
            ? `ยืนยันรับรถเข้าสาขาเรียบร้อย (${job.jobNumber})` 
            : `อนุมัติใบงาน ${job.jobNumber} สำเร็จ`, 
          'success'
        );
      }
    } finally {
      setApprovingJobId(null);
    }
  };

  // Handle per-item approve — job auto-closes when every car is approved/declined
  const handleApproveItem = async (jobId: string, itemId: string, carLabel: string) => {
    setApprovingItemId(itemId);
    try {
      const progress = await updateCarWashItemStatus(jobId, itemId, 'APPROVED');
      if (!progress) {
        showToast('อนุมัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
      } else if (progress.allApproved) {
        showToast(`🎉 อนุมัติครบทุกคันแล้ว — ปิดใบงานอัตโนมัติ`, 'success');
      } else {
        showToast(`✅ อนุมัติรถคัน ${carLabel} (${progress.approved}/${progress.total - progress.cancelled} คัน)`, 'success');
      }
    } finally {
      setApprovingItemId(null);
    }
  };

  const currentList = activeTab === 'WAITING' 
    ? waitingJobs 
    : activeTab === 'PARTIAL'
    ? partiallyCompletedJobs
    : activeTab === 'APPROVED' 
    ? recentApprovedJobs 
    : rejectedJobs;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pb-20 sm:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-snug">
                ตรวจรับงานซัพพลายเออร์
              </h1>
              <span className="text-[11px] text-gray-400 font-normal sm:hidden">
                Waiting for Approval
              </span>
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Waiting for Approval
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ตรวจสอบรูปถ่ายหลักฐานการปฏิบัติงานของ Supplier และกด Approve / Reject (รายคัน หรือทั้งใบงาน)
          </p>
        </div>

        {/* Tab Badges */}
        <div className="grid grid-cols-4 sm:flex sm:items-center p-1 rounded-2xl sm:rounded-full bg-white border border-gray-200/80 shadow-xs gap-1 sm:gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('WAITING')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'WAITING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>รอตรวจรับ</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'WAITING' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {waitingJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PARTIAL')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PARTIAL'
                ? 'bg-blue-500 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>ส่งบางส่วน</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'PARTIAL' ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-800'
            }`}>
              {partiallyCompletedJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'APPROVED'
                ? 'bg-[#0f5238] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>อนุมัติแล้ว</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'APPROVED' ? 'bg-white/30 text-white' : 'bg-emerald-100 text-[#0f5238]'
            }`}>
              {recentApprovedJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'REJECTED'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>ขอแก้ไข</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'REJECTED' ? 'bg-white/30 text-white' : 'bg-red-100 text-red-800'
            }`}>
              {rejectedJobs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Review Cards */}
      {currentList.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-2xl sm:rounded-3xl bg-white border border-gray-200/80 shadow-xs text-center flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800">ไม่มีรายการในหมวดนี้</h3>
          <p className="text-xs text-gray-500 max-w-sm">
            {activeTab === 'WAITING'
              ? 'ทุกคำสั่งงานได้รับการตรวจรับและอนุมัติครบถ้วนเรียบร้อยแล้ว'
              : activeTab === 'PARTIAL'
              ? 'ไม่มีงานที่ Supplier ส่งมาบางส่วน'
              : 'ยังไม่มีประวัติรายการในหมวดนี้'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6">
          {currentList.map(job => {
            const isHighlighted = job.id === highlightedJobId;
            const isCarWash = job.jobType === 'CAR_WASH';
            const completedItemCount = job.carWashItems?.filter(i => i.status === 'COMPLETED' || i.status === 'APPROVED').length || 0;
            const approvedItemCount = job.carWashItems?.filter(i => i.status === 'APPROVED').length || 0;
            const cancelledItemCount = job.carWashItems?.filter(i => i.status === 'CANCELLED').length || 0;
            const totalItemCount = job.carWashItems?.length || 0;
            const approvableTotal = totalItemCount - cancelledItemCount;
            const allItemsCompleted = isCarWash && completedItemCount === totalItemCount && totalItemCount > 0;
            const countOf = (s: CarWashItemStatus) => job.carWashItems?.filter(i => i.status === s).length || 0;
            const statusSegments = [
              { key: 'APPROVED',  label: 'อนุมัติแล้ว', bar: 'bg-emerald-500', count: approvedItemCount },
              { key: 'COMPLETED', label: 'รอตรวจ',     bar: 'bg-amber-400',   count: countOf('COMPLETED') },
              { key: 'REJECTED',  label: 'ตีกลับ',     bar: 'bg-red-500',     count: countOf('REJECTED') },
              { key: 'PENDING',   label: 'รอส่งงาน',  bar: 'bg-gray-300',    count: countOf('PENDING') },
              { key: 'CANCELLED', label: 'ปฏิเสธ',     bar: 'bg-gray-500',    count: cancelledItemCount },
            ];

            return (
              <div
                key={job.id}
                className={`rounded-2xl sm:rounded-3xl bg-white border overflow-hidden transition-all shadow-xs flex flex-col ${
                  isHighlighted
                    ? 'border-amber-400 ring-2 ring-amber-400/30'
                    : 'border-gray-200/80'
                }`}
              >
                {/* ── Job Header ── */}
                <div className="p-4 sm:p-5 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0">
                        {isCarWash ? <Sparkles className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-white font-bold text-[10px] font-mono bg-emerald-700">
                            {job.companyCode}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight font-mono">
                            {job.jobNumber}
                          </h3>
                          {job.status === 'WAITING_APPROVAL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              <Eye className="w-3 h-3" /> รอตรวจรับ
                            </span>
                          )}
                          {job.status === 'IN_PROGRESS' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                              <Clock className="w-3 h-3" /> ส่งบางส่วน {completedItemCount}/{totalItemCount}
                            </span>
                          )}
                          {job.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว
                            </span>
                          )}
                          {job.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                              <AlertCircle className="w-3 h-3" /> ส่งกลับแก้ไข
                            </span>
                          )}

                          {/* Direction Badge for Vehicle Slide */}
                          {job.jobType === 'VEHICLE_SLIDE' && (() => {
                            const myBranchId = activeBranch?.id || currentBranchId;
                            const dir = getSlideDirection(job, myBranchId, currentCompany);

                            if (dir === 'INBOUND') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  📥 รับเข้า (สาขาปลายทาง)
                                </span>
                              );
                            }
                            if (dir === 'OUTBOUND') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-bold text-[10px] shadow-2xs">
                                  📤 ส่งออก (สาขาต้นทาง)
                                </span>
                              );
                            }
                            if (dir === 'INTERNAL' || job.destBranchId) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">
                                  🚚 ย้ายสาขา: {job.originBranchName || job.branchName} → {job.destBranchName}
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-bold text-[10px]">
                                📍 ส่งตามพิกัด/แผนที่
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5 text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-700 truncate">{job.branchName}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-700 truncate max-w-[220px]">{job.supplierName}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Car className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{totalItemCount > 0 ? `${isCarWash ? '' : 'รถสไลด์ '}${totalItemCount} คัน` : 'รถสไลด์ 1 คัน'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between gap-1 px-3 py-2 sm:p-0 rounded-xl bg-emerald-50/50 sm:bg-transparent border sm:border-0 border-emerald-100 shrink-0">
                      <span className="text-[11px] text-gray-400 font-medium">ค่าบริการสุทธิ</span>
                      <span className="text-xl sm:text-2xl font-black text-[#0f5238] font-mono leading-none">
                        ฿{getJobTotalCost(job).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* ── Review progress + whole-job actions ── */}
                  {totalItemCount > 0 || job.status === 'WAITING_APPROVAL' ? (
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                      {totalItemCount > 0 && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="font-bold text-gray-700">ความคืบหน้าการตรวจรับ</span>
                            <span className="text-gray-500">
                              อนุมัติแล้ว <b className="text-emerald-700 text-xs">{approvedItemCount}</b>/{approvableTotal} คัน
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200 flex overflow-hidden">
                            {statusSegments.map(seg => seg.count > 0 && (
                              <div
                                key={seg.key}
                                className={`${seg.bar} h-full transition-all duration-500`}
                                style={{ width: `${(seg.count / totalItemCount) * 100}%` }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5">
                            {statusSegments.filter(s => s.count > 0).map(seg => (
                              <span key={seg.key} className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                                <span className={`w-1.5 h-1.5 rounded-full ${seg.bar}`} />
                                {seg.label} <b className="text-gray-700">{seg.count}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {job.status === 'WAITING_APPROVAL' && (() => {
                        const isSlide = job.jobType === 'VEHICLE_SLIDE';
                        const myBranchId = activeBranch?.id || currentBranchId;
                        const isDest = Boolean(isSlide && job.destBranchId && job.destBranchId === myBranchId);
                        const isOrigin = Boolean(isSlide && ((job.originBranchId && job.originBranchId === myBranchId) || (job.branchId && job.branchId === myBranchId)));

                        return (
                          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 lg:shrink-0 lg:ml-auto">
                            <button
                              onClick={() => {
                                setRejectingJobId(job.id);
                                setRejectingItemId(null);
                              }}
                              disabled={approvingJobId === job.id}
                              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-red-50 active:scale-[0.98] text-red-600 text-xs font-bold border border-red-200 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                              <span>ตีกลับทั้งใบ</span>
                            </button>

                            {isDest ? (
                              <button
                                onClick={() => handleApprove(job, false)}
                                disabled={approvingJobId === job.id}
                                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                title="สาขาปลายทางยืนยันรับรถเข้าสาขา"
                              >
                                <CheckCheck className="w-4 h-4 shrink-0" />
                                <span>{approvingJobId === job.id ? 'กำลังบันทึก...' : '✅ ยืนยันรับรถเข้าสาขา'}</span>
                              </button>
                            ) : isOrigin && job.destBranchId ? (
                              <button
                                onClick={() => setConfirmProxyJob(job)}
                                disabled={approvingJobId === job.id}
                                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 active:scale-[0.98] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                title="อนุมัติแทนสาขาปลายทาง"
                              >
                                <CheckCheck className="w-4 h-4 shrink-0" />
                                <span>{approvingJobId === job.id ? 'กำลังบันทึก...' : 'อนุมัติแทนปลายทาง'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApprove(job, false)}
                                disabled={approvingJobId === job.id}
                                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                              >
                                <CheckCheck className="w-4 h-4 shrink-0" />
                                <span>{approvingJobId === job.id ? 'กำลังบันทึก...' : approvedItemCount > 0 ? 'อนุมัติที่เหลือทั้งหมด' : 'อนุมัติทั้งใบ'}</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}

                  {job.status === 'APPROVED' && job.approvedAt && (
                    <p className="text-[11px] text-gray-500 -mt-1">
                      อนุมัติสำเร็จเมื่อ {formatThaiDate(job.approvedAt)}{job.approvedBy ? ` โดย ${job.approvedBy}` : ''}
                    </p>
                  )}
                </div>

                {/* ── Per-car review cards (Ultra-Compact Redesign) ── */}
                {job.carWashItems && job.carWashItems.length > 0 && (
                  <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-2.5 bg-gray-50/60 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {job.carWashItems.map((item) => (
                      <CarWashItemReviewCard
                        key={item.id}
                        item={item}
                        job={job}
                        isCarWash={isCarWash}
                        isApprovingThis={approvingItemId === item.id}
                        onPreviewPhoto={(photo) => setSelectedPhoto({ url: photo.url, caption: photo.caption || '', type: photo.type || '' })}
                        onApproveItem={(jobId, itemId, label) => handleApproveItem(jobId, itemId, label)}
                        onRejectItem={(jobId, itemId) => {
                          setRejectingJobId(jobId);
                          setRejectingItemId(itemId);
                        }}
                      />
                    ))}                  </div>
                )}

                {/* Vehicle Slide details (Single Car) */}
                {job.jobType === 'VEHICLE_SLIDE' && (!job.carWashItems || job.carWashItems.length === 0) && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80 text-xs flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">VIN รถที่สไลด์</span>
                        <p className="font-mono font-bold text-sm text-gray-900">{job.vin}</p>
                        <p className="text-gray-600 mt-0.5">{job.vehicle?.model} • สี: {job.vehicle?.color}</p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-400 text-[10px] font-semibold">เส้นทางสไลด์:</span>
                        <p className="font-semibold text-gray-800">{job.originBranchName} &rarr; {job.destBranchName}</p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-400 text-[10px] font-semibold">เวลาส่งมอบ:</span>
                        <p className="font-semibold text-gray-800">{formatThaiDateTime(job.deliveryDateTime)}</p>
                      </div>
                    </div>

                    {/* Single Vehicle Slide Photos */}
                    {job.evidences && job.evidences.length > 0 && (
                      <div className="pt-3 border-t border-gray-200/70">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                            <span>รูปถ่ายหลักฐานการส่งมอบรถ ({job.evidences.length} รูป)</span>
                          </span>
                          <span className="text-[10px] text-gray-400">คลิกเพื่อดูรูปใหญ่</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {job.evidences.map((evi) => (
                            <div
                              key={evi.id}
                              onClick={() => setSelectedPhoto({ url: evi.photoUrl, caption: evi.caption, type: evi.evidenceType })}
                              className="group relative rounded-xl overflow-hidden border border-gray-200 aspect-4/3 cursor-pointer bg-gray-100 hover:shadow-md active:scale-95 transition-all"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={evi.photoUrl}
                                alt={evi.caption}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                              <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold uppercase">
                                {evi.evidenceType}
                              </span>
                              {evi.caption && (
                                <p className="absolute bottom-1 left-1.5 right-1.5 text-white text-[10px] font-medium truncate" title={evi.caption}>
                                  {evi.caption}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reject note if rejected */}
                {job.rejectReason && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
                    <p className="font-bold">เหตุผลที่ส่งกลับแก้ไข:</p>
                    <p className="mt-0.5">{job.rejectReason}</p>
                  </div>
                )}

                {/* Unassigned / Additional Evidences (if any photos do not belong to a specific VIN) */}
                {(() => {
                  const hasCarItems = job.carWashItems && job.carWashItems.length > 0;
                  const unassigned = hasCarItems
                    ? job.evidences.filter(e => !job.carWashItems!.some(it => it.vin === e.vin))
                    : (!job.vin && job.evidences.length > 0)
                    ? job.evidences
                    : [];

                  if (unassigned.length === 0) return null;

                  return (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>รูปถ่ายทั่วไป / อื่นๆ ({unassigned.length} รูป)</span>
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-gray-400">คลิกที่รูปเพื่อขยายดูรายละเอียด</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
                        {unassigned.map(evi => (
                          <div
                            key={evi.id}
                            onClick={() => setSelectedPhoto({ url: evi.photoUrl, caption: evi.caption, type: evi.evidenceType })}
                            className="group relative rounded-xl sm:rounded-2xl overflow-hidden border border-gray-200 aspect-4/3 cursor-pointer bg-gray-100 hover:shadow-md active:scale-[0.98] transition-all"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={evi.photoUrl}
                              alt={evi.caption}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-90" />
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold uppercase">
                              {evi.evidenceType}
                            </span>
                            <p className="absolute bottom-1.5 left-1.5 right-1.5 text-white text-[10px] sm:text-[11px] font-medium truncate">
                              {evi.caption}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl w-full bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[70vh] bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto.url} alt={selectedPhoto.caption} className="max-h-[70vh] w-auto object-contain" />
            </div>
            <div className="p-3.5 sm:p-4 bg-white">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#0f5238] font-bold text-[10px] uppercase">
                {selectedPhoto.type}
              </span>
              <p className="text-sm font-semibold text-gray-900 mt-1">{selectedPhoto.caption}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal — supports both whole-job and per-item */}
      <ApprovalRejectModal
        jobId={rejectingJobId}
        itemId={rejectingItemId}
        onClose={() => {
          setRejectingJobId(null);
          setRejectingItemId(null);
        }}
        onConfirmRejectJob={async (jobId, reason) => {
          await updateJobStatus(jobId, 'REJECTED', {
            rejectReason: reason || 'งานไม่ผ่านเกณฑ์ ขอให้ช่างแก้ไขงานซ้ำ'
          });
          showToast('ตีกลับงานเรียบร้อยแล้ว', 'info');
        }}
        onConfirmRejectItem={async (jobId, itemId, reason) => {
          await updateCarWashItemStatus(
            jobId,
            itemId,
            'REJECTED',
            reason || 'ล้างไม่สะอาด ขอให้แก้ไข'
          );
          showToast('ตีกลับรถคันนี้เรียบร้อยแล้ว', 'info');
        }}
      />

      {/* Confirmation Modal for Proxy Approval */}
      <ProxyApprovalModal
        job={confirmProxyJob}
        onClose={() => setConfirmProxyJob(null)}
        onConfirm={async (job) => {
          setConfirmProxyJob(null);
          await handleApprove(job, true);
        }}
      />
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-gray-500">กำลังโหลดข้อมูลการตรวจรับงาน...</div>}>
      <ApprovalsContent />
    </Suspense>
  );
}
