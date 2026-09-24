'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { JobType, JobStatus, Supplier } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';

interface JobFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: 'ALL' | JobType;
  onTypeFilterChange: (value: 'ALL' | JobType) => void;
  statusFilter: 'ALL' | JobStatus;
  onStatusFilterChange: (value: 'ALL' | JobStatus) => void;
  supplierFilter: string;
  onSupplierFilterChange: (value: string) => void;
  suppliers: Supplier[];
  theme: ThemeColors;
}

export const JobFilters: React.FC<JobFiltersProps> = ({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  supplierFilter,
  onSupplierFilterChange,
  suppliers,
  theme,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white border shadow-xs flex flex-col lg:flex-row items-center gap-3" style={{ borderColor: theme.borderSoft }}>
      {/* Search */}
      <div className="relative flex-1 w-full">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหา Job No., VIN, ทะเบียนรถ, สาขา, Supplier..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2"
          style={{ backgroundColor: theme.bgSoft, '--tw-ring-color': theme.primary } as React.CSSProperties}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as 'ALL' | JobType)}
          className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2"
          style={{ backgroundColor: theme.bgSoft, '--tw-ring-color': theme.primary } as React.CSSProperties}
        >
          <option value="ALL">ทุกประเภทงาน</option>
          <option value="CAR_WASH">Car Wash (สั่งล้างรถ)</option>
          <option value="VEHICLE_SLIDE">Vehicle Slide (รถสไลด์)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as 'ALL' | JobStatus)}
          className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2"
          style={{ backgroundColor: theme.bgSoft, '--tw-ring-color': theme.primary } as React.CSSProperties}
        >
          <option value="ALL">ทุกสถานะ</option>
          <option value="PENDING_SUPPLIER">รอ Supplier รับงาน</option>
          <option value="IN_PROGRESS">กำลังปฏิบัติงาน</option>
          <option value="WAITING_APPROVAL">รอสาขาตรวจรับ</option>
          <option value="APPROVED">Approved (พร้อมวางบิล)</option>
          <option value="REJECTED">ขอแก้ไข (Reject)</option>
          <option value="INVOICED">วางบิลแล้ว</option>
        </select>

        {/* Supplier Filter */}
        <select
          value={supplierFilter}
          onChange={(e) => onSupplierFilterChange(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2"
          style={{ backgroundColor: theme.bgSoft, '--tw-ring-color': theme.primary } as React.CSSProperties}
        >
          <option value="ALL">ทุก Supplier</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
