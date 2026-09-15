'use client';

import React from 'react';
import { Home, ClipboardList, Plus, Receipt, User } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: 'HOME' | 'MY_JOBS' | 'INVOICES' | 'PROFILE';
  onChangeTab: (tab: 'HOME' | 'MY_JOBS' | 'INVOICES' | 'PROFILE') => void;
  onQuickSubmit: () => void;
  hasActiveWork?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab,
  onQuickSubmit,
  hasActiveWork = false,
}) => {
  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 pt-2 pb-5 shadow-nav z-40 rounded-t-3xl">
      <div className="flex items-center justify-between relative">
        {/* Tab 1: หน้าหลัก */}
        <button
          onClick={() => onChangeTab('HOME')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors ${
            activeTab === 'HOME' ? 'text-[#0f5b44]' : 'text-gray-400 hover:text-[#0f5b44]'
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-0.5">หน้าหลัก</span>
          <div
            className={`w-1.5 h-1.5 bg-[#0f5b44] rounded-full mt-0.5 ${
              activeTab === 'HOME' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </button>

        {/* Tab 2: งานของฉัน */}
        <button
          onClick={() => onChangeTab('MY_JOBS')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors ${
            activeTab === 'MY_JOBS' ? 'text-[#0f5b44]' : 'text-gray-400 hover:text-[#0f5b44]'
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center relative">
            <ClipboardList className="w-5 h-5" />
            {hasActiveWork && (
              <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-0 right-0" />
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">งานของฉัน</span>
          <div
            className={`w-1.5 h-1.5 bg-[#0f5b44] rounded-full mt-0.5 ${
              activeTab === 'MY_JOBS' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </button>

        {/* Tab 3: ส่งมอบงาน (+) Central Floating Action Button */}
        <button
          onClick={onQuickSubmit}
          className="flex flex-col items-center justify-center -mt-6 flex-1 group"
          title="ถ่ายรูปส่งมอบงานด่วน"
        >
          <div className="w-12 h-12 rounded-full bg-[#0f5b44] text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center border-4 border-white group-active:scale-95 transition-transform">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-[10px] font-bold text-[#0f5b44] tracking-tight mt-0.5">
            ส่งมอบงาน
          </span>
        </button>

        {/* Tab 4: วางบิล */}
        <button
          onClick={() => onChangeTab('INVOICES')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors ${
            activeTab === 'INVOICES' ? 'text-[#0f5b44]' : 'text-gray-400 hover:text-[#0f5b44]'
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">วางบิล</span>
          <div
            className={`w-1.5 h-1.5 bg-[#0f5b44] rounded-full mt-0.5 ${
              activeTab === 'INVOICES' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </button>

        {/* Tab 5: โปรไฟล์ */}
        <button
          onClick={() => onChangeTab('PROFILE')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors ${
            activeTab === 'PROFILE' ? 'text-[#0f5b44]' : 'text-gray-400 hover:text-[#0f5b44]'
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">โปรไฟล์</span>
          <div
            className={`w-1.5 h-1.5 bg-[#0f5b44] rounded-full mt-0.5 ${
              activeTab === 'PROFILE' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </button>
      </div>

      {/* iOS Home Indicator Bar */}
      <div className="w-32 h-1 bg-gray-300 rounded-full mx-auto mt-3"></div>
    </nav>
  );
};
