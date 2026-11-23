'use client';

import React from 'react';
import { BarChart3, Sparkles, Truck } from 'lucide-react';
import { ReportTab } from '../_lib/report-calculations';

interface ReportsTabBarProps {
  activeTab: ReportTab;
  onChangeTab: (tab: ReportTab) => void;
  washJobsCount: number;
  slideJobsCount: number;
}

export default function ReportsTabBar({
  activeTab,
  onChangeTab,
  washJobsCount,
  slideJobsCount,
}: ReportsTabBarProps) {
  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-gray-100/90 rounded-2xl w-full sm:w-fit overflow-x-auto">
      <button
        type="button"
        onClick={() => onChangeTab('overview')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
          activeTab === 'overview'
            ? 'bg-white text-emerald-950 shadow-xs'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <BarChart3 className="w-4 h-4 text-emerald-700" />
        <span>ภาพรวมระบบ</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab('wash')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
          activeTab === 'wash'
            ? 'bg-white text-emerald-950 shadow-xs'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <Sparkles className="w-4 h-4 text-amber-600" />
        <span>งานล้างรถ (Car Wash)</span>
        <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
          {washJobsCount} ใบ
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab('slide')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
          activeTab === 'slide'
            ? 'bg-white text-emerald-950 shadow-xs'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <Truck className="w-4 h-4 text-sky-600" />
        <span>งานรถสไลด์ (Vehicle Slide)</span>
        <span className="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-900 text-[10px] font-bold">
          {slideJobsCount} เที่ยว
        </span>
      </button>
    </div>
  );
}
