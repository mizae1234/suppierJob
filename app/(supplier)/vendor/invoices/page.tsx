'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { formatThaiDate } from '@/lib/date-utils';
import { Invoice, Job } from '@/types';
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
} from 'lucide-react';

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
  const { jobs, invoices, createInvoice, activeSupplier, currentSupplierId, currentBranchId, suppliers } = useApp();
  const { user } = useAuth();
  const theme = useTheme();

  const isMaster = user?.role === 'MASTER';
  const isAdmin = user?.role === 'ADMIN';
  const isSupplierUser = user?.role === 'SUPPLIER';

  const isAll = !isSupplierUser && (isMaster || isAdmin) && (!activeSupplier || currentSupplierId === 'ALL');
  const supplierId = isSupplierUser ? user?.supplierId : (activeSupplier?.id || user?.supplierId);

  const [isCreating, setIsCreating] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const searchTerms = useMemo(() => parseSearchTerms(searchQuery), [searchQuery]);
  const hasSearch = searchTerms.length > 0;

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

  const filteredApprovedJobs = useMemo(() => {
    if (!hasSearch) return approvedJobs;
    return approvedJobs.filter((job) => jobMatchesTerms(job, searchTerms));
  }, [approvedJobs, hasSearch, searchTerms]);

  // Invoices for this supplier (or all for Master)
  const myInvoices = useMemo(() => {
    if (isAll) {
      return invoices;
    }
    return invoices.filter(i => i.supplierId === supplierId);
  }, [invoices, supplierId, isAll]);

  const filteredInvoices = useMemo(() => {
    if (!hasSearch) return myInvoices;
    return myInvoices.filter((inv) => {
      const supplierObj = suppliers.find((s) => s.id === inv.supplierId);
      const invHaystack = [
        inv.invoiceNumber,
        inv.companyCode,
        inv.supplierName || '',
        supplierObj?.name || '',
      ]
        .join(' ')
        .toLowerCase();
      if (searchTerms.some((term) => invHaystack.includes(term))) {
        return true;
      }
      const linkedJobs = (inv.jobIds || [])
        .map((id) => jobsById.get(id))
        .filter((j): j is Job => Boolean(j));
      return linkedJobs.some((job) => jobMatchesTerms(job, searchTerms));
    });
  }, [myInvoices, hasSearch, searchTerms, suppliers, jobsById]);

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

  const { showToast } = useToast();

  const handleCreateInvoice = async () => {
    if (selectedJobIds.length === 0) return;
    setIsCreating(true);
    try {
      // Derive companyCode from first selected job
      const firstJob = approvedJobs.find(j => selectedJobIds.includes(j.id));
      const companyCode = firstJob?.companyCode || 'EV7';
      const actualSupplierId = firstJob?.supplierId || supplierId || suppliers[0]?.id;
      // Default due date: 30 days from now
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const result = await createInvoice({
        supplierId: actualSupplierId,
        companyCode: companyCode as 'EV7' | 'GI',
        jobIds: selectedJobIds,
        dueDate,
      });
      if (result.success && result.invoice) {
        setSelectedJobIds([]);
        showToast('ออกใบวางบิลสำเร็จเรียบร้อย!', 'success');
        setSelectedInvoice(result.invoice as unknown as Invoice);
      } else {
        showToast(result.error || 'เกิดข้อผิดพลาดในการสร้างใบวางบิล', 'error');
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
                {hasSearch
                  ? `แสดง ${filteredApprovedJobs.length} / ${approvedJobs.length} งานพร้อมออกบิล`
                  : `${approvedJobs.length} งานพร้อมออกบิล`}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">เลือกงานที่ต้องการรวมในใบวางบิล:</p>

          {filteredApprovedJobs.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 mb-4">
              <p className="text-xs font-medium text-gray-500">
                ไม่พบงานพร้อมออกบิลที่ตรงกับ &ldquo;{searchQuery.trim()}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold hover:underline cursor-pointer"
                style={{ color: theme.primary }}
              >
                ล้างคำค้นหา
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {filteredApprovedJobs.map(job => {
                const isSelected = selectedJobIds.includes(job.id);
                const cost = getJobTotalCost(job);
                const activeItems = (job.carWashItems || []).filter((i) => i.status !== 'CANCELLED');
                const firstVin = activeItems[0]?.vin || job.vin || '';
                const extraCarCount = activeItems.length > 1 ? activeItems.length - 1 : 0;
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
                    style={isSelected ? { borderColor: theme.primary, backgroundColor: theme.bgSoft } : {}}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'text-white' : 'border-gray-300'
                      }`}
                      style={isSelected ? { backgroundColor: theme.primary, borderColor: theme.primary } : {}}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {job.jobType === 'CAR_WASH'
                          ? <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          : <Truck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        }
                        <span className="text-xs font-bold font-mono text-gray-900">{job.jobNumber}</span>
                        {job.d365PoNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-[#0f5238]">
                            PO: {job.d365PoNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{job.companyCode} • {job.branchName}</span>
                        {firstVin && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="font-mono text-gray-600">
                              {firstVin}{extraCarCount > 0 ? ` (+${extraCarCount} คัน)` : ''}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <span className="text-xs font-bold font-mono shrink-0" style={{ color: theme.primary }}>
                      {formatCurrency(cost)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Submit Invoice */}
          {selectedJobIds.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">เลือก {selectedJobIds.length} งาน</p>
                <p className="text-lg font-bold font-mono" style={{ color: theme.primary }}>
                  {formatCurrency(selectedTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={isCreating}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all cursor-pointer hover:opacity-90 active:scale-[0.99] shadow-sm"
                style={{ backgroundColor: theme.primary }}
              >
                {isCreating ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Receipt className="w-4 h-4" />
                )}
                ออกใบวางบิล
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
      {myInvoices.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span>ใบวางบิลที่ออกแล้ว</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                {hasSearch ? `${filteredInvoices.length} / ${myInvoices.length}` : myInvoices.length}
              </span>
            </h3>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60">
              <p className="text-xs font-medium text-gray-500">
                ไม่พบใบวางบิลที่ตรงกับ &ldquo;{searchQuery.trim()}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold hover:underline cursor-pointer"
                style={{ color: theme.primary }}
              >
                ล้างคำค้นหา
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 sm:gap-3">
              {filteredInvoices.map(inv => {
                const supplierObj = suppliers.find(s => s.id === inv.supplierId);
                const isPaid = inv.status === 'PAID';
                const isSubmitted = inv.status === 'SUBMITTED';
                const linkedPos = Array.from(
                  new Set(
                    (inv.jobIds || [])
                      .map((id) => jobsById.get(id)?.d365PoNumber)
                      .filter((po): po is string => Boolean(po))
                  )
                );

                return (
                  <div
                    key={inv.id}
                    className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white hover:bg-gray-50/70 border border-gray-100 hover:border-gray-200 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Top/Left Section: Invoice Header, Badges, Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between sm:justify-start gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] font-mono text-white shadow-2xs bg-emerald-700">
                            {inv.companyCode}
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
                        onClick={() => setSelectedInvoice(inv)}
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
      )}

      {/* Invoice Document Modal / Print Preview */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        jobs={jobs}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
