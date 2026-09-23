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
  Calendar
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
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <span>ตรวจรับงานซัพพลายเออร์ (Waiting for Approval)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            ตรวจสอบรูปถ่ายหลักฐานก่อน-หลังการปฏิบัติงานของ Supplier และกด Approve / Reject
          </p>
        </div>

        {/* Tab Badges */}
        <div className="flex items-center p-1 rounded-full bg-white border border-emerald-950/10 shadow-xs">
          <button
            onClick={() => setActiveTab('WAITING')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'WAITING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>รอตรวจรับ</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'WAITING' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {waitingJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'APPROVED'
                ? 'bg-[#0f5238] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Approve แล้ว</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'APPROVED' ? 'bg-white/30 text-white' : 'bg-emerald-100 text-[#0f5238]'
            }`}>
              {recentApprovedJobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'REJECTED'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>ขอแก้ไข (Reject)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'REJECTED' ? 'bg-white/30 text-white' : 'bg-red-100 text-red-800'
            }`}>
              {rejectedJobs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Review Cards */}
      {currentList.length === 0 ? (
        <div className="p-16 rounded-3xl bg-white border border-emerald-950/10 shadow-xs text-center flex flex-col items-center justify-center gap-3">
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
        <div className="flex flex-col gap-6">
          {currentList.map(job => {
            const isHighlighted = job.id === highlightedJobId;
            return (
              <div
                key={job.id}
                className={`p-6 rounded-3xl bg-white border transition-all shadow-xs flex flex-col gap-5 ${
                  isHighlighted
                    ? 'border-amber-400 ring-2 ring-amber-400/30'
                    : 'border-emerald-950/10'
                }`}
              >
                {/* Card Top Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-xs">
                      {job.companyCode}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">{job.jobNumber}</h3>
                        <span className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                          {job.jobType === 'CAR_WASH' ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Car Wash ({job.carWashItems?.length || 0} คัน)</span>
                            </>
                          ) : (
                            <>
                              <Truck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Vehicle Slide (1 คัน)</span>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        สาขา: <span className="font-semibold text-gray-800">{job.branchName}</span> • ผู้รับจ้าง:{' '}
                        <span className="font-semibold text-gray-800">{job.supplierName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[11px] text-gray-400">ค่าบริการสุทธิ</span>
                      <p className="text-lg font-bold text-[#0f5238]">
                        ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                      </p>
                    </div>

                    {/* Actions if WAITING */}
                    {job.status === 'WAITING_APPROVAL' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(job.id)}
                          className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          <span>อนุมัติ (Approve)</span>
                        </button>
                        <button
                          onClick={() => setRejectingJobId(job.id)}
                          className="flex items-center gap-1 px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          <span>ขอแก้ไข (Reject)</span>
                        </button>
                      </div>
                    )}

                    {job.status === 'APPROVED' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-xs">
                        อนุมัติแล้ว เมื่อ {formatThaiDate(job.approvedAt)}
                      </span>
                    )}

                    {job.status === 'REJECTED' && (
                      <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                        ส่งกลับแก้ไข
                      </span>
                    )}
                  </div>
                </div>

                {/* Job Summary & Vehicles Details */}
                {job.jobType === 'CAR_WASH' && job.carWashItems && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {job.carWashItems.map((item, i) => (
                      <div key={item.id} className="p-3.5 rounded-2xl bg-[#fbfdfc] border border-gray-100 flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-gray-900">{item.vin}</span>
                          <span className="font-bold text-[#0f5238]">฿{item.unitPrice}</span>
                        </div>
                        <p className="text-gray-700 font-medium">{item.vehicleModel} ({item.vehicleColor})</p>
                        <p className="text-gray-500 text-[11px]">
                          วันที่ล้างจริง: {formatThaiDate(item.actualWashDate)} • {item.washType}
                        </p>
                        {item.remarks && (
                          <p className="text-gray-500 text-[11px] italic bg-white p-1 rounded border border-gray-100 mt-1">
                            &quot;{item.remarks}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {job.jobType === 'VEHICLE_SLIDE' && (
                  <div className="p-4 rounded-2xl bg-[#fbfdfc] border border-gray-100 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="font-mono font-bold text-sm text-gray-900">{job.vin}</p>
                      <p className="text-gray-600 mt-0.5">{job.vehicle?.model} • สี: {job.vehicle?.color}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[11px]">เส้นทาง:</span>
                      <p className="font-semibold text-gray-800">{job.originBranchName} &rarr; {job.destBranchName}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[11px]">เวลาส่งมอบ:</span>
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-700" />
                      <span>หลักฐานภาพถ่ายจาก Supplier ({job.evidences.length} รูป)</span>
                    </span>
                    <span className="text-[11px] text-gray-400">คลิกที่รูปเพื่อขยายดูรายละเอียด</span>
                  </div>

                  {job.evidences.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                      ยังไม่มีการแนบรูปภาพหลักฐาน
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {job.evidences.map(evi => (
                        <div
                          key={evi.id}
                          onClick={() => setSelectedPhoto({ url: evi.photoUrl, caption: evi.caption, type: evi.evidenceType })}
                          className="group relative rounded-2xl overflow-hidden border border-gray-200 aspect-4/3 cursor-pointer bg-gray-100 hover:shadow-md transition-all"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={evi.photoUrl}
                            alt={evi.caption}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold uppercase">
                            {evi.evidenceType}
                          </span>
                          <p className="absolute bottom-2 left-2 right-2 text-white text-[11px] font-medium truncate">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[70vh] bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto.url} alt={selectedPhoto.caption} className="max-h-[70vh] w-auto object-contain" />
            </div>
            <div className="p-4 bg-white">
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>ระบุข้อเสนอแนะในการแก้ไข (Reject)</span>
              </h3>
              <button
                onClick={() => setRejectingJobId(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
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
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-600 outline-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingJobId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
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
