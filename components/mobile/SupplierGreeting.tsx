'use client';

import React from 'react';
import { Branch } from '@/types';
import { ChevronDown } from 'lucide-react';

interface SupplierGreetingProps {
  supplierName: string;
  branches: Branch[];
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  companyLabel?: string;
}

export const SupplierGreeting: React.FC<SupplierGreetingProps> = ({
  supplierName,
  branches,
  selectedBranchId,
  onSelectBranch,
  companyLabel = 'ภาพรวมการดำเนินงาน EV7 วันนี้',
}) => {
  // Format current date dynamically in Thai
  const todayThaiString = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const selectedBranchName = selectedBranchId === 'ALL'
    ? 'ทุกสาขา'
    : (branches.find(b => b.id === selectedBranchId)?.name || 'สาขาที่เลือก');

  return (
    <section className="flex items-end justify-between px-1" data-purpose="user-greeting">
      <div>
        <div className="text-xs text-gray-500 font-normal">{todayThaiString}</div>
        <div className="text-xl font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
          สวัสดี, {supplierName.split(' ')[0]} <span className="text-lg">👋</span>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
          <span>{selectedBranchName}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          <span className="text-[#0f5b44] font-medium">{companyLabel}</span>
        </div>
      </div>

      {/* Dynamic Branch Filter Pill */}
      <div className="relative">
        <select
          value={selectedBranchId}
          onChange={(e) => onSelectBranch(e.target.value)}
          className="appearance-none text-xs font-semibold bg-white border border-gray-200 pl-3 pr-7 py-1.5 rounded-lg text-slate-700 shadow-xs outline-none focus:ring-2 focus:ring-[#0f5b44] cursor-pointer"
        >
          <option value="ALL">ทุกสาขา</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </section>
  );
};
