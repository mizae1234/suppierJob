'use client';

import React from 'react';
import {
  Clock,
  CheckCircle2,
  Truck,
  Camera,
  XCircle,
  Car,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { ThemeColors } from '@/hooks/useTheme';
import { Job, Vehicle } from '@/types';
import { getJobTotalCost, getVehicleLabel } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { isFailedAttemptJob } from '@/lib/slide-failed-attempt';
import { VendorJobCardActions } from '../_types';
import { SlideRouteBox } from './SlideRouteBox';
import { FailedAttemptButton, FailedAttemptWaitingBanner } from './FailedAttemptControls';

interface LegacySlideJobCardProps {
  job: Job;
  vehicles: Vehicle[];
  theme: ThemeColors;
  actions: VendorJobCardActions;
}

// การ์ดงานรถสไลด์แบบเดิม (เฉพาะใบงานเก่าที่ไม่มี carWashItems)
export function LegacySlideJobCard({ job, vehicles, theme, actions }: LegacySlideJobCardProps) {
  const cost = getJobTotalCost(job);
  const isActiveJob = job.status === 'IN_PROGRESS' || job.status === 'PENDING_SUPPLIER';
  const isNeedsVerify = isActiveJob && !job.verifiedAt;
  const isVerifiedPending = isActiveJob && !!job.verifiedAt;
  const isSubmitting = actions.submittingId === job.id;

  const isCompleted = ['WAITING_APPROVAL', 'APPROVED', 'INVOICED'].includes(job.status);
  const isRejected = job.status === 'REJECTED';
  const isCancelled = job.status === 'CANCELLED';

  const singleItem = job.carWashItems && job.carWashItems.length === 1 ? job.carWashItems[0] : null;
  const vehicleCount = job.carWashItems && job.carWashItems.length > 0 ? job.carWashItems.length : (job.vin ? 1 : 0);
  const isMultiCar = vehicleCount > 1;

  // Vehicle info for single vehicle
  const primaryVin = singleItem?.vin || job.vin || '';
  const singleItemVehicle = (singleItem as { vehicle?: { model?: string; color?: string; licensePlate?: string } } | null)?.vehicle;
  const primaryVehicleObj = vehicles.find(v => v.vin === primaryVin) || singleItemVehicle || job.vehicle;
  const primaryModel = primaryVehicleObj?.model || singleItem?.vehicleModel || '';
  const primaryColor = primaryVehicleObj?.color || singleItem?.vehicleColor || '';
  const primaryPlate = primaryVehicleObj?.licensePlate || singleItem?.licensePlate || '';

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl bg-white border transition-all duration-200 shadow-2xs hover:shadow-md overflow-hidden flex flex-col gap-3.5 ${
        isNeedsVerify
          ? 'border-sky-200/90 hover:border-sky-300'
          : isVerifiedPending
          ? 'border-amber-200/90 hover:border-amber-300'
          : isCompleted
          ? 'border-emerald-200/70 bg-[#fafdfb]'
          : 'border-red-200/70 bg-[#fdfafb]'
      }`}
    >
      {/* ── Top Row: Job Number Badge, Type & Price ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center gap-1.5 shrink-0">
            <Truck className="w-3.5 h-3.5" />
            <span>{isMultiCar ? `รถสไลด์ (${vehicleCount} คัน)` : 'รถสไลด์'}</span>
          </span>
          <span className="font-mono text-xs text-gray-500 font-semibold truncate">
            #{job.jobNumber}
          </span>
        </div>

        <div className="text-right shrink-0">
          <span className="text-base font-black font-mono tracking-tight text-[#0f5238]">
            {formatCurrency(cost)}
          </span>
        </div>
      </div>

      {/* ── Vehicle Info Box (Hero content for driver) ── */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8faf9] border border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center shrink-0 text-emerald-800">
          <Car className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          {isMultiCar ? (
            <>
              <p className="text-xs font-bold text-gray-900 truncate">
                ขนย้ายรถยนต์ทั้งหมด {vehicleCount} คัน
              </p>
              <div className="flex items-center gap-1.5 mt-1 overflow-x-auto scrollbar-none">
                {job.carWashItems?.map((it, idx) => (
                  <span
                    key={it.id || idx}
                    className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[10px] font-medium text-gray-700 shrink-0"
                  >
                    {getVehicleLabel(it.vin, it.licensePlate)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {primaryModel || 'รถยนต์'}
                </p>
                {primaryPlate && (
                  <span className="px-1.5 py-0.2 rounded bg-white text-gray-800 font-bold text-[10px] border border-gray-200 shadow-2xs font-mono">
                    {primaryPlate}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                {primaryColor ? `${primaryColor} • ` : ''}
                <span className="font-mono">VIN: ...{primaryVin ? primaryVin.slice(-6) : '-'}</span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Route & Navigation Box (Unified Timeline Card) ── */}
      <SlideRouteBox job={job} showNav={!isCancelled && !['APPROVED', 'INVOICED'].includes(job.status)} />

      {/* Verification badge (step 1 done) */}
      {job.verifiedAt && (isActiveJob || isRejected) && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-[11px] font-bold text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ยืนยันตัวรถแล้ว • พร้อมส่งงาน</span>
        </div>
      )}

      {/* ── Action Row: Bottom buttons ── */}
      <div className="flex items-center gap-2 pt-1">
        {isActiveJob && (
          <>
            <button
              type="button"
              onClick={() => actions.onOpenRejectForSlide(job)}
              className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span>ปฏิเสธ</span>
            </button>
            <button
              type="button"
              onClick={() => actions.onOpenPhotoForSlide(job)}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer hover:opacity-90 active:scale-[0.99] shadow-sm disabled:opacity-50"
              style={{ backgroundColor: theme.primary }}
            >
              {job.verifiedAt ? <Camera className="w-3.5 h-3.5" /> : <ScanLine className="w-3.5 h-3.5" />}
              <span>{job.verifiedAt ? 'ถ่ายรูป + ส่งงาน' : 'ยืนยันรถก่อนเริ่มงาน'}</span>
            </button>
          </>
        )}

        {isCancelled && (
          <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-red-50/80 border border-red-100 text-xs">
            <div className="flex items-center gap-1.5 text-red-700 font-bold">
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>ปฏิเสธงานนี้แล้ว</span>
            </div>
            {job.rejectReason && (
              <span className="text-[11px] text-red-600 truncate">
                เหตุผล: {job.rejectReason}
              </span>
            )}
          </div>
        )}

        {isRejected && (
          <div className="flex-1 flex items-center justify-between gap-2 p-2 rounded-xl bg-red-50 border border-red-200 text-xs">
            <span className="text-red-700 font-medium truncate">
              สาขาขอให้แก้ไข: {job.rejectReason || 'โปรดตรวจสอบ'}
            </span>
            <button
              type="button"
              onClick={() => actions.onOpenPhotoForSlide(job)}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            >
              แก้ไข + ส่งใหม่
            </button>
          </div>
        )}

        {job.status === 'WAITING_APPROVAL' && (
          isFailedAttemptJob(job) ? <FailedAttemptWaitingBanner /> : (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60">
              <Clock className="w-4 h-4" />
              <span>ส่งงานแล้ว • รอสาขาตรวจรับ...</span>
            </div>
          )
        )}

        {['APPROVED', 'INVOICED'].includes(job.status) && (
          <div
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border"
            style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary, borderColor: theme.borderSoft }}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{isFailedAttemptJob(job) ? 'อนุมัติค่าเที่ยวเปล่าเรียบร้อยแล้ว' : 'ผ่านการตรวจรับเรียบร้อยแล้ว'}</span>
          </div>
        )}
      </div>

      {(isActiveJob || isRejected) && (
        <FailedAttemptButton
          job={job}
          disabled={isSubmitting}
          onReport={actions.onReportFailedAttempt}
        />
      )}
    </div>
  );
}
