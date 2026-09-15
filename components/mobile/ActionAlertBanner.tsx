'use client';

import React from 'react';
import { ClipboardList, ChevronRight } from 'lucide-react';

interface ActionAlertBannerProps {
  newJobsCount: number;
  onClick: () => void;
}

export const ActionAlertBanner: React.FC<ActionAlertBannerProps> = ({
  newJobsCount,
  onClick,
}) => {
  return (
    <section data-purpose="announcement-banner">
      <div
        onClick={onClick}
        className="bg-[#f2faf5] border border-emerald-200/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all group active:scale-[0.99]"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-[#0f5b44] shadow-xs shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-xs tracking-tight">
              ตรวจสอบงานที่มอบหมาย
            </div>
            <div className="text-[11px] text-[#0f5b44] font-medium mt-0.5">
              {newJobsCount > 0
                ? `มีงานใหม่ ${newJobsCount} งานวันนี้ที่ต้องดำเนินการ`
                : 'ไม่มีงานใหม่ค้างรับในขณะนี้ (อัปเดตเรียลไทม์)'}
            </div>
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center text-[#0f5b44] group-hover:translate-x-0.5 transition-transform border border-emerald-100/60 shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </section>
  );
};
