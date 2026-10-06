'use client';

import React from 'react';
import {
  Camera,
  ImageIcon,
  Calendar,
  MapPin,
  RotateCcw,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { Job, CarWashItem } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { getVehicleLabel } from '@/lib/job-utils';
import { ITEM_STATUS_UI, WASH_TYPE_LABEL } from './constants';

export interface CarWashItemReviewCardProps {
  item: CarWashItem;
  job: Job;
  isCarWash?: boolean;
  isApprovingThis?: boolean;
  onPreviewPhoto: (photo: { url: string; caption?: string; type?: string }) => void;
  onApproveItem: (jobId: string, itemId: string, label: string) => void;
  onRejectItem: (jobId: string, itemId: string) => void;
}

export function CarWashItemReviewCard({
  item,
  job,
  isCarWash = true,
  isApprovingThis = false,
  onPreviewPhoto,
  onApproveItem,
  onRejectItem,
}: CarWashItemReviewCardProps) {
  const cfg = ITEM_STATUS_UI[item.status] || ITEM_STATUS_UI.PENDING;
  const StatusIcon = cfg.icon;
  const isItemCompleted = item.status === 'COMPLETED';
  const isItemApproved = item.status === 'APPROVED';
  const isItemCancelled = item.status === 'CANCELLED';
  const isItemRejected = item.status === 'REJECTED';
  const itemEvidences = (job.evidences || []).filter(e => e.vin === item.vin);
  const hero = itemEvidences[0];
  const canReview = isItemCompleted && (job.status === 'WAITING_APPROVAL' || job.status === 'IN_PROGRESS');
  const remarkLabel = isItemRejected ? 'ตีกลับ' : isItemCancelled ? 'ปฏิเสธ' : 'หมายเหตุ';

  return (
    <div
      key={item.id}
      className={`rounded-lg bg-white border overflow-hidden flex flex-col transition-all hover:shadow-md ${cfg.card}`}
    >
      {/* Photo - Cinematic Ultra-Compact Banner */}
      <div className="relative h-24 sm:h-28 bg-gray-100 overflow-hidden">
        {hero ? (
          <button
            type="button"
            onClick={() => onPreviewPhoto({ url: hero.photoUrl, caption: hero.caption, type: hero.evidenceType })}
            className="group block w-full h-full cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.photoUrl}
              alt={hero.caption}
              className={`w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 ${isItemCancelled ? 'grayscale' : ''}`}
            />
          </button>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-gray-400">
            <Camera className="w-4 h-4 opacity-50" />
            <span className="text-[9px] font-medium">
              {isItemCancelled ? 'ไม่ทำ' : item.status === 'PENDING' ? 'รอรูป' : 'ไม่มีรูป'}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/40 to-transparent" />
        
        {/* Badges on Photo */}
        <span className={`absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-xs backdrop-blur-md ${cfg.pill}`}>
          <StatusIcon className="w-2.5 h-2.5" />
          <span className="truncate max-w-[65px]">{cfg.label}</span>
        </span>

        <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/95 backdrop-blur-md text-[9px] font-black font-mono shadow-xs ${
          isItemCancelled ? 'text-gray-400 line-through' : 'text-[#0f5238]'
        }`}>
          ฿{item.unitPrice.toLocaleString()}
        </span>

        {itemEvidences.length > 1 && (
          <button
            type="button"
            onClick={() => onPreviewPhoto({ url: hero?.photoUrl || '', caption: hero?.caption, type: hero?.evidenceType })}
            className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/65 backdrop-blur-xs text-white text-[8px] font-bold hover:bg-black/80 transition-colors"
          >
            <ImageIcon className="w-2 h-2" /> {itemEvidences.length} รูป
          </button>
        )}
      </div>

      {/* Extra thumbnail swatches - Micro strip if > 1 */}
      {itemEvidences.length > 1 && (
        <div className="flex gap-1 px-1.5 pt-1 overflow-x-auto scrollbar-none bg-gray-50/50 border-b border-gray-100">
          {itemEvidences.map((evi, idx) => (
            <button
              key={evi.id}
              type="button"
              onClick={() => onPreviewPhoto({ url: evi.photoUrl, caption: evi.caption, type: evi.evidenceType })}
              className={`w-5 h-5 rounded overflow-hidden border shrink-0 cursor-zoom-in transition-all ${idx === 0 ? 'border-emerald-600 ring-1 ring-emerald-400' : 'border-gray-200 hover:opacity-80'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={evi.photoUrl} alt={evi.caption} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Details - Ultra Compact */}
      <div className="p-2 flex flex-col gap-0.5 flex-1 justify-between">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className={`text-xs font-black tracking-tight leading-tight truncate ${isItemCancelled ? 'text-gray-400' : 'text-gray-900'}`} title={item.licensePlate || item.vin}>
              {getVehicleLabel(item.vin, item.licensePlate)}
            </p>
            <span className={`px-1 py-0.2 rounded text-[8px] font-bold shrink-0 ${
              isCarWash ? 'bg-gray-100 text-gray-700' : 'bg-sky-50 text-sky-700'
            }`}>
              {isCarWash ? (WASH_TYPE_LABEL[item.washType] || item.washType) : 'สไลด์'}
            </span>
          </div>

          <p className="text-[10px] text-gray-600 truncate leading-tight" title={`${item.vehicleModel} ${item.vehicleColor || ''} (VIN: ${item.vin})`}>
            {item.vehicleModel}
            {item.vehicleColor && <span className="text-gray-400"> · {item.vehicleColor}</span>}
          </p>

          <p className="font-mono text-[9px] text-gray-400 truncate leading-tight" title={item.vin}>
            VIN: ...{item.vin.slice(-8)}
          </p>

          {isCarWash ? (
            <p className="flex items-center gap-1 text-[9px] text-gray-400 leading-tight">
              <Calendar className="w-2.5 h-2.5 shrink-0" />
              <span>{formatThaiDate(item.actualWashDate)}</span>
            </p>
          ) : (
            <p className="flex items-center gap-1 text-[9px] text-gray-400 truncate leading-tight" title={`${job.originBranchName || job.branchName} → ${job.destBranchName || job.customDestAddress || 'ปลายทาง'}`}>
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{job.destBranchName || 'ปลายทาง'}</span>
            </p>
          )}

          {item.remarks && (
            <p className={`text-[9px] px-1.5 py-0.5 rounded leading-tight truncate mt-0.5 ${
              isItemRejected
                ? 'bg-red-50 text-red-700 border border-red-100'
                : 'bg-gray-50 text-gray-600 border border-gray-100'
            }`} title={item.remarks}>
              <span className="font-semibold">{remarkLabel}:</span> {item.remarks}
            </p>
          )}
        </div>

        {/* Actions - Ultra-Compact Buttons */}
        {canReview && (
          <div className="pt-1.5 mt-1 border-t border-gray-100 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onRejectItem(job.id, item.id)}
              disabled={isApprovingThis}
              title="ตีกลับ"
              className="h-6 px-1.5 rounded bg-white hover:bg-red-50 text-red-600 text-[10px] font-bold border border-red-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={() => onApproveItem(job.id, item.id, getVehicleLabel(item.vin, item.licensePlate))}
              disabled={isApprovingThis}
              className="h-6 flex-1 flex items-center justify-center gap-1 px-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold shadow-2xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 truncate"
            >
              <Check className="w-3 h-3 shrink-0" />
              <span>{isApprovingThis ? 'บันทึก...' : 'อนุมัติ'}</span>
            </button>
          </div>
        )}

        {isItemApproved && (
          <div className="mt-1 flex items-center justify-center gap-1 h-5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100">
            <CheckCircle2 className="w-2.5 h-2.5" />
            ผ่านตรวจรับ
          </div>
        )}

        {isItemRejected && (
          <div className="mt-1 flex items-center justify-center gap-1 h-5 rounded bg-red-50 text-red-700 text-[9px] font-bold border border-red-100">
            <RotateCcw className="w-2.5 h-2.5" />
            ตีกลับแล้ว
          </div>
        )}

        {isItemCancelled && (
          <div className="mt-1 flex items-center justify-center gap-1 h-5 rounded bg-gray-100 text-gray-500 text-[9px] font-bold">
            ไม่ทำรายการ
          </div>
        )}
      </div>
    </div>
  );
}

export default CarWashItemReviewCard;
