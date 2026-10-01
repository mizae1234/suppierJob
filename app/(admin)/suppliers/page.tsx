'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost } from '@/lib/job-utils';
import { Supplier } from '@/types';
import { 
  Store, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  Truck, 
  X,
  FileText, 
  Building, 
  ExternalLink,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Copy,
  Check,
  Clock,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function SupplierManagementPage() {
  const router = useRouter();
  const theme = useTheme();
  const { suppliers, jobs, currentRole, setCurrentRole, setCurrentSupplierId } = useApp();

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'ALL' | 'CAR_WASH' | 'VEHICLE_SLIDE'>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  // Compute overall KPI metrics
  const kpiStats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const activeJobs = jobs.filter(j => ['PENDING_SUPPLIER', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(j.status)).length;
    const completedJobs = jobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status)).length;
    const totalBilled = jobs.reduce((sum, j) => sum + getJobTotalCost(j), 0);

    return { totalSuppliers, activeJobs, completedJobs, totalBilled };
  }, [suppliers, jobs]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      // Service filter
      if (serviceFilter !== 'ALL' && !supplier.services.includes(serviceFilter)) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = supplier.name.toLowerCase().includes(q);
        const matchesCode = supplier.code.toLowerCase().includes(q);
        const matchesPhone = supplier.phone?.toLowerCase().includes(q);
        const matchesTax = supplier.taxId?.toLowerCase().includes(q);
        const matchesBank = supplier.bankName?.toLowerCase().includes(q) || supplier.bankAccount?.includes(q);
        return matchesName || matchesCode || matchesPhone || matchesTax || matchesBank;
      }

      return true;
    });
  }, [suppliers, serviceFilter, searchTerm]);

  // Counts for filter pills
  const washCount = useMemo(() => suppliers.filter(s => s.services.includes('CAR_WASH')).length, [suppliers]);
  const slideCount = useMemo(() => suppliers.filter(s => s.services.includes('VEHICLE_SLIDE')).length, [suppliers]);

  // Monogram helper for avatar
  const getMonogram = (name: string, code: string) => {
    if (code) {
      const parts = code.split('-');
      if (parts.length > 1) return parts[1].slice(0, 2).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
            >
              <Store className="w-5 h-5 text-white" />
            </div>
            <span>จัดการรายชื่อซัพพลายเออร์ (Supplier Management)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            บริหารคู่ค้าผู้ให้บริการล้างรถ ขนส่งรถสไลด์ บัญชีการเงิน ข้อมูลสัญญา และการวางบิล
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-emerald-50 text-[#0f5238] border border-emerald-200/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            คู่ค้าพร้อมให้บริการ {suppliers.length} ราย
          </span>
        </div>
      </div>

      {/* ── KPI Overview Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Suppliers */}
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">คู่ค้าทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0f5238] flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{kpiStats.totalSuppliers}</span>
            <span className="text-xs font-semibold text-gray-500">ราย</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Active พร้อมรับงาน 100%</span>
          </p>
        </div>

        {/* Card 2: Active Ongoing Jobs */}
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">งานกำลังทำ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{kpiStats.activeJobs}</span>
            <span className="text-xs font-semibold text-gray-500">งาน</span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-1">
            ระหว่างล้าง หรือกำลังขนส่ง
          </p>
        </div>

        {/* Card 3: Completed Jobs */}
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">งานที่ตรวจรับแล้ว</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f5238]">{kpiStats.completedJobs}</span>
            <span className="text-xs font-semibold text-gray-500">งาน</span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-1">
            พร้อมวางบิลหรือเบิกจ่าย
          </p>
        </div>

        {/* Card 4: Total Volume */}
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ยอดงานรวมสะสม</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs font-bold text-gray-400">฿</span>
            <span className="text-2xl font-black text-gray-900">{kpiStats.totalBilled.toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-gray-500 font-medium mt-1">
            มูลค่าบริการรวมทุกคู่ค้า
          </p>
        </div>
      </div>

      {/* ── Toolbar: Search, Filter Tabs & View Toggle ── */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อคู่ค้า, รหัส, เบอร์โทร, เลขประจำตัวผู้เสียภาษี..."
            className="w-full h-10 pl-10 pr-8 rounded-xl bg-[#f4f9f5] border border-gray-200/80 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0f5238] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Service Filter Pills & View Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Service Filter Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[#f4f9f5] border border-gray-200/60">
            <button
              onClick={() => setServiceFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                serviceFilter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              ทั้งหมด ({suppliers.length})
            </button>
            <button
              onClick={() => setServiceFilter('CAR_WASH')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                serviceFilter === 'CAR_WASH'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>ล้างรถ ({washCount})</span>
            </button>
            <button
              onClick={() => setServiceFilter('VEHICLE_SLIDE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                serviceFilter === 'VEHICLE_SLIDE'
                  ? 'bg-white text-blue-800 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Truck className="w-3 h-3 text-blue-600" />
              <span>รถสไลด์ ({slideCount})</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[#f4f9f5] border border-gray-200/60">
            <button
              onClick={() => setViewMode('CARDS')}
              title="แสดงแบบการ์ด (Card View)"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'CARDS'
                  ? 'bg-white text-[#0f5238] shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              title="แสดงแบบตาราง (Table View)"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white text-[#0f5238] shadow-2xs'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content View: Empty State ── */}
      {filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-2xs flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
            <Store className="w-6 h-6" />
          </div>
          <p className="text-gray-700 font-bold text-sm">ไม่พบรายชื่อซัพพลายเออร์ที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-gray-400 max-w-sm">
            ลองปรับเปลี่ยนคำค้นหา หรือเลือกแท็บประเภทบริการเป็น &quot;ทั้งหมด&quot; เพื่อดูข้อมูล
          </p>
          <button
            onClick={() => { setSearchTerm(''); setServiceFilter('ALL'); }}
            className="mt-2 px-4 py-2 rounded-xl bg-emerald-50 text-[#0f5238] font-bold text-xs hover:bg-emerald-100 transition-colors"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* ── View 1: Redesigned Cards Grid ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map(supplier => {
            const supplierJobs = jobs.filter(j => j.supplierId === supplier.id);
            const activeJobs = supplierJobs.filter(j => ['PENDING_SUPPLIER', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(j.status));
            const completedJobs = supplierJobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status));
            const totalRevenue = supplierJobs.reduce((acc, j) => acc + getJobTotalCost(j), 0);
            const monogram = getMonogram(supplier.name, supplier.code);

            return (
              <div
                key={supplier.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-emerald-200"
              >
                {/* Card Top / Header */}
                <div className="p-6">
                  {/* Avatar, Code & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm tracking-wider shadow-xs shrink-0"
                        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
                      >
                        {monogram}
                      </div>
                      <div>
                        <span className="font-mono text-xs font-bold text-gray-500 tracking-wide block">
                          {supplier.code}
                        </span>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-[#0f5238] transition-colors leading-snug line-clamp-1">
                          {supplier.name}
                        </h3>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0f5238] font-bold text-[10px] border border-emerald-200/60 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>

                  {/* Tax ID Tag */}
                  {supplier.taxId && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                      <span>เลขผู้เสียภาษี:</span>
                      <span className="font-mono font-medium text-gray-600">{supplier.taxId}</span>
                    </div>
                  )}

                  {/* Services Badges */}
                  <div className="flex items-center gap-2 flex-wrap mt-3.5">
                    {supplier.services.includes('CAR_WASH') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[#0f5238] font-bold text-[11px] border border-emerald-200/70">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>ล้างรถ (Car Wash)</span>
                      </span>
                    )}
                    {supplier.services.includes('VEHICLE_SLIDE') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-200/70">
                        <Truck className="w-3 h-3 text-blue-600" />
                        <span>รถสไลด์ (Slide)</span>
                      </span>
                    )}
                  </div>

                  {/* Contact & Banking Information Box */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-[#f4f9f5]/70 border border-gray-100 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <a 
                          href={`tel:${supplier.phone}`} 
                          className="font-medium text-gray-700 hover:text-emerald-700 truncate"
                        >
                          {supplier.phone || '-'}
                        </a>
                      </div>
                      {supplier.email && (
                        <div className="flex items-center gap-2 min-w-0 text-right">
                          <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <a 
                            href={`mailto:${supplier.email}`} 
                            className="font-medium text-gray-600 hover:text-emerald-700 truncate max-w-[130px]"
                            title={supplier.email}
                          >
                            {supplier.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Bank Account */}
                    {supplier.bankName && supplier.bankAccount && (
                      <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="text-gray-500 truncate">{supplier.bankName}</span>
                          <span className="font-mono font-bold text-gray-800 truncate">{supplier.bankAccount}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(supplier.bankAccount || '', supplier.id)}
                          title="คัดลอกเลขบัญชี"
                          className="p-1 rounded-md hover:bg-white text-gray-400 hover:text-emerald-700 transition-colors shrink-0"
                        >
                          {copiedAccount === supplier.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Work Statistics Bar */}
                  <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-2xl bg-gray-50/70 border border-gray-100 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">กำลังทำ</span>
                      <span className="text-sm font-black text-amber-600 mt-0.5 block">{activeJobs.length} งาน</span>
                    </div>
                    <div className="border-x border-gray-200/70">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ตรวจรับแล้ว</span>
                      <span className="text-sm font-black text-[#0f5238] mt-0.5 block">{completedJobs.length} งาน</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ยอดรวม</span>
                      <span className="text-sm font-black text-gray-900 mt-0.5 block">฿{totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Action Buttons (No text wrapping!) */}
                <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex items-center gap-2">
                  {currentRole === 'MASTER' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSupplierId(supplier.id);
                        setCurrentRole('SUPPLIER');
                        router.push('/vendor');
                      }}
                      title="เข้าสู่ระบบในมุมมอง Vendor Portal ของคู่ค้ารายนี้"
                      className="flex-1 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer hover:shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>ดูมุมมองคู่ค้า</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedSupplier(supplier)}
                    className="flex-1 h-9 px-3 rounded-xl bg-white hover:bg-emerald-50 text-[#0f5238] border border-gray-200 hover:border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>รายละเอียด</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── View 2: Redesigned Table View ── */
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-12">#</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ซัพพลายเออร์ (Supplier)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">บริการที่รับ</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ช่องทางติดต่อ</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">บัญชีรับเงิน</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">งานกำลังทำ</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">เสร็จสิ้น</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">ยอดรวมสะสม</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[190px]">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredSuppliers.map((supplier, idx) => {
                  const supplierJobs = jobs.filter(j => j.supplierId === supplier.id);
                  const activeJobs = supplierJobs.filter(j => ['PENDING_SUPPLIER', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(j.status));
                  const completedJobs = supplierJobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status));
                  const totalRevenue = supplierJobs.reduce((acc, j) => acc + getJobTotalCost(j), 0);
                  const monogram = getMonogram(supplier.name, supplier.code);

                  return (
                    <tr key={supplier.id} className="hover:bg-[#fbfdfc] transition-colors group">
                      <td className="py-3 px-4 text-center text-gray-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Name & Code */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-2xs shrink-0"
                            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
                          >
                            {monogram}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 group-hover:text-[#0f5238] transition-colors">
                                {supplier.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-[#0f5238] font-bold text-[10px] border border-emerald-200/60 font-mono">
                                {supplier.code}
                              </span>
                            </div>
                            {supplier.taxId && (
                              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                TAX: {supplier.taxId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Services */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {supplier.services.includes('CAR_WASH') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[#0f5238] font-bold text-[10px] border border-emerald-200/60">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              <span>ล้างรถ</span>
                            </span>
                          )}
                          {supplier.services.includes('VEHICLE_SLIDE') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200/60">
                              <Truck className="w-2.5 h-2.5 text-blue-600" />
                              <span>สไลด์</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contacts */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <a 
                            href={`tel:${supplier.phone}`} 
                            className="font-medium text-gray-800 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span>{supplier.phone || '-'}</span>
                          </a>
                          {supplier.email && (
                            <a 
                              href={`mailto:${supplier.email}`} 
                              className="text-[11px] text-gray-500 hover:text-emerald-700 truncate max-w-[170px]"
                            >
                              {supplier.email}
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Bank Account */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {supplier.bankName ? (
                          <div className="flex items-center gap-1.5">
                            <div>
                              <p className="font-semibold text-gray-900 leading-tight">{supplier.bankName}</p>
                              <p className="font-mono text-[11px] text-gray-500 mt-0.5">{supplier.bankAccount}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(supplier.bankAccount || '', supplier.id)}
                              title="คัดลอกเลขบัญชี"
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-700 transition-colors"
                            >
                              {copiedAccount === supplier.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Active Work */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                          {activeJobs.length} งาน
                        </span>
                      </td>

                      {/* Completed Work */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs bg-emerald-50 text-[#0f5238] border border-emerald-200">
                          {completedJobs.length} งาน
                        </span>
                      </td>

                      {/* Total Turnover */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-gray-900">
                        ฿{totalRevenue.toLocaleString()}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {currentRole === 'MASTER' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentSupplierId(supplier.id);
                                setCurrentRole('SUPPLIER');
                                router.push('/vendor');
                              }}
                              title="เข้าสู่มุมมองคู่ค้ารายนี้"
                              className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span>มุมมองคู่ค้า</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedSupplier(supplier)}
                            className="h-8 px-2.5 rounded-lg bg-white hover:bg-emerald-50 text-[#0f5238] border border-gray-200 hover:border-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                          >
                            <FileText className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span>รายละเอียด</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500">
            <span>แสดงคู่ค้า <strong>{filteredSuppliers.length}</strong> จากทั้งหมด <strong>{suppliers.length}</strong> ราย</span>
            <span>กดปุ่ม &quot;มุมมองคู่ค้า&quot; เพื่อทดสอบเข้าใช้งานในหน้า Vendor Portal ของคู่ค้าแต่ละราย</span>
          </div>
        </div>
      )}

      {/* ── Supplier Details Slide-Over Drawer ── */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Dimmed Backdrop */}
          <div 
            onClick={() => setSelectedSupplier(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full pointer-events-auto border-l border-gray-100 animate-slide-in-right">
              
              {/* Sticky Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm tracking-wider shadow-xs shrink-0"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
                  >
                    {getMonogram(selectedSupplier.name, selectedSupplier.code)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 leading-snug">
                        {selectedSupplier.name}
                      </h3>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238]">
                        {selectedSupplier.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      พาร์ทเนอร์ผู้ให้บริการ (Active Verified Partner)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  title="ปิด (Esc)"
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-xs">
                {/* Metrics Highlights */}
                {(() => {
                  const supplierJobs = jobs.filter(j => j.supplierId === selectedSupplier.id);
                  const activeCount = supplierJobs.filter(j => ['PENDING_SUPPLIER', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(j.status)).length;
                  const completedCount = supplierJobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status)).length;
                  const totalBilled = supplierJobs.reduce((acc, j) => acc + getJobTotalCost(j), 0);

                  return (
                    <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10">
                      <div>
                        <span className="text-[11px] text-gray-500 font-medium">งานกำลังทำ:</span>
                        <p className="text-xl font-black text-amber-600 mt-1">{activeCount} งาน</p>
                      </div>
                      <div className="border-x border-gray-200/80 px-3">
                        <span className="text-[11px] text-gray-500 font-medium">ตรวจรับแล้ว:</span>
                        <p className="text-xl font-black text-[#0f5238] mt-1">{completedCount} งาน</p>
                      </div>
                      <div className="pl-1">
                        <span className="text-[11px] text-gray-500 font-medium">ยอดงานรวม:</span>
                        <p className="text-xl font-black text-gray-900 mt-1">฿{totalBilled.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Services Tags */}
                <div>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    บริการที่ได้รับมอบหมาย
                  </h4>
                  <div className="flex items-center gap-2">
                    {selectedSupplier.services.includes('CAR_WASH') && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-[#0f5238] font-bold text-xs border border-emerald-200">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>บริการล้างรถ (Car Wash Service)</span>
                      </span>
                    )}
                    {selectedSupplier.services.includes('VEHICLE_SLIDE') && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 font-bold text-xs border border-blue-200">
                        <Truck className="w-3.5 h-3.5 text-blue-600" />
                        <span>บริการรถสไลด์ขนส่ง (Vehicle Slide Service)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Corporate & Contact Details */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-3">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-gray-500" />
                    <span>ข้อมูลนิติบุคคลและการติดต่อ</span>
                  </h4>

                  <div className="space-y-3 text-xs text-gray-700">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-gray-500 block">ที่อยู่จดทะเบียน:</span>
                        <p className="font-medium text-gray-900 mt-0.5">{selectedSupplier.address || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <span className="text-gray-500 block">เบอร์โทรศัพท์:</span>
                        <p className="font-medium text-gray-900 mt-0.5">
                          {selectedSupplier.phone ? (
                            <a href={`tel:${selectedSupplier.phone}`} className="text-emerald-700 hover:underline">
                              {selectedSupplier.phone}
                            </a>
                          ) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <span className="text-gray-500 block">อีเมลติดต่อ:</span>
                        <p className="font-medium text-gray-900 mt-0.5">
                          {selectedSupplier.email ? (
                            <a href={`mailto:${selectedSupplier.email}`} className="text-emerald-700 hover:underline">
                              {selectedSupplier.email}
                            </a>
                          ) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <span className="text-gray-500 block">เลขประจำตัวผู้เสียภาษี (Tax ID):</span>
                        <p className="font-mono font-bold text-gray-900 mt-0.5">{selectedSupplier.taxId || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank / Payout Information */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-3">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                    <span>ข้อมูลการเงินและการโอนเงิน (Bank Account)</span>
                  </h4>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">ธนาคาร:</span>
                      <span className="font-bold text-gray-900">{selectedSupplier.bankName || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">เลขที่บัญชี:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#0f5238]">{selectedSupplier.bankAccount || '-'}</span>
                        {selectedSupplier.bankAccount && (
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedSupplier.bankAccount || '', 'drawer')}
                            className="p-1 rounded text-gray-400 hover:text-emerald-700"
                            title="คัดลอกเลขบัญชี"
                          >
                            {copiedAccount === 'drawer' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">ชื่อบัญชี:</span>
                      <span className="font-medium text-gray-800">{selectedSupplier.name}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Jobs by this Supplier */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      รายการงานล่าสุดของ Supplier นี้
                    </h4>
                    <a 
                      href={`/jobs?supplierId=${selectedSupplier.id}`}
                      className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                    >
                      <span>ดูงานทั้งหมด</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>

                  {(() => {
                    const recentJobs = jobs.filter(j => j.supplierId === selectedSupplier.id).slice(0, 5);
                    if (recentJobs.length === 0) {
                      return (
                        <div className="p-6 rounded-2xl bg-gray-50 text-center text-gray-400 text-xs">
                          ยังไม่มีประวัติการส่งมอบงานในระบบ
                        </div>
                      );
                    }
                    return (
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-2xs">
                        {recentJobs.map(job => (
                          <div key={job.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#fbfdfc] transition-colors">
                            <div>
                              <span className="font-mono font-bold text-gray-900">{job.jobNumber}</span>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {job.jobType === 'CAR_WASH' ? '🧼 ล้างรถ' : '🚛 รถสไลด์'} • {job.branchName}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-[#0f5238] block font-mono">
                                ฿{getJobTotalCost(job).toLocaleString()}
                              </span>
                              <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                {job.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-white/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center justify-between shrink-0 shadow-xs">
                {currentRole === 'MASTER' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSupplierId(selectedSupplier.id);
                      setCurrentRole('SUPPLIER');
                      router.push('/vendor');
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#0f5238] hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                    <span>เข้าสู่หน้า Vendor Portal &rarr;</span>
                  </button>
                ) : (
                  <a
                    href={`/jobs?supplierId=${selectedSupplier.id}`}
                    className="text-xs font-bold text-[#0f5238] hover:underline"
                  >
                    เปิดตารางงานของเจ้านี้ &rarr;
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28] transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
