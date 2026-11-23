'use client';

import React, { useState } from 'react';
import { Check, CheckCheck, ChevronDown, Sparkles } from 'lucide-react';
import { CAR_WASH_REASONS, getWashReasonItem } from '../_utils';

interface BatchWashReasonBarProps {
  selectedCount: number;
  batchReason: string;
  onBatchReasonChange: (reason: string) => void;
  onApplyToAll: (customReasonValue?: string) => void;
}

export function BatchWashReasonBar({
  selectedCount,
  batchReason,
  onBatchReasonChange,
  onApplyToAll,
}: BatchWashReasonBarProps) {
  const [openBatchReason, setOpenBatchReason] = useState(false);
  const batchReasonObj = getWashReasonItem(batchReason);

  return (
    <div className="p-3 sm:px-4 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-50/70 via-slate-50 to-emerald-50/40 border border-emerald-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <span>Apply เหตุผลให้ทุกคัน</span>
            <span className="text-[10px] text-emerald-800 bg-emerald-100/80 font-bold px-1.5 py-0.5 rounded">
              {selectedCount} คัน
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            เลือกเหตุผลที่ต้องการ แล้วกดปุ่ม Apply เพื่ออัปเดตรถทุกคันพร้อมกัน
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 sm:w-72">
          <button
            type="button"
            onClick={() => setOpenBatchReason(o => !o)}
            className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold text-left flex items-center justify-between gap-2 cursor-pointer transition-all bg-white shadow-2xs hover:border-gray-300 ${
              openBatchReason
                ? 'border-[#0f5238] ring-2 ring-emerald-500/20 text-gray-900'
                : 'border-gray-300 text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm leading-none shrink-0">{batchReasonObj.icon}</span>
              <span className="truncate font-semibold">{batchReasonObj.label}</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
                openBatchReason ? 'rotate-180 text-[#0f5238]' : ''
              }`}
            />
          </button>

          {openBatchReason && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenBatchReason(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden z-50 py-1 divide-y divide-gray-50">
                {CAR_WASH_REASONS.map(r => {
                  const isSelected = batchReasonObj.value === r.value;
                  return (
                    <button
                      type="button"
                      key={r.value}
                      onMouseDown={e => {
                        e.preventDefault();
                        onBatchReasonChange(r.value);
                        setOpenBatchReason(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-bold border-l-2 border-l-[#0f5238]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm leading-none shrink-0">{r.icon}</span>
                        <span className="truncate">{r.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0f5238] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => onApplyToAll()}
          className="h-9 px-3.5 rounded-lg bg-[#0f5238] hover:bg-[#0d452f] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all shrink-0 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Apply ทั้งหมด</span>
        </button>
      </div>
    </div>
  );
}
