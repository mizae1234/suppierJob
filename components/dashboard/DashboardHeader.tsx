'use client';

import React from 'react';
import Link from 'next/link';
import { UserRole, CompanyCode } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { useTheme } from '@/hooks/useTheme';
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
  const theme = useTheme();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Title & Context */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
            ภาพรวมระบบจัดการงานซัพพลายเออร์
          </h1>
          <span
            className="px-3 py-1 rounded-full text-xs font-bold transition-colors duration-300"
            style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}
          >
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
      <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
        {/* Multi-Company Selector Pill */}
        <div className="flex items-center bg-white p-1 rounded-full border shadow-xs transition-colors duration-300" style={{ borderColor: theme.borderSoft }}>
          {(['ALL', 'EV7', 'GI'] as const).map(comp => {
            const isActive = currentCompany === comp;
            const activeColor = comp === 'GI' ? '#1e3a5f' : comp === 'EV7' ? '#0f5238' : theme.primary;
            return (
              <button
                key={comp}
                onClick={() => onSelectCompany(comp)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive ? 'text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                style={isActive ? { backgroundColor: activeColor } : {}}
              >
                {comp === 'ALL' ? 'ทุกบริษัท' : comp}
              </button>
            );
          })}
        </div>

        {/* Quick Mobile Portal Shortcut */}
        <Link
          href="/mobile"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition-colors shadow-xs"
          style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary, borderColor: `${theme.primary}33` }}
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
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold transition-all shadow-xs"
              style={{ backgroundColor: theme.primaryLight }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryLight; }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ สั่งล้างรถ</span>
            </Link>
            <Link
              href="/jobs/create-vehicle-slide"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold transition-all shadow-xs"
              style={{ backgroundColor: theme.primary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryHover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary; }}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>+ ขอรถสไลด์</span>
            </Link>
          </>
        )}

        {currentRole === 'SUPPLIER' && (
          <Link
            href="/invoices"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold transition-all shadow-xs"
            style={{ backgroundColor: theme.primary }}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>+ ออกใบวางบิล</span>
          </Link>
        )}
      </div>
    </div>
  );
};
