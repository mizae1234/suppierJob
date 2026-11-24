'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost, getOwnerBranchCorporateInfo } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { formatThaiDate } from '@/lib/date-utils';
import { CompanyCode, Invoice, Job } from '@/types';
import { InvoiceDetailModal } from '@/components/invoices';
import {
  Receipt,
  CheckCircle2,
  FileText,
  Plus,
  Sparkles,
  Truck,
  Printer,
  Search,
  X,
  Calendar,
  Building2,
  Layers,
  Info,
} from 'lucide-react';

/**
 * ข้อความแจ้งเงื่อนไขและรอบการวางบิล (ปรับแก้ข้อความ/วันที่ตัดรอบได้จากจุดเดียวที่นี่)
 */
const BILLING_CYCLE_NOTICE = {
  title: 'เงื่อนไขและรอบการวางบิล',
  cycleText:
    'รอบการวางบิลและวันตัดรอบเป็นไปตามกำหนดการของฝ่ายบัญชี (หากต้องการสอบถามวันตัดรอบหรือกำหนดชำระเงิน กรุณาติดต่อผู้ประสานงานสาขาหรือฝ่ายบัญชี)',
};

interface BillingGroup {
  key: string;
  supplierId: string;
  supplierName: string;
  companyCode: CompanyCode;
  ownerBranchCode: string;
  ownerNameTh: string;
  jobs: Job[];
  subtotal: number;
}

type DatePreset = 'ALL' | 'TODAY' | 'PAST_7' | 'THIS_MONTH' | 'CUSTOM';

function toLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isInDateRange(
  rawDate: string | Date | null | undefined,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!dateFrom && !dateTo) return true;
  if (!rawDate) return false;
  const parsed = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const ymd = toLocalYMD(parsed);
  if (dateFrom && ymd < dateFrom) return false;
  if (dateTo && ymd > dateTo) return false;
  return true;
}

function parseSearchTerms(raw: string): string[] {
  return raw
    .split(/[,\n\t;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function jobMatchesTerms(job: Job, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const fields: string[] = [
    job.jobNumber,
    job.d365PoNumber || '',
    job.companyCode,
    job.branchName,
    job.branchCode || '',
    job.supplierName,
    job.vin || '',
    job.vehicle?.licensePlate || '',
    job.vehicle?.model || '',
  ];
  if (job.carWashItems && job.carWashItems.length > 0) {
    for (const item of job.carWashItems) {
      if (item.vin) fields.push(item.vin);
      if (item.licensePlate) fields.push(item.licensePlate);
      if (item.vehicleModel) fields.push(item.vehicleModel);
    }
  }
  const haystack = fields.join(' ').toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

export default function SupplierInvoicesPage() {
  const {
    jobs,
    invoices,
    vehicles,
    branches,
    companies,
    createInvoice,
    activeSupplier,
    currentSupplierId,
    currentBranchId,
    suppliers,
  } = useApp();
  const { user } = useAuth();
  const theme = useTheme();

  const isMaster = user?.role === 'MASTER';
  const isAdmin = user?.role === 'ADMIN';
  const isSupplierUser = user?.role === 'SUPPLIER';

  const isAll = !isSupplierUser && (isMaster || isAdmin) && (!activeSupplier || currentSupplierId === 'ALL');
  const supplierId = isSupplierUser ? user?.supplierId : (activeSupplier?.id || user?.supplierId);

  const [isCreating, setIsCreating] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [previewInvoices, setPreviewInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const searchTerms = useMemo(() => parseSearchTerms(searchQuery), [searchQuery]);
  const hasDateFilter = Boolean(dateFrom || dateTo);
  const hasActiveFilter = searchTerms.length > 0 || hasDateFilter;

  const clearAllFilters = () => {
    setSearchQuery('');
    handleSelectDatePreset('ALL');
  };

  const jobsById = useMemo(() => {
    const map = new Map<string, Job>();
    for (const j of jobs) map.set(j.id, j);
    return map;
  }, [jobs]);

  // Jobs that are APPROVED and belong to this supplier (or all for Master)
  const approvedJobs = useMemo(() => {
    let list = isAll
      ? jobs.filter(j => j.status === 'APPROVED')
      : jobs.filter(j => j.supplierId === supplierId && j.status === 'APPROVED');
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list;
  }, [jobs, supplierId, isAll, currentBranchId]);

  const getJobOwnerInfo = React.useCallback(
    (job: Job) =>
      getOwnerBranchCorporateInfo({
        job,
        vehicles,
        branches,
        companies,
        companyCode: job.companyCode,
      }),
    [vehicles, branches, companies]
  );

  const buildBillingGroups = React.useCallback(
    (list: Job[]): BillingGroup[] => {
      const map = new Map<string, BillingGroup>();
      for (const job of list) {
        const owner = getJobOwnerInfo(job);
        const ownerBranchCode = owner.branchCode || job.companyCode || 'GI';
        const key = `${job.supplierId}::${job.companyCode}::${ownerBranchCode}`;
        const existing = map.get(key);
        const cost = getJobTotalCost(job);
        if (existing) {
          existing.jobs.push(job);
          existing.subtotal += cost;
        } else {
          map.set(key, {
            key,
            supplierId: job.supplierId,
            supplierName: job.supplierName,
            companyCode: job.companyCode,
            ownerBranchCode,
            ownerNameTh: owner.nameTh,
            jobs: [job],
            subtotal: cost,
          });
        }
      }
      return Array.from(map.values()).sort((a, b) =>
        a.ownerBranchCode.localeCompare(b.ownerBranchCode, 'en', { numeric: true })
      );
    },
    [getJobOwnerInfo]
  );

  const filteredApprovedJobs = useMemo(() => {
    if (!hasActiveFilter) return approvedJobs;
    return approvedJobs.filter((job) => {
      if (hasDateFilter && !isInDateRange(job.approvedAt || job.completedAt || job.createdAt, dateFrom, dateTo)) {
        return false;
      }
      if (searchTerms.length > 0) {
        const owner = getJobOwnerInfo(job);
        const ownerHaystack = `${owner.branchCode} ${owner.nameTh}`.toLowerCase();
        const matchesOwner = searchTerms.some((term) => ownerHaystack.includes(term));
        if (!matchesOwner && !jobMatchesTerms(job, searchTerms)) {
          return false;
        }
      }
      return true;
    });
  }, [approvedJobs, hasActiveFilter, hasDateFilter, dateFrom, dateTo, searchTerms, getJobOwnerInfo]);

  const billingGroups = useMemo(
    () => buildBillingGroups(filteredApprovedJobs),
    [buildBillingGroups, filteredApprovedJobs]
  );

  const selectedBillingGroups = useMemo(() => {
    const selectedJobs = approvedJobs.filter((j) => selectedJobIds.includes(j.id));
    return buildBillingGroups(selectedJobs);
  }, [approvedJobs, selectedJobIds, buildBillingGroups]);

  // Invoices for this supplier (or all for Master)
  const myInvoices = useMemo(() => {
    if (isAll) {
      return invoices;
    }
    return invoices.filter(i => i.supplierId === supplierId);
  }, [invoices, supplierId, isAll]);

  const filteredInvoices = useMemo(() => {
    if (!hasActiveFilter) return myInvoices;
    return myInvoices.filter((inv) => {
      if (hasDateFilter && !isInDateRange(inv.invoiceDate || inv.createdAt, dateFrom, dateTo)) {
        return false;
      }
      if (searchTerms.length === 0) return true;
      const supplierObj = suppliers.find((s) => s.id === inv.supplierId);
      const linkedJobs = (inv.jobIds || [])
        .map((id) => jobsById.get(id))
        .filter((j): j is Job => Boolean(j));
      const firstLinked = linkedJobs[0];
      const ownerInfo = firstLinked ? getJobOwnerInfo(firstLinked) : null;
      const invHaystack = [
        inv.invoiceNumber,
        inv.companyCode,
        inv.supplierName || '',
        supplierObj?.name || '',
        ownerInfo?.branchCode || '',
        ownerInfo?.nameTh || '',
      ]
        .join(' ')
        .toLowerCase();
      if (searchTerms.some((term) => invHaystack.includes(term))) {
        return true;
      }
      return linkedJobs.some((job) => jobMatchesTerms(job, searchTerms));
    });
  }, [myInvoices, hasActiveFilter, hasDateFilter, dateFrom, dateTo, searchTerms, suppliers, jobsById, getJobOwnerInfo]);

  const selectedTotal = useMemo(() => {
    return approvedJobs
      .filter(j => selectedJobIds.includes(j.id))
      .reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [approvedJobs, selectedJobIds]);

  const toggleJob = (jobId: string) => {
    setSelectedJobIds(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const toggleGroupJobs = (groupJobs: Job[]) => {
    const groupIds = groupJobs.map((j) => j.id);
    const allInGroupSelected = groupIds.every((id) => selectedJobIds.includes(id));
    if (allInGroupSelected) {
      setSelectedJobIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setSelectedJobIds((prev) => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const allFilteredSelected =
    filteredApprovedJobs.length > 0 &&
    filteredApprovedJobs.every((j) => selectedJobIds.includes(j.id));

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredApprovedJobs.map((j) => j.id);
    if (allFilteredSelected) {
      setSelectedJobIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedJobIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId]
    );
  };

  const allFilteredInvoicesSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((inv) => selectedInvoiceIds.includes(inv.id));

  const toggleSelectAllFilteredInvoices = () => {
    const ids = filteredInvoices.map((inv) => inv.id);
    if (allFilteredInvoicesSelected) {
      setSelectedInvoiceIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedInvoiceIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleBatchPrintSelectedInvoices = () => {
    const selected = filteredInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
    if (selected.length > 0) {
      setPreviewInvoices(selected);
    }
  };

  const { showToast } = useToast();

  const handleCreateInvoice = async () => {
    if (selectedBillingGroups.length === 0) return;
    setIsCreating(true);
    try {
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const createdInvoices: Invoice[] = [];
      const succeededJobIds = new Set<string>();
      const failedMessages: string[] = [];

      for (const group of selectedBillingGroups) {
        const actualSupplierId = group.supplierId || supplierId || suppliers[0]?.id;
        const result = await createInvoice({
          supplierId: actualSupplierId,
          companyCode: group.companyCode,
          jobIds: group.jobs.map((j) => j.id),
          dueDate,
        });
        if (result.success && result.invoice) {
          createdInvoices.push(result.invoice as unknown as Invoice);
          for (const j of group.jobs) succeededJobIds.add(j.id);
        } else {
          failedMessages.push(`${group.ownerBranchCode}: ${result.error || 'สร้างใบวางบิลไม่สำเร็จ'}`);
        }
      }

      if (succeededJobIds.size > 0) {
        setSelectedJobIds((prev) => prev.filter((id) => !succeededJobIds.has(id)));
      }

      if (createdInvoices.length > 0 && failedMessages.length === 0) {
        if (createdInvoices.length === 1) {
          showToast(`ออกใบวางบิล ${createdInvoices[0].invoiceNumber} เรียบร้อยแล้ว`, 'success');
        } else {
          const numbers = createdInvoices.map((i) => i.invoiceNumber).join(', ');
          showToast(
            `ออกใบวางบิลแยกตามสาขาเจ้าของรถสำเร็จ ${createdInvoices.length} ใบ (${numbers}) — พิมพ์รวมชุดได้ทันที`,
            'success',
            6000
          );
        }
        setPreviewInvoices(createdInvoices);
      } else if (createdInvoices.length > 0 && failedMessages.length > 0) {
        showToast(
          `ออกใบวางบิลสำเร็จ ${createdInvoices.length} ใบ แต่ไม่สำเร็จบางสาขา: ${failedMessages.join(' | ')}`,
          'warning',
          7000
        );
        setPreviewInvoices(createdInvoices);
      } else {
        showToast(failedMessages[0] || 'เกิดข้อผิดพลาดในการสร้างใบวางบิล', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการสร้างใบวางบิล', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 pb-20 sm:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ใบวางบิล</h1>
          <p className="text-sm text-gray-500">จัดการใบวางบิลและออกบิลจากงานที่ผ่านการตรวจรับ</p>
        </div>

        {/* Search Filter Bar (Filters both ready-to-bill jobs and issued invoices) */}
        {(approvedJobs.length > 0 || myInvoices.length > 0) && (
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขใบงาน, เลข PO, VIN, เลขที่ใบวางบิล..."
              aria-label="ค้นหาเลขใบงาน เลข PO VIN หรือเลขที่ใบวางบิล"
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 shadow-2xs focus:outline-none focus:border-[#0f5238] focus:ring-2 focus:ring-[#0f5238]/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Billing Cycle & Guidelines Notice */}
      {(() => {
        const currentSupplierObj = !isAll
          ? activeSupplier || suppliers.find((s) => s.id === supplierId)
          : undefined;
        const paymentTermsLabel = currentSupplierObj?.paymentTerms?.trim();
        return (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-[#0f5238] flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-[#0f5238]">{BILLING_CYCLE_NOTICE.title}</p>
                {paymentTermsLabel && (
                  <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-[10px] font-mono font-bold text-[#0f5238]">
                    เงื่อนไขชำระเงิน: {paymentTermsLabel}
                  </span>
                )}
              </div>
              <p className="text-gray-700 leading-relaxed">{BILLING_CYCLE_NOTICE.cycleText}</p>
              <p className="text-gray-500 text-[11px] leading-relaxed">{BILLING_CYCLE_NOTICE.ruleText}</p>
            </div>
          </div>
        );
      })()}

      {/* Date Range Filter Bar */}
      {(approvedJobs.length > 0 || myInvoices.length > 0) && (
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
      )}

      {/* Create Invoice Section */}
      {approvedJobs.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5" style={{ color: theme.primary }} />
              <h3 className="text-sm font-bold text-gray-900">
                ออกใบวางบิลใหม่
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {filteredApprovedJobs.length > 1 && (
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="text-xs font-semibold hover:underline cursor-pointer"
                  style={{ color: theme.primary }}
                >
                  {allFilteredSelected ? 'ยกเลิกที่เลือกทั้งหมด' : `เลือกทั้งหมด (${filteredApprovedJobs.length})`}
                </button>
              )}
              <span className="text-xs text-gray-500">
                {hasActiveFilter
                  ? `แสดง ${filteredApprovedJobs.length} / ${approvedJobs.length} งานพร้อมออกบิล`
                  : `${approvedJobs.length} งานพร้อมออกบิล`}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            เลือกงานที่ต้องการรวมในใบวางบิล (จัดกลุ่มแยกตามสาขาเจ้าของรถผู้รับผิดชอบค่าใช้จ่าย หากเลือกหลายสาขา ระบบจะแยกออกใบวางบิลให้อัตโนมัติ):
          </p>

          {filteredApprovedJobs.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 mb-4">
              <p className="text-xs font-medium text-gray-500">
                ไม่พบงานพร้อมออกบิลที่ตรงกับเงื่อนไขที่กรอง
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-2 text-xs font-semibold hover:underline cursor-pointer"
                style={{ color: theme.primary }}
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 mb-4">
              {billingGroups.map((group) => {
                const groupSelectedCount = group.jobs.filter((j) =>
                  selectedJobIds.includes(j.id)
                ).length;
                const allGroupSelected =
                  group.jobs.length > 0 && groupSelectedCount === group.jobs.length;
                return (
                  <div
                    key={group.key}
                    className="rounded-xl border border-gray-200/80 bg-gray-50/40 overflow-hidden"
                  >
                    {/* Group Header: Owner Branch / Paying Legal Entity */}
                    <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-2.5 bg-[#f4f9f5] border-b border-gray-200/70">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold text-white bg-[#0f5238] shrink-0">
                          <Building2 className="w-3 h-3" />
                          {group.ownerBranchCode}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {group.ownerNameTh}
                          </p>
                          {isAll && (
                            <p className="text-[10px] text-gray-500 truncate">
                              Supplier: {group.supplierName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-gray-500">
                          {group.jobs.length} งาน •{' '}
                          <span className="font-mono font-bold text-gray-700">
                            {formatCurrency(group.subtotal)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleGroupJobs(group.jobs)}
                          className="text-[11px] font-bold hover:underline cursor-pointer"
                          style={{ color: theme.primary }}
                        >
                          {allGroupSelected ? 'ยกเลิกกลุ่มนี้' : 'เลือกกลุ่มนี้'}
                        </button>
                      </div>
                    </div>

                    {/* Jobs in this Owner Branch group */}
                    <div className="p-2.5 flex flex-col gap-2 bg-white">
                      {group.jobs.map((job) => {
                        const isSelected = selectedJobIds.includes(job.id);
                        const cost = getJobTotalCost(job);
                        const activeItems = (job.carWashItems || []).filter(
                          (i) => i.status !== 'CANCELLED'
                        );
                        const firstVin = activeItems[0]?.vin || job.vin || '';
                        const extraCarCount = activeItems.length > 1 ? activeItems.length - 1 : 0;
                        const displayDate = job.approvedAt || job.completedAt || job.createdAt;
                        return (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() => toggleJob(job.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-current bg-current/5'
                                : 'border-gray-100 hover:border-gray-200'
                            }`}
                            style={
                              isSelected
                                ? { borderColor: theme.primary, backgroundColor: theme.bgSoft }
                                : {}
                            }
                          >
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'text-white' : 'border-gray-300'
                              }`}
                              style={
                                isSelected
                                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                  : {}
                              }
                            >
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {job.jobType === 'CAR_WASH' ? (
                                  <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                ) : (
                                  <Truck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                )}
                                <span className="text-xs font-bold font-mono text-gray-900">
                                  {job.jobNumber}
                                </span>
                                {job.d365PoNumber && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-[#0f5238]">
                                    PO: {job.d365PoNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>
                                  {job.companyCode} • {job.branchName}
                                </span>
                                {displayDate && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span>{formatThaiDate(displayDate)}</span>
                                  </>
                                )}
                                {firstVin && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="font-mono text-gray-600">
                                      {firstVin}
                                      {extraCarCount > 0 ? ` (+${extraCarCount} คัน)` : ''}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>

                            <span
                              className="text-xs font-bold font-mono shrink-0"
                              style={{ color: theme.primary }}
                            >
                              {formatCurrency(cost)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit Invoice */}
          {selectedJobIds.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  เลือก {selectedJobIds.length} งาน
                  {selectedBillingGroups.length === 1 && (
                    <span className="text-gray-600 font-medium">
                      {' '}• สาขาเจ้าของรถ {selectedBillingGroups[0].ownerBranchCode}
                    </span>
                  )}
                </p>
                <p className="text-lg font-bold font-mono" style={{ color: theme.primary }}>
                  {formatCurrency(selectedTotal)}
                </p>
                {selectedBillingGroups.length > 1 && (
                  <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-[#0f5238]">
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      ระบบจะแยกออกเป็น {selectedBillingGroups.length} ใบวางบิลอัตโนมัติตามสาขาเจ้าของรถ (
                      {selectedBillingGroups.map((g) => g.ownerBranchCode).join(', ')})
                    </span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={isCreating}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all cursor-pointer hover:opacity-90 active:scale-[0.99] shadow-sm shrink-0"
                style={{ backgroundColor: theme.primary }}
              >
                {isCreating ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Receipt className="w-4 h-4" />
                )}
                {selectedBillingGroups.length > 1
                  ? `ออก ${selectedBillingGroups.length} ใบวางบิล`
                  : 'ออกใบวางบิล'}
              </button>
            </div>
          )}
        </div>
      )}

      {approvedJobs.length === 0 && myInvoices.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">ยังไม่มีงานที่พร้อมออกบิล</p>
          <p className="text-xs mt-1">งานที่ผ่านการตรวจรับจากสาขาจะแสดงที่นี่</p>
        </div>
      )}

      {/* Existing Invoices */}
      {myInvoices.length > 0 && (() => {
        const selectedFilteredCount = filteredInvoices.filter((inv) =>
          selectedInvoiceIds.includes(inv.id)
        ).length;
        return (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span>ใบวางบิลที่ออกแล้ว</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                {hasActiveFilter ? `${filteredInvoices.length} / ${myInvoices.length}` : myInvoices.length}
              </span>
            </h3>

            {filteredInvoices.length > 0 && (
              <div className="flex items-center gap-2.5 flex-wrap">
                {filteredInvoices.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllFilteredInvoices}
                    className="text-xs font-semibold hover:underline cursor-pointer"
                    style={{ color: theme.primary }}
                  >
                    {allFilteredInvoicesSelected
                      ? 'ยกเลิกที่เลือกทั้งหมด'
                      : `เลือกทั้งหมด (${filteredInvoices.length})`}
                  </button>
                )}
                {selectedFilteredCount > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchPrintSelectedInvoices}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs transition-all cursor-pointer hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>พิมพ์รวมที่เลือก ({selectedFilteredCount} ใบ)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60">
              <p className="text-xs font-medium text-gray-500">
                ไม่พบใบวางบิลที่ตรงกับเงื่อนไขที่กรอง
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-2 text-xs font-semibold hover:underline cursor-pointer"
                style={{ color: theme.primary }}
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 sm:gap-3">
              {filteredInvoices.map(inv => {
                const supplierObj = suppliers.find(s => s.id === inv.supplierId);
                const isPaid = inv.status === 'PAID';
                const isSubmitted = inv.status === 'SUBMITTED';
                const isInvoiceChecked = selectedInvoiceIds.includes(inv.id);
                const linkedJobs = (inv.jobIds || [])
                  .map((id) => jobsById.get(id))
                  .filter((j): j is Job => Boolean(j));
                const ownerInfo = linkedJobs[0] ? getJobOwnerInfo(linkedJobs[0]) : null;
                const linkedPos = Array.from(
                  new Set(
                    linkedJobs
                      .map((j) => j.d365PoNumber)
                      .filter((po): po is string => Boolean(po))
                  )
                );

                return (
                  <div
                    key={inv.id}
                    className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isInvoiceChecked
                        ? 'border-[#0f5238]/40 bg-[#f4f9f5]/70'
                        : 'bg-white hover:bg-gray-50/70 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {/* Top/Left Section: Checkbox + Invoice Header, Badges, Details */}
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleInvoiceSelect(inv.id)}
                        aria-label={`เลือกใบวางบิล ${inv.invoiceNumber} เพื่อพิมพ์รวม`}
                        className={`mt-0.5 sm:mt-0 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isInvoiceChecked
                            ? 'text-white'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                        style={
                          isInvoiceChecked
                            ? { backgroundColor: theme.primary, borderColor: theme.primary }
                            : {}
                        }
                      >
                        {isInvoiceChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between sm:justify-start gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] font-mono text-white shadow-2xs bg-emerald-700">
                              {ownerInfo?.branchCode || inv.companyCode}
                            </span>
                            <p className="text-xs sm:text-sm font-bold text-gray-900 font-mono tracking-tight">
                              {inv.invoiceNumber}
                            </p>
                            {linkedPos.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-[#0f5238]">
                                PO: {linkedPos.slice(0, 2).join(', ')}{linkedPos.length > 2 ? ` +${linkedPos.length - 2}` : ''}
                              </span>
                            )}
                          </div>

                          {/* Status Badge (mobile view - top right) */}
                          <span
                            className={`sm:hidden px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isPaid
                                ? 'bg-emerald-100 text-[#0f5238]'
                                : isSubmitted
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {isSubmitted ? 'รอชำระ' : isPaid ? 'ชำระแล้ว' : inv.status}
                          </span>
                        </div>

                        {/* Metadata line: Job count & Supplier */}
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                          <span className="font-medium text-gray-700">{inv.jobIds?.length || 0} งาน</span>
                          {inv.invoiceDate && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span>{formatThaiDate(inv.invoiceDate)}</span>
                            </>
                          )}
                          {isAll && inv.supplierId && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-medium truncate max-w-[200px]">
                                {supplierObj?.name || 'Supplier'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom/Right Section: Amount & Action Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="flex sm:flex-col items-baseline sm:items-end gap-1.5 sm:gap-0">
                        <span className="text-[10px] text-gray-400 font-medium sm:hidden">ยอดรวมสุทธิ:</span>
                        <p className="text-base sm:text-base font-bold font-mono text-[#0f5238]">
                          {formatCurrency(inv.totalAmount)}
                        </p>
                        {/* Status Badge (desktop view) */}
                        <span
                          className={`hidden sm:inline-block text-[10px] font-semibold mt-0.5 ${
                            isPaid ? 'text-emerald-700' : isSubmitted ? 'text-amber-600' : 'text-gray-400'
                          }`}
                        >
                          {isSubmitted ? 'รอชำระ' : isPaid ? 'ชำระแล้ว' : inv.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewInvoices([inv])}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 active:scale-[0.98] text-xs font-semibold transition-all cursor-pointer shadow-2xs border border-gray-200 shrink-0 whitespace-nowrap"
                        title="ดูใบวางบิล / พิมพ์"
                      >
                        <Printer className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="whitespace-nowrap">ดูบิล / พิมพ์</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        );
      })()}

      {/* Invoice Document Modal / Print Preview (Single or Batch) */}
      <InvoiceDetailModal
        invoices={previewInvoices}
        jobs={jobs}
        onClose={() => setPreviewInvoices([])}
      />
    </div>
  );
}
