'use client';

import React from 'react';
import Link from 'next/link';
import { UserRole, CompanyCode } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { Sparkles, Truck, Receipt, Smartphone } from 'lucide-react';

interface DashboardHeaderProps {
  currentRole: UserRole;
  currentCompany: 'ALL' | CompanyCode;
  onSelectCompany: (company: 'ALL' | CompanyCode) => void;
  activeBranchName?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentRole,
  currentCompany,
  onSelectCompany,
  activeBranchName,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Title & Context */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
            ภาพรวมระบบจัดการงานซัพพลายเออร์
          </h1>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#0f5238] text-xs font-bold">
            VendorOps Central Hub
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
          <span>ข้อมูลประจำวัน: {formatThaiDate(new Date())}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
          <span>
            {currentRole === 'ADMIN' && 'โหมดภาพรวมทุกสาขา (Central Admin)'}
            {currentRole === 'BRANCH' && `สาขา: ${activeBranchName || 'ที่เลือก'}`}
            {currentRole === 'SUPPLIER' && 'โหมดคู่ค้าซัพพลายเออร์'}
          </span>
        </p>
      </div>

      {/* Action Controls & Company Pill */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Multi-Company Selector Pill */}
        <div className="flex items-center bg-white p-1 rounded-full border border-emerald-950/10 shadow-xs">
          {(['ALL', 'EV7', 'GI'] as const).map(comp => (
            <button
              key={comp}
              onClick={() => onSelectCompany(comp)}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                currentCompany === comp
                  ? 'bg-[#0f5238] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {comp === 'ALL' ? 'ทุกบริษัท' : comp}
            </button>
          ))}
        </div>

        {/* Quick Mobile Portal Shortcut */}
        <Link
          href="/mobile"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#0f5238] border border-emerald-200 text-xs font-semibold transition-colors shadow-xs"
          title="เปิดโหมดมือถือสำหรับคนขับ / ช่าง Supplier"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>โหมดมือถือ</span>
        </Link>

        {/* Quick Create Buttons */}
        {currentRole !== 'SUPPLIER' && (
          <>
            <Link
              href="/jobs/create-car-wash"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ สั่งล้างรถ</span>
            </Link>
            <Link
              href="/jobs/create-vehicle-slide"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0f5238] text-white text-xs font-semibold hover:bg-[#0a3d28] transition-all shadow-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>+ ขอรถสไลด์</span>
            </Link>
          </>
        )}

        {currentRole === 'SUPPLIER' && (
          <Link
            href="/invoices"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0f5238] text-white text-xs font-semibold hover:bg-[#0a3d28] transition-all shadow-xs"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>+ ออกใบวางบิล</span>
          </Link>
        )}
      </div>
    </div>
  );
};
