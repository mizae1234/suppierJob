'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { CarCategory } from '../_types';

interface CarCategorySelectorProps {
  carCategory: CarCategory;
  onChange: (category: CarCategory) => void;
  isLocked: boolean;
  themePrimary: string;
}

export function CarCategorySelector({
  carCategory,
  onChange,
  isLocked,
  themePrimary,
}: CarCategorySelectorProps) {
  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/90 shadow-xs flex flex-col gap-2.5 transition-opacity ${
        isLocked ? 'pointer-events-none opacity-45 select-none' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
            style={{ backgroundColor: themePrimary }}
          >
            2
          </span>
          <span>เลือกประเภทรถที่จะล้าง</span>
        </h2>
        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
          {carCategory === 'NEW_CAR' ? '🚗 รถใหม่' : '🔧 รถ Service'}
        </span>
      </div>

      {/* Category 2-Card Selection */}
      <div className="grid grid-cols-2 gap-2">
        {/* Option 1: รถใหม่ */}
        <button
          type="button"
          onClick={() => onChange('NEW_CAR')}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden ${
            carCategory === 'NEW_CAR'
              ? 'border-[#0f5238] bg-emerald-50/80 ring-1.5 ring-emerald-500/20 shadow-xs'
              : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs shadow-2xs">
              🚗
            </span>
            {carCategory === 'NEW_CAR' && (
              <span className="w-3.5 h-3.5 rounded-full bg-[#0f5238] text-white flex items-center justify-center shadow-xs">
                <Check className="w-2 h-2 stroke-[3]" />
              </span>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1">
              <span>รถใหม่</span>
              <span className="text-[9px] text-emerald-700 bg-emerald-100/70 font-semibold px-1 py-0.2 rounded">
                Stock / PDI
              </span>
            </div>
          </div>
        </button>

        {/* Option 2: รถ Service */}
        <button
          type="button"
          onClick={() => onChange('SERVICE')}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden ${
            carCategory === 'SERVICE'
              ? 'border-[#0f5238] bg-emerald-50/80 ring-1.5 ring-emerald-500/20 shadow-xs'
              : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs shadow-2xs">
              🔧
            </span>
            {carCategory === 'SERVICE' && (
              <span className="w-3.5 h-3.5 rounded-full bg-[#0f5238] text-white flex items-center justify-center shadow-xs">
                <Check className="w-2 h-2 stroke-[3]" />
              </span>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1">
              <span>รถ Service</span>
              <span className="text-[9px] text-amber-700 bg-amber-100/70 font-semibold px-1 py-0.2 rounded">
                ศูนย์บริการ
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
