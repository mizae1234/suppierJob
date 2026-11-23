'use client';

import React from 'react';
import {
  Clock,
  CheckCircle2,
  Sparkles,
  Camera,
  XCircle,
  Car,
  Hash,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { ThemeColors } from '@/hooks/useTheme';
import { getVehicleLabel } from '@/lib/job-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
import { SupplierItemCard, VendorJobCardActions } from '../_types';
import { getWashBadgeClass } from '../_utils';
import { JobStatusBreakdownChips } from './JobStatusBreakdownChips';

interface WashItemCardProps {
  card: SupplierItemCard;
  isAll: boolean;
  theme: ThemeColors;
  actions: VendorJobCardActions;
}

export function WashItemCard({ card, isAll, theme, actions }: WashItemCardProps) {
  const isSubmitting = actions.submittingId === card.itemId;
  const isPending = card.itemStatus === 'PENDING' && ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(card.jobStatus);
  const isNeedsVerify = isPending && !card.verifiedAt;
  const isVerifiedPending = isPending && !!card.verifiedAt;
  const isCompleted = card.itemStatus === 'COMPLETED' || card.itemStatus === 'APPROVED';
  const isApproved = card.itemStatus === 'APPROVED' ||
    (card.itemStatus === 'COMPLETED' && ['APPROVED', 'INVOICED'].includes(card.jobStatus));
  const isRejected = card.itemStatus === 'REJECTED';

  const washMeta = getWashServiceDisplay(card.washType || 'WASH_NORMAL');
  const badgeClass = getWashBadgeClass(card.washType);

  return (
    <div
      className={`p-4 rounded-2xl bg-white border shadow-xs transition-all overflow-hidden ${
        isNeedsVerify
          ? 'border-sky-200/90 hover:border-sky-300'
          : isVerifiedPending
          ? 'border-amber-200/80 hover:border-amber-300'
          : isCompleted
          ? 'border-emerald-200/60'
          : 'border-red-200/60'
      }`}
    >
      {/* Top Row: Vehicle Info & Price */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
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
            {isNeedsVerify ? <ScanLine className="w-5 h-5" /> : <Car className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {getVehicleLabel(card.vin, card.licensePlate)}
              </p>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 truncate">
              {card.vehicleModel || 'รถยนต์'} {card.vehicleColor ? `• ${card.vehicleColor}` : ''}
              {card.licensePlate && card.licensePlate !== '-' && !card.licensePlate.includes('ป้ายแดง') ? (
                <span className="font-mono"> • VIN ...{card.vin.slice(-6)}</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span
            className={`text-base font-mono ${card.itemStatus === 'CANCELLED' ? 'text-gray-400 text-xs' : 'font-black'}`}
            style={card.itemStatus !== 'CANCELLED' ? { color: theme.primary } : undefined}
          >
            ฿{card.unitPrice.toLocaleString()}
          </span>
          {card.itemStatus === 'CANCELLED' && (
            <span className="block text-[9px] text-red-500 font-medium">ไม่คิดเงิน</span>
          )}
        </div>
      </div>

      {/* Unified Service & Instruction Card (Clean, modern, no nested clutter) */}
      <div className="mb-3 p-2.5 rounded-xl bg-[#fbfdfc] border border-gray-200/80 text-xs shadow-2xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border shadow-2xs ${badgeClass}`}>
              <Sparkles className="w-3 h-3" />
              <span>{washMeta.name}</span>
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              • {washMeta.categoryName}
            </span>
          </div>
          {!card.itemRemarks && washMeta.defaultRemarks && (
            <span className="text-[10px] text-gray-400 truncate max-w-[200px]">
              {washMeta.defaultRemarks}
            </span>
          )}
        </div>

        {card.itemRemarks && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-start gap-1.5 text-[11px] text-amber-950">
            <span className="shrink-0 font-bold text-amber-800">จุดที่ต้องเน้น:</span>
            <span className="font-semibold leading-relaxed">{card.itemRemarks}</span>
          </div>
        )}
      </div>

      {/* Job Reference Badge + Progress */}
      <div className="flex items-center justify-between mb-3 gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 min-w-0 overflow-hidden">
          <Hash className="w-3 h-3 shrink-0 text-gray-400" />
          <span className="font-mono font-semibold text-gray-700 shrink-0">{card.jobNumber}</span>
          <span>•</span>
          {isAll && (
            <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded-full font-medium truncate max-w-[140px]" title={card.supplierName}>
              {card.supplierName}
            </span>
          )}
          {!isAll && (
            <span className="truncate">{card.branchName}</span>
          )}
        </div>
        {/* Job breakdown — status of every car in this job (only non-zero shown) */}
        <JobStatusBreakdownChips card={card} variant="wash" />
      </div>

      {/* Verification badge (step 1 done) */}
      {card.verifiedAt && (isPending || isRejected) && (
        <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-[11px] font-bold text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ยืนยันตัวรถแล้ว • พร้อมส่งงาน</span>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {/* PENDING items: Show submit + reject */}
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

        {/* COMPLETED items waiting approval */}
        {card.itemStatus === 'COMPLETED' && ['IN_PROGRESS', 'WAITING_APPROVAL'].includes(card.jobStatus) && (
          <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">
            <Clock className="w-4 h-4" />
            <span>ส่งงานคันนี้แล้ว • รอตรวจรับ</span>
          </div>
        )}

        {/* APPROVED items (approved per-car, or whole job approved) */}
        {isApproved && (
          <div
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold"
            style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ผ่านการตรวจรับเรียบร้อยแล้ว</span>
          </div>
        )}

        {/* REJECTED items */}
        {isRejected && (
          <div className="flex-1 flex items-center justify-between gap-2">
            <span className="text-xs text-red-700 font-medium truncate">
              สาขาขอให้แก้ไข: {card.itemRemarks || card.job.rejectReason || 'โปรดตรวจสอบ'}
            </span>
            <button
              type="button"
              onClick={() => actions.onOpenPhotoForWash(card)}
              disabled={isSubmitting}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 disabled:opacity-50"
            >
              แก้ไข + ส่งใหม่
            </button>
          </div>
        )}

        {/* CANCELLED jobs */}
        {(card.itemStatus === 'CANCELLED' || card.jobStatus === 'CANCELLED') && !isRejected && (
          <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-red-50/80 border border-red-100 text-xs">
            <div className="flex items-center gap-1.5 text-red-700 font-bold">
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>ปฏิเสธงานนี้แล้ว</span>
            </div>
            {(card.itemRemarks || card.job.rejectReason) && (
              <span className="text-[11px] text-red-600 truncate">
                เหตุผล: {card.itemRemarks || card.job.rejectReason}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
