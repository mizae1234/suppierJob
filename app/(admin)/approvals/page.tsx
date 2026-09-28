'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
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
  MapPin
} from 'lucide-react';

function ApprovalsContent() {
  const searchParams = useSearchParams();
  const highlightedJobId = searchParams.get('jobId');

  const { 
    jobs, 
    updateJobStatus, 
    currentRole 
  } = useApp();

  const waitingJobs = jobs.filter(j => j.status === 'WAITING_APPROVAL');
  const recentApprovedJobs = jobs.filter(j => j.status === 'APPROVED');
  const rejectedJobs = jobs.filter(j => j.status === 'REJECTED');

  const [activeTab, setActiveTab] = useState<'WAITING' | 'APPROVED' | 'REJECTED'>('WAITING');
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; caption: string; type: string } | null>(null);

  // Reject modal state
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (jobId: string) => {
    await updateJobStatus(jobId, 'APPROVED', { approvedBy: 'สาขาผู้ตรวจรับ' });
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingJobId) return;

    await updateJobStatus(rejectingJobId, 'REJECTED', {
      rejectReason: rejectReason || 'งานไม่ผ่านเกณฑ์ ขอให้ช่างแก้ไขงานซ้ำ'
    });

    setRejectingJobId(null);
    setRejectReason('');
  };

  const currentList = activeTab === 'WAITING' 
    ? waitingJobs 
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
            ตรวจสอบรูปถ่ายหลักฐานการปฏิบัติงานของ Supplier และกด Approve / Reject
          </p>
        </div>

        {/* Tab Badges */}
        <div className="grid grid-cols-3 sm:flex sm:items-center p-1 rounded-2xl sm:rounded-full bg-white border border-gray-200/80 shadow-xs gap-1 sm:gap-1.5 w-full sm:w-auto">
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
              : 'ยังไม่มีประวัติรายการในหมวดนี้'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6">
          {currentList.map(job => {
            const isHighlighted = job.id === highlightedJobId;
            return (
              <div
                key={job.id}
                className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border transition-all shadow-xs flex flex-col gap-4 sm:gap-5 ${
                  isHighlighted
                    ? 'border-amber-400 ring-2 ring-amber-400/30'
                    : 'border-gray-200/80'
                }`}
              >
                {/* Card Top Info */}
                <div className="flex flex-col gap-3 border-b border-gray-100 pb-4">
                  {/* Row 1: Company + Job Number + Job Type Badge + Status if applicable */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-white font-bold text-xs font-mono shadow-xs ${
                        job.companyCode === 'GI' ? 'bg-blue-600' : 'bg-emerald-700'
                      }`}>
                        {job.companyCode}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight font-mono">
                        {job.jobNumber}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                        {job.jobType === 'CAR_WASH' ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Car Wash ({job.carWashItems?.length || 0} คัน)</span>
                          </>
                        ) : (
                          <>
                            <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Vehicle Slide (1 คัน)</span>
                          </>
                        )}
                      </span>
                    </div>

                    {job.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>อนุมัติแล้ว</span>
                      </span>
                    )}

                    {job.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>ส่งกลับแก้ไข</span>
                      </span>
                    )}
                  </div>

                  {/* Row 2: Branch & Supplier Details in a clean modern mini-card */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs bg-gray-50/80 rounded-xl p-2.5 sm:p-3 border border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-400 shrink-0">สาขา:</span>
                      <span className="font-semibold text-gray-800 truncate">{job.branchName}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-400 shrink-0">ผู้รับจ้าง:</span>
                      <span className="font-semibold text-gray-800 truncate">{job.supplierName}</span>
                    </div>
                  </div>

                  {/* Row 3: Price & Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center justify-between sm:justify-start gap-3 bg-emerald-50/40 sm:bg-transparent px-3 py-2 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-emerald-100/60">
                      <span className="text-xs text-gray-500 font-medium sm:hidden">ยอดค่าบริการสุทธิ:</span>
                      <div className="flex sm:flex-col items-baseline sm:items-start gap-1 sm:gap-0">
                        <span className="hidden sm:inline text-[11px] text-gray-400 font-medium">ค่าบริการสุทธิ</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl sm:text-2xl font-black text-[#0f5238] font-mono">
                            ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                          </span>
                          <span className="text-[11px] text-gray-500 font-normal">บาท</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions if WAITING */}
                    {job.status === 'WAITING_APPROVAL' && (
                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleApprove(job.id)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4 shrink-0" />
                          <span>อนุมัติ (Approve)</span>
                        </button>
                        <button
                          onClick={() => setRejectingJobId(job.id)}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-[0.98] text-red-700 text-xs font-bold border border-red-200 transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4 shrink-0" />
                          <span>ขอแก้ไข (Reject)</span>
                        </button>
                      </div>
                    )}

                    {job.status === 'APPROVED' && job.approvedAt && (
                      <p className="text-[11px] text-gray-500 sm:text-right">
                        อนุมัติสำเร็จเมื่อ: {formatThaiDate(job.approvedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Job Summary & Vehicles Details */}
                {job.jobType === 'CAR_WASH' && job.carWashItems && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                    {job.carWashItems.map((item, i) => (
                      <div key={item.id} className="p-3 sm:p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:border-emerald-200 transition-colors flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                          <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">{item.vin}</span>
                          <span className="font-bold text-[#0f5238] text-xs sm:text-sm font-mono">฿{item.unitPrice}</span>
                        </div>
                        <p className="text-gray-800 font-semibold">{item.vehicleModel} <span className="text-gray-500 font-normal">({item.vehicleColor})</span></p>
                        <div className="flex items-center gap-2 text-gray-500 text-[11px] flex-wrap">
                          <span>วันที่ล้าง: {formatThaiDate(item.actualWashDate)}</span>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-medium">{item.washType}</span>
                        </div>
                        {item.remarks && (
                          <p className="text-gray-600 text-[11px] italic bg-gray-50 p-1.5 rounded-lg border border-gray-100 mt-0.5">
                            &quot;{item.remarks}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {job.jobType === 'VEHICLE_SLIDE' && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                )}

                {/* Reject note if rejected */}
                {job.rejectReason && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
                    <p className="font-bold">เหตุผลที่ส่งกลับแก้ไข:</p>
                    <p className="mt-0.5">{job.rejectReason}</p>
                  </div>
                )}

                {/* Photo Evidence Gallery */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>หลักฐานภาพถ่ายจาก Supplier ({job.evidences.length} รูป)</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-gray-400">คลิกที่รูปเพื่อขยายดูรายละเอียด</span>
                  </div>

                  {job.evidences.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400 bg-gray-50/50">
                      ยังไม่มีการแนบรูปภาพหลักฐาน
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
                      {job.evidences.map(evi => (
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
                  )}
                </div>
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

      {/* Reject Confirmation Modal */}
      {rejectingJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>ระบุข้อเสนอแนะในการแก้ไข (Reject)</span>
              </h3>
              <button
                onClick={() => setRejectingJobId(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectConfirm} className="flex flex-col gap-3">
              <label className="block text-xs font-semibold text-gray-700">
                รายละเอียดจุดที่ต้องล้างซ้ำ หรือแก้ไข:
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="เช่น ขอบกระจังหน้ายังมีคราบฝังแน่น และมีคราบน้ำมันบริเวณบันไดข้าง..."
                className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-600 outline-none"
              />
              <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingJobId(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer text-center"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer text-center"
                >
                  ยืนยันการ Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
