'use client';

import React from 'react';
import { BarChart3, Building2, FileDown } from 'lucide-react';
import { CompanyFilter } from '../_lib/report-calculations';
import { ReportContextInfo } from '../_hooks/useReportData';

interface ReportsHeaderProps {
  context: ReportContextInfo;
  companyFilter: CompanyFilter;
  onChangeCompanyFilter: (filter: CompanyFilter) => void;
  onExportCSV: () => void;
}

export default function ReportsHeader({
  context,
  companyFilter,
  onChangeCompanyFilter,
  onExportCSV,
}: ReportsHeaderProps) {
  const { currentRole, activeBranch } = context;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-700 shrink-0" />
          <span>รายงานสรุปและสถิติ</span>
          {currentRole === 'BRANCH' && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
              {activeBranch?.name || 'สาขา'}
            </span>
          )}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {currentRole === 'BRANCH'
            ? `ภาพรวมค่าใช้จ่ายและสถิติงานบริการเฉพาะสาขา ${activeBranch?.name || ''}`
            : 'ภาพรวมค่าใช้จ่าย สถิติงานล้างรถ และงานรถสไลด์ขนส่งรถยนต์'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Branch Badge - Only for BRANCH users */}
        {currentRole === 'BRANCH' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{activeBranch?.name || 'สาขาของคุณ'}</span>
          </div>
        )}

        {/* Company Filter Pill - Only for ADMIN / MASTER */}
        {currentRole !== 'BRANCH' && (
          <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-semibold">
            {(['ALL', 'EV7', 'GI'] as const).map(code => (
              <button
                key={code}
                type="button"
                onClick={() => onChangeCompanyFilter(code)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  companyFilter === code
                    ? 'bg-white text-emerald-950 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {code === 'ALL' ? 'ทุกบริษัท' : code}
              </button>
            ))}
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>ส่งออก CSV</span>
        </button>
      </div>
    </div>
  );
}
