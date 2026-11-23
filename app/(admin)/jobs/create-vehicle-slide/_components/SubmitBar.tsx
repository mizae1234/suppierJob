'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { CustomDestPoint, RouteMode } from '../_types';

interface SubmitBarProps {
  supplierName?: string;
  originLabel?: string;
  destMode: RouteMode;
  destBranchName?: string;
  customDest: CustomDestPoint | null;
  distance: number;
  selectedVinsCount: number;
  estimatedCost: number;
}

export default function SubmitBar({
  supplierName,
  originLabel,
  destMode,
  destBranchName,
  customDest,
  distance,
  selectedVinsCount,
  estimatedCost,
}: SubmitBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100 mt-2">
      <div>
        <p className="text-xs text-gray-600">
          <span className="text-gray-500">Supplier:</span>{' '}
          <span className="font-bold text-gray-900">{supplierName || '-'}</span>
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          <span className="text-gray-500">เส้นทาง:</span>{' '}
          <span className="font-semibold text-gray-800">
            {originLabel} &rarr;{' '}
            {destMode === 'branch'
              ? destBranchName
              : customDest
                ? customDest.address.split(',').slice(0, 2).join(',')
                : 'ยังไม่ได้เลือกจุดปลายทาง'}
          </span>
          {distance > 0 && <span className="text-gray-400 ml-1 font-normal">({distance} กม.)</span>}
        </p>
        {selectedVinsCount > 0 && (
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            เลือก {selectedVinsCount} คัน &bull; ฿{estimatedCost.toLocaleString()}/คัน{' '}
            {selectedVinsCount > 1 && (
              <span className="font-bold">(รวม ฿{(estimatedCost * selectedVinsCount).toLocaleString()})</span>
            )}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#0f5238] text-white text-xs font-bold hover:bg-[#0a3d28] shadow-md transition-all cursor-pointer whitespace-nowrap"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>บันทึกและส่งมอบหมายงานรถสไลด์</span>
      </button>
    </div>
  );
}
