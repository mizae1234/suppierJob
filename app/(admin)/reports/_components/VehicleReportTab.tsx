'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
import { getFailedAttemptItemPrice, isFailedAttemptJob, SLIDE_FAILED_ATTEMPT_LABEL } from '@/lib/slide-failed-attempt';
import { Job } from '@/types';
import { VehicleDetailModal, VehicleRecord } from '@/components/vehicles';
import CustomDropdown, { DropdownOption } from '@/components/ui/CustomDropdown';
import { CompanyFilter } from '../_lib/report-calculations';
import {
  Car,
  FileText,
  Search,
  Filter,
  Printer,
  X,
  ChevronDown,
  ChevronRight,
  Receipt,
  Building2,
  Sparkles,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  CheckCheck,
  Calendar,
  Layers,
  List,
  PencilLine,
} from 'lucide-react';



// ─── Status badge helper ───
const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'รอดำเนินการ', color: '#d97706', bg: '#fffbeb', icon: Clock },
  IN_PROGRESS: { label: 'กำลังดำเนินงาน', color: '#2563eb', bg: '#eff6ff', icon: Truck },
  COMPLETED: { label: 'ส่งงานแล้ว', color: '#059669', bg: '#ecfdf5', icon: CheckCircle2 },
  WAITING_APPROVAL: { label: 'รอตรวจรับ', color: '#d97706', bg: '#fffbeb', icon: Clock },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#059669', bg: '#ecfdf5', icon: CheckCircle2 },
  INVOICED: { label: 'วางบิลแล้ว', color: '#6b7280', bg: '#f3f4f6', icon: Receipt },
  REJECTED: { label: 'ตีกลับ', color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle },
  CANCELLED: { label: 'ยกเลิก', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'ล้างปกติ (Standard)',
  DEEP_CLEAN: 'ล้างพิเศษ (Deep Clean)',
  POLISH: 'ขัดเคลือบ (Polish)',
  VEHICLE_SLIDE: 'รถสไลด์ (Slide)',
  SLIDE_FAILED_ATTEMPT: SLIDE_FAILED_ATTEMPT_LABEL,
};

const getServiceLabel = (serviceType: string): string => {
  if (SERVICE_TYPE_LABELS[serviceType]) return SERVICE_TYPE_LABELS[serviceType];
  return getWashServiceDisplay(serviceType)?.name || serviceType;
};

/** ย่อชื่อสาขาโดยตัดคำซ้ำ GOLD INTEGRATE / CO., LTD. ออก เพื่อให้อ่านเส้นทางจบในจอเดียว */
const shortenBranchSegment = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '-';
  const stripped = trimmed
    .replace(/^GOLD\s+INTEGRATE\s*/i, '')
    .replace(/,?\s*CO\.?,?\s*LTD\.?$/i, '')
    .replace(/^\s*-\s*/, '')
    .trim();
  if (!stripped) {
    return /^GOLD\s+INTEGRATE/i.test(trimmed) ? 'สำนักงานใหญ่ (GI)' : trimmed;
  }
  return stripped;
};

const formatCompactLocation = (raw: string): string => {
  if (!raw) return '-';
  if (raw.includes('➔')) {
    const distMatch = raw.match(/\s*\([^)]*กม\.\)\s*$/);
    const distSuffix = distMatch ? ` ${distMatch[0].trim()}` : '';
    const routeOnly = distMatch ? raw.slice(0, distMatch.index) : raw;
    const [origin, dest] = routeOnly.split('➔');
    return `${shortenBranchSegment(origin || '')} → ${shortenBranchSegment(dest || '')}${distSuffix}`;
  }
  return shortenBranchSegment(raw);
};

interface VehicleReportTabProps {
  jobs: Job[];
  companyFilter: CompanyFilter;
  registerExportHandler?: (handler: (() => void) | null) => void;
}

export default function VehicleReportTab({
  jobs,
  companyFilter,
  registerExportHandler,
}: VehicleReportTabProps) {
  const { suppliers } = useApp();

  // ─── Build flat per-vehicle records from jobs data ───
  const allRecords: VehicleRecord[] = useMemo(() => {
    const records: VehicleRecord[] = [];

    const getRouteLabel = (j: (typeof jobs)[number]) => {
      const origin = j.customOriginAddress || j.pickupBranchName || j.branchName || 'ต้นทาง';
      const dest = j.customDestAddress || j.destBranchName || 'ปลายทาง';
      return `${origin} ➔ ${dest}${j.distance ? ` (${j.distance} กม.)` : ''}`;
    };

    for (const job of jobs) {
      // Do not include cancelled jobs in vehicle service history
      if (job.status === 'CANCELLED') continue;

      // Jobs with items (CAR_WASH or VEHICLE_SLIDE with items)
      if (job.carWashItems && job.carWashItems.length > 0) {
        for (const item of job.carWashItems) {
          // Do not include cancelled items
          if (item.status === 'CANCELLED') continue;

          records.push({
            id: item.id,
            vin: item.vin,
            vehicleModel: item.vehicleModel || '-',
            vehicleColor: item.vehicleColor || '-',
            licensePlate: item.licensePlate || '-',
            vehicleType: '-',
            jobId: job.id,
            jobNumber: job.jobNumber,
            jobType: job.jobType,
            serviceType: job.jobType === 'VEHICLE_SLIDE'
              ? (isFailedAttemptJob(job) ? 'SLIDE_FAILED_ATTEMPT' : 'VEHICLE_SLIDE')
              : item.washType,
            serviceDate: item.actualWashDate,
            unitPrice: job.jobType === 'VEHICLE_SLIDE' && isFailedAttemptJob(job)
              ? getFailedAttemptItemPrice(job.carWashItems, item.id)
              : item.unitPrice,
            itemStatus: item.status,
            jobStatus: job.status,
            companyCode: job.companyCode,
            branchName: job.jobType === 'VEHICLE_SLIDE' ? getRouteLabel(job) : job.branchName,
            supplierName: job.supplierName,
            d365PoNumber: job.d365PoNumber || null,
            invoiceNumber: job.invoiceNumber || null,
            remarks: item.remarks || null,
            pricingMode: job.jobType === 'VEHICLE_SLIDE' ? (job.pricingMode || 'AUTO') : null,
            contractCost: job.contractCost ?? null,
            manualPriceNote: job.manualPriceNote || null,
          });
        }
      }
      // Single vehicle VEHICLE_SLIDE (no items)
      else if (job.jobType === 'VEHICLE_SLIDE' && job.vin) {
        records.push({
          id: `slide-${job.id}`,
          vin: job.vin,
          vehicleModel: job.vehicle?.model || '-',
          vehicleColor: job.vehicle?.color || '-',
          licensePlate: job.vehicle?.licensePlate || '-',
          vehicleType: job.vehicle?.vehicleType || '-',
          jobId: job.id,
          jobNumber: job.jobNumber,
          jobType: job.jobType,
          serviceType: isFailedAttemptJob(job) ? 'SLIDE_FAILED_ATTEMPT' : 'VEHICLE_SLIDE',
          serviceDate: job.createdAt,
          unitPrice: getJobTotalCost(job),
          itemStatus: job.status,
          jobStatus: job.status,
          companyCode: job.companyCode,
          branchName: getRouteLabel(job),
          supplierName: job.supplierName,
          d365PoNumber: job.d365PoNumber || null,
          invoiceNumber: job.invoiceNumber || null,
          pricingMode: job.pricingMode || 'AUTO',
          contractCost: job.contractCost ?? null,
          manualPriceNote: job.manualPriceNote || null,
          remarks: null,
        });
      }
    }

    // Sort by date descending
    records.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
    return records;
  }, [jobs]);

  // ─── Filters ───
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'PAST_7' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const toLocalYMD = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSelectDatePreset = (preset: 'ALL' | 'TODAY' | 'PAST_7' | 'THIS_MONTH') => {
    setDatePreset(preset);
    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const now = new Date();
    const todayStr = toLocalYMD(now);
    if (preset === 'TODAY') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'PAST_7') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      setDateFrom(toLocalYMD(start));
      setDateTo(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(toLocalYMD(start));
      setDateTo(todayStr);
    }
  };

  // ─── Detail view ───
  const [selectedVin, setSelectedVin] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator?.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  // Unique invoice numbers for filter
  const invoiceNumbers = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach(r => { if (r.invoiceNumber) set.add(r.invoiceNumber); });
    return Array.from(set).sort();
  }, [allRecords]);

  const serviceOptions: DropdownOption[] = useMemo(() => {
    const usedTypes = Array.from(new Set(allRecords.map(r => r.serviceType)));
    const baseTypes = [
      'WASH_AND_COAT',
      'POLISH_STAINS',
      'VACUUM_CENTER',
      'VACUUM_CUSTOMER',
      'WASH_NORMAL',
      'WASH_INSPECTION',
      'COATING',
      'BIG_SIZE_M8',
      'VEHICLE_SLIDE',
    ];
    const allTypes = Array.from(new Set([...usedTypes, ...baseTypes]));
    return [
      { value: 'ALL', label: 'ทั้งหมด', icon: Sparkles },
      ...allTypes.map(type => ({
        value: type,
        label: getServiceLabel(type),
        dot: type === 'SLIDE_FAILED_ATTEMPT' ? '#ea580c' : type === 'VEHICLE_SLIDE' ? '#f59e0b' : '#10b981',
        icon: type === 'VEHICLE_SLIDE' || type === 'SLIDE_FAILED_ATTEMPT' ? Truck : undefined,
      })),
    ];
  }, [allRecords]);

  const statusOptions: DropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'ทั้งหมด', icon: Filter },
    { value: 'PENDING', label: 'รอดำเนินการ', dot: '#d97706', badge: 'รอทำ', badgeClass: 'bg-amber-50 text-amber-700' },
    { value: 'COMPLETED', label: 'ส่งงานแล้ว', dot: '#059669', badge: 'ส่งแล้ว', badgeClass: 'bg-emerald-50 text-emerald-700' },
    { value: 'APPROVED', label: 'อนุมัติแล้ว', dot: '#059669', badge: 'อนุมัติ', badgeClass: 'bg-emerald-50 text-[#0f5238]' },
    { value: 'INVOICED', label: 'วางบิลแล้ว', dot: '#6b7280', badge: 'วางบิล', badgeClass: 'bg-gray-100 text-gray-700' },
    { value: 'REJECTED', label: 'ตีกลับ', dot: '#dc2626', badge: 'ตีกลับ', badgeClass: 'bg-red-50 text-red-700' },
  ], []);

  const supplierOptions: DropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'ทั้งหมด', icon: Building2 },
    ...suppliers.map(s => ({
      value: s.name,
      label: s.name,
      sublabel: `รหัส: ${s.code}`,
      dot: '#3b82f6',
    })),
  ], [suppliers]);

  const invoiceOptions: DropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'ทั้งหมด', icon: Receipt },
    { value: 'NO_INVOICE', label: 'ยังไม่วางบิล', dot: '#f59e0b' },
    ...invoiceNumbers.map(inv => ({
      value: inv,
      label: inv,
      dot: '#10b981',
      icon: Receipt,
    })),
  ], [invoiceNumbers]);

  // ─── Apply filters ───
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          r.vin.toLowerCase().includes(q) ||
          r.licensePlate.toLowerCase().includes(q) ||
          r.vehicleModel.toLowerCase().includes(q) ||
          r.jobNumber.toLowerCase().includes(q) ||
          (r.d365PoNumber?.toLowerCase().includes(q) ?? false) ||
          (r.invoiceNumber?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      // Company
      if (companyFilter !== 'ALL' && r.companyCode !== companyFilter) return false;
      // Service type
      if (serviceFilter !== 'ALL' && r.serviceType !== serviceFilter) return false;
      // Status
      if (statusFilter !== 'ALL' && r.itemStatus !== statusFilter) return false;
      // Supplier
      if (supplierFilter !== 'ALL' && r.supplierName !== supplierFilter) return false;
      // Invoice
      if (invoiceFilter !== 'ALL') {
        if (invoiceFilter === 'NO_INVOICE' && r.invoiceNumber) return false;
        if (invoiceFilter !== 'NO_INVOICE' && r.invoiceNumber !== invoiceFilter) return false;
      }
      // Date range (YYYY-MM-DD)
      if (dateFrom || dateTo) {
        const recordDate = (r.serviceDate || '').slice(0, 10);
        if (dateFrom && recordDate < dateFrom) return false;
        if (dateTo && recordDate > dateTo) return false;
      }
      return true;
    });
  }, [allRecords, searchQuery, companyFilter, serviceFilter, statusFilter, supplierFilter, invoiceFilter, dateFrom, dateTo]);

  // ─── Group by VIN for summary ───
  const vehicleGroups = useMemo(() => {
    const map = new Map<string, VehicleRecord[]>();
    for (const r of filteredRecords) {
      const existing = map.get(r.vin) || [];
      existing.push(r);
      map.set(r.vin, existing);
    }
    // Sort by number of records desc
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredRecords]);

  // ─── Summary stats ───
  const totalCost = filteredRecords.reduce((sum, r) => r.itemStatus !== 'CANCELLED' ? sum + r.unitPrice : sum, 0);
  const totalVehicles = vehicleGroups.length;
  const invoicedCount = filteredRecords.filter(r => r.invoiceNumber).length;
  const cancelledCount = filteredRecords.filter(r => r.itemStatus === 'CANCELLED').length;

  // ─── Export Excel (.xlsx) ───
  const handleExportExcel = useCallback(async () => {
    const XLSX = await import('xlsx');

    const rows = filteredRecords.map((r, index) => ({
      'ลำดับ': index + 1,
      'VIN (เลขตัวถัง)': r.vin,
      'ทะเบียนรถ': r.licensePlate || '-',
      'รุ่นรถ': r.vehicleModel || '-',
      'สี': r.vehicleColor || '-',
      'บริษัท': r.companyCode,
      'เลขใบสั่งงาน': r.jobNumber,
      'เลข PO (D365)': r.d365PoNumber || '-',
      'ประเภทงาน': r.jobType === 'VEHICLE_SLIDE' ? 'รถสไลด์' : 'ล้างรถ',
      'บริการ': getServiceLabel(r.serviceType),
      'วันที่ทำรายการ': formatThaiDate(r.serviceDate),
      'สาขา / เส้นทาง': r.branchName,
      'Supplier': r.supplierName,
      'สถานะ': STATUS_STYLES[r.itemStatus]?.label || r.itemStatus,
      'เลข Invoice': r.invoiceNumber || '-',
      'วิธีคิดค่าบริการ': r.jobType === 'VEHICLE_SLIDE' ? (r.pricingMode === 'MANUAL' ? 'กรอกเอง' : 'คำนวณอัตโนมัติ') : '-',
      'ราคาตามสัญญา (บาท)': r.pricingMode === 'MANUAL' ? (r.contractCost ?? '-') : '-',
      'ราคา (บาท)': r.unitPrice,
      'หมายเหตุการกรอกราคาเอง': r.pricingMode === 'MANUAL' ? (r.manualPriceNote || '') : '',
      'หมายเหตุ': r.remarks || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 7 },   // ลำดับ
      { wch: 22 },  // VIN
      { wch: 14 },  // ทะเบียนรถ
      { wch: 26 },  // รุ่นรถ
      { wch: 16 },  // สี
      { wch: 8 },   // บริษัท
      { wch: 18 },  // เลขใบสั่งงาน
      { wch: 18 },  // เลข PO (D365)
      { wch: 12 },  // ประเภทงาน
      { wch: 24 },  // บริการ
      { wch: 15 },  // วันที่ทำรายการ
      { wch: 35 },  // สาขา / เส้นทาง
      { wch: 32 },  // Supplier
      { wch: 14 },  // สถานะ
      { wch: 18 },  // เลข Invoice
      { wch: 16 },  // วิธีคิดค่าบริการ
      { wch: 18 },  // ราคาตามสัญญา (บาท)
      { wch: 14 },  // ราคา (บาท)
      { wch: 32 },  // หมายเหตุการกรอกราคาเอง
      { wch: 24 },  // หมายเหตุ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ประวัติรายคัน');
    XLSX.writeFile(wb, `Vehicle_History_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [filteredRecords]);

  // เชื่อมปุ่ม "ส่งออก Excel" ด้านบนของหน้ารายงานให้ส่งออกข้อมูลรายคันตามตัวกรองปัจจุบัน
  useEffect(() => {
    registerExportHandler?.(handleExportExcel);
    return () => registerExportHandler?.(null);
  }, [registerExportHandler, handleExportExcel]);

  const activeAdvancedFilterCount = [
    serviceFilter !== 'ALL',
    statusFilter !== 'ALL',
    supplierFilter !== 'ALL',
    invoiceFilter !== 'ALL',
  ].filter(Boolean).length;

  // ─── Print per-vehicle detail ───
  const selectedVinRecords = useMemo(() => {
    if (!selectedVin) return [];
    const matched = filteredRecords.filter(r => r.vin === selectedVin);
    return matched.length > 0 ? matched : allRecords.filter(r => r.vin === selectedVin);
  }, [selectedVin, filteredRecords, allRecords]);

  // ─── View mode (FLAT = รายการทั้งหมด [default] | GROUPED = จัดกลุ่มตามรถ) ───
  const [viewMode, setViewMode] = useState<'GROUPED' | 'FLAT'>('FLAT');

  // ─── Expand/Collapse state per vehicle ───
  // ค่าเริ่มต้น: ถ้ามี ≤ 5 คัน หรือกำลังพิมพ์ค้นหา → กางอัตโนมัติ, ถ้ามากกว่านั้น → ย่อไว้เพื่อให้สแกนยอดรายคันได้เร็ว
  const autoExpandByDefault = searchQuery.trim().length > 0 || vehicleGroups.length <= 5;
  const [toggledVins, setToggledVins] = useState<Set<string>>(new Set());
  const [expandAllOverride, setExpandAllOverride] = useState<boolean | null>(null);

  const isVinExpanded = useCallback(
    (vin: string) => {
      const base = expandAllOverride !== null ? expandAllOverride : autoExpandByDefault;
      return toggledVins.has(vin) ? !base : base;
    },
    [expandAllOverride, autoExpandByDefault, toggledVins]
  );

  const toggleVinGroup = useCallback((vin: string) => {
    setToggledVins(prev => {
      const next = new Set(prev);
      if (next.has(vin)) next.delete(vin);
      else next.add(vin);
      return next;
    });
  }, []);

  const allExpanded = vehicleGroups.length > 0 && vehicleGroups.every(([vin]) => isVinExpanded(vin));

  const handleToggleAllGroups = () => {
    setToggledVins(new Set());
    setExpandAllOverride(!allExpanded);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* ═══ Summary Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 md:p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Car className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] text-gray-400 font-medium uppercase">รถทั้งหมด</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{totalVehicles} <span className="text-xs font-medium text-gray-400">คัน</span></p>
        </div>
        <div className="p-3 md:p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] text-gray-400 font-medium uppercase">รายการทั้งหมด</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{filteredRecords.length} <span className="text-xs font-medium text-gray-400">รายการ</span></p>
        </div>
        <div className="p-3 md:p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] text-gray-400 font-medium uppercase">วางบิลแล้ว</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-emerald-700">{invoicedCount} <span className="text-xs font-medium text-gray-400">รายการ</span></p>
        </div>
        <div className="p-3 md:p-4 rounded-2xl bg-gradient-to-br from-[#0f5238] to-[#1a7a56] text-white shadow-lg">
          <span className="text-[10px] font-medium text-white/70 uppercase">ค่าบริการรวม</span>
          <p className="text-xl md:text-2xl font-bold mt-0.5">฿{totalCost.toLocaleString()}</p>
          {cancelledCount > 0 && (
            <p className="text-[10px] text-white/60 mt-0.5">ยกเลิก {cancelledCount} รายการ (ไม่รวมในยอด)</p>
          )}
        </div>
      </div>

      {/* ═══ Search & Filters ═══ */}
      <div className="flex flex-col gap-3">
        {/* Search bar + Filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหา VIN, ทะเบียนรถ, รุ่นรถ, เลขใบสั่งงาน, เลข PO หรือ Invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238]/20 focus:border-[#0f5238] outline-none bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-10 flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all border shrink-0 cursor-pointer ${
              showFilters || activeAdvancedFilterCount > 0
                ? 'bg-[#f4f9f5] border-[#0f5238] text-[#0f5238]'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>ตัวกรองเพิ่มเติม</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#0f5238] text-white text-[10px] font-bold">
                {activeAdvancedFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Date Range Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white border border-gray-100 shadow-xs">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#0f5238]" />
              <span>ช่วงวันที่:</span>
            </span>
            {([
              { key: 'ALL', label: 'ทั้งหมด' },
              { key: 'TODAY', label: 'วันนี้' },
              { key: 'PAST_7', label: '7 วันล่าสุด' },
              { key: 'THIS_MONTH', label: 'เดือนนี้' },
            ] as const).map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleSelectDatePreset(preset.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  datePreset === preset.key
                    ? 'bg-[#0f5238] text-white shadow-2xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs (From - To) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-medium text-gray-500 whitespace-nowrap">ตั้งแต่วันที่</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateFrom(val);
                  setDatePreset(!val && !dateTo ? 'ALL' : 'CUSTOM');
                }}
                className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-[#0f5238]/20 focus:border-[#0f5238] outline-none bg-gray-50/50"
              />
            </div>

            <span className="text-xs text-gray-400">ถึง</span>

            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-medium text-gray-500 whitespace-nowrap">วันที่</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateTo(val);
                  setDatePreset(!dateFrom && !val ? 'ALL' : 'CUSTOM');
                }}
                className="h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-[#0f5238]/20 focus:border-[#0f5238] outline-none bg-gray-50/50"
              />
            </div>

            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => handleSelectDatePreset('ALL')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold transition-colors cursor-pointer"
                title="ล้างตัวกรองวันที่"
              >
                <X className="w-3 h-3" />
                <span>ล้างวันที่</span>
              </button>
            )}
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-xs animate-fade-in">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">ประเภทบริการ</label>
              <CustomDropdown
                value={serviceFilter}
                onChange={setServiceFilter}
                options={serviceOptions}
                icon={Sparkles}
                dropdownWidth="w-full"
                placeholder="ทั้งหมด"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">สถานะ</label>
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                icon={Filter}
                dropdownWidth="w-full"
                placeholder="ทั้งหมด"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Supplier</label>
              <CustomDropdown
                value={supplierFilter}
                onChange={setSupplierFilter}
                options={supplierOptions}
                icon={Building2}
                dropdownWidth="w-full"
                placeholder="ทั้งหมด"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">เลข Invoice</label>
              <CustomDropdown
                value={invoiceFilter}
                onChange={setInvoiceFilter}
                options={invoiceOptions}
                icon={Receipt}
                dropdownWidth="w-full"
                placeholder="ทั้งหมด"
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══ Per-Vehicle Grouped / Flat Report ═══ */}
      {vehicleGroups.length === 0 ? (
        <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Car className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold">ไม่พบรายการ</p>
          <p className="text-xs mt-1">ลองปรับเงื่อนไขการค้นหา</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Toolbar: Count + View Mode Switcher + Expand/Collapse */}
          <div className="px-4 py-2.5 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-bold text-gray-900">รายการสรุปยอด</span>
              <span className="text-gray-300">•</span>
              <span>
                <strong className="text-[#0f5238]">{totalVehicles}</strong> คัน ({filteredRecords.length} รายการ)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View mode toggle */}
              <div className="flex items-center p-0.5 rounded-xl bg-gray-100 border border-gray-200/70">
                <button
                  type="button"
                  onClick={() => setViewMode('FLAT')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    viewMode === 'FLAT'
                      ? 'bg-white text-[#0f5238] shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>รายการทั้งหมด</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('GROUPED')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    viewMode === 'GROUPED'
                      ? 'bg-white text-[#0f5238] shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>จัดกลุ่มตามรถ</span>
                </button>
              </div>

              {viewMode === 'GROUPED' && (
                <button
                  type="button"
                  onClick={handleToggleAllGroups}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[11px] font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  {allExpanded ? (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                      <span>ย่อทั้งหมด</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-[#0f5238]" />
                      <span>ขยายทั้งหมด</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {viewMode === 'GROUPED' ? (
            /* ═══ GROUPED VIEW: Card Accordion per Vehicle (Zero Horizontal Scroll) ═══ */
            <div className="flex flex-col gap-2.5">
              {vehicleGroups.map(([vin, records], groupIdx) => {
                const first = records[0];
                const groupCost = records
                  .filter(r => r.itemStatus !== 'CANCELLED')
                  .reduce((s, r) => s + r.unitPrice, 0);
                const poCount = records.filter(r => Boolean(r.d365PoNumber)).length;
                const hasManualPrice = records.some(r => r.pricingMode === 'MANUAL');
                const hasFailedAttempt = records.some(r => r.serviceType === 'SLIDE_FAILED_ATTEMPT');
                const expanded = isVinExpanded(vin);

                return (
                  <div
                    key={vin}
                    className={`rounded-2xl bg-white border transition-all overflow-hidden shadow-2xs ${
                      expanded ? 'border-emerald-200/90' : 'border-gray-200/80 hover:border-emerald-200'
                    }`}
                  >
                    {/* ─── Vehicle Card Header (Always 100% visible, no overflow) ─── */}
                    <div
                      onClick={() => toggleVinGroup(vin)}
                      className={`px-3.5 sm:px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        expanded ? 'bg-[#f4f9f5] border-b border-emerald-100' : 'bg-white hover:bg-[#f8fbf9]'
                      }`}
                    >
                      {/* Left: Expand + Index + VIN + Model */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-lg bg-white border border-emerald-200 text-[#0f5238] flex items-center justify-center shrink-0">
                          {expanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="w-6 h-6 rounded-lg bg-[#0f5238] text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                          {groupIdx + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 tracking-tight">
                              {vin}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(vin);
                              }}
                              title="คัดลอก VIN"
                              className="p-0.5 rounded hover:bg-emerald-100 text-gray-400 hover:text-[#0f5238] transition-colors cursor-pointer"
                            >
                              {copiedText === vin ? (
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-100 text-[#0f5238]">
                              {first.companyCode}
                            </span>
                            {first.licensePlate && first.licensePlate !== '-' && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700">
                                {first.licensePlate}
                              </span>
                            )}
                            <span className="px-2 py-0.2 rounded-full bg-white border border-gray-200 text-[10px] font-semibold text-gray-700">
                              {records.length} รายการ
                            </span>
                            {hasFailedAttempt && (
                              <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-800 text-[10px] font-bold">
                                เที่ยวเปล่า
                              </span>
                            )}
                            {hasManualPrice && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                                <PencilLine className="w-2.5 h-2.5" />
                                กรอกเอง
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {first.vehicleModel}
                            {first.vehicleColor && first.vehicleColor !== '-' ? ` · ${first.vehicleColor}` : ''}
                            {poCount > 0 ? ` · PO ${poCount}/${records.length}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Right: Subtotal + Print (Always pinned inside viewport) */}
                      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                        <div className="text-right">
                          <span className="block text-[9px] text-gray-400 font-medium leading-none">รวมคันนี้</span>
                          <span className="font-mono font-extrabold text-sm sm:text-base text-[#0f5238] leading-tight">
                            ฿{groupCost.toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVin(vin);
                          }}
                          title="ดูรายละเอียดและพิมพ์ประวัติรถคันนี้"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">พิมพ์</span>
                        </button>
                      </div>
                    </div>

                    {/* ─── Vehicle Items: Clean 6-Column Table (Fits Desktop Without Scroll) ─── */}
                    {expanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50/70 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              <th className="py-2 px-3.5">ใบงาน / วันที่</th>
                              <th className="py-2 px-3">บริการ / เส้นทาง</th>
                              <th className="py-2 px-3">Supplier</th>
                              <th className="py-2 px-3">PO / Invoice</th>
                              <th className="py-2 px-3 text-center">สถานะ</th>
                              <th className="py-2 px-3.5 text-right">ราคา</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {records.map((r) => {
                              const st = STATUS_STYLES[r.itemStatus] || STATUS_STYLES.PENDING;
                              const isCancelled = r.itemStatus === 'CANCELLED';
                              const isFailed = r.serviceType === 'SLIDE_FAILED_ATTEMPT';
                              const isManual = r.pricingMode === 'MANUAL';
                              const compactLoc = formatCompactLocation(r.branchName);

                              return (
                                <tr
                                  key={r.id}
                                  className={`transition-colors ${
                                    isCancelled ? 'bg-red-50/30' : 'bg-white hover:bg-gray-50/60'
                                  }`}
                                >
                                  {/* 1. Job Number + Date */}
                                  <td className="py-2.5 px-3.5 whitespace-nowrap align-top">
                                    <p className={`font-mono font-bold text-xs ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                      {r.jobNumber}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      {formatThaiDate(r.serviceDate)}
                                    </p>
                                  </td>

                                  {/* 2. Service + Compact Branch/Route */}
                                  <td className="py-2.5 px-3 align-top max-w-[260px]">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {r.jobType === 'VEHICLE_SLIDE' ? (
                                        <Truck className={`w-3.5 h-3.5 shrink-0 ${isFailed ? 'text-orange-500' : 'text-blue-500'}`} />
                                      ) : (
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      )}
                                      <span className={`font-semibold text-xs ${isFailed ? 'text-orange-800' : 'text-gray-800'}`}>
                                        {getServiceLabel(r.serviceType)}
                                      </span>
                                      {isManual && (
                                        <span
                                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold"
                                          title={r.manualPriceNote || 'ค่าบริการกรอกเอง'}
                                        >
                                          <PencilLine className="w-2.5 h-2.5" />
                                          กรอกเอง
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 truncate mt-0.5" title={r.branchName}>
                                      {compactLoc}
                                    </p>
                                  </td>

                                  {/* 3. Supplier */}
                                  <td className="py-2.5 px-3 align-top max-w-[170px]">
                                    <p className="text-xs text-gray-700 truncate" title={r.supplierName}>
                                      {r.supplierName}
                                    </p>
                                  </td>

                                  {/* 4. PO + Invoice */}
                                  <td className="py-2.5 px-3 whitespace-nowrap align-top">
                                    {r.d365PoNumber ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 font-mono text-[11px] font-bold">
                                        {r.d365PoNumber}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-gray-400">ยังไม่มี PO</span>
                                    )}
                                    {r.invoiceNumber && (
                                      <p className="font-mono text-[10px] text-emerald-700 font-semibold mt-0.5">
                                        {r.invoiceNumber}
                                      </p>
                                    )}
                                  </td>

                                  {/* 5. Status */}
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap align-top">
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                                      style={{ color: st.color, backgroundColor: st.bg }}
                                    >
                                      {st.label}
                                    </span>
                                  </td>

                                  {/* 6. Price */}
                                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap align-top">
                                    <span
                                      className={`font-mono font-bold text-xs sm:text-sm ${
                                        isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'
                                      }`}
                                      title={
                                        isManual && r.contractCost
                                          ? `ราคาตามสัญญา ฿${r.contractCost.toLocaleString()} • หมายเหตุ: ${r.manualPriceNote || '-'}`
                                          : undefined
                                      }
                                    >
                                      ฿{r.unitPrice.toLocaleString()}
                                    </span>
                                    {isManual && r.contractCost && r.contractCost !== r.unitPrice && (
                                      <p className="text-[10px] text-amber-700 font-mono mt-0.5">
                                        สัญญา ฿{r.contractCost.toLocaleString()}
                                      </p>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ═══ FLAT VIEW: Chronological All-Items Table (Accounting / PO Check) ═══ */
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/90 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="py-3 px-3.5">รถ (VIN / รุ่น)</th>
                      <th className="py-3 px-3">ใบงาน / วันที่</th>
                      <th className="py-3 px-3">บริการ / เส้นทาง</th>
                      <th className="py-3 px-3">Supplier</th>
                      <th className="py-3 px-3">PO / Invoice</th>
                      <th className="py-3 px-3 text-center">สถานะ</th>
                      <th className="py-3 px-3.5 text-right">ราคา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.map((r) => {
                      const st = STATUS_STYLES[r.itemStatus] || STATUS_STYLES.PENDING;
                      const isCancelled = r.itemStatus === 'CANCELLED';
                      const isFailed = r.serviceType === 'SLIDE_FAILED_ATTEMPT';
                      const isManual = r.pricingMode === 'MANUAL';
                      const compactLoc = formatCompactLocation(r.branchName);

                      return (
                        <tr
                          key={r.id}
                          className={`transition-colors ${
                            isCancelled ? 'bg-red-50/30' : 'bg-white hover:bg-gray-50/70'
                          }`}
                        >
                          {/* 1. Vehicle */}
                          <td className="py-2.5 px-3.5 align-top max-w-[190px]">
                            <button
                              type="button"
                              onClick={() => setSelectedVin(r.vin)}
                              className="font-mono font-bold text-xs text-[#0f5238] hover:underline text-left cursor-pointer"
                              title="คลิกดูประวัติรถคันนี้"
                            >
                              {r.vin}
                            </button>
                            <p className="text-[10px] text-gray-500 truncate mt-0.5" title={`${r.vehicleModel} ${r.licensePlate !== '-' ? r.licensePlate : ''}`}>
                              {r.vehicleModel}
                              {r.licensePlate && r.licensePlate !== '-' ? ` · ${r.licensePlate}` : ''}
                            </p>
                          </td>

                          {/* 2. Job + Date */}
                          <td className="py-2.5 px-3 whitespace-nowrap align-top">
                            <p className={`font-mono font-bold text-xs ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {r.jobNumber}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {formatThaiDate(r.serviceDate)}
                            </p>
                          </td>

                          {/* 3. Service + Route */}
                          <td className="py-2.5 px-3 align-top max-w-[230px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {r.jobType === 'VEHICLE_SLIDE' ? (
                                <Truck className={`w-3.5 h-3.5 shrink-0 ${isFailed ? 'text-orange-500' : 'text-blue-500'}`} />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              )}
                              <span className={`font-semibold text-xs ${isFailed ? 'text-orange-800' : 'text-gray-800'}`}>
                                {getServiceLabel(r.serviceType)}
                              </span>
                              {isManual && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold"
                                  title={r.manualPriceNote || 'ค่าบริการกรอกเอง'}
                                >
                                  <PencilLine className="w-2.5 h-2.5" />
                                  กรอกเอง
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5" title={r.branchName}>
                              {compactLoc}
                            </p>
                          </td>

                          {/* 4. Supplier */}
                          <td className="py-2.5 px-3 align-top max-w-[160px]">
                            <p className="text-xs text-gray-700 truncate" title={r.supplierName}>
                              {r.supplierName}
                            </p>
                          </td>

                          {/* 5. PO / Invoice */}
                          <td className="py-2.5 px-3 whitespace-nowrap align-top">
                            {r.d365PoNumber ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 font-mono text-[11px] font-bold">
                                {r.d365PoNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">ยังไม่มี PO</span>
                            )}
                            {r.invoiceNumber && (
                              <p className="font-mono text-[10px] text-emerald-700 font-semibold mt-0.5">
                                {r.invoiceNumber}
                              </p>
                            )}
                          </td>

                          {/* 6. Status */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap align-top">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ color: st.color, backgroundColor: st.bg }}
                            >
                              {st.label}
                            </span>
                          </td>

                          {/* 7. Price */}
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap align-top">
                            <span
                              className={`font-mono font-bold text-xs sm:text-sm ${
                                isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'
                              }`}
                            >
                              ฿{r.unitPrice.toLocaleString()}
                            </span>
                            {isManual && r.contractCost && r.contractCost !== r.unitPrice && (
                              <p className="text-[10px] text-amber-700 font-mono mt-0.5">
                                สัญญา ฿{r.contractCost.toLocaleString()}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ Grand Total Bar (Always Visible at Bottom) ═══ */}
          <div className="px-4 sm:px-5 py-3.5 rounded-2xl bg-[#f4f9f5] border border-emerald-200/80 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-bold text-gray-700">
              รวมค่าบริการสุทธิทั้งหมด ({totalVehicles} คัน • {filteredRecords.filter(r => r.itemStatus !== 'CANCELLED').length} รายการ)
            </span>
            <span className="font-mono font-black text-base sm:text-lg text-[#0f5238]">
              ฿{totalCost.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* ═══ Detail / Print Modal ═══ */}
      {selectedVin && selectedVinRecords.length > 0 && (
        <VehicleDetailModal
          vin={selectedVin}
          records={selectedVinRecords}
          onClose={() => setSelectedVin(null)}
          onCopy={handleCopy}
          copiedText={copiedText}
        />
      )}
    </div>
  );
}
