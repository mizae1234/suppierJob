'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import TagSearch from '@/components/ui/TagSearch';
import { Vehicle, Job, VehicleSlideLog } from '@/types';
import { formatThaiDateTime } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { 
  Car, 
  Search, 
  MapPin, 
  History, 
  CheckCircle2, 
  Clock, 
  X, 
  ArrowRight, 
  FileSpreadsheet,
  Truck,
  Navigation,
  RefreshCw,
  Eye,
  ShieldCheck,
  AlertCircle,
  Building2,
  Filter
} from 'lucide-react';
import VehicleImportModal from '@/components/vehicles/VehicleImportModal';
import CustomDropdown, { DropdownOption } from '@/components/ui/CustomDropdown';

export const BRANCH_SHORT_NAMES: Record<string, string> = {
  GI: 'สำนักงานใหญ่',
  GI01: 'บางแค',
  GI02: 'มีนบุรี',
  GI03: 'เลียบด่วนรามอินทรา',
  GI04: 'สีลม',
  GI05: 'อุบลราชธานี',
  GI06: 'EV7',
  GI07: 'มหาชัย',
  GI08: 'ศาลายา',
  GI09: 'วิภาวดี',
  GI10: 'พิบูลสงคราม',
  GI11: 'อยุธยา',
  GI12: 'เชียงใหม่',
};

export const getVehicleBranchBadge = (v: Vehicle) => {
  if (v.companyCode === 'EV7') {
    return {
      text: 'EV7',
      title: v.currentBranchName || 'EV7 Co.,Ltd.',
      badgeClass: 'bg-emerald-50 text-[#0f5238] border-emerald-300',
    };
  }

  const code = v.currentBranchCode || 'GI';

  return {
    text: code,
    title: v.currentBranchName ? `${code}: ${v.currentBranchName}` : code,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  };
};

export default function VehicleStockPage() {
  const { 
    vehicles, 
    jobs, 
    branches, 
    currentRole, 
    currentBranchId, 
    currentCompany,
    refreshData,
  } = useApp();

  const canSyncD365 = currentRole === 'MASTER' || currentRole === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'STOCK' | 'SLIDE_LOGS'>('STOCK');

  // ─── Vehicle Stock State ───
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<'ALL' | 'GI' | 'EV7'>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // ─── D365 Sync State ───
  type D365SyncRunInfo = {
    id: string; trigger: string; triggeredBy: string | null; status: string;
    startedAt: string; finishedAt: string | null;
    created: number; updated: number; restocked: number; outOfStock: number; skipped: number;
  };
  const [d365Info, setD365Info] = useState<{ configured: boolean; autoSyncEnabled: boolean; intervalMinutes: number; runs: D365SyncRunInfo[] } | null>(null);
  const [isSyncingD365, setIsSyncingD365] = useState(false);
  const [d365Message, setD365Message] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // ─── Slide Logs State ───
  const [slideLogs, setSlideLogs] = useState<VehicleSlideLog[]>([]);
  const [loadingSlideLogs, setLoadingSlideLogs] = useState<boolean>(false);
  const [slideSearchQuery, setSlideSearchQuery] = useState<string>('');
  const [selectedSlideActionFilter, setSelectedSlideActionFilter] = useState<string>('ALL');

  // ─── VIN Modal Slide Logs State ───
  const [vinSlideLogs, setVinSlideLogs] = useState<VehicleSlideLog[]>([]);
  const [loadingVinSlideLogs, setLoadingVinSlideLogs] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'JOBS' | 'SLIDE_LOGS'>('JOBS');

  // ─── Custom Dropdown Options ───
  // บริษัทของสาขาต้องดูจาก companyCode จริง (เช่น GI06 เป็นของ EV7) ไม่ใช่ prefix ของรหัสสาขา
  const getBranchCompanyCode = (b: (typeof branches)[number]) =>
    (b as typeof b & { companyCode?: string }).companyCode ||
    (b.code === 'GI06' || b.code.startsWith('EV7') ? 'EV7' : 'GI');

  const giVehiclesCount = useMemo(() => vehicles.filter(v => v.companyCode === 'GI').length, [vehicles]);
  const ev7VehiclesCount = useMemo(() => vehicles.filter(v => v.companyCode === 'EV7').length, [vehicles]);

  const companyFilterOptions: DropdownOption[] = useMemo(() => [
    {
      value: 'ALL',
      label: 'ทุกสังกัด / ทุกบริษัท',
      badge: `${vehicles.length} คัน`,
      badgeClass: 'bg-emerald-100 text-[#0f5238] font-bold',
      icon: Building2,
    },
    {
      value: 'GI',
      label: 'GI (Gold Integrate)',
      badge: `${giVehiclesCount} คัน`,
      badgeClass: 'bg-blue-100 text-blue-800 font-bold',
      dot: '#2563eb',
    },
    {
      value: 'EV7',
      label: 'EV7 (EV7 Co.,Ltd.)',
      badge: `${ev7VehiclesCount} คัน`,
      badgeClass: 'bg-emerald-100 text-emerald-800 font-bold',
      dot: '#059669',
    },
  ], [vehicles.length, giVehiclesCount, ev7VehiclesCount]);

  const branchOptions: DropdownOption[] = useMemo(() => {
    const allOption: DropdownOption = {
      value: 'ALL',
      label: selectedCompanyFilter === 'ALL'
        ? 'ทุกสาขา (All Branches)'
        : selectedCompanyFilter === 'GI'
          ? 'ทุกสาขา (GI Hubs)'
          : 'ทุกสาขา (EV7)',
      icon: Building2,
    };

    const branchList: DropdownOption[] = branches
      .filter(b => selectedCompanyFilter === 'ALL' || getBranchCompanyCode(b) === selectedCompanyFilter)
      .map(b => ({
        value: b.id,
        label: b.name,
        sublabel: b.code ? `รหัสสาขา: ${b.code}` : undefined,
        dot: getBranchCompanyCode(b) === 'EV7' ? '#059669' : '#3b82f6',
        badge: getBranchCompanyCode(b) === 'EV7' ? 'EV7' : 'GI',
        badgeClass: getBranchCompanyCode(b) === 'EV7' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200',
      }));

    return [allOption, ...branchList];
  }, [branches, selectedCompanyFilter]);

  // เปลี่ยนบริษัทแล้ว ถ้าสาขาที่เลือกค้างไว้ไม่อยู่ในบริษัทใหม่ → ถือเป็น "ทุกสาขา"
  const effectiveBranchFilter = branchOptions.some(o => o.value === selectedBranchFilter)
    ? selectedBranchFilter
    : 'ALL';

  const statusOptions: DropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'ทุกสถานะรถ', icon: Filter },
    { value: 'AVAILABLE', label: 'พร้อมใช้งาน (Available)', dot: '#10b981', badge: 'พร้อมใช้งาน', badgeClass: 'bg-emerald-50 text-[#0f5238] border border-emerald-200' },
    { value: 'IN_WASH', label: 'อยู่ระหว่างล้าง (In Wash)', dot: '#3b82f6', badge: 'กำลังล้าง', badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200' },
    { value: 'IN_TRANSIT', label: 'ระหว่างขนส่ง (In Transit)', dot: '#f59e0b', badge: 'กำลังสไลด์', badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200' },
    { value: 'OUT_OF_STOCK', label: 'ไม่อยู่ในสต็อก (Out of Stock)', dot: '#9ca3af', badge: 'หมดสต็อก', badgeClass: 'bg-gray-100 text-gray-600 border border-gray-200' },
  ], []);

  const slideActionOptions: DropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'ทุกขั้นตอน / สถานะ', icon: Filter },
    { value: 'CREATED', label: 'สร้างใบงานใหม่', dot: '#0284c7', icon: Clock },
    { value: 'PICKUP_VERIFIED', label: 'ยืนยันรับรถขึ้นสไลด์', dot: '#4f46e5', icon: CheckCircle2 },
    { value: 'IN_TRANSIT', label: 'อยู่ระหว่างขนส่ง', dot: '#f59e0b', icon: Truck },
    { value: 'DELIVERED', label: 'ส่งมอบปลายทางแล้ว', dot: '#2563eb', icon: MapPin },
    { value: 'APPROVED', label: 'สาขาตรวจรับสำเร็จ', dot: '#059669', icon: CheckCircle2 },
    { value: 'CANCELLED', label: 'ยกเลิกการสไลด์', dot: '#dc2626', icon: X },
  ], []);

  // Filtered vehicles
  const displayedVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // Company filter
      if (selectedCompanyFilter !== 'ALL' && v.companyCode !== selectedCompanyFilter) return false;

      // Branch filter
      if (effectiveBranchFilter !== 'ALL' && v.currentBranchId !== effectiveBranchFilter) return false;

      // Status filter
      if (selectedStatusFilter !== 'ALL' && v.status !== selectedStatusFilter) return false;

      // Search term
      if (searchTags.length > 0) {
        const matches = searchTags.some(q => {
          const term = q.toLowerCase();
          const matchesVin = v.vin.toLowerCase().includes(term);
          const matchesModel = v.model.toLowerCase().includes(term);
          const matchesPlate = v.licensePlate?.toLowerCase().includes(term);
          const matchesColor = v.color.toLowerCase().includes(term);
          const matchesCompany = v.companyCode?.toLowerCase().includes(term);
          const matchesBranchCode = v.currentBranchCode?.toLowerCase().includes(term);
          const matchesBranchName = v.currentBranchName?.toLowerCase().includes(term);
          const shortName = v.currentBranchCode ? BRANCH_SHORT_NAMES[v.currentBranchCode] : undefined;
          const matchesShortName = shortName ? shortName.toLowerCase().includes(term) : false;
          return matchesVin || matchesModel || matchesPlate || matchesColor || matchesCompany || matchesBranchCode || matchesBranchName || matchesShortName;
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [vehicles, selectedCompanyFilter, effectiveBranchFilter, selectedStatusFilter, searchTags]);

  // Find job history for selected VIN
  const vinHistory: Job[] = useMemo(() => {
    if (!selectedVehicle) return [];
    return jobs.filter(j => {
      if (j.jobType === 'VEHICLE_SLIDE') {
        return j.vin === selectedVehicle.vin;
      } else {
        return j.carWashItems?.some(it => it.vin === selectedVehicle.vin);
      }
    });
  }, [selectedVehicle, jobs]);

  // Fetch slide movement logs
  const fetchSlideLogs = useCallback(async () => {
    setLoadingSlideLogs(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompanyFilter !== 'ALL') params.set('companyId', selectedCompanyFilter);
      if (slideSearchQuery.trim()) params.set('q', slideSearchQuery.trim());
      const res = await fetch(`/api/vehicles/slide-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setSlideLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching slide logs:', err);
    } finally {
      setLoadingSlideLogs(false);
    }
  }, [selectedCompanyFilter, slideSearchQuery]);

  useEffect(() => {
    if (activeTab === 'SLIDE_LOGS') {
      fetchSlideLogs();
    }
  }, [activeTab, fetchSlideLogs]);

  // Load slide logs for selected vehicle modal
  useEffect(() => {
    if (!selectedVehicle) {
      setVinSlideLogs([]);
      setModalTab('JOBS');
      return;
    }
    setLoadingVinSlideLogs(true);
    fetch(`/api/vehicles/slide-logs?vin=${encodeURIComponent(selectedVehicle.vin)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.logs)) {
          setVinSlideLogs(data.logs);
          if (data.logs.length > 0 && vinHistory.length === 0) {
            setModalTab('SLIDE_LOGS');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingVinSlideLogs(false));
  }, [selectedVehicle, vinHistory.length]);

  // Filtered slide logs in Tab 2
  const displayedSlideLogs = useMemo(() => {
    return slideLogs.filter(log => {
      if (selectedSlideActionFilter !== 'ALL' && log.action !== selectedSlideActionFilter) {
        return false;
      }
      return true;
    });
  }, [slideLogs, selectedSlideActionFilter]);

  // Action badge configuration
  const getActionBadge = (action: string) => {
    const config: Record<string, { label: string; bg: string; text: string; icon: any }> = {
      CREATED: { label: 'สร้างใบงานสไลด์', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800', icon: Clock },
      PICKUP_VERIFIED: { label: 'ยืนยันรับรถขึ้นสไลด์', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-800', icon: CheckCircle2 },
      IN_TRANSIT: { label: 'อยู่ระหว่างขนส่ง', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: Truck },
      DELIVERED: { label: 'ส่งมอบปลายทางแล้ว', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: MapPin },
      APPROVED: { label: 'สาขาตรวจรับสำเร็จ', bg: 'bg-emerald-50 border-emerald-200', text: 'text-[#0f5238]', icon: CheckCircle2 },
      CANCELLED: { label: 'ยกเลิกการสไลด์', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', icon: X },
    };

    const c = config[action] || { label: action, bg: 'bg-gray-100 border-gray-200', text: 'text-gray-700', icon: Clock };
    const Icon = c.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${c.bg} ${c.text}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{c.label}</span>
      </span>
    );
  };

  // ─── D365 Sync ───
  const fetchD365Info = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/d365/sync');
      if (!res.ok) return;
      setD365Info(await res.json());
    } catch (err) {
      console.error('Error fetching D365 sync info:', err);
    }
  }, []);

  useEffect(() => {
    if (canSyncD365) fetchD365Info();
  }, [canSyncD365, fetchD365Info]);

  const handleSyncD365 = async () => {
    setIsSyncingD365(true);
    setD365Message(null);
    try {
      const res = await fetch('/api/integrations/d365/sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setD365Message({ type: res.status === 409 ? 'warning' : 'error', text: data.error || 'Sync ไม่สำเร็จ' });
      } else {
        setD365Message({ type: data.status === 'PARTIAL' ? 'warning' : 'success', text: data.message });
        await refreshData();
      }
    } catch {
      setD365Message({ type: 'error', text: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' });
    } finally {
      setIsSyncingD365(false);
      fetchD365Info();
    }
  };

  const lastD365Run = d365Info?.runs?.[0];
  const d365RunStatusLabel: Record<string, { label: string; cls: string }> = {
    SUCCESS: { label: 'สำเร็จ', cls: 'text-emerald-700' },
    PARTIAL: { label: 'บางส่วน', cls: 'text-amber-700' },
    FAILED: { label: 'ล้มเหลว', cls: 'text-rose-700' },
    RUNNING: { label: 'กำลังทำงาน', cls: 'text-blue-700' },
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-emerald-600" />
            <span>คลังข้อมูลรถยนต์ & ประวัติการสไลด์ (Vehicle Stock & Slide Logs)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            ระบบตรวจสอบสถานะรถยนต์ในคลัง และบันทึกประวัติการสไลด์ย้ายรถ (Origin ➔ Destination Tracking)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-[#0f5238]">
            รถในระบบทั้งหมด {displayedVehicles.length} คัน
          </span>
          {canSyncD365 && d365Info?.configured && (
            <button
              onClick={handleSyncD365}
              disabled={isSyncingD365}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#0f5238] text-[#0f5238] bg-white hover:bg-emerald-50 text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              title="ดึงรถในสต็อกจาก D365 ทันที"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingD365 ? 'animate-spin' : ''}`} />
              <span>{isSyncingD365 ? 'กำลัง Sync...' : 'Sync จาก D365'}</span>
            </button>
          )}
          {currentRole !== 'SUPPLIER' && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0f5238] text-white hover:bg-[#0a3d28] text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>นำเข้ารถ (Excel)</span>
            </button>
          )}
        </div>
      </div>

      {/* D365 Sync Status */}
      {canSyncD365 && d365Info?.configured && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 rounded-xl bg-white border border-emerald-950/10 text-[11px] text-gray-600">
            <span className="inline-flex items-center gap-1.5 font-bold text-gray-800">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
              D365 Sync
            </span>
            <span>
              {d365Info.autoSyncEnabled
                ? `อัตโนมัติทุก ${d365Info.intervalMinutes} นาที`
                : 'ปิด Sync อัตโนมัติ (กด Sync เองได้)'}
            </span>
            {lastD365Run ? (
              <>
                <span>
                  ล่าสุด: {formatThaiDateTime(lastD365Run.startedAt)}{' '}
                  <strong className={d365RunStatusLabel[lastD365Run.status]?.cls || ''}>
                    ({d365RunStatusLabel[lastD365Run.status]?.label || lastD365Run.status})
                  </strong>
                </span>
                {lastD365Run.status !== 'RUNNING' && lastD365Run.status !== 'FAILED' && (
                  <span className="text-gray-500">
                    ใหม่ {lastD365Run.created} · อัปเดต {lastD365Run.updated} · กลับเข้าสต็อก {lastD365Run.restocked} · หมดสต็อก {lastD365Run.outOfStock} · ข้าม {lastD365Run.skipped}
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">ยังไม่เคย Sync</span>
            )}
          </div>
          {d365Message && (
            <div className={`flex items-start gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border ${
              d365Message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-[#0f5238]'
                : d365Message.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {d365Message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="flex-1">{d365Message.text}</span>
              <button type="button" onClick={() => setD365Message(null)} className="cursor-pointer opacity-60 hover:opacity-100" aria-label="ปิด">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'STOCK'
              ? 'border-[#0f5238] text-[#0f5238]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>คลังข้อมูลรถยนต์ (Vehicle Stock)</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {displayedVehicles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SLIDE_LOGS')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'SLIDE_LOGS'
              ? 'border-[#0f5238] text-[#0f5238]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>ประวัติการสไลด์รถ (Slide Movement Logs)</span>
          {slideLogs.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238]">
              {slideLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB 1: VEHICLE STOCK ─── */}
      {activeTab === 'STOCK' && (
        <div className="flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col lg:flex-row items-center gap-3">
            {/* Search */}
            <div className="flex-1 w-full">
              <TagSearch
                tags={searchTags}
                onTagsChange={setSearchTags}
                placeholder="ค้นหาตาม VIN / รุ่น / ทะเบียน / สี... (กด Enter เพื่อเพิ่ม)"
                accentColor="#0f5238"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              {/* Company Filter */}
              <div className="w-full sm:w-[210px]">
                <CustomDropdown
                  value={selectedCompanyFilter}
                  onChange={(val) => {
                    setSelectedCompanyFilter(val as 'ALL' | 'GI' | 'EV7');
                    setSelectedBranchFilter('ALL');
                  }}
                  options={companyFilterOptions}
                  icon={Building2}
                  dropdownWidth="w-full sm:w-[240px]"
                  placeholder="ทุกสังกัด"
                />
              </div>

              {/* Branch Filter */}
              <div className="w-full sm:w-[240px]">
                <CustomDropdown
                  value={effectiveBranchFilter}
                  onChange={setSelectedBranchFilter}
                  options={branchOptions}
                  icon={Building2}
                  dropdownWidth="w-full sm:w-[320px]"
                  placeholder="เลือกสาขา"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-[190px]">
                <CustomDropdown
                  value={selectedStatusFilter}
                  onChange={setSelectedStatusFilter}
                  options={statusOptions}
                  icon={Filter}
                  dropdownWidth="w-full sm:w-[240px]"
                  placeholder="ทุกสถานะรถ"
                />
              </div>
            </div>
          </div>

          {/* Vehicles Table */}
          <div className="bg-white rounded-2xl border border-emerald-950/10 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-[#f4f9f5] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">เลขตัวถัง (VIN) / สังกัด</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ยี่ห้อและรุ่นรถ (Model)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">สีตัวถัง</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ทะเบียนรถ</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">เลขไมล์</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">สาขาปัจจุบัน</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">สถานะ</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">ประวัติงาน & สไลด์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {displayedVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                            <Car className="w-5 h-5" />
                          </div>
                          <p className="text-gray-500 font-medium">ไม่พบข้อมูลรถยนต์ที่ตรงกับเงื่อนไขการค้นหา</p>
                          <p className="text-[11px] text-gray-400">ลองปรับเปลี่ยนคำค้นหา หรือตัวกรองสาขา/สถานะ</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedVehicles.map((vehicle, idx) => {
                      const statusConfig = {
                        AVAILABLE: { label: 'พร้อมใช้งาน', bg: 'bg-emerald-50 text-[#0f5238] border border-emerald-200' },
                        IN_WASH: { label: 'อยู่ระหว่างล้าง', bg: 'bg-blue-50 text-blue-800 border border-blue-200' },
                        IN_TRANSIT: { label: 'อยู่ระหว่างขนส่ง', bg: 'bg-amber-50 text-amber-800 border border-amber-200' },
                        MAINTENANCE: { label: 'ซ่อมบำรุง', bg: 'bg-gray-100 text-gray-700 border border-gray-200' },
                        OUT_OF_STOCK: { label: 'ไม่อยู่ในสต็อก', bg: 'bg-gray-100 text-gray-500 border border-gray-200' },
                      }[vehicle.status] || { label: vehicle.status, bg: 'bg-gray-100 text-gray-700 border border-gray-200' };

                      return (
                        <tr 
                          key={vehicle.vin} 
                          className={`hover:bg-[#fbfdfc] transition-colors group ${vehicle.status === 'OUT_OF_STOCK' ? 'opacity-60' : ''}`}
                        >
                          <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const badge = getVehicleBranchBadge(vehicle);
                                return (
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-bold text-[10px] shrink-0 border ${badge.badgeClass}`}
                                    title={badge.title}
                                  >
                                    {badge.text}
                                  </span>
                                );
                              })()}
                              <button
                                type="button"
                                onClick={() => setSelectedVehicle(vehicle)}
                                className="font-mono font-bold text-gray-900 group-hover:text-[#0f5238] hover:underline text-left cursor-pointer"
                                title="คลิกเพื่อดูประวัติงานและการสไลด์"
                              >
                                {vehicle.vin}
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-semibold text-gray-900">{vehicle.model}</span>
                              <span className="text-[10px] text-gray-400 font-medium">({vehicle.vehicleType})</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium whitespace-nowrap">
                              {vehicle.color}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {vehicle.licensePlate ? (
                              <span className="font-semibold text-gray-800 px-2 py-0.5 rounded bg-gray-100 text-[11px] border border-gray-200/70 whitespace-nowrap">
                                {vehicle.licensePlate}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px] italic">ป้ายแดง</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-gray-700 whitespace-nowrap">
                            {vehicle.mileage !== undefined && vehicle.mileage !== null 
                              ? `${vehicle.mileage.toLocaleString()} กม.` 
                              : '-'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-gray-700 max-w-[220px]">
                              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span className="truncate text-xs" title={vehicle.currentBranchName}>
                                {vehicle.currentBranchName || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${statusConfig.bg}`}>
                                {statusConfig.label}
                              </span>
                              {vehicle.d365Reserved && vehicle.status !== 'OUT_OF_STOCK' && (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap"
                                  title="รถคันนี้ถูกจองใน D365 (ยังสั่งงานได้ตามปกติ)"
                                >
                                  จองแล้ว
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedVehicle(vehicle)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-emerald-600 hover:bg-emerald-50 text-[#0f5238] font-semibold text-[11px] transition-all cursor-pointer shadow-2xs group-hover:border-emerald-300"
                              title="ดูประวัติงานและเส้นทางสไลด์ของ VIN นี้"
                            >
                              <History className="w-3.5 h-3.5 text-emerald-700" />
                              <span>ดูประวัติ</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer info */}
            {displayedVehicles.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500">
                <span>แสดงผล <strong>{displayedVehicles.length}</strong> จากทั้งหมด <strong>{vehicles.length}</strong> คัน</span>
                <span>คลิกที่เลข VIN หรือปุ่ม &quot;ดูประวัติ&quot; เพื่อตรวจสอบประวัติงานและบันทึกการสไลด์</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: SLIDE MOVEMENT LOGS ─── */}
      {activeTab === 'SLIDE_LOGS' && (
        <div className="flex flex-col gap-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">การบันทึกสไลด์ทั้งหมด</span>
              <span className="text-2xl font-bold text-gray-900 font-mono">{slideLogs.length}</span>
              <span className="text-[10px] text-emerald-700">รายการบันทึกสถานะทั้งหมด</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-1">
              <span className="text-xs font-semibold text-amber-600">อยู่ระหว่างขนส่ง</span>
              <span className="text-2xl font-bold text-amber-700 font-mono">
                {slideLogs.filter(l => l.action === 'IN_TRANSIT').length}
              </span>
              <span className="text-[10px] text-gray-400">กำลังเดินทางบนรถสไลด์</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-1">
              <span className="text-xs font-semibold text-blue-600">ส่งมอบแล้ว</span>
              <span className="text-2xl font-bold text-blue-700 font-mono">
                {slideLogs.filter(l => l.action === 'DELIVERED').length}
              </span>
              <span className="text-[10px] text-gray-400">ถึงปลายทางรอตรวจรับ</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#0f5238]">ตรวจรับสำเร็จ</span>
              <span className="text-2xl font-bold text-[#0f5238] font-mono">
                {slideLogs.filter(l => l.action === 'APPROVED').length}
              </span>
              <span className="text-[10px] text-gray-400">สาขาอนุมัติเรียบร้อย</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={slideSearchQuery}
                onChange={(e) => setSlideSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchSlideLogs(); }}
                placeholder="ค้นหาตามเลข VIN, เลขใบงาน, ต้นทาง, ปลายทาง, ผู้รับจ้าง... (กด Enter)"
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#f4f9f5] border border-gray-200 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-[220px]">
                <CustomDropdown
                  value={selectedSlideActionFilter}
                  onChange={setSelectedSlideActionFilter}
                  options={slideActionOptions}
                  icon={Filter}
                  dropdownWidth="w-full sm:w-[250px]"
                  placeholder="ทุกขั้นตอน / สถานะ"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchSlideLogs()}
                disabled={loadingSlideLogs}
                className="h-10 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSlideLogs ? 'animate-spin text-[#0f5238]' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            </div>
          </div>

          {/* Slide Logs Table */}
          <div className="bg-white rounded-2xl border border-emerald-950/10 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-[#f4f9f5] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3 whitespace-nowrap">วันที่และเวลา</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">เลขที่ใบงาน</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ข้อมูลรถ (VIN / ทะเบียน / รุ่น)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ขั้นตอน / สถานะ</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">เส้นทางการสไลด์ (ต้นทาง ➔ ปลายทาง)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ผู้รับจ้างสไลด์</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">ผู้บันทึก</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {loadingSlideLogs ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#0f5238]" />
                          <span>กำลังโหลดประวัติการสไลด์รถ...</span>
                        </div>
                      </td>
                    </tr>
                  ) : displayedSlideLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                            <Truck className="w-5 h-5" />
                          </div>
                          <p className="text-gray-500 font-medium">ไม่พบประวัติการสไลด์รถที่ตรงกับเงื่อนไข</p>
                          <p className="text-[11px] text-gray-400">เมื่อมีการสร้างใบงานสไลด์หรือเคลื่อนย้ายรถ ประวัติจะถูกบันทึกอัตโนมัติที่นี่</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedSlideLogs.map((log) => {
                      return (
                        <tr key={log.id} className="hover:bg-[#fbfdfc] transition-colors">
                          {/* DateTime */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                            {formatThaiDateTime(log.createdAt)}
                          </td>

                          {/* Job Number */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-gray-900 px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                              {log.jobNumber}
                            </span>
                          </td>

                          {/* Vehicle */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-gray-900">{log.vin}</span>
                              <span className="text-[11px] text-gray-500">
                                {log.vehicle?.model || '-'} {log.vehicle?.color ? `• ${log.vehicle.color}` : ''} 
                                {log.vehicle?.licensePlate ? ` (${log.vehicle.licensePlate})` : ''}
                              </span>
                            </div>
                          </td>

                          {/* Action badge */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>

                          {/* Slide Route: Origin ➔ Dest */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-[260px]">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                <span className="font-medium text-gray-800" title={log.originAddress || undefined}>
                                  {log.originName}
                                </span>
                              </div>
                              <div className="flex items-center text-gray-400 px-0.5">
                                <ArrowRight className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="font-medium text-gray-800" title={log.destAddress || undefined}>
                                  {log.destName}
                                </span>
                              </div>
                              {log.distance ? (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200 ml-1">
                                  {log.distance} กม.
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Supplier */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-700">
                            {log.supplierName || '-'}
                          </td>

                          {/* Actor */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-800 text-[11px]">{log.actorName || '-'}</span>
                              <span className="text-[10px] text-gray-400">{log.actorRole || ''}</span>
                            </div>
                          </td>

                          {/* Remarks */}
                          <td className="py-2.5 px-3 text-gray-500 text-[11px] max-w-[200px] truncate" title={log.remarks || undefined}>
                            {log.remarks || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            {displayedSlideLogs.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500">
                <span>แสดงผล <strong>{displayedSlideLogs.length}</strong> จากทั้งหมด <strong>{slideLogs.length}</strong> รายการ</span>
                <span>บันทึกการเคลื่อนย้ายสไลด์รถยนต์ตามมาตรฐานระบบขนส่ง</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── VIN History Modal Drawer ─── */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-xs">
                  {selectedVehicle.companyCode}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1 flex items-center gap-2">
                  <span>VIN: {selectedVehicle.vin}</span>
                  {selectedVehicle.licensePlate && (
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
                      ทะเบียน {selectedVehicle.licensePlate}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedVehicle.model} • สี: {selectedVehicle.color} • สาขาปัจจุบัน: {selectedVehicle.currentBranchName}
                </p>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <button
                onClick={() => setModalTab('JOBS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modalTab === 'JOBS'
                    ? 'bg-emerald-50 text-[#0f5238]'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>ประวัติใบงาน ({vinHistory.length})</span>
              </button>
              <button
                onClick={() => setModalTab('SLIDE_LOGS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modalTab === 'SLIDE_LOGS'
                    ? 'bg-emerald-50 text-[#0f5238]'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>ประวัติการสไลด์รถ ({vinSlideLogs.length})</span>
              </button>
            </div>

            {/* TAB 1: Master Jobs History */}
            {modalTab === 'JOBS' && (
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  ประวัติงานคำสั่งการทั้งหมด ({vinHistory.length} รายการ)
                </h4>

                {vinHistory.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-400">
                    ยังไม่มีประวัติการสั่งล้างหรือย้ายสไลด์สำหรับรถคันนี้
                  </div>
                ) : (
                  vinHistory.map(job => {
                    const isSlide = job.jobType === 'VEHICLE_SLIDE';
                    const originName = job.customOriginAddress || job.originBranchName || job.branchName;
                    const destName = job.customDestAddress || job.destBranchName || '-';

                    return (
                      <div
                        key={job.id}
                        className="p-4 rounded-xl border border-gray-200 bg-[#fbfdfc] flex flex-col gap-2.5 text-xs"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 font-mono">{job.jobNumber}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              isSlide ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                            }`}>
                              {isSlide ? 'Vehicle Slide' : 'Car Wash'}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-800">
                              {job.status}
                            </span>
                          </div>

                          {(() => {
                            const item = job.jobType === 'CAR_WASH' ? job.carWashItems?.find(i => i.vin === selectedVehicle.vin) : null;
                            const isCancelled = item?.status === 'CANCELLED';
                            const cost = item ? (isCancelled ? 0 : item.unitPrice) : getJobTotalCost(job);

                            return (
                              <div className="text-right">
                                <span className={`font-bold text-sm ${isCancelled ? 'text-gray-400' : 'text-[#0f5238]'}`}>
                                  ฿{cost.toLocaleString()}
                                </span>
                                {isCancelled && (
                                  <span className="block text-[10px] text-red-500 font-medium">ปฏิเสธ / ยกเลิก</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Slide route highlight box */}
                        {isSlide && (
                          <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/90 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-[#0f5238] mb-1">
                              <Truck className="w-3.5 h-3.5" />
                              <span>เส้นทางการสไลด์:</span>
                              {job.distance ? (
                                <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-emerald-800 border border-emerald-200">
                                  {job.distance} กม.
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-700 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                <span className="font-semibold text-gray-900">ต้นทาง:</span>
                                <span>{originName}</span>
                              </div>
                              <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="font-semibold text-gray-900">ปลายทาง:</span>
                                <span>{destName}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-gray-500 text-[11px] pt-1 border-t border-gray-100">
                          <span>สาขา: {job.branchName} • ผู้รับจ้าง: {job.supplierName}</span>
                          <span>วันที่: {formatThaiDateTime(job.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: Detailed Slide Logs Timeline */}
            {modalTab === 'SLIDE_LOGS' && (
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  บันทึกประวัติการสไลด์ย้ายรถ (Slide Movement Logs)
                </h4>

                {loadingVinSlideLogs ? (
                  <div className="p-8 text-center text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
                    <span>กำลังโหลดบันทึกการสไลด์...</span>
                  </div>
                ) : vinSlideLogs.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-400">
                    ยังไม่มีบันทึกประวัติการสไลด์สำหรับรถคันนี้
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {vinSlideLogs.map((log, index) => {
                      return (
                        <div
                          key={log.id || index}
                          className="p-3.5 rounded-xl border border-gray-200 bg-[#fbfdfc] flex flex-col gap-2 text-xs"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              {getActionBadge(log.action)}
                              <span className="font-mono font-bold text-gray-900 text-[11px]">
                                {log.jobNumber}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-gray-500">
                              {formatThaiDateTime(log.createdAt)}
                            </span>
                          </div>

                          {/* Route description */}
                          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              <span className="font-semibold text-gray-800">ต้นทาง:</span>
                              <span className="text-gray-700">{log.originName}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span className="font-semibold text-gray-800">ปลายทาง:</span>
                              <span className="text-gray-700">{log.destName}</span>
                            </div>

                            {log.distance ? (
                              <span className="font-mono text-[11px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 shrink-0">
                                {log.distance} กม.
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-gray-500">
                            <div>
                              ผู้รับจ้าง: <span className="font-semibold text-gray-700">{log.supplierName || '-'}</span>
                              {log.actorName && (
                                <span> • ผู้บันทึก: <span className="font-medium text-gray-700">{log.actorName} ({log.actorRole})</span></span>
                              )}
                            </div>
                            {log.remarks && (
                              <span className="text-gray-600 italic">หมายเหตุ: {log.remarks}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28]"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Vehicles Modal */}
      <VehicleImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
