'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Truck,
  ChevronsUpDown,
  Search,
  Check,
  Phone,
  MapPin,
  X,
  Store,
} from 'lucide-react';
import { Supplier } from '@/types';

export interface SupplierSelectorProps {
  suppliers: Supplier[];
  selectedSupplierId: string;
  onSelect: (supplierId: string) => void;
  serviceType: 'CAR_WASH' | 'VEHICLE_SLIDE';
  stepNumber?: number;
  title?: string;
  themeColor?: string;
  className?: string;
}

export const SupplierSelector: React.FC<SupplierSelectorProps> = ({
  suppliers,
  selectedSupplierId,
  onSelect,
  serviceType,
  stepNumber = 1,
  title,
  themeColor = '#0f5238',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Default title based on service
  const displayTitle =
    title ||
    (serviceType === 'CAR_WASH' ? 'เลือก Supplier คู่ค้า' : 'เลือก Supplier รถสไลด์');

  // Currently selected supplier
  const selectedSupplier = useMemo(
    () => suppliers.find(s => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );

  // Filter suppliers based on search query
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }, [suppliers, searchQuery]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus search input when opened
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (supId: string) => {
    onSelect(supId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const ServiceIcon = serviceType === 'CAR_WASH' ? Sparkles : Truck;

  return (
    <div
      ref={dropdownRef}
      className={`p-4 sm:p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs relative ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-2xs"
            style={{ backgroundColor: themeColor }}
          >
            {stepNumber}
          </span>
          <span>{displayTitle}</span>
        </h2>
        <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
          {suppliers.length} คู่ค้า
        </span>
      </div>

      {/* Selected Supplier Card / Trigger */}
      {selectedSupplier ? (
        <button
          type="button"
          onClick={() => setIsOpen(o => !o)}
          className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
            isOpen
              ? 'border-[#0f5238] bg-[#f4f9f5] ring-2 ring-[#0f5238]/20 shadow-sm'
              : 'border-emerald-700/25 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/30 hover:border-[#0f5238] hover:bg-emerald-50/40 hover:shadow-2xs'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Service Icon Badge */}
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-[#0f5238] flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
              <ServiceIcon className="w-5 h-5" />
            </div>

            {/* Supplier Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                {selectedSupplier.code && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0f5238] text-white tracking-wider">
                    {selectedSupplier.code}
                  </span>
                )}
                <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                  {selectedSupplier.name}
                </p>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-gray-500 mt-1">
                <span className="flex items-center gap-1 shrink-0">
                  <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                  {selectedSupplier.phone || 'ไม่มีเบอร์โทร'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  เลือกอยู่
                </span>
                {selectedSupplier.address && (
                  <span className="hidden sm:flex items-center gap-1 truncate text-gray-400">
                    • {selectedSupplier.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Change Button Pill */}
          <div className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50">
            <span>เปลี่ยน</span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full text-left p-3.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#0f5238] bg-gray-50/50 hover:bg-emerald-50/30 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 text-gray-500 text-xs">
            <Store className="w-4 h-4 text-gray-400" />
            <span>กรุณาคลิกเพื่อเลือก Supplier</span>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-gray-400" />
        </button>
      )}

      {/* Dropdown Floating Popover */}
      {isOpen && (
        <div className="absolute z-40 left-4 right-4 sm:left-5 sm:right-5 top-full mt-2 rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/80">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัส, หรือเบอร์โทร..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]/20 focus:border-[#0f5238] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Supplier Items List (Fixed max height with clean scrolling) */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-gray-100 overscroll-contain">
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map(sup => {
                const isSelected = sup.id === selectedSupplierId;
                return (
                  <button
                    key={sup.id}
                    type="button"
                    onClick={() => handleSelect(sup.id)}
                    className={`w-full text-left p-3 text-xs transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/90 text-gray-900 border-l-4 border-l-[#0f5238]'
                        : 'hover:bg-emerald-50/40 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Radio / Check indicator */}
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-[#0f5238] text-white'
                            : 'border-2 border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {sup.code && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-200">
                              {sup.code}
                            </span>
                          )}
                          <span
                            className={`font-bold truncate text-xs ${
                              isSelected ? 'text-[#0f5238]' : 'text-gray-900'
                            }`}
                          >
                            {sup.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                          <span className="flex items-center gap-1 shrink-0">
                            <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                            {sup.phone || 'ไม่มีเบอร์โทร'}
                          </span>
                          {sup.address && (
                            <span className="truncate text-gray-400">
                              • {sup.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[11px] font-bold text-[#0f5238] shrink-0 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                        เลือกอยู่
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-gray-500">
                <p>ไม่พบ Supplier ที่ตรงกับคำค้นหา &ldquo;{searchQuery}&rdquo;</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-semibold text-[#0f5238] hover:underline"
                >
                  ล้างคำค้นหา
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3.5 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>
              แสดง {filteredSuppliers.length} จากทั้งหมด {suppliers.length} คู่ค้า
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-200/60"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
