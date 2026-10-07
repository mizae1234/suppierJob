'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { Job, CompanyCode, CarWashItem } from '@/types';
import { VehicleDetailModal, VehicleRecord } from '@/components/vehicles';
import {
  Car,
  FileText,
  Search,
  Filter,
  Printer,
  Download,
  X,
  ChevronDown,
  ChevronUp,
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

export default function VehicleReportsPage() {
  const { jobs, invoices, suppliers, companies } = useApp();

  // ─── Build flat per-vehicle records from jobs data ───
  const allRecords: VehicleRecord[] = useMemo(() => {
    const records: VehicleRecord[] = [];

    for (const job of jobs) {
      // Jobs with items (CAR_WASH or VEHICLE_SLIDE with items)
      if (job.carWashItems && job.carWashItems.length > 0) {
        for (const item of job.carWashItems) {
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
            branchName: job.branchName,
            supplierName: job.supplierName,
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
          branchName: job.branchName,
          supplierName: job.supplierName,
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

  // ─── Export CSV ───
  const handleExportCSV = () => {
    const sanitizeCell = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['VIN', 'ทะเบียนรถ', 'รุ่นรถ', 'สี', 'บริษัท', 'สาขา', 'Supplier', 'เลขใบสั่งงาน', 'ประเภทงาน', 'ประเภทบริการ', 'วันที่', 'ราคา', 'สถานะ', 'เลข Invoice', 'หมายเหตุ'];
    const rows = filteredRecords.map(r => [
      sanitizeCell(r.vin),
      sanitizeCell(r.licensePlate),
      sanitizeCell(r.vehicleModel),
      sanitizeCell(r.vehicleColor),
      sanitizeCell(r.companyCode),
      sanitizeCell(r.branchName),
      sanitizeCell(r.supplierName),
      sanitizeCell(r.jobNumber),
      sanitizeCell(r.jobType),
      sanitizeCell(r.serviceType),
      sanitizeCell(r.serviceDate),
      sanitizeCell(r.unitPrice),
      sanitizeCell(r.itemStatus),
      sanitizeCell(r.invoiceNumber),
      sanitizeCell(r.remarks),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Vehicle_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Print per-vehicle detail ───
  const selectedVinRecords = selectedVin ? allRecords.filter(r => r.vin === selectedVin) : [];

  return (
    <div className="flex flex-col gap-4 md:gap-6 pb-12">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Car className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 shrink-0" />
            <span>ใบรายคัน (Per-Vehicle Report)</span>
          </h1>
          <p className="text-[11px] text-gray-500 mt-0.5">
            รายงานประวัติการให้บริการรายคัน แสดงงานที่ทำ ค่าบริการ สถานะ และเลข Invoice ที่เกี่ยวข้อง
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
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ส่งออก CSV</span>
            <span className="sm:hidden">CSV</span>
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
            placeholder="ค้นหา VIN, ทะเบียนรถ, รุ่นรถ, เลขใบสั่งงาน หรือ Invoice..."
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-xs animate-fade-in">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">ประเภทบริการ</label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238]/20 outline-none"
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="STANDARD">ล้างปกติ (Standard)</option>
                <option value="DEEP_CLEAN">ล้างพิเศษ (Deep Clean)</option>
                <option value="POLISH">ขัดเคลือบ (Polish)</option>
                <option value="VEHICLE_SLIDE">รถสไลด์ (Slide)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">สถานะ</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238]/20 outline-none"
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="PENDING">รอดำเนินการ</option>
                <option value="COMPLETED">ส่งงานแล้ว</option>
                <option value="APPROVED">อนุมัติแล้ว</option>
                <option value="INVOICED">วางบิลแล้ว</option>
                <option value="REJECTED">ตีกลับ</option>
                <option value="CANCELLED">ยกเลิก</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Supplier</label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238]/20 outline-none"
              >
                <option value="ALL">ทั้งหมด</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">เลข Invoice</label>
              <select
                value={invoiceFilter}
                onChange={(e) => setInvoiceFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238]/20 outline-none"
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="NO_INVOICE">ยังไม่วางบิล</option>
                {invoiceNumbers.map(inv => (
                  <option key={inv} value={inv}>{inv}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Per-Vehicle Accordion List ═══ */}
      <div className="flex flex-col gap-3">
        {vehicleGroups.length === 0 ? (
          <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Car className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold">ไม่พบรายการ</p>
            <p className="text-xs mt-1">ลองปรับเงื่อนไขการค้นหา</p>
          </div>
        ) : (
          vehicleGroups.map(([vin, records]) => (
            <VehicleAccordion
              key={vin}
              vin={vin}
              records={records}
              onViewDetail={setSelectedVin}
              onCopy={handleCopy}
              copiedText={copiedText}
            />
          ))
        )}
      </div>

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


// ────────────────────────────────────────────────────
// Per-Vehicle Accordion Card
// ────────────────────────────────────────────────────
function VehicleAccordion({
  vin,
  records,
  onViewDetail,
  onCopy,
  copiedText,
}: {
  vin: string;
  records: VehicleRecord[];
  onViewDetail: (vin: string) => void;
  onCopy: (text: string) => void;
  copiedText: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const first = records[0];
  const totalCost = records.filter(r => r.itemStatus !== 'CANCELLED').reduce((s, r) => s + r.unitPrice, 0);
  const invoiceNums = [...new Set(records.map(r => r.invoiceNumber).filter(Boolean))];
  const hasCarWash = records.some(r => r.jobType === 'CAR_WASH');
  const hasSlide = records.some(r => r.serviceType === 'VEHICLE_SLIDE');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden transition-all">
      {/* Collapsed Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 md:p-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        {/* Vehicle Icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0f5238] to-[#1a7a56] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Car className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-gray-900 truncate">{vin}</span>
            {first.licensePlate && first.licensePlate !== '-' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                {first.licensePlate}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0f5238]">
              {first.companyCode}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
            <span>{first.vehicleModel}</span>
            {first.vehicleColor !== '-' && <span>• {first.vehicleColor}</span>}
            <span className="text-gray-300">|</span>
            <span className="font-semibold text-gray-700">{records.length} รายการ</span>
            {hasCarWash && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600">
                <Sparkles className="w-3 h-3" /> ล้างรถ
              </span>
            )}
            {hasSlide && (
              <span className="inline-flex items-center gap-0.5 text-blue-600">
                <Truck className="w-3 h-3" /> สไลด์
              </span>
            )}
          </div>
        </div>

        {/* Cost & Invoice */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-sm font-bold text-[#0f5238]">฿{totalCost.toLocaleString()}</p>
          {invoiceNums.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate max-w-[140px]">
              {invoiceNums.join(', ')}
            </p>
          )}
        </div>

        {/* Expand icon */}
        <div className="shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/30">
          {/* Mobile cost display */}
          <div className="sm:hidden px-4 py-2 flex items-center justify-between text-xs border-b border-gray-100">
            <span className="text-gray-500">ค่าบริการรวม</span>
            <span className="font-bold text-[#0f5238]">฿{totalCost.toLocaleString()}</span>
          </div>

          {/* Records table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-2.5 px-3 md:px-4">ใบสั่งงาน</th>
                  <th className="py-2.5 px-3 md:px-4">บริการ</th>
                  <th className="py-2.5 px-3 md:px-4">วันที่</th>
                  <th className="py-2.5 px-3 md:px-4">สาขา</th>
                  <th className="py-2.5 px-3 md:px-4">Supplier</th>
                  <th className="py-2.5 px-3 md:px-4 text-center">สถานะ</th>
                  <th className="py-2.5 px-3 md:px-4 text-right">ราคา</th>
                  <th className="py-2.5 px-3 md:px-4">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => {
                  const st = STATUS_STYLES[r.itemStatus] || STATUS_STYLES.PENDING;
                  const isCancelled = r.itemStatus === 'CANCELLED';
                  return (
                    <tr key={r.id} className={`transition-colors ${isCancelled ? 'bg-red-50/30' : 'hover:bg-white'}`}>
                      <td className="py-2.5 px-3 md:px-4">
                        <span className={`font-mono font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {r.jobNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 md:px-4">
                        <div className="flex items-center gap-1">
                          {r.serviceType === 'VEHICLE_SLIDE' ? (
                            <Truck className="w-3 h-3 text-blue-500" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                          )}
                          <span className="text-gray-700">{SERVICE_TYPE_LABELS[r.serviceType] || r.serviceType}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 md:px-4 text-gray-600 whitespace-nowrap">
                        {formatThaiDate(r.serviceDate)}
                      </td>
                      <td className="py-2.5 px-3 md:px-4 text-gray-600">{r.branchName}</td>
                      <td className="py-2.5 px-3 md:px-4 text-gray-600">{r.supplierName}</td>
                      <td className="py-2.5 px-3 md:px-4 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                          style={{ color: st.color, backgroundColor: st.bg }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 md:px-4 text-right">
                        <span className={`font-mono font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          ฿{r.unitPrice.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 md:px-4">
                        {r.invoiceNumber ? (
                          <span className="font-mono text-[11px] text-emerald-700 font-semibold">{r.invoiceNumber}</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="text-[11px] text-gray-500">
              ยอดรวม {records.filter(r => r.itemStatus !== 'CANCELLED').length} รายการ:{' '}
              <strong className="text-[#0f5238]">฿{totalCost.toLocaleString()}</strong>
            </div>
            <button
              onClick={() => onViewDetail(vin)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white text-[11px] font-bold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ดู / พิมพ์ใบรายคัน</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
