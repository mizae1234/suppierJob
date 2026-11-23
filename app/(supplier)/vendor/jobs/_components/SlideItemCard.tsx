'use client';

import React from 'react';
import {
  Clock,
  CheckCircle2,
  Truck,
  Camera,
  XCircle,
  Hash,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { ThemeColors } from '@/hooks/useTheme';
import { getVehicleLabel } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { isFailedAttemptJob } from '@/lib/slide-failed-attempt';
import { SupplierItemCard, VendorJobCardActions } from '../_types';
import { JobStatusBreakdownChips } from './JobStatusBreakdownChips';
import { SlideRouteBox } from './SlideRouteBox';
import { FailedAttemptButton, FailedAttemptWaitingBanner } from './FailedAttemptControls';

interface SlideItemCardProps {
  card: SupplierItemCard;
  isAll: boolean;
  theme: ThemeColors;
  actions: VendorJobCardActions;
}

// การ์ดงานรถสไลด์รายคัน (เหมือนล้างรถ แยกทีละคัน + มีปุ่มนำทาง Google Maps)
export function SlideItemCard({ card, isAll, theme, actions }: SlideItemCardProps) {
  const { job } = card;
  const isSubmitting = actions.submittingId === card.itemId;
  const isPending = card.itemStatus === 'PENDING' && ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(card.jobStatus);
  const isNeedsVerify = isPending && !card.verifiedAt;
  const isVerifiedPending = isPending && !!card.verifiedAt;
  const isCompleted = card.itemStatus === 'COMPLETED' || card.itemStatus === 'APPROVED';
  const isApproved = card.itemStatus === 'APPROVED' ||
    (card.itemStatus === 'COMPLETED' && ['APPROVED', 'INVOICED'].includes(card.jobStatus));
  const isRejected = card.itemStatus === 'REJECTED';
  const isCancelled = card.itemStatus === 'CANCELLED' || card.jobStatus === 'CANCELLED';

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
      {/* ── Top Row: Vehicle Info & Per-Car Price ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isNeedsVerify
              ? 'bg-sky-50 text-sky-600 border border-sky-100'
              : isVerifiedPending
              ? 'bg-amber-50 text-amber-600 border border-amber-100'
              : isCompleted
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            {isNeedsVerify ? <ScanLine className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {getVehicleLabel(card.vin, card.licensePlate)}
              </p>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 inline-flex items-center gap-1">
                <Truck className="w-3 h-3" />
                <span>รถสไลด์</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 truncate">
              {card.vehicleModel || 'รถยนต์'} {card.vehicleColor ? `• ${card.vehicleColor}` : ''}
              {card.vin ? <span className="font-mono"> • VIN: {card.vin}</span> : null}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`text-base font-mono ${isCancelled ? 'text-gray-400 text-xs line-through' : 'font-black text-[#0f5238]'}`}
          >
            {formatCurrency(card.unitPrice)}
          </span>
          {isCancelled && (
            <span className="block text-[9px] text-red-500 font-medium">ไม่คิดเงิน</span>
          )}
        </div>
      </div>

      {/* ── Job Reference + Multi-car Status Breakdown ── */}
      <div className="flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 min-w-0 overflow-hidden">
          <Hash className="w-3 h-3 shrink-0 text-gray-400" />
          <span className="font-mono font-semibold text-gray-700 shrink-0">{card.jobNumber}</span>
          {isAll && (
            <>
              <span>•</span>
              <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded-full font-medium truncate max-w-[140px]" title={card.supplierName}>
                {card.supplierName}
              </span>
            </>
          )}
        </div>

        <JobStatusBreakdownChips card={card} variant="slide" />
      </div>

      {/* ── Route & Navigation Box (Unified Timeline Card) ── */}
      <SlideRouteBox job={job} showNav={!isCancelled && !isApproved} />

      {/* Verification badge (step 1 done) */}
      {card.verifiedAt && (isPending || isRejected) && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-[11px] font-bold text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ยืนยันตัวรถคันนี้แล้ว • พร้อมส่งงาน</span>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-1">
        {isPending && (
          <>
            <button
              type="button"
              onClick={() => actions.onOpenRejectForWash(card)}
              className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span>ปฏิเสธ</span>
            </button>

            <button
              type="button"
              onClick={() => actions.onOpenPhotoForWash(card)}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer hover:opacity-90 active:scale-[0.99] shadow-sm disabled:opacity-50"
              style={{ backgroundColor: theme.primary }}
            >
              {card.verifiedAt ? <Camera className="w-3.5 h-3.5" /> : <ScanLine className="w-3.5 h-3.5" />}
              <span>{card.verifiedAt ? 'ถ่ายรูป + ส่งงาน' : 'ยืนยันรถก่อนเริ่มงาน'}</span>
            </button>
          </>
        )}

        {card.itemStatus === 'COMPLETED' && ['IN_PROGRESS', 'WAITING_APPROVAL'].includes(card.jobStatus) && (
          isFailedAttemptJob(job) ? <FailedAttemptWaitingBanner /> : (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60">
              <Clock className="w-4 h-4" />
              <span>ส่งงานคันนี้แล้ว • รอสาขาตรวจรับ</span>
            </div>
          )
        )}

        {isApproved && (
          <div
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border"
            style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary, borderColor: theme.borderSoft }}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{isFailedAttemptJob(job) ? 'อนุมัติค่าเที่ยวเปล่าเรียบร้อยแล้ว' : 'ผ่านการตรวจรับเรียบร้อยแล้ว'}</span>
          </div>
        )}

        {isRejected && (
          <div className="flex-1 flex items-center justify-between gap-2 p-2 rounded-xl bg-red-50 border border-red-200 text-xs">
            <span className="text-red-700 font-medium truncate">
              สาขาขอให้แก้ไข: {card.itemRemarks || card.job.rejectReason || 'โปรดตรวจสอบ'}
            </span>
            <button
              type="button"
              onClick={() => actions.onOpenPhotoForWash(card)}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 disabled:opacity-50"
            >
              แก้ไข + ส่งใหม่
            </button>
          </div>
        )}

        {isCancelled && !isRejected && (
          <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-red-50/80 border border-red-100 text-xs">
            <div className="flex items-center gap-1.5 text-red-700 font-bold">
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>ยกเลิก / ปฏิเสธรถคันนี้แล้ว</span>
            </div>
            {(card.itemRemarks || card.job.rejectReason) && (
              <span className="text-[11px] text-red-600 truncate">
                เหตุผล: {card.itemRemarks || card.job.rejectReason}
              </span>
            )}
          </div>
        )}
      </div>

      {(isPending || isRejected) && (
        <FailedAttemptButton
          job={job}
          disabled={actions.submittingId === job.id}
          onReport={actions.onReportFailedAttempt}
        />
      )}
    </div>
  );
}
