'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Building, Check, ChevronDown } from 'lucide-react';
import { Branch } from '@/types';

type BranchWithCompany = Branch & { companyCode?: string };

interface BranchSelectProps {
  branches: Branch[];
  value: string;
  onChange: (branchId: string) => void;
  /** สาขาที่เลือกไม่ได้ พร้อมข้อความกำกับ เช่น { [originId]: 'ต้นทาง' } */
  disabledIds?: Record<string, string>;
  placeholder?: string;
}

const COMPANY_DOTS: Record<string, string> = {
  EV7: '#2d6a4f',
  GI: '#3b82f6',
};

const getCompanyCode = (b: BranchWithCompany) =>
  b.companyCode || (b.code?.startsWith('EV7') ? 'EV7' : 'GI');

/**
 * Dropdown เลือกสาขา — สไตล์เดียวกับตัวเลือกบริษัทใน Header
 * จัดกลุ่มตามบริษัท (จุดสี) และแสดงสาขาย่อยพร้อมไอคอนอาคาร
 */
export const BranchSelect: React.FC<BranchSelectProps> = ({
  branches,
  value,
  onChange,
  disabledIds = {},
  placeholder = 'เลือกสาขา',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const selected = branches.find(b => b.id === value) as BranchWithCompany | undefined;

  // Group by company
  const groups = (branches as BranchWithCompany[]).reduce<Record<string, BranchWithCompany[]>>((acc, b) => {
    const code = getCompanyCode(b);
    (acc[code] ||= []).push(b);
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full h-10 px-3 rounded-xl border bg-white text-xs font-semibold flex items-center gap-2 transition-colors ${
          open ? 'border-[#0f5238] ring-2 ring-[#0f5238]/20' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {selected ? (
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: COMPANY_DOTS[getCompanyCode(selected)] || '#9ca3af' }}
            />
            <span className="flex-1 text-left truncate text-gray-900">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-gray-400">{placeholder}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-[#0f5238]' : 'text-gray-400'}`} />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-2xl bg-white border border-gray-100 shadow-lg overflow-hidden max-h-72 overflow-y-auto animate-slide-down">
          {Object.entries(groups).map(([code, list], gi) => (
            <div key={code}>
              {gi > 0 && <div className="h-px bg-gray-100" />}
              <div className="flex items-center gap-3 px-4 pt-3 pb-1.5 text-xs font-bold text-gray-700">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COMPANY_DOTS[code] || '#9ca3af' }} />
                <span>{code}</span>
              </div>
              {list.map(b => {
                const isSelected = b.id === value;
                const disabledLabel = disabledIds[b.id];
                const isDisabled = disabledLabel !== undefined;
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => { onChange(b.id); setOpen(false); }}
                    className={`w-full flex items-center gap-2 pl-9 pr-4 py-2.5 text-[11px] transition-colors ${
                      isDisabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : isSelected
                        ? 'bg-emerald-50 text-gray-900 font-semibold'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'
                    }`}
                  >
                    <Building className="w-3 h-3 shrink-0 opacity-50" />
                    <span className="flex-1 text-left truncate">{b.name}</span>
                    {isDisabled && (
                      <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[9px] font-bold text-gray-400 shrink-0">
                        {disabledLabel}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
          {branches.length === 0 && (
            <div className="px-4 py-6 text-center text-[11px] text-gray-400">ไม่มีสาขา</div>
          )}
        </div>
      )}
    </div>
  );
};

export default BranchSelect;
