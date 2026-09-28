'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
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

const typeOptions: { value: 'ALL' | JobType; label: string }[] = [
  { value: 'ALL', label: 'ทุกประเภท' },
  { value: 'CAR_WASH', label: 'Car Wash' },
  { value: 'VEHICLE_SLIDE', label: 'สไลด์' },
];

const statusOptions: { value: 'ALL' | JobStatus; label: string; dot?: string }[] = [
  { value: 'ALL', label: 'ทุกสถานะ', dot: '#6b7280' },
  { value: 'PENDING_SUPPLIER', label: 'รอ Supplier', dot: '#3b82f6' },
  { value: 'IN_PROGRESS', label: 'กำลังทำ', dot: '#f59e0b' },
  { value: 'WAITING_APPROVAL', label: 'รอตรวจรับ', dot: '#8b5cf6' },
  { value: 'APPROVED', label: 'Approved', dot: '#10b981' },
  { value: 'REJECTED', label: 'แก้ไข', dot: '#ef4444' },
  { value: 'INVOICED', label: 'วางบิลแล้ว', dot: '#6366f1' },
];

type FilterKey = 'type' | 'status' | 'supplier';

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
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const supplierOptions: { value: string; label: string }[] = [
    { value: 'ALL', label: 'ทุก Supplier' },
    ...suppliers.map(s => ({ value: s.id, label: s.name })),
  ];

  // Close on click outside
  useEffect(() => {
    if (!openFilter) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openFilter]);

  const toggle = (key: FilterKey) => {
    setOpenFilter(prev => prev === key ? null : key);
  };

  // Get current dropdown options and handler
  const getActiveDropdown = () => {
    switch (openFilter) {
      case 'type':
        return { options: typeOptions as { value: string; label: string; dot?: string }[], value: typeFilter, onChange: (v: string) => onTypeFilterChange(v as 'ALL' | JobType) };
      case 'status':
        return { options: statusOptions as { value: string; label: string; dot?: string }[], value: statusFilter, onChange: (v: string) => onStatusFilterChange(v as 'ALL' | JobStatus) };
      case 'supplier':
        return { options: supplierOptions as { value: string; label: string; dot?: string }[], value: supplierFilter, onChange: onSupplierFilterChange };
      default:
        return null;
    }
  };

  const activeDropdown = getActiveDropdown();

  const typeLabel = typeOptions.find(o => o.value === typeFilter)?.label || 'ประเภท';
  const statusLabel = statusOptions.find(o => o.value === statusFilter)?.label || 'สถานะ';
  const supplierLabel = supplierOptions.find(o => o.value === supplierFilter)?.label || 'Supplier';

  return (
    <div ref={containerRef} className="p-4 rounded-2xl bg-white border shadow-xs flex flex-col gap-3 relative" style={{ borderColor: theme.borderSoft }}>
      {/* Search */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหา Job No., VIN, ทะเบียนรถ..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2"
          style={{ backgroundColor: theme.bgSoft, '--tw-ring-color': theme.primary } as React.CSSProperties}
        />
      </div>

      {/* Filter Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { key: 'type' as FilterKey, label: typeLabel },
          { key: 'status' as FilterKey, label: statusLabel },
          { key: 'supplier' as FilterKey, label: supplierLabel },
        ]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-1.5 w-full text-left transition-colors ${
              openFilter === key
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 text-gray-700'
            }`}
            style={openFilter !== key ? { backgroundColor: theme.bgSoft } : {}}
          >
            <span className="truncate">{label}</span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${openFilter === key ? 'rotate-180 text-emerald-600' : 'text-gray-400'}`} />
          </button>
        ))}
      </div>

      {/* Dropdown Panel — full width of container */}
      {activeDropdown && (
        <div className="rounded-xl bg-white border border-gray-100 shadow-lg overflow-hidden animate-slide-down">
          {activeDropdown.options.map((opt) => {
            const isActive = opt.value === activeDropdown.value;
            return (
              <button
                key={opt.value}
                onClick={() => { activeDropdown.onChange(opt.value); setOpenFilter(null); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-gray-900 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {opt.dot && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.dot }} />
                )}
                <span className="flex-1 text-left">{opt.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
