'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { Branch, Company } from '@/types';
import {
  Building2,
  Phone,
  MapPin,
  Map,
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Copy,
  Check,
  X,
  FileText,
  Car,
  ClipboardList,
  Compass,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Users as UsersIcon,
  Navigation,
} from 'lucide-react';

const MapPickerModal = dynamic(() => import('@/components/jobs/MapPickerModal'), { ssr: false });

export default function BranchManagementPage() {
  const theme = useTheme();
  const {
    branches: contextBranches,
    companies,
    vehicles,
    jobs,
    currentRole,
    refreshData,
  } = useApp();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'ALL' | string>('ALL');
  const [gpsFilter, setGpsFilter] = useState<'ALL' | 'HAS_GPS' | 'NO_GPS'>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modals state
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [mapPickerBranch, setMapPickerBranch] = useState<Branch | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status / toast notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch branches with counts from API
  const loadBranches = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/branches');
      if (res.ok) {
        const data = await res.json();
        if (data.branches) {
          setBranches(data.branches);
        }
      }
    } catch (e) {
      console.error('Failed to load branches:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [contextBranches]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      // Company filter
      if (companyFilter !== 'ALL' && branch.companyCode !== companyFilter) {
        return false;
      }

      // GPS filter
      const hasGps = branch.latitude !== null && branch.latitude !== undefined && branch.longitude !== null && branch.longitude !== undefined;
      if (gpsFilter === 'HAS_GPS' && !hasGps) return false;
      if (gpsFilter === 'NO_GPS' && hasGps) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = branch.name.toLowerCase().includes(q);
        const matchesCode = branch.code.toLowerCase().includes(q);
        const matchesPhone = branch.phone?.toLowerCase().includes(q);
        const matchesAddress = branch.address?.toLowerCase().includes(q);
        const matchesCompany = branch.companyCode?.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesPhone || matchesAddress || matchesCompany;
      }

      return true;
    });
  }, [branches, companyFilter, gpsFilter, searchTerm]);

  // Statistics for pills
  const giCount = useMemo(() => branches.filter((b) => b.companyCode === 'GI').length, [branches]);
  const ev7Count = useMemo(() => branches.filter((b) => b.companyCode === 'EV7').length, [branches]);
  const hasGpsCount = useMemo(
    () => branches.filter((b) => b.latitude && b.longitude).length,
    [branches]
  );
  const noGpsCount = useMemo(
    () => branches.filter((b) => !b.latitude || !b.longitude).length,
    [branches]
  );

  // Monogram helper for branch avatar
  const getBranchMonogram = (name: string, code: string) => {
    if (code.includes('-')) {
      const parts = code.split('-');
      return (parts[1] || parts[0]).slice(0, 2).toUpperCase();
    }
    return code.slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
  };



  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* ── Toast Notification ── */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-red-900 text-white border-red-700'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
            >
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span>จัดการข้อมูลสาขา (Branch Management)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            บริหารรายชื่อสาขา พิกัด GPS จุดรับ-ส่งรถ สต็อกรถประจำสาขา และข้อมูลการติดต่อ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full bg-emerald-50 text-[#0f5238] border border-emerald-200/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            สาขาในระบบ {branches.length} สาขา
          </span>

          {['MASTER', 'ADMIN'].includes(currentRole) && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white text-xs font-bold shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มสาขาใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar: Search, Filters & View Toggle ── */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อสาขา, รหัสสาขา, ที่อยู่, เบอร์โทร..."
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

        {/* Right: Filter Tabs & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Company Filter Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[#f4f9f5] border border-gray-200/60">
            <button
              onClick={() => setCompanyFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                companyFilter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              ทั้งหมด ({branches.length})
            </button>
            {giCount > 0 && (
              <button
                onClick={() => setCompanyFilter('GI')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  companyFilter === 'GI'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                GI ({giCount})
              </button>
            )}
            {ev7Count > 0 && (
              <button
                onClick={() => setCompanyFilter('EV7')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  companyFilter === 'EV7'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                EV7 ({ev7Count})
              </button>
            )}
          </div>

          {/* GPS status filter */}
          <div className="flex items-center p-1 rounded-xl bg-[#f4f9f5] border border-gray-200/60">
            <button
              onClick={() => setGpsFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                gpsFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              พิกัดทั้งหมด
            </button>
            <button
              onClick={() => setGpsFilter('HAS_GPS')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                gpsFilter === 'HAS_GPS'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-500 hover:text-emerald-700'
              }`}
            >
              🟢 มีพิกัด ({hasGpsCount})
            </button>
            <button
              onClick={() => setGpsFilter('NO_GPS')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                gpsFilter === 'NO_GPS'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-gray-500 hover:text-amber-700'
              }`}
            >
              🟡 ไม่มีพิกัด ({noGpsCount})
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[#f4f9f5] border border-gray-200/60 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              title="มุมมองการ์ด"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'CARDS'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              title="มุมมองตาราง"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content View: Empty State ── */}
      {filteredBranches.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-2xs flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="text-gray-700 font-bold text-sm">ไม่พบรายชื่อสาขาที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-gray-400 max-w-sm">
            ลองปรับเปลี่ยนคำค้นหา หรือเลือกแท็บบริษัทเป็น &quot;ทั้งหมด&quot; เพื่อดูข้อมูล
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setCompanyFilter('ALL');
              setGpsFilter('ALL');
            }}
            className="mt-2 px-4 py-2 rounded-xl bg-emerald-50 text-[#0f5238] font-bold text-xs hover:bg-emerald-100 transition-colors"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* ── View 1: Redesigned Cards Grid ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => {
            const hasGps = Boolean(branch.latitude && branch.longitude);
            const branchVehicles = vehicles.filter((v) => v.currentBranchId === branch.id);
            const branchJobs = jobs.filter(
              (j) => j.branchId === branch.id || j.originBranchId === branch.id || j.destBranchId === branch.id
            );
            const activeJobs = branchJobs.filter((j) =>
              ['PENDING_SUPPLIER', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(j.status)
            );
            const completedJobs = branchJobs.filter((j) => ['APPROVED', 'INVOICED'].includes(j.status));

            const monogram = getBranchMonogram(branch.name, branch.code);
            const isGI = branch.companyCode === 'GI';

            return (
              <div
                key={branch.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-emerald-200"
              >
                {/* Card Top */}
                <div className="p-6">
                  {/* Avatar, Code & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm tracking-wider shadow-xs shrink-0"
                        style={{
                          background: isGI
                            ? 'linear-gradient(135deg, #10b981, #047857)'
                            : 'linear-gradient(135deg, #0284c7, #0369a1)',
                        }}
                      >
                        {monogram}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-gray-500 tracking-wide">
                            {branch.code}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider ${
                              isGI ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                            }`}
                          >
                            {branch.companyCode || 'CORP'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-[#0f5238] transition-colors leading-snug truncate">
                          {branch.name}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] shrink-0 border ${
                        hasGps
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                          : 'bg-amber-50 text-amber-800 border-amber-200/60'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${hasGps ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      />
                      {hasGps ? 'มีพิกัด GPS' : 'ยังไม่มีพิกัด'}
                    </span>
                  </div>

                  {/* Contact & Address Box */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-[#f4f9f5]/70 border border-gray-100 flex flex-col gap-2.5 text-xs">
                    {/* Phone */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <a
                        href={branch.phone ? `tel:${branch.phone}` : undefined}
                        className={`font-medium truncate ${
                          branch.phone ? 'text-gray-700 hover:text-emerald-700' : 'text-gray-400'
                        }`}
                      >
                        {branch.phone || 'ยังไม่มีเบอร์ติดต่อ'}
                      </a>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span
                        className="text-gray-600 line-clamp-2 leading-relaxed break-words"
                        title={branch.address || undefined}
                      >
                        {branch.address || 'ยังไม่ได้ระบุที่อยู่สาขา'}
                      </span>
                    </div>

                    {/* GPS Coordinates Badge / Action */}
                    <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between gap-2 text-[11px]">
                      {hasGps ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Compass className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="font-mono text-gray-700 font-semibold truncate">
                            {branch.latitude?.toFixed(4)}, {branch.longitude?.toFixed(4)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-medium text-[11px] flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> แนะนำให้ปักหมุดเพื่อใช้คำนวณระยะทาง
                        </span>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        {hasGps && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopy(`${branch.latitude},${branch.longitude}`, branch.id)}
                              title="คัดลอกพิกัด GPS"
                              className="p-1 rounded-md hover:bg-white text-gray-400 hover:text-emerald-700 transition-colors"
                            >
                              {copiedId === branch.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="เปิดใน Google Maps"
                              className="p-1 rounded-md hover:bg-white text-gray-400 hover:text-emerald-700 transition-colors"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Work Statistics Bar */}
                  <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-2xl bg-gray-50/70 border border-gray-100 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        รถในสาขา
                      </span>
                      <span className="text-sm font-black text-gray-900 mt-0.5 block">
                        {branch.vehiclesCount !== undefined ? branch.vehiclesCount : branchVehicles.length} คัน
                      </span>
                    </div>
                    <div className="border-x border-gray-200/70">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        งานกำลังทำ
                      </span>
                      <span className="text-sm font-black text-amber-600 mt-0.5 block">
                        {branch.activeJobsCount !== undefined ? branch.activeJobsCount : activeJobs.length} งาน
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        งานทั้งหมด
                      </span>
                      <span className="text-sm font-black text-[#0f5238] mt-0.5 block">
                        {branch.totalJobsCount !== undefined ? branch.totalJobsCount : branchJobs.length} งาน
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMapPickerBranch(branch)}
                    title="แก้ไขหรือปักหมุด GPS ของสาขานี้"
                    className={`flex-1 h-9 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer ${
                      hasGps
                        ? 'bg-white hover:bg-emerald-50 text-gray-700 border-gray-200 hover:border-emerald-300'
                        : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5 shrink-0" />
                    <span>{hasGps ? 'แก้ไขหมุด' : 'ปักหมุด'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBranch(branch)}
                    title="ดูรายละเอียดสาขาและแก้ไขข้อมูล"
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
                  <th className="py-3.5 px-4 whitespace-nowrap">สาขา (Branch)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">สถานะพิกัด GPS</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">เบอร์โทรติดต่อ</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ที่อยู่</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">รถในสาขา</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">งานกำลังทำ</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">งานทั้งหมด</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[200px]">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredBranches.map((branch, idx) => {
                  const hasGps = Boolean(branch.latitude && branch.longitude);
                  const branchVehicles = vehicles.filter((v) => v.currentBranchId === branch.id);
                  const branchJobs = jobs.filter(
                    (j) => j.branchId === branch.id || j.originBranchId === branch.id || j.destBranchId === branch.id
                  );
                  const activeJobs = branchJobs.filter((j) =>
                    ['PENDING_SUPPLIER', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(j.status)
                  );
                  const isGI = branch.companyCode === 'GI';
                  const monogram = getBranchMonogram(branch.name, branch.code);

                  return (
                    <tr key={branch.id} className="hover:bg-[#fbfdfc] transition-colors group">
                      <td className="py-3 px-4 text-center text-gray-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Branch & Company */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-2xs shrink-0"
                            style={{
                              background: isGI
                                ? 'linear-gradient(135deg, #10b981, #047857)'
                                : 'linear-gradient(135deg, #0284c7, #0369a1)',
                            }}
                          >
                            {monogram}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 group-hover:text-[#0f5238] transition-colors">
                                {branch.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-[#0f5238] font-bold text-[10px] border border-emerald-200/60 font-mono">
                                {branch.code}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium">
                              {branch.companyName || branch.companyCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* GPS status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasGps ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              มีพิกัด GPS
                            </span>
                            <span className="font-mono text-[11px] text-gray-500">
                              ({branch.latitude?.toFixed(2)}, {branch.longitude?.toFixed(2)})
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            ยังไม่มีพิกัด
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-gray-700 font-medium">{branch.phone || '-'}</span>
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 max-w-xs truncate" title={branch.address || ''}>
                        <span className="text-gray-600">{branch.address || '-'}</span>
                      </td>

                      {/* Vehicles count */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-gray-800">
                          {branch.vehiclesCount !== undefined ? branch.vehiclesCount : branchVehicles.length}
                        </span>
                      </td>

                      {/* Active Jobs */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-amber-600">
                          {branch.activeJobsCount !== undefined ? branch.activeJobsCount : activeJobs.length}
                        </span>
                      </td>

                      {/* Total Jobs */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-[#0f5238]">
                          {branch.totalJobsCount !== undefined ? branch.totalJobsCount : branchJobs.length}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMapPickerBranch(branch)}
                            className="px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 border border-gray-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                            title="ปักหมุดแผนที่"
                          >
                            <Map className="w-3 h-3 text-emerald-700" />
                            <span>หมุด</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBranch(branch)}
                            className="px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                            title="รายละเอียด"
                          >
                            <FileText className="w-3 h-3 text-gray-500" />
                            <span>ดู</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal 1: Map Picker Modal for Branch Pin ── */}
      {mapPickerBranch && (
        <MapPickerModal
          isOpen={Boolean(mapPickerBranch)}
          onClose={() => setMapPickerBranch(null)}
          mode="dest"
          initialLat={mapPickerBranch.latitude ?? undefined}
          initialLng={mapPickerBranch.longitude ?? undefined}
          pointLabel={`พิกัดสาขา ${mapPickerBranch.name}`}
          onConfirm={async (data) => {
            try {
              const res = await fetch(`/api/branches/${mapPickerBranch.id}/location`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  latitude: data.lat,
                  longitude: data.lng,
                  address: data.address,
                }),
              });
              if (res.ok) {
                showNotification(`อัปเดตพิกัดสาขา ${mapPickerBranch.name} เรียบร้อยแล้ว`);
                setMapPickerBranch(null);
                await loadBranches();
                await refreshData();
              } else {
                const err = await res.json();
                showNotification(err.error || 'เกิดข้อผิดพลาดในการบันทึกพิกัด', 'error');
              }
            } catch (e) {
              console.error('Update branch location error:', e);
              showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
            }
          }}
        />
      )}

      {/* ── Modal 2: Branch Detail & Edit Modal ── */}
      {selectedBranch && (
        <BranchDetailModal
          branch={selectedBranch}
          onClose={() => setSelectedBranch(null)}
          onUpdated={async () => {
            await loadBranches();
            await refreshData();
            setSelectedBranch(null);
            showNotification('บันทึกข้อมูลสาขาเรียบร้อย');
          }}
          onDeleted={async () => {
            await loadBranches();
            await refreshData();
            setSelectedBranch(null);
            showNotification('ลบสาขาเรียบร้อยแล้ว');
          }}
          onOpenMap={() => {
            const b = selectedBranch;
            setSelectedBranch(null);
            setMapPickerBranch(b);
          }}
        />
      )}

      {/* ── Modal 3: Create Branch Modal ── */}
      {isCreateOpen && (
        <CreateBranchModal
          companies={companies}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async (newBranch) => {
            setIsCreateOpen(false);
            showNotification(`สร้างสาขา ${newBranch.name} เรียบร้อยแล้ว`);
            await loadBranches();
            await refreshData();
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Modal: Branch Details & Edit
───────────────────────────────────────────────────────────── */
interface BranchDetailModalProps {
  branch: Branch;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onOpenMap: () => void;
}

function BranchDetailModal({ branch, onClose, onUpdated, onDeleted, onOpenMap }: BranchDetailModalProps) {
  const { currentRole } = useApp();
  const [activeTab, setActiveTab] = useState<'INFO' | 'VEHICLES' | 'USERS'>('INFO');
  const [detailData, setDetailData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit form state
  const [name, setName] = useState(branch.name);
  const [code, setCode] = useState(branch.code);
  const [phone, setPhone] = useState(branch.phone || '');
  const [address, setAddress] = useState(branch.address || '');
  const [lat, setLat] = useState<string>(branch.latitude ? String(branch.latitude) : '');
  const [lng, setLng] = useState<string>(branch.longitude ? String(branch.longitude) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch full details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/branches/${branch.id}`);
        if (res.ok) {
          const data = await res.json();
          setDetailData(data.branch);
        }
      } catch (e) {
        console.error('Fetch branch detail failed:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [branch.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'เกิดข้อผิดพลาดในการบันทึก');
      } else {
        onUpdated();
      }
    } catch (e) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`ยืนยันการลบสาขา ${branch.name} (${branch.code}) หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }
    try {
      const res = await fetch(`/api/branches/${branch.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'ไม่สามารถลบสาขาได้');
      } else {
        onDeleted();
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{branch.name}</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#0f5238] font-bold text-xs font-mono">
                  {branch.code}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                บริษัท: {branch.companyName || branch.companyCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-gray-100 bg-[#fbfdfc]">
          <button
            onClick={() => setActiveTab('INFO')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'INFO'
                ? 'text-[#0f5238] border-b-2 border-[#0f5238]'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            ข้อมูลและการแก้ไข
          </button>
          <button
            onClick={() => setActiveTab('VEHICLES')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'VEHICLES'
                ? 'text-[#0f5238] border-b-2 border-[#0f5238]'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>รถในสาขา ({detailData?.vehicles?.length ?? '...'})</span>
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'USERS'
                ? 'text-[#0f5238] border-b-2 border-[#0f5238]'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <UsersIcon className="w-3.5 h-3.5" />
            <span>ผู้ใช้งานสาขา ({detailData?.users?.length ?? '...'})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'INFO' && (
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ชื่อสาขา: *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    รหัสสาขา (Code): *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  เบอร์โทรศัพท์ติดต่อ:
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 02-123-4567, 089-xxx-xxxx"
                  className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ที่อยู่สาขา:
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ระบุที่อยู่สาขา เช่น เลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด"
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238] resize-none"
                />
              </div>

              {/* GPS Coordinates & Map Button */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>พิกัด GPS สำหรับระบบนำทางและคำนวณระยะทาง</span>
                  </span>
                  <button
                    type="button"
                    onClick={onOpenMap}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0f5238] text-white text-[11px] font-bold hover:bg-[#0a3d28] transition-colors"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>เปิดแผนที่ปักหมุด</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 font-semibold mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="เช่น 13.7563"
                      className="w-full h-9 px-3 rounded-lg bg-white border border-gray-200 text-xs font-mono font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 font-semibold mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="เช่น 100.5018"
                      className="w-full h-9 px-3 rounded-lg bg-white border border-gray-200 text-xs font-mono font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="mt-2 pt-4 border-t border-gray-100 flex items-center justify-between">
                {currentRole === 'MASTER' ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบสาขานี้</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'VEHICLES' && (
            <div>
              {isLoading ? (
                <div className="p-8 text-center text-xs text-gray-400">กำลังโหลดข้อมูลรถ...</div>
              ) : !detailData?.vehicles || detailData.vehicles.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-500">
                  ไม่มีรถในสต็อกประจำสาขานี้ในขณะนี้
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {detailData.vehicles.map((v: any) => (
                    <div key={v.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-gray-900">{v.vin}</span>
                        <p className="text-[11px] text-gray-500">
                          {v.brand} {v.model} {v.color ? `(${v.color})` : ''} • ทะเบียน: {v.licensePlate || '-'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'USERS' && (
            <div>
              {isLoading ? (
                <div className="p-8 text-center text-xs text-gray-400">กำลังโหลดรายชื่อผู้ใช้...</div>
              ) : !detailData?.users || detailData.users.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-500">
                  ยังไม่มีผู้ใช้หรือพนักงานผูกกับสาขานี้
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {detailData.users.map((u: any) => (
                    <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-900">{u.name}</span>
                        <p className="text-[11px] text-gray-400">{u.email} {u.phone ? `• ${u.phone}` : ''}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold">
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Modal: Create Branch
───────────────────────────────────────────────────────────── */
interface CreateBranchModalProps {
  companies: Company[];
  onClose: () => void;
  onCreated: (branch: Branch) => void;
}

function CreateBranchModal({ companies, onClose, onCreated }: CreateBranchModalProps) {
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !code.trim() || !name.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลบริษัท รหัสสาขา และชื่อสาขา');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          code: code.trim(),
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'ไม่สามารถสร้างสาขาได้');
      } else {
        const data = await res.json();
        onCreated(data.branch);
      }
    } catch (e) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">เพิ่มสาขาใหม่</h2>
              <p className="text-xs text-gray-400">สร้างสาขาและกำหนดข้อมูลพิกัดและที่อยู่</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              สังกัดบริษัท: *
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                รหัสสาขา: *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น GI-NEW หรือ BKK-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ชื่อสาขา: *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น สาขาบางนา"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              เบอร์โทรศัพท์:
            </label>
            <input
              type="text"
              placeholder="เช่น 02-xxx-xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ที่อยู่สาขา:
            </label>
            <textarea
              rows={2}
              placeholder="ที่อยู่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Latitude (ถ้ามี)</label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 13.7563"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Longitude (ถ้ามี)</label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 100.5018"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'กำลังสร้าง...' : 'สร้างสาขา'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
