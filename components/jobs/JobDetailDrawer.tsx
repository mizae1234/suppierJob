'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { Job } from '@/types';
import { getSlideDirection, getJobTotalCost } from '@/lib/job-utils';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import { STATUS_MAP, SAMPLE_PHOTOS } from './constants';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Car,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ImageIcon,
  MapPin,
  Phone,
  Printer,
  Sparkles,
  Truck,
  Upload,
  User,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';

export interface JobDetailDrawerProps {
  job: Job | null;
  onClose: () => void;
  onPrevJob?: () => void;
  onNextJob?: () => void;
  hasPrevJob?: boolean;
  hasNextJob?: boolean;
  currentJobIndex?: number;
  totalJobs?: number;
  onApprove: (jobId: string, customApprovedBy?: string) => Promise<void>;
  onReject: (job: Job) => void;
  onAcceptJob: (jobId: string) => Promise<void>;
  onCompleteJob: (job: Job) => void;
  onPreviewPhoto: (url: string) => void;
}

export function JobDetailDrawer({
  job,
  onClose,
  onPrevJob,
  onNextJob,
  hasPrevJob = false,
  hasNextJob = false,
  currentJobIndex = -1,
  totalJobs = 0,
  onApprove,
  onReject,
  onAcceptJob,
  onCompleteJob,
  onPreviewPhoto,
}: JobDetailDrawerProps) {
  const { currentRole, activeBranch, currentBranchId, currentCompany, vehicles } = useApp();
  const theme = useTheme();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopyText = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1800);
    }
  };

  useEffect(() => {
    if (!job) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevJob && onPrevJob) {
        onPrevJob();
      } else if (e.key === 'ArrowRight' && hasNextJob && onNextJob) {
        onNextJob();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [job, hasPrevJob, hasNextJob, onPrevJob, onNextJob, onClose]);

  if (!job) return null;
  const activeJob = job;

  return (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Dimmed Backdrop */}
          <div 
            onClick={() => onClose()}
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

                  {/* Direction Badge for Vehicle Slide */}
                  {activeJob.jobType === 'VEHICLE_SLIDE' && (() => {
                    const myBranchId = activeBranch?.id || currentBranchId;
                    const dir = getSlideDirection(activeJob, myBranchId, currentCompany);

                    if (dir === 'INBOUND') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          📥 รับเข้า (สาขาปลายทาง)
                        </span>
                      );
                    }
                    if (dir === 'OUTBOUND') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-bold text-xs">
                          📤 ส่งออก (สาขาต้นทาง)
                        </span>
                      );
                    }
                    if (dir === 'INTERNAL' || activeJob.destBranchId) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs">
                          🚚 ย้ายสาขา: {activeJob.originBranchName || activeJob.branchName} → {activeJob.destBranchName}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Right controls: Prev/Next & Close */}
                <div className="flex items-center gap-2">
                  {currentJobIndex >= 0 && (totalJobs || 0) > 1 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-100 text-[11px] text-gray-600">
                      <span className="font-medium font-mono">{currentJobIndex + 1} / {(totalJobs || 0)}</span>
                      <div className="flex items-center ml-1 border-l border-gray-300 pl-1">
                        <button
                          type="button"
                          onClick={onPrevJob}
                          disabled={!hasPrevJob}
                          title="งานก่อนหน้า (ลูกศรซ้าย)"
                          className="p-1 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={onNextJob}
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
                    onClick={() => onClose()}
                    title="ปิด (Esc)"
                    className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">

                {/* ─── Compact Job Overview ─── */}
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Key Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border" style={{ color: theme.textPrimary, backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}>
                        {activeJob.jobType === 'CAR_WASH' ? (
                          <><Sparkles className="w-3 h-3" /> Car Wash</>
                        ) : (
                          <><Truck className="w-3 h-3" /> Vehicle Slide</>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {activeJob.jobType === 'CAR_WASH'
                          ? `${activeJob.carWashItems?.length || 0} คัน`
                          : '1 คัน'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate"><strong className="text-gray-800">{activeJob.branchName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate"><strong className="text-gray-800">{activeJob.supplierName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{formatThaiDate(activeJob.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Cost */}
                  {(() => {
                    const isJobCancelled = activeJob.status === 'CANCELLED';
                    const effectiveCost = getJobTotalCost(activeJob);
                    const hasCancelledWash = activeJob.jobType === 'CAR_WASH' && 
                      activeJob.carWashItems?.some(i => i.status === 'CANCELLED');
                    const originalCost = activeJob.estimatedCost || 0;

                    return (
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-gray-400 block">
                          {isJobCancelled ? 'ค่าบริการ' : hasCancelledWash ? 'ค่าบริการสุทธิ' : 'ค่าบริการ'}
                        </span>
                        <div className="flex items-baseline justify-end gap-1.5">
                          {isJobCancelled && originalCost > 0 && (
                            <span className="text-xs text-gray-400 line-through font-mono">
                              ฿{originalCost.toLocaleString()}
                            </span>
                          )}
                          {hasCancelledWash && originalCost > effectiveCost && (
                            <span className="text-xs text-gray-400 line-through font-mono">
                              ฿{originalCost.toLocaleString()}
                            </span>
                          )}
                          <p className="text-xl font-black tracking-tight" style={{ color: isJobCancelled ? '#dc2626' : hasCancelledWash ? '#059669' : theme.textPrimary }}>
                            ฿{effectiveCost.toLocaleString()}
                          </p>
                        </div>
                        {isJobCancelled && (
                          <span className="text-[9px] text-red-500 font-semibold block">
                            (ปฏิเสธงาน / ไม่คิดค่าบริการ)
                          </span>
                        )}
                        {hasCancelledWash && !isJobCancelled && (
                          <span className="text-[9px] text-red-500 font-semibold block">
                            (หักคันที่ปฏิเสธแล้ว)
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Reject Reason Alert */}
                {activeJob.rejectReason && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-700">
                        {activeJob.status === 'CANCELLED'
                          ? 'เหตุผลที่ Supplier ปฏิเสธงาน:'
                          : 'หมายเหตุขอแก้ไขจากสาขา (ตีกลับ):'}
                      </p>
                      <p className="text-red-600 mt-0.5">{activeJob.rejectReason}</p>
                    </div>
                  </div>
                )}

                {/* ─── Compact Workflow Stepper ─── */}
                {activeJob.status === 'CANCELLED' ? (
                  <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm shrink-0">
                        ✕
                      </div>
                      <div>
                        <p className="font-bold text-red-800">
                          {activeJob.rejectReason?.includes('Supplier') ? 'Supplier ปฏิเสธงานนี้' : 'งานนี้ถูกปฏิเสธ / ยกเลิกแล้ว'}
                        </p>
                        <p className="text-[11px] text-red-600 mt-0.5">
                          {activeJob.rejectReason ? `เหตุผล: ${activeJob.rejectReason}` : 'คำสั่งงานสิ้นสุด ไม่มีการดำเนินการต่อ'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white shrink-0">
                      ปฏิเสธงาน
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px]">
                    {(() => {
                      const steps = [
                        { label: 'เปิดงาน', key: 'CREATED' },
                        { label: 'ดำเนินการ', key: 'IN_PROGRESS' },
                        { label: activeJob.status === 'REJECTED' ? 'ขอแก้ไข' : 'ตรวจรับ', key: 'WAITING_APPROVAL' },
                        { label: 'อนุมัติ', key: 'APPROVED' },
                      ];

                      const currentIdx = (() => {
                        if (['APPROVED', 'INVOICED'].includes(activeJob.status)) return 3;
                        if (activeJob.status === 'WAITING_APPROVAL') return 2;
                        if (activeJob.status === 'REJECTED') return 2;
                        if (activeJob.status === 'IN_PROGRESS' || activeJob.status === 'PENDING_SUPPLIER') return 1;
                        return 0;
                      })();

                      return steps.map((step, idx) => {
                        const isCompleted = idx < currentIdx || (idx === currentIdx && ['APPROVED', 'INVOICED'].includes(activeJob.status));
                        const isCurrent = idx === currentIdx && !['APPROVED', 'INVOICED'].includes(activeJob.status);
                        const isRejected = isCurrent && activeJob.status === 'REJECTED';

                        return (
                          <React.Fragment key={idx}>
                            {idx > 0 && (
                              <div className={`flex-1 h-px ${isCompleted || isCurrent ? '' : 'bg-gray-200'}`}
                                style={isCompleted || isCurrent ? { backgroundColor: isRejected ? '#dc2626' : theme.primary } : {}}
                              />
                            )}
                            <div className="flex items-center gap-1">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                                  isCompleted
                                    ? 'text-white'
                                    : isCurrent
                                      ? isRejected
                                        ? 'bg-red-600 text-white ring-2 ring-red-100'
                                        : 'text-white ring-2'
                                      : 'bg-gray-200 text-gray-400'
                                }`}
                                style={{
                                  ...(isCompleted ? { backgroundColor: theme.primary } : {}),
                                  ...(isCurrent && !isRejected ? { backgroundColor: theme.primary, '--tw-ring-color': theme.badgeBg } as React.CSSProperties : {}),
                                }}
                              >
                                {isCompleted ? '✓' : isRejected ? '!' : idx + 1}
                              </div>
                              <span className={`hidden sm:inline whitespace-nowrap ${
                                isCurrent ? (isRejected ? 'font-bold text-red-600' : 'font-bold') : isCompleted ? 'text-gray-600' : 'text-gray-400'
                              }`}
                                style={isCurrent && !isRejected ? { color: theme.textPrimary } : {}}
                              >
                                {step.label}
                              </span>
                            </div>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* ─── Job Items (Car Wash & Vehicle Slide) ─── */}
                {activeJob.carWashItems && activeJob.carWashItems.length > 0 && (
                  <div>
                    {/* Header + Progress */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        {activeJob.jobType === 'CAR_WASH' ? (
                          <Sparkles className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
                        ) : (
                          <Car className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
                        )}
                        <span>{activeJob.jobType === 'CAR_WASH' ? 'รายการรถในคำสั่งล้าง' : 'รายการรถในคำสั่งรถสไลด์'}</span>
                      </h4>
                      <div className="flex items-center gap-2 text-[10px]">
                        {(() => {
                          const completed = activeJob.carWashItems.filter(i => i.status === 'COMPLETED' || i.status === 'APPROVED').length;
                          const cancelled = activeJob.carWashItems.filter(i => i.status === 'CANCELLED' || i.status === 'REJECTED').length;
                          return (
                            <>
                              {completed > 0 && <span className="text-emerald-600 font-bold">เสร็จ {completed}</span>}
                              {cancelled > 0 && <span className="text-red-500 font-bold">ปฏิเสธ {cancelled}</span>}
                              <span className="text-gray-400 font-mono">{completed + cancelled}/{activeJob.carWashItems.length}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(() => {
                      const completed = activeJob.carWashItems.filter(i => i.status === 'COMPLETED' || i.status === 'APPROVED').length;
                      const cancelled = activeJob.carWashItems.filter(i => i.status === 'CANCELLED' || i.status === 'REJECTED').length;
                      const total = activeJob.carWashItems.length;
                      if (completed === 0 && cancelled === 0) return null;
                      return (
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex mb-2">
                          {completed > 0 && (
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(completed / total) * 100}%` }} />
                          )}
                          {cancelled > 0 && (
                            <div className="h-full bg-red-400 transition-all duration-500" style={{ width: `${(cancelled / total) * 100}%` }} />
                          )}
                        </div>
                      );
                    })()}

                    {/* Item Rows */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-gray-50">
                      {activeJob.carWashItems.map((item) => {
                        const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
                          PENDING: { label: 'รอดำเนินการ', color: '#d97706', bg: '#fffbeb' },
                          COMPLETED: { label: 'ส่งแล้ว', color: '#059669', bg: '#ecfdf5' },
                          REJECTED: { label: 'ตีกลับ', color: '#dc2626', bg: '#fef2f2' },
                          CANCELLED: { label: 'ปฏิเสธ', color: '#ef4444', bg: '#fef2f2' },
                        };
                        const s = statusCfg[item.status] || statusCfg.PENDING;
                        const isCancelled = item.status === 'CANCELLED';

                        return (
                          <div key={item.id} className={`px-3 py-2.5 flex items-center gap-3 text-xs transition-colors ${isCancelled ? 'bg-red-50/25' : 'hover:bg-gray-50/50'}`}>
                            {/* VIN + Copy */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-mono font-bold text-[11px] ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.vin}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(item.vin)}
                                  className="p-0.5 rounded text-gray-300 hover:text-gray-600 transition-colors"
                                >
                                  {copiedText === item.vin ? <CheckCheck className="w-3 h-3" style={{ color: theme.iconColor }} /> : <Copy className="w-3 h-3" />}
                                </button>
                                {item.licensePlate && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${isCancelled ? 'line-through bg-gray-50 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                    {item.licensePlate}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                                {item.vehicleModel} {item.vehicleColor && `• ${item.vehicleColor}`} • {item.washType}
                              </p>
                            </div>

                            {/* Status Badge */}
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap" style={{ color: s.color, backgroundColor: s.bg }}>
                              {s.label}
                            </span>

                            {/* Price */}
                            <div className="text-right shrink-0">
                              <span className={`font-mono ${isCancelled ? 'line-through text-gray-400 text-[11px]' : 'font-bold text-[12px]'}`} style={!isCancelled ? { color: theme.textPrimary } : undefined}>
                                ฿{item.unitPrice.toLocaleString()}
                              </span>
                              {isCancelled && (
                                <span className="block text-[9px] text-red-500 font-medium">ไม่คิดเงิน</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total row */}
                    {(() => {
                      const validItems = activeJob.carWashItems.filter(i => i.status !== 'CANCELLED');
                      const totalActive = validItems.reduce((a, c) => a + c.unitPrice, 0);
                      const totalOriginal = activeJob.carWashItems.reduce((a, c) => a + c.unitPrice, 0);
                      const hasCancelled = activeJob.carWashItems.some(i => i.status === 'CANCELLED');

                      return (
                        <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-xl bg-gray-50/80 border border-gray-100 text-[11px]">
                          <span className="text-gray-600 font-medium">
                            {hasCancelled ? (
                              <>
                                ยอดรวมสุทธิ <span className="text-gray-400 font-normal">({validItems.length} จาก {activeJob.carWashItems.length} คัน)</span>
                              </>
                            ) : (
                              `ยอดรวม (${activeJob.carWashItems.length} คัน)`
                            )}
                          </span>
                          <div className="flex items-baseline gap-2">
                            {hasCancelled && (
                              <span className="text-gray-400 line-through text-[10px] font-mono">
                                ฿{totalOriginal.toLocaleString()}
                              </span>
                            )}
                            <strong className="text-sm font-bold font-mono" style={{ color: theme.textPrimary }}>
                              ฿{totalActive.toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Specific Job Details: Vehicle Slide */}
                {activeJob.jobType === 'VEHICLE_SLIDE' && (() => {
                  const slideVehicle = vehicles.find(v => v.vin === activeJob.vin) || activeJob.vehicle;
                  const vModel = slideVehicle?.model || activeJob.vehicle?.model || 'ไม่ระบุรุ่น';
                  const vColor = slideVehicle?.color || activeJob.vehicle?.color || '';
                  const vPlate = slideVehicle?.licensePlate || activeJob.vehicle?.licensePlate || '';
                  const vType = slideVehicle?.vehicleType || activeJob.vehicle?.vehicleType || '';
                  const isCancelled = activeJob.status === 'CANCELLED';
                  const isRejected = activeJob.status === 'REJECTED';
                  const isApproved = ['APPROVED', 'INVOICED'].includes(activeJob.status);
                  const isWaiting = activeJob.status === 'WAITING_APPROVAL';
                  const isInProgress = activeJob.status === 'IN_PROGRESS';
                  const isPending = activeJob.status === 'PENDING_SUPPLIER';

                  return (
                    <div className="space-y-4">
                      {/* Vehicle Main Card with Status (Only for single vehicle slide without items) */}
                      {(!activeJob.carWashItems || activeJob.carWashItems.length === 0) && (
                      <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-gray-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <Car className="w-4 h-4" style={{ color: theme.iconColor }} />
                            <span>ข้อมูลรถยนต์และสถานะงาน (1 คัน)</span>
                          </h4>

                          {/* Dynamic Status Badge */}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ตรวจรับเรียบร้อย</span>
                            </span>
                          )}
                          {isWaiting && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>ส่งงานแล้ว • รอตรวจรับ</span>
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span>ปฏิเสธงาน (ยกเลิก)</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              <span>ตีกลับขอแก้ไข</span>
                            </span>
                          )}
                          {isInProgress && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                              <Truck className="w-3 h-3 text-blue-600" />
                              <span>กำลังขนส่ง</span>
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200 shrink-0">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span>รอ Supplier รับงาน</span>
                            </span>
                          )}
                        </div>

                        {/* Vehicle Info Box */}
                        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isCancelled ? 'bg-red-50/30 border-red-100' : 'bg-gray-50/80 border-gray-100'
                        }`}>
                          <div className="flex items-start sm:items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isCancelled ? 'bg-red-100 text-red-500' : 'bg-white shadow-2xs'
                            }`} style={!isCancelled ? { color: theme.iconColor } : undefined}>
                              <Car className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-mono font-bold text-sm ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                  {activeJob.vin || '-'}
                                </span>
                                {activeJob.vin && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(activeJob.vin!)}
                                    className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                                    title="คัดลอก VIN"
                                  >
                                    {copiedText === activeJob.vin ? <CheckCheck className="w-3.5 h-3.5" style={{ color: theme.iconColor }} /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                {vPlate ? (
                                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                    isCancelled ? 'bg-gray-100 text-gray-400 line-through' : 'bg-white text-gray-800 border border-gray-200 shadow-2xs'
                                  }`}>
                                    {vPlate}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] text-gray-400 bg-gray-100">
                                    ไม่มีป้ายทะเบียน
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-gray-800">{vModel}</span>
                                {vColor && <span>• {vColor}</span>}
                                {vType && <span className="px-1.5 py-0.5 rounded bg-gray-200/70 text-[10px] text-gray-600 font-medium">{vType}</span>}
                                {slideVehicle?.status && (
                                  <span className="text-[10px] text-gray-400">
                                    (สถานะรถ: {slideVehicle.status === 'AVAILABLE' ? 'พร้อมใช้งาน' : slideVehicle.status === 'IN_TRANSIT' ? 'กำลังขนส่ง' : slideVehicle.status})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Cost on card */}
                          <div className="text-right sm:shrink-0 self-end sm:self-center">
                            <span className="text-[10px] text-gray-500 block">ค่าบริการ</span>
                            <div className="flex items-baseline gap-1.5">
                              {isCancelled ? (
                                <>
                                  <span className="text-gray-400 line-through text-xs font-mono">
                                    ฿{(activeJob.estimatedCost || 0).toLocaleString()}
                                  </span>
                                  <span className="text-sm font-bold text-red-600 font-mono">฿0</span>
                                </>
                              ) : (
                                <span className="text-sm font-bold font-mono" style={{ color: theme.textPrimary }}>
                                  ฿{(activeJob.actualCost ?? activeJob.estimatedCost ?? 0).toLocaleString()}
                                </span>
                              )}
                            </div>
                            {isCancelled && (
                              <span className="text-[10px] text-red-500 font-medium block">ปฏิเสธงาน</span>
                            )}
                          </div>
                        </div>

                        {/* Detailed Status Result / Rejection / Completion Box */}
                        {isCancelled && (
                          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-red-800">
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                              <span>ข้อมูลการปฏิเสธงาน:</span>
                            </div>
                            <div className="pl-5 text-red-700 space-y-1">
                              <p><span className="font-semibold">เหตุผล:</span> {activeJob.rejectReason || 'ไม่มีการระบุเหตุผล'}</p>
                              <p className="text-[11px] text-red-500">
                                • สถานะถูกปรับเป็น "ยกเลิก/ปฏิเสธงาน" และไม่มีการคิดค่าบริการรถสไลด์
                              </p>
                            </div>
                          </div>
                        )}

                        {isRejected && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>ข้อมูลขอแก้ไขจากสาขา (ตีกลับ):</span>
                            </div>
                            <div className="pl-5 text-amber-700 space-y-1">
                              <p><span className="font-semibold">ข้อความจากสาขา:</span> {activeJob.rejectReason || 'โปรดตรวจสอบและแก้ไขงาน'}</p>
                              <p className="text-[11px] text-amber-600">
                                • Supplier สามารถแก้ไขและกดส่งงานใหม่ได้
                              </p>
                            </div>
                          </div>
                        )}

                        {isApproved && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>ผ่านการตรวจรับมอบรถแล้ว</span>
                              </div>
                              {activeJob.approvedAt && (
                                <span className="text-[10px] text-emerald-600">
                                  อนุมัติเมื่อ: {formatThaiDateTime(activeJob.approvedAt)}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-700 text-[11px] mt-1">
                              <div>
                                <span className="text-emerald-800 font-semibold">ผู้ตรวจรับอนุมัติ: </span>
                                <span>{activeJob.approvedBy || activeJob.branchName || '-'}</span>
                              </div>
                              {activeJob.completedAt && (
                                <div>
                                  <span className="text-emerald-800 font-semibold">เวลาส่งงานเสร็จ: </span>
                                  <span>{formatThaiDateTime(activeJob.completedAt)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {isWaiting && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Supplier ดำเนินการส่งมอบรถแล้ว (รอการตรวจรับ)</span>
                              </div>
                              {activeJob.completedAt && (
                                <span className="text-[10px] text-amber-600">
                                  ส่งงานเมื่อ: {formatThaiDateTime(activeJob.completedAt)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-amber-700">
                              หลักฐานการขนส่งพร้อมให้สาขาตรวจสอบ ({activeJob.evidences.length} รูป)
                            </p>
                          </div>
                        )}
                      </div>
                      )}

                      {/* Route & Transport Logistics Details */}
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
                          
                          <div className="flex flex-col items-center gap-0.5 px-2">
                            {activeJob.distance ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 shadow-2xs">
                                {activeJob.distance} กม.
                              </span>
                            ) : null}
                            <div className="flex items-center gap-1" style={{ color: theme.iconColor }}>
                              <span className="border-b border-dashed w-8" style={{ borderColor: `${theme.primary}88` }} />
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-right">
                            <div>
                              <span className="text-[10px] text-gray-500">ปลายทาง (Destination):</span>
                              <p className="font-bold text-gray-900">{activeJob.destBranchName || activeJob.customDestAddress || '-'}</p>
                            </div>
                            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                            <span className="text-gray-500">ผู้สั่งงาน (Requester):</span>
                            <p className="font-bold text-gray-900 mt-0.5">{activeJob.requestedBy || '-'}</p>
                            {activeJob.requesterPhone && (
                              <a 
                                href={`tel:${activeJob.requesterPhone}`}
                                className="text-[11px] hover:underline flex items-center gap-1 mt-0.5"
                                style={{ color: theme.textMuted }}
                              >
                                <Phone className="w-3 h-3" />
                                <span>{activeJob.requesterPhone}</span>
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
                    </div>
                  );
                })()}

                {/* Photo Evidences Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-gray-600" />
                      <span>รูปถ่ายหลักฐาน ({activeJob.evidences.length} รูป)</span>
                    </h4>
                  </div>

                  {activeJob.evidences.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">ยังไม่มีรูปหลักฐาน</p>
                  ) : activeJob.carWashItems && activeJob.carWashItems.length > 0 ? (
                    /* Grouped Per Vehicle (Option 1) */
                    <div className="flex flex-col gap-4">
                      {activeJob.carWashItems.map((item) => {
                        const itemEvidences = activeJob.evidences.filter(e => e.vin === item.vin);
                        if (itemEvidences.length === 0) return null;

                        return (
                          <div key={item.id} className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                                  🚗
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">
                                    {item.vehicleModel || 'รถยนต์'} {item.licensePlate && `(${item.licensePlate})`}
                                  </p>
                                  <span className="font-mono text-[10px] text-gray-400">
                                    VIN: {item.vin}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                                {itemEvidences.length} รูป
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {itemEvidences.map(evi => (
                                <div 
                                  key={evi.id} 
                                  onClick={() => onPreviewPhoto(evi.photoUrl)}
                                  className="group relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xs cursor-pointer transition-all"
                                >
                                  <div className="relative h-40 w-full overflow-hidden bg-gray-100">
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
                                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold uppercase backdrop-blur-xs">
                                      {evi.evidenceType === 'AFTER' ? 'หลังทำเสร็จ' : evi.evidenceType === 'BEFORE' ? 'ก่อนเริ่มงาน' : evi.evidenceType}
                                    </span>
                                  </div>
                                  <div className="p-2.5">
                                    <p className="text-xs font-semibold text-gray-800 line-clamp-1">{evi.caption}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{formatThaiDateTime(evi.uploadedAt)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Any unassigned photos in drawer */}
                      {(() => {
                        const unassigned = activeJob.evidences.filter(
                          e => !activeJob.carWashItems!.some(it => it.vin === e.vin)
                        );
                        if (unassigned.length === 0) return null;

                        return (
                          <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 flex flex-col gap-2.5">
                            <span className="text-xs font-bold text-gray-700">รูปภาพอื่นๆ ({unassigned.length} รูป)</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {unassigned.map(evi => (
                                <div 
                                  key={evi.id} 
                                  onClick={() => onPreviewPhoto(evi.photoUrl)}
                                  className="group relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xs cursor-pointer transition-all"
                                >
                                  <div className="relative h-40 w-full overflow-hidden bg-gray-100">
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
                                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold uppercase backdrop-blur-xs">
                                      {evi.evidenceType}
                                    </span>
                                  </div>
                                  <div className="p-2.5">
                                    <p className="text-xs font-semibold text-gray-800 line-clamp-1">{evi.caption}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{formatThaiDateTime(evi.uploadedAt)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* Single Vehicle (e.g. Slide single car) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeJob.evidences.map(evi => (
                        <div 
                          key={evi.id} 
                          onClick={() => onPreviewPhoto(evi.photoUrl)}
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

              {/* ─── Activity Timeline (Flex-based) ─── */}
              {activeJob.activities && activeJob.activities.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    กิจกรรม
                  </h4>

                  <div className="flex flex-col">
                    {activeJob.activities.map((activity, idx) => {
                      const dotColors: Record<string, string> = {
                        ITEM_COMPLETED: '#059669',
                        ITEM_REJECTED: '#dc2626',
                        ITEM_CANCELLED: '#ef4444',
                        JOB_WAITING_APPROVAL: '#2563eb',
                        JOB_APPROVED: '#059669',
                        JOB_REJECTED: '#dc2626',
                        JOB_CANCELLED: '#6b7280',
                        EVIDENCE_UPLOADED: '#0891b2',
                      };
                      const dotColor = dotColors[activity.action] || '#9ca3af';
                      const time = new Date(activity.createdAt);
                      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                      const isLast = idx === (activeJob.activities?.length || 0) - 1;

                      return (
                        <div key={activity.id} className="flex gap-3">
                          {/* Left: dot + connecting line */}
                          <div className="flex flex-col items-center shrink-0" style={{ width: '12px' }}>
                            <div
                              className="w-[10px] h-[10px] rounded-full shrink-0 mt-[3px]"
                              style={{ backgroundColor: dotColor }}
                            />
                            {!isLast && (
                              <div className="w-[2px] flex-1 bg-gray-200 min-h-[8px]" />
                            )}
                          </div>

                          {/* Right: content */}
                          <div className={`flex-1 flex items-baseline justify-between gap-2 text-[11px] ${!isLast ? 'pb-2.5' : ''}`}>
                            <p className="text-gray-700 leading-snug">
                              {activity.description
                                .replace(/✅/g, 'เสร็จ')
                                .replace(/❌/g, 'ปฏิเสธ')
                                .replace(/🚫/g, 'ปฏิเสธ')
                                .replace(/⏳/g, 'รอ')
                              }
                              {activity.vin && (
                                <span className="ml-1 text-[9px] font-mono text-gray-400">
                                  ...{activity.vin.slice(-6)}
                                </span>
                              )}
                            </p>
                            <span className="text-[9px] text-gray-400 font-mono shrink-0">{timeStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  PRINT-ONLY WORK ORDER (hidden on screen)
                  ══════════════════════════════════════════════ */}
              <div className="print-work-order hidden">
                {/* Header */}
                <div className="print-wo-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="print-wo-title">
                      {activeJob.jobType === 'CAR_WASH' ? 'ใบสั่งงานล้างรถ' : 'ใบสั่งงานรถสไลด์'}
                    </div>
                    <div className="print-wo-subtitle" style={{ marginTop: '2pt' }}>
                      {activeJob.jobType === 'CAR_WASH' ? 'CAR WASH WORK ORDER' : 'VEHICLE SLIDE WORK ORDER'} — {activeJob.companyCode}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="print-wo-job-number">{activeJob.jobNumber}</div>
                    <div className="print-wo-subtitle">วันที่สั่ง: {formatThaiDateTime(activeJob.createdAt)}</div>
                  </div>
                </div>

                {/* Info Grid */}
                <dl className="print-wo-info-grid">
                  <div>
                    <dt>สาขาผู้สั่งงาน</dt>
                    <dd>{activeJob.branchName}</dd>
                  </div>
                  <div>
                    <dt>Supplier ผู้รับจ้าง</dt>
                    <dd>{activeJob.supplierName}</dd>
                  </div>
                  <div>
                    <dt>ผู้สั่งงาน</dt>
                    <dd>
                      {activeJob.requestedBy || '-'}
                      {activeJob.requesterPosition && ` (${activeJob.requesterPosition})`}
                    </dd>
                  </div>
                  <div>
                    <dt>เบอร์โทรผู้สั่งงาน</dt>
                    <dd>{activeJob.requesterPhone || '-'}</dd>
                  </div>
                  <div>
                    <dt>สถานะ</dt>
                    <dd>{STATUS_MAP[activeJob.status]?.label || activeJob.status}</dd>
                  </div>
                  <div>
                    <dt>ประเภทงาน</dt>
                    <dd>{activeJob.jobType === 'CAR_WASH' ? 'ล้างรถ (Car Wash)' : 'รถสไลด์ (Vehicle Slide)'}</dd>
                  </div>
                </dl>

                {/* Vehicle Slide specific info */}
                {activeJob.jobType === 'VEHICLE_SLIDE' && (() => {
                  const v = vehicles.find(item => item.vin === activeJob.vin) || activeJob.vehicle;
                  return (
                    <dl className="print-wo-info-grid">
                      <div>
                        <dt>VIN รถ</dt>
                        <dd style={{ fontFamily: 'monospace', fontWeight: 700 }}>{activeJob.vin || '-'}</dd>
                      </div>
                      <div>
                        <dt>รุ่น / สี</dt>
                        <dd>{v ? `${v.model || ''} ${v.color ? `(${v.color})` : ''}`.trim() : '-'}</dd>
                      </div>
                      <div>
                        <dt>ทะเบียนรถ</dt>
                        <dd style={{ fontWeight: 700 }}>{v?.licensePlate || '-'}</dd>
                      </div>
                      <div>
                        <dt>ประเภทรถ</dt>
                        <dd>{v?.vehicleType || '-'}</dd>
                      </div>
                      <div>
                        <dt>สาขาต้นทาง</dt>
                        <dd>{activeJob.originBranchName || activeJob.branchName}</dd>
                      </div>
                      <div>
                        <dt>สาขาปลายทาง</dt>
                        <dd>{activeJob.destBranchName || activeJob.customDestAddress || '-'}</dd>
                      </div>
                      <div>
                        <dt>วันเวลารับรถ</dt>
                        <dd>{activeJob.pickupDateTime ? formatThaiDateTime(activeJob.pickupDateTime) : '-'}</dd>
                      </div>
                      <div>
                        <dt>วันเวลาส่งรถ</dt>
                        <dd>{activeJob.deliveryDateTime ? formatThaiDateTime(activeJob.deliveryDateTime) : '-'}</dd>
                      </div>
                      <div>
                        <dt>ผู้ติดต่อปลายทาง</dt>
                        <dd>{activeJob.contactPerson || '-'}</dd>
                      </div>
                      <div>
                        <dt>เบอร์โทรปลายทาง</dt>
                        <dd>{activeJob.contactPhone || '-'}</dd>
                      </div>
                      {activeJob.transferReason && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <dt>เหตุผลในการเคลื่อนย้าย / หมายเหตุ</dt>
                          <dd>{activeJob.transferReason}</dd>
                        </div>
                      )}
                    </dl>
                  );
                })()}

                {/* Car Wash Items Table */}
                {activeJob.jobType === 'CAR_WASH' && activeJob.carWashItems && (
                  <>
                    <div style={{ fontSize: '10pt', fontWeight: 700, marginBottom: '6pt' }}>
                      รายการรถในคำสั่งล้าง ({activeJob.carWashItems.length} คัน)
                    </div>
                    <table className="print-wo-table">
                      <thead>
                        <tr>
                          <th className="text-center" style={{ width: '28pt' }}>ลำดับ</th>
                          <th>เลขตัวถัง (VIN)</th>
                          <th>รุ่น / สี</th>
                          <th>ทะเบียน</th>
                          <th>วันที่ล้าง</th>
                          <th>ประเภท</th>
                          <th className="text-center" style={{ width: '55pt' }}>สถานะ</th>
                          <th className="text-right" style={{ width: '55pt' }}>ราคา (฿)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeJob.carWashItems.map((item, idx) => {
                          const isCancelled = item.status === 'CANCELLED';
                          const statusConfig: Record<string, { label: string; color: string }> = {
                            PENDING: { label: 'รอดำเนินการ', color: '#b45309' },
                            COMPLETED: { label: 'เสร็จสิ้น', color: '#15803d' },
                            REJECTED: { label: 'ตีกลับ', color: '#dc2626' },
                            CANCELLED: { label: 'ปฏิเสธ', color: '#dc2626' },
                          };
                          const s = statusConfig[item.status] || { label: item.status, color: '#374151' };

                          return (
                            <tr key={item.id}>
                              <td className="text-center">{idx + 1}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.vin}</td>
                              <td>{item.vehicleModel} {item.vehicleColor ? `(${item.vehicleColor})` : ''}</td>
                              <td>{item.licensePlate || '-'}</td>
                              <td>{formatThaiDate(item.actualWashDate)}</td>
                              <td>{item.washType}</td>
                              <td className="text-center" style={{ fontWeight: 700, color: s.color }}>
                                {s.label}
                              </td>
                              <td className="text-right" style={{ fontWeight: 700, color: isCancelled ? '#dc2626' : undefined }}>
                                {isCancelled ? '0' : item.unitPrice.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="print-wo-total-row">
                          <td colSpan={7} className="text-right">
                            ยอดรวมสุทธิ {activeJob.carWashItems.some(i => i.status === 'CANCELLED') ? `(เฉพาะ ${activeJob.carWashItems.filter(i => i.status !== 'CANCELLED').length} คันที่ทำ)` : 'ทั้งสิ้น'}
                          </td>
                          <td className="text-right">
                            ฿{activeJob.carWashItems.filter(i => i.status !== 'CANCELLED').reduce((s, i) => s + i.unitPrice, 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </>
                )}

                {/* Vehicle Slide Table */}
                {activeJob.jobType === 'VEHICLE_SLIDE' && (() => {
                  const slideItems = activeJob.carWashItems;
                  const isJobCancelled = activeJob.status === 'CANCELLED';
                  const isJobApproved = ['APPROVED', 'INVOICED'].includes(activeJob.status);

                  if (slideItems && slideItems.length > 0) {
                    const validItems = slideItems.filter(i => i.status !== 'CANCELLED');
                    const totalCost = validItems.reduce((s, i) => s + i.unitPrice, 0);

                    return (
                      <div style={{ marginBottom: '14pt' }}>
                        <div style={{ fontSize: '10pt', fontWeight: 700, marginBottom: '6pt' }}>
                          รายการรถในคำสั่งขนส่งรถสไลด์ ({slideItems.length} คัน)
                        </div>
                        <table className="print-wo-table">
                          <thead>
                            <tr>
                              <th className="text-center" style={{ width: '28pt' }}>ลำดับ</th>
                              <th>เลขตัวถัง (VIN)</th>
                              <th>รุ่น / สี</th>
                              <th>ทะเบียน</th>
                              <th>เส้นทางขนส่ง</th>
                              <th className="text-center" style={{ width: '80pt' }}>สถานะ</th>
                              <th className="text-right" style={{ width: '60pt' }}>ราคา (฿)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {slideItems.map((item, idx) => {
                              const isItemCancelled = item.status === 'CANCELLED';
                              const isItemDone = item.status === 'COMPLETED' || item.status === 'APPROVED';
                              const statusLabel = isItemCancelled 
                                ? 'ปฏิเสธ' 
                                : (isJobApproved || item.status === 'APPROVED')
                                  ? 'ตรวจรับแล้ว' 
                                  : isItemDone 
                                    ? 'ส่งแล้ว' 
                                    : 'รอดำเนินการ';
                              const statusColor = isItemCancelled ? '#dc2626' : (isJobApproved || isItemDone) ? '#15803d' : '#b45309';

                              return (
                                <React.Fragment key={item.id}>
                                  <tr>
                                    <td className="text-center">{idx + 1}</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, textDecoration: isItemCancelled ? 'line-through' : 'none' }}>
                                      {item.vin}
                                    </td>
                                    <td>{item.vehicleModel} {item.vehicleColor ? `(${item.vehicleColor})` : ''}</td>
                                    <td style={{ fontWeight: 700 }}>{item.licensePlate || '-'}</td>
                                    <td>
                                      {(activeJob.originBranchName || activeJob.branchName)} → {(activeJob.destBranchName || activeJob.customDestAddress || '-')}
                                      {activeJob.distance ? ` (${activeJob.distance} กม.)` : ''}
                                    </td>
                                    <td className="text-center" style={{ fontWeight: 700, color: statusColor }}>
                                      {statusLabel}
                                    </td>
                                    <td className="text-right" style={{ fontWeight: 700, color: isItemCancelled ? '#dc2626' : undefined }}>
                                      {isItemCancelled ? '0' : item.unitPrice.toLocaleString()}
                                    </td>
                                  </tr>
                                  {isItemCancelled && item.remarks && (
                                    <tr>
                                      <td colSpan={7} style={{ color: '#dc2626', background: '#fef2f2', padding: '4pt 8pt', fontSize: '8.5pt' }}>
                                        ↳ เหตุผลที่ปฏิเสธ: {item.remarks} (ไม่คิดค่าบริการ)
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="print-wo-total-row">
                              <td colSpan={6} className="text-right">
                                ยอดรวมสุทธิ {slideItems.some(i => i.status === 'CANCELLED') ? `(เฉพาะ ${validItems.length} จาก ${slideItems.length} คัน)` : 'ทั้งสิ้น'}
                              </td>
                              <td className="text-right">
                                ฿{totalCost.toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  }

                  // Single car fallback
                  const v = vehicles.find(item => item.vin === activeJob.vin) || activeJob.vehicle;
                  const vModel = v?.model || 'ไม่ระบุรุ่น';
                  const vColor = v?.color || '';
                  const vPlate = v?.licensePlate || '-';
                  const statusText = isJobCancelled
                    ? 'ปฏิเสธงาน / ยกเลิก'
                    : isJobApproved
                      ? 'ผ่านการตรวจรับแล้ว'
                      : activeJob.status === 'WAITING_APPROVAL'
                        ? 'ส่งงานแล้ว (รอตรวจรับ)'
                        : activeJob.status === 'IN_PROGRESS'
                          ? 'กำลังขนส่ง'
                          : 'รอ Supplier รับงาน';

                  const statusColor = isJobCancelled ? '#dc2626' : isJobApproved ? '#15803d' : '#374151';
                  const finalCost = isJobCancelled ? 0 : (activeJob.actualCost ?? activeJob.estimatedCost ?? 0);

                  return (
                    <div style={{ marginBottom: '14pt' }}>
                      <div style={{ fontSize: '10pt', fontWeight: 700, marginBottom: '6pt' }}>
                        รายการรถในคำสั่งขนส่งรถสไลด์ (1 คัน)
                      </div>
                      <table className="print-wo-table">
                        <thead>
                          <tr>
                            <th className="text-center" style={{ width: '28pt' }}>ลำดับ</th>
                            <th>เลขตัวถัง (VIN)</th>
                            <th>รุ่น / สี</th>
                            <th>ทะเบียน</th>
                            <th>เส้นทางขนส่ง</th>
                            <th>วันเวลารับ / ส่งมอบ</th>
                            <th className="text-center" style={{ width: '80pt' }}>สถานะ</th>
                            <th className="text-right" style={{ width: '60pt' }}>ราคา (฿)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="text-center">1</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, textDecoration: isJobCancelled ? 'line-through' : 'none' }}>
                              {activeJob.vin || '-'}
                            </td>
                            <td>{vModel} {vColor ? `(${vColor})` : ''}</td>
                            <td style={{ fontWeight: 700 }}>{vPlate}</td>
                            <td>
                              {(activeJob.originBranchName || activeJob.branchName)} → {(activeJob.destBranchName || activeJob.customDestAddress || '-')}
                              {activeJob.distance ? ` (${activeJob.distance} กม.)` : ''}
                            </td>
                            <td>
                              {activeJob.pickupDateTime ? formatThaiDateTime(activeJob.pickupDateTime) : '-'}
                            </td>
                            <td className="text-center" style={{ fontWeight: 700, color: statusColor }}>
                              {statusText}
                            </td>
                            <td className="text-right" style={{ fontWeight: 700, color: isJobCancelled ? '#dc2626' : undefined }}>
                              {isJobCancelled ? '0' : finalCost.toLocaleString()}
                            </td>
                          </tr>
                          {isJobCancelled && activeJob.rejectReason && (
                            <tr>
                              <td colSpan={8} style={{ color: '#dc2626', background: '#fef2f2', padding: '6pt 8pt', fontSize: '9pt', borderTop: '0.5pt solid #fca5a5' }}>
                                <strong>เหตุผลที่ปฏิเสธงาน / ยกเลิก:</strong> {activeJob.rejectReason} (ไม่คิดค่าบริการ)
                              </td>
                            </tr>
                          )}
                          {isJobApproved && (
                            <tr>
                              <td colSpan={8} style={{ color: '#15803d', background: '#f0fdf4', padding: '6pt 8pt', fontSize: '9pt', borderTop: '0.5pt solid #86efac' }}>
                                <strong>ผลการตรวจรับ:</strong> ผ่านการตรวจรับแล้ว {activeJob.approvedBy ? `โดย ${activeJob.approvedBy}` : ''} {activeJob.approvedAt ? `เมื่อ ${formatThaiDateTime(activeJob.approvedAt)}` : ''}
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="print-wo-total-row">
                            <td colSpan={7} className="text-right">
                              ยอดรวมสุทธิ {isJobCancelled ? '(ยกเลิกงาน / ไม่คิดค่าบริการ)' : 'ทั้งสิ้น'}
                            </td>
                            <td className="text-right">
                              ฿{finalCost.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })()}

                {/* Signatures */}
                <div className="print-wo-signatures">
                  <div>
                    <div className="print-wo-sig-line" />
                    <div>ลงชื่อ {activeJob.requestedBy || '...........................................'}</div>
                    <div style={{ fontWeight: 700, marginTop: '4pt' }}>
                      ({activeJob.requesterPosition || '...........................................'})
                    </div>
                  </div>
                  <div>
                    <div className="print-wo-sig-line" />
                    <div>ลงชื่อ ...........................................</div>
                    <div style={{ fontWeight: 700, marginTop: '4pt' }}>
                      (...........................................)
                    </div>
                    <div>ผู้แทน Supplier ผู้รับงาน</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="print-wo-footer">
                  เอกสารนี้พิมพ์จากระบบจัดการงาน Supplier — {activeJob.companyCode} •
                  เลขที่ {activeJob.jobNumber} •
                  วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
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
                      onClick={() => onAcceptJob(activeJob.id)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                    >
                      รับงานนี้
                    </button>
                  )}

                  {currentRole === 'SUPPLIER' && activeJob.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      onClick={() => onCompleteJob(activeJob)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>ส่งมอบงาน & แนบรูป</span>
                    </button>
                  )}

                  {(currentRole === 'BRANCH' || currentRole === 'ADMIN') && activeJob.status === 'WAITING_APPROVAL' && (() => {
                    const isSlide = activeJob.jobType === 'VEHICLE_SLIDE';
                    const myBranchId = activeBranch?.id || currentBranchId;
                    const isDest = Boolean(isSlide && activeJob.destBranchId && activeJob.destBranchId === myBranchId);
                    const isOrigin = Boolean(isSlide && activeJob.destBranchId && (activeJob.originBranchId === myBranchId || activeJob.branchId === myBranchId));

                    return (
                      <>
                        {isDest ? (
                          <button
                            type="button"
                            onClick={() => onApprove(activeJob.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition-colors"
                            title="ยืนยันตรวจรับรถเข้าสาขา"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>ยืนยันรับรถเข้าสาขา</span>
                          </button>
                        ) : isOrigin ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`คุณกำลังจะอนุมัติแทนสาขาปลายทาง (${activeJob.destBranchName || 'ปลายทาง'}) ยืนยันหรือไม่?`)) {
                                onApprove(activeJob.id);
                              }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 shadow-xs transition-colors"
                            title="อนุมัติแทนสาขาปลายทาง"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>อนุมัติแทนปลายทาง</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onApprove(activeJob.id)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors"
                            style={{ backgroundColor: theme.primary }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryHover; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary; }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>อนุมัติงาน</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onReject(activeJob)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          ขอแก้ไข
                        </button>
                      </>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => onClose()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

  );
}

export default JobDetailDrawer;
