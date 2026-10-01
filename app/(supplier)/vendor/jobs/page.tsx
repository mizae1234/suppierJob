'use client';

import React, { useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { Job, JobStatus } from '@/types';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Truck,
  Camera,
  XCircle,
  ArrowRight,
  AlertTriangle,
  X,
} from 'lucide-react';

type TabKey = 'progress' | 'waiting' | 'approved' | 'rejected';

function SupplierJobsPageContent() {
  const { jobs, updateJobStatus, addJobEvidence, activeSupplier, currentSupplierId, currentBranchId, activeBranch } = useApp();
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const searchParams = useSearchParams();

  const isMaster = user?.role === 'MASTER';
  const isAll = (!activeSupplier || currentSupplierId === 'ALL') && isMaster;
  const supplierId = activeSupplier?.id || user?.supplierId;

  const rawTab = searchParams.get('tab');
  const initialTab: TabKey = rawTab === 'new' ? 'progress' : (rawTab as TabKey) || 'progress';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Rejection modal state
  const [rejectingJob, setRejectingJob] = useState<Job | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  const presetReasons = [
    'คิวงานเต็ม / ช่างไม่พอ',
    'เกินเวลาทำการ',
    'อุปกรณ์ซ่อมบำรุง',
    'ไม่สามารถให้บริการประเภทนี้ได้',
    'รถไม่อยู่ในจุดนัดหมาย',
  ];

  const myJobs = useMemo(() => {
    let list = isAll ? jobs : jobs.filter(j => j.supplierId === supplierId);
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list;
  }, [jobs, supplierId, isAll, currentBranchId]);

  const tabConfig: { key: TabKey; label: string; status: JobStatus[]; icon: React.ElementType; color: string }[] = [
    { key: 'progress', label: 'งานที่ต้องทำ', status: ['IN_PROGRESS', 'PENDING_SUPPLIER'], icon: Clock, color: '#f59e0b' },
    { key: 'waiting', label: 'รอตรวจรับ', status: ['WAITING_APPROVAL'], icon: AlertCircle, color: '#ef4444' },
    { key: 'approved', label: 'ผ่านแล้ว', status: ['APPROVED', 'INVOICED'], icon: CheckCircle2, color: theme.primary },
    { key: 'rejected', label: 'ปฏิเสธ/ตีกลับ', status: ['CANCELLED', 'REJECTED'], icon: XCircle, color: '#dc2626' },
  ];

  const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();

  const filteredJobs = useMemo(() => {
    const config = tabConfig.find(t => t.key === activeTab);
    if (!config) return [];
    let list = myJobs.filter(j => config.status.includes(j.status));
    if (searchQuery) {
      const terms = searchQuery.split(/[,\s]+/).filter(t => t.length > 0);
      if (terms.length > 0) {
        list = list.filter(j =>
          terms.some(q =>
            j.jobNumber.toLowerCase().includes(q) ||
            (j.vehicle?.licensePlate && j.vehicle.licensePlate.toLowerCase().includes(q)) ||
            (j.carWashItems && j.carWashItems.some(it => (it.licensePlate && it.licensePlate.toLowerCase().includes(q)) || (it.vin && it.vin.toLowerCase().includes(q)))) ||
            (j.vin && j.vin.toLowerCase().includes(q)) ||
            (j.branchName && j.branchName.toLowerCase().includes(q))
          )
        );
      }
    }
    return list;
  }, [myJobs, activeTab, searchQuery]);

  const handleConfirmReject = async () => {
    if (!rejectingJob) return;
    setIsSubmittingReject(true);
    try {
      const reason = rejectReason.trim() || 'Supplier ปฏิเสธงาน';
      await updateJobStatus(rejectingJob.id, 'CANCELLED', { rejectReason: reason });
      showToast(`ปฏิเสธงาน ${rejectingJob.jobNumber} เรียบร้อยแล้ว`, 'info');
      setRejectingJob(null);
      setRejectReason('');
    } catch (e) {
      console.error(e);
      showToast('ไม่สามารถปฏิเสธงานได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">รายการงานของฉัน</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            งานทั้งหมด {myJobs.length} รายการ {activeBranch ? `(${activeBranch.name})` : '(ทุกสาขา)'}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
          {filteredJobs.length} งานในหมวดนี้
        </span>
      </div>

      {/* Tab Bar (Native Mobile Segmented Control) */}
      <div className="flex items-center gap-1.5 p-1.5 bg-gray-200/60 backdrop-blur-sm rounded-2xl overflow-x-auto scrollbar-none shadow-inner">
        {tabConfig.map(tab => {
          const Icon = tab.icon;
          const count = myJobs.filter(j => tab.status.includes(j.status)).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-white shadow-xs text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: isActive ? tab.color : undefined }} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold text-white"
                  style={{ backgroundColor: tab.color }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Job Cards */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white/60 rounded-3xl border border-gray-100 shadow-2xs text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold text-gray-600">ไม่มีงานในหมวดนี้</p>
          <p className="text-xs text-gray-400 mt-1">งานจะปรากฏเมื่อมีการมอบหมายหรือเปลี่ยนสถานะ</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredJobs.map(job => {
            const cost = getJobTotalCost(job);
            const isWash = job.jobType === 'CAR_WASH';
            const isActiveJob = job.status === 'IN_PROGRESS' || job.status === 'PENDING_SUPPLIER';

            return (
              <div
                key={job.id}
                className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs transition-all"
              >
                {/* Job Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isWash ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                    }`}>
                      {isWash
                        ? <Sparkles className="w-4.5 h-4.5" />
                        : <Truck className="w-4.5 h-4.5" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900 font-mono">{job.jobNumber}</p>
                        {isActiveJob && (
                          <span className="px-1.5 py-0.2 rounded-sm bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/50">
                            เข้าอัตโนมัติ
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {isWash ? 'ล้างรถ' : 'รถสไลด์'} •{' '}
                        <span className="font-semibold text-gray-700">{job.companyCode}</span> • {job.branchName}
                        {isAll && (
                          <span className="ml-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded-full font-medium">
                            🏢 {job.supplierName}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono" style={{ color: theme.primary }}>
                    {formatCurrency(cost)}
                  </span>
                </div>

                {/* Job Details */}
                {isWash && job.carWashItems && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {job.carWashItems.map((item, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[11px] text-gray-700 font-mono">
                        🚗 {item.vin.slice(-6)}
                      </span>
                    ))}
                  </div>
                )}

                {!isWash && job.vin && (
                  <div className="mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[11px] text-gray-700 font-mono">
                      🚗 {job.vin}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  {/* Active Jobs: Both PENDING_SUPPLIER & IN_PROGRESS have REJECT button & SUBMIT button */}
                  {isActiveJob && (
                    <>
                      {/* เปลี่ยนจากปุ่มรับงาน เป็นปุ่มปฏิเสธงาน */}
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingJob(job);
                          setRejectReason('');
                        }}
                        className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span>ปฏิเสธงาน</span>
                      </button>

                      {/* Primary action: Submit Evidence */}
                      <Link
                        href={`/vendor/submit/${job.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all cursor-pointer hover:opacity-90 active:scale-[0.99] shadow-sm"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Camera className="w-4 h-4" />
                        <span>ส่งงาน + แนบรูป</span>
                      </Link>
                    </>
                  )}

                  {/* CANCELLED: Job was declined by supplier */}
                  {job.status === 'CANCELLED' && (
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2.5 rounded-xl bg-red-50/80 border border-red-100 text-xs">
                      <div className="flex items-center gap-1.5 text-red-700 font-bold">
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>ปฏิเสธงานนี้แล้ว</span>
                      </div>
                      {job.rejectReason && (
                        <span className="text-[11px] text-red-600 truncate max-w-xs">
                          เหตุผล: {job.rejectReason}
                        </span>
                      )}
                    </div>
                  )}

                  {/* REJECTED: Branch asked for rework */}
                  {job.status === 'REJECTED' && (
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-red-700 font-medium truncate">
                        ⚠️ สาขาขอให้แก้ไข: {job.rejectReason || 'โปรดตรวจสอบ'}
                      </span>
                      <Link
                        href={`/vendor/submit/${job.id}`}
                        className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                      >
                        แก้ไข + ส่งใหม่
                      </Link>
                    </div>
                  )}

                  {/* WAITING_APPROVAL */}
                  {job.status === 'WAITING_APPROVAL' && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs sm:text-sm font-bold">
                      <Clock className="w-4 h-4" />
                      <span>ส่งงานแล้ว • รอสาขาตรวจรับ...</span>
                    </div>
                  )}

                  {/* APPROVED / INVOICED */}
                  {['APPROVED', 'INVOICED'].includes(job.status) && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold"
                      style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ผ่านการตรวจรับเรียบร้อย ✅</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Job Confirmation Modal */}
      {rejectingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-9 h-9 rounded-2xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">ปฏิเสธงานนี้</h3>
                  <p className="text-[11px] text-gray-500 font-mono">{rejectingJob.jobNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingJob(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              เมื่อกดยืนยัน ระบบจะยกเลิกคำสั่งงานและคืนสถานะรถให้สาขาเพื่อจัดสรรใหม่
            </p>

            {/* Quick Reason Chips */}
            <div>
              <p className="text-[11px] font-bold text-gray-700 mb-1.5">เลือกเหตุผลด่วน:</p>
              <div className="flex flex-wrap gap-1.5">
                {presetReasons.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRejectReason(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      rejectReason === r
                        ? 'bg-red-600 text-white font-bold shadow-2xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                หรือระบุเหตุผลเพิ่มเติม:
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผลในการปฏิเสธงาน..."
                rows={3}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectingJob(null)}
                disabled={isSubmittingReject}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{isSubmittingReject ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธงาน'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupplierJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">กำลังโหลด...</div>}>
      <SupplierJobsPageContent />
    </Suspense>
  );
}
