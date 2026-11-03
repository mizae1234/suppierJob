'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
import { Job, CompanyCode, CarWashItem } from '@/types';
import { VehicleDetailModal, VehicleRecord } from '@/components/vehicles';
import CustomDropdown, { DropdownOption } from '@/components/ui/CustomDropdown';
import {
  Car,
  FileText,
  FileSpreadsheet,
  Search,
  Filter,
  Printer,
  Download,
  X,
  ChevronDown,
  ChevronRight,
  Receipt,
  Building2,
  Sparkles,
  Truck,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  CheckCheck,
  Hash,
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
};

const getServiceLabel = (serviceType: string): string => {
  if (SERVICE_TYPE_LABELS[serviceType]) return SERVICE_TYPE_LABELS[serviceType];
  return getWashServiceDisplay(serviceType)?.name || serviceType;
};

export default function VehicleReportsPage() {
  const { jobs, invoices, suppliers, companies } = useApp();

  // ─── Build flat per-vehicle records from jobs data ───
  const allRecords: VehicleRecord[] = useMemo(() => {
    const records: VehicleRecord[] = [];

    const getRouteLabel = (j: any) => {
      const origin = j.customOriginAddress || j.originBranchName || j.branchName || 'ต้นทาง';
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
            serviceType: job.jobType === 'VEHICLE_SLIDE' ? 'VEHICLE_SLIDE' : item.washType,
            serviceDate: item.actualWashDate,
            unitPrice: item.unitPrice,
            itemStatus: item.status,
            jobStatus: job.status,
            companyCode: job.companyCode,
            branchName: job.jobType === 'VEHICLE_SLIDE' ? getRouteLabel(job) : job.branchName,
            supplierName: job.supplierName,
            d365PoNumber: job.d365PoNumber || null,
            invoiceNumber: job.invoiceNumber || null,
            remarks: item.remarks || null,
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
          serviceType: 'VEHICLE_SLIDE',
          serviceDate: job.createdAt,
          unitPrice: job.actualCost || job.estimatedCost || 0,
          itemStatus: job.status,
          jobStatus: job.status,
          companyCode: job.companyCode,
          branchName: getRouteLabel(job),
          supplierName: job.supplierName,
          d365PoNumber: job.d365PoNumber || null,
          invoiceNumber: job.invoiceNumber || null,
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
  const [companyFilter, setCompanyFilter] = useState<'ALL' | CompanyCode>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);

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
        dot: type === 'VEHICLE_SLIDE' ? '#f59e0b' : '#10b981',
        icon: type === 'VEHICLE_SLIDE' ? Truck : undefined,
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
      return true;
    });
  }, [allRecords, searchQuery, companyFilter, serviceFilter, statusFilter, supplierFilter, invoiceFilter]);

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
  const handleExportExcel = async () => {
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
      'ราคา (บาท)': r.unitPrice,
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
      { wch: 14 },  // ราคา (บาท)
      { wch: 24 },  // หมายเหตุ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ประวัติการทำรายการ');
    XLSX.writeFile(wb, `Transaction_History_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ─── Print per-vehicle detail ───
  const selectedVinRecords = selectedVin ? allRecords.filter(r => r.vin === selectedVin) : [];

  // ─── Collapsed vehicle groups state (default: all expanded in grouped table) ───
  const [collapsedVins, setCollapsedVins] = useState<Set<string>>(new Set());

  const toggleVinGroup = useCallback((vin: string) => {
    setCollapsedVins(prev => {
      const next = new Set(prev);
      if (next.has(vin)) {
        next.delete(vin);
      } else {
        next.add(vin);
      }
      return next;
    });
  }, []);

  const allCollapsed = vehicleGroups.length > 0 && vehicleGroups.every(([vin]) => collapsedVins.has(vin));

  const handleToggleAllGroups = () => {
    if (allCollapsed) {
      setCollapsedVins(new Set());
    } else {
      setCollapsedVins(new Set(vehicleGroups.map(([vin]) => vin)));
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 pb-12">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Car className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 shrink-0" />
            <span>ประวัติการทำรายการ</span>
          </h1>
          <p className="text-[11px] text-gray-500 mt-0.5">
            รายงานประวัติการให้บริการแยกรายคัน แสดงงานที่ทำ ค่าบริการ สถานะ และเลข Invoice ที่เกี่ยวข้อง
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Company filter pills */}
          <div className="flex items-center bg-white p-1 rounded-full border border-emerald-950/10 shadow-xs">
            {(['ALL', 'EV7', 'GI'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCompanyFilter(c)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  companyFilter === c ? 'bg-[#0f5238] text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {c === 'ALL' ? 'ทุกบริษัท' : c}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              showFilters ? 'bg-[#f4f9f5] border-[#0f5238] text-[#0f5238]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>ตัวกรอง</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ส่งออก Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>
        </div>
      </div>

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
        {/* Search bar */}
        <div className="relative">
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
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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

      {/* ═══ Per-Vehicle Grouped Table ═══ */}
      {vehicleGroups.length === 0 ? (
        <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Car className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold">ไม่พบรายการ</p>
          <p className="text-xs mt-1">ลองปรับเงื่อนไขการค้นหา</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          {/* Table Top Bar */}
          <div className="px-4 md:px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap bg-gray-50/40">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-bold text-gray-900">ตารางประวัติการทำรายการแยกรายคัน</span>
              <span className="text-gray-300">•</span>
              <span>
                จัดกลุ่ม <strong className="text-[#0f5238]">{totalVehicles}</strong> คัน ({filteredRecords.length} รายการ)
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleAllGroups}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[11px] font-semibold text-gray-700 transition-colors cursor-pointer"
            >
              {allCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-[#0f5238]" />
                  <span>ขยายทุกคัน</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  <span>ย่อทุกคัน</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-gray-50/90 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-3 md:px-4 w-12 text-center">#</th>
                  <th className="py-3 px-3 md:px-4">ใบสั่งงาน</th>
                  <th className="py-3 px-3 md:px-4">เลข PO</th>
                  <th className="py-3 px-3 md:px-4">บริการ</th>
                  <th className="py-3 px-3 md:px-4">วันที่</th>
                  <th className="py-3 px-3 md:px-4">สาขา / เส้นทาง</th>
                  <th className="py-3 px-3 md:px-4">Supplier</th>
                  <th className="py-3 px-3 md:px-4 text-center">สถานะ</th>
                  <th className="py-3 px-3 md:px-4">Invoice</th>
                  <th className="py-3 px-3 md:px-4 text-right">ราคา (บาท)</th>
                </tr>
              </thead>

              {vehicleGroups.map(([vin, records], groupIdx) => {
                const first = records[0];
                const groupCost = records
                  .filter(r => r.itemStatus !== 'CANCELLED')
                  .reduce((s, r) => s + r.unitPrice, 0);
                const invoiceNums = [...new Set(records.map(r => r.invoiceNumber).filter(Boolean))];
                const hasCarWash = records.some(r => r.jobType === 'CAR_WASH');
                const hasSlide = records.some(r => r.serviceType === 'VEHICLE_SLIDE');
                const isCollapsed = collapsedVins.has(vin);

                return (
                  <tbody key={vin} className="divide-y divide-gray-100 border-b-2 border-gray-100 last:border-b-0">
                    {/* ─── Group Header Row for this Vehicle ─── */}
                    <tr
                      onClick={() => toggleVinGroup(vin)}
                      className="bg-[#f4f9f5]/90 hover:bg-[#eaf4ed] transition-colors cursor-pointer select-none"
                    >
                      <td colSpan={10} className="py-2.5 px-3 md:px-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          {/* Left: Vehicle Identity & Meta */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                            <div className="w-6 h-6 rounded-md bg-white border border-emerald-200 text-[#0f5238] flex items-center justify-center shrink-0 shadow-2xs">
                              {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </div>

                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0f5238] to-[#1a7a56] text-white flex items-center justify-center shrink-0 text-[10px] font-bold shadow-2xs">
                              {groupIdx + 1}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs md:text-sm text-gray-900">
                                {vin}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(vin);
                                }}
                                title="คัดลอก VIN"
                                className="p-1 rounded hover:bg-emerald-100/70 text-gray-400 hover:text-[#0f5238] transition-colors cursor-pointer"
                              >
                                {copiedText === vin ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            {first.licensePlate && first.licensePlate !== '-' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white border border-gray-200 text-gray-700">
                                {first.licensePlate}
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0f5238]">
                              {first.companyCode}
                            </span>

                            <span className="text-[11px] text-gray-600 font-medium">
                              {first.vehicleModel}
                              {first.vehicleColor && first.vehicleColor !== '-' ? ` • ${first.vehicleColor}` : ''}
                            </span>

                            <span className="text-gray-300">|</span>

                            <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-200/80 text-[10px] font-bold text-[#0f5238]">
                              {records.length} รายการ
                            </span>

                            {hasCarWash && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded-md">
                                <Sparkles className="w-3 h-3" /> ล้างรถ
                              </span>
                            )}
                            {hasSlide && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded-md">
                                <Truck className="w-3 h-3" /> สไลด์
                              </span>
                            )}
                          </div>

                          {/* Right: Subtotal & Print Button */}
                          <div className="flex items-center gap-3 shrink-0 ml-auto">
                            {invoiceNums.length > 0 && (
                              <span className="hidden lg:inline-block text-[10px] text-gray-500 font-mono truncate max-w-[180px]" title={invoiceNums.join(', ')}>
                                {invoiceNums.join(', ')}
                              </span>
                            )}

                            <div className="text-right">
                              <span className="text-[10px] text-gray-500 mr-1.5">รวมคันนี้:</span>
                              <span className="font-mono font-bold text-sm text-[#0f5238]">
                                ฿{groupCost.toLocaleString()}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVin(vin);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0f5238] hover:bg-[#0a3d28] text-white text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              <span>ดู / พิมพ์</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* ─── Grouped Transaction Rows for this Vehicle ─── */}
                    {!isCollapsed &&
                      records.map((r, itemIdx) => {
                        const st = STATUS_STYLES[r.itemStatus] || STATUS_STYLES.PENDING;
                        const isCancelled = r.itemStatus === 'CANCELLED';
                        return (
                          <tr
                            key={r.id}
                            className={`transition-colors ${
                              isCancelled ? 'bg-red-50/30' : 'bg-white hover:bg-gray-50/70'
                            }`}
                          >
                            <td className="py-2.5 px-3 md:px-4 text-center text-[11px] font-mono text-gray-400">
                              {itemIdx + 1}
                            </td>
                            <td className="py-2.5 px-3 md:px-4 whitespace-nowrap">
                              <span className={`font-mono font-bold ${isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>
                                {r.jobNumber}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 md:px-4 whitespace-nowrap">
                              {r.d365PoNumber ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 font-mono text-[11px] font-bold">
                                  {r.d365PoNumber}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 md:px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {r.serviceType === 'VEHICLE_SLIDE' ? (
                                  <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                )}
                                <span className="text-gray-700 font-medium">
                                  {getServiceLabel(r.serviceType)}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 md:px-4 text-gray-600 whitespace-nowrap">
                              {formatThaiDate(r.serviceDate)}
                            </td>
                            <td className="py-2.5 px-3 md:px-4 text-gray-600 max-w-[240px] truncate" title={r.branchName}>
                              {r.branchName}
                            </td>
                            <td className="py-2.5 px-3 md:px-4 text-gray-600 max-w-[180px] truncate" title={r.supplierName}>
                              {r.supplierName}
                            </td>
                            <td className="py-2.5 px-3 md:px-4 text-center whitespace-nowrap">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                                style={{ color: st.color, backgroundColor: st.bg }}
                              >
                                {st.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 md:px-4 whitespace-nowrap">
                              {r.invoiceNumber ? (
                                <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                                  {r.invoiceNumber}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 md:px-4 text-right whitespace-nowrap">
                              <span className={`font-mono font-bold ${isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>
                                ฿{r.unitPrice.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                );
              })}

              {/* ─── Grand Total Footer ─── */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                  <td colSpan={9} className="py-3 px-4 text-right text-gray-700">
                    รวมค่าบริการสุทธิทั้งหมด ({totalVehicles} คัน • {filteredRecords.filter(r => r.itemStatus !== 'CANCELLED').length} รายการ):
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-[#0f5238]">
                    ฿{totalCost.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
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
