'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Invoice, CompanyCode, Job } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { getInvoiceUpdateStatusMeta, isJobInvoiceUpdated } from '@/lib/invoice-workflow';
import { CreateInvoiceModal, InvoiceDetailModal } from '@/components/invoices';
import {
  Receipt,
  Plus,
  Printer,
  Check,
  Clock,
  CheckCircle2,
  FileEdit,
} from 'lucide-react';

type AdminInvoiceTab = 'ALL' | 'PENDING_UPDATE' | 'UPDATED' | 'INVOICED';

export default function InvoiceManagementPage() {
  const {
    invoices,
    jobs,
    suppliers,
    currentRole,
    currentSupplierId,
    createInvoice,
    updateJobInvoiceNumber,
  } = useApp();
  const { showToast } = useToast();

  const [companyFilter, setCompanyFilter] = useState<'ALL' | CompanyCode>('ALL');
  const [statusTab, setStatusTab] = useState<AdminInvoiceTab>('ALL');
  const [previewInvoices, setPreviewInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vendorInvoiceDrafts, setVendorInvoiceDrafts] = useState<Record<string, string>>({});
  const [savingJobId, setSavingJobId] = useState<string | null>(null);

  // งานที่อนุมัติแล้ว (APPROVED) — มีเลข Invoice ชุดแรกแล้ว รออัปเดต Invoice / อัปเดตแล้วรอออกบิลเปิด PO
  const approvedTrackingJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (j.status !== 'APPROVED' || j.invoiceId) return false;
      if (companyFilter !== 'ALL' && j.companyCode !== companyFilter) return false;
      if (currentRole === 'SUPPLIER' && j.supplierId !== currentSupplierId) return false;
      return true;
    });
  }, [jobs, companyFilter, currentRole, currentSupplierId]);

  const pendingUpdateJobs = useMemo(
    () => approvedTrackingJobs.filter((j) => !isJobInvoiceUpdated(j)),
    [approvedTrackingJobs]
  );

  const updatedReadyJobs = useMemo(
    () => approvedTrackingJobs.filter((j) => isJobInvoiceUpdated(j)),
    [approvedTrackingJobs]
  );

  const displayedTrackingJobs = useMemo(() => {
    if (statusTab === 'PENDING_UPDATE') return pendingUpdateJobs;
    if (statusTab === 'UPDATED') return updatedReadyJobs;
    if (statusTab === 'ALL') return approvedTrackingJobs;
    return [];
  }, [statusTab, approvedTrackingJobs, pendingUpdateJobs, updatedReadyJobs]);

  // Filtered issued invoices (already billed & PO opened)
  const displayedInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (companyFilter !== 'ALL' && inv.companyCode !== companyFilter) return false;
      if (currentRole === 'SUPPLIER' && inv.supplierId !== currentSupplierId) return false;
      return true;
    });
  }, [invoices, companyFilter, currentRole, currentSupplierId]);

  const jobsById = useMemo(() => {
    const map = new Map<string, Job>();
    for (const j of jobs) map.set(j.id, j);
    return map;
  }, [jobs]);

  const toggleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(invId) ? prev.filter(id => id !== invId) : [...prev, invId]
    );
  };

  const allDisplayedSelected =
    displayedInvoices.length > 0 &&
    displayedInvoices.every(inv => selectedInvoiceIds.includes(inv.id));

  const toggleSelectAllDisplayed = () => {
    const ids = displayedInvoices.map(i => i.id);
    if (allDisplayedSelected) {
      setSelectedInvoiceIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedInvoiceIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const selectedDisplayedInvoices = useMemo(
    () => displayedInvoices.filter(inv => selectedInvoiceIds.includes(inv.id)),
    [displayedInvoices, selectedInvoiceIds]
  );

  const handleBatchPrintSelected = () => {
    if (selectedDisplayedInvoices.length > 0) setPreviewInvoices(selectedDisplayedInvoices);
  };

  const handleSaveVendorInvoice = async (job: Job) => {
    const draft = (vendorInvoiceDrafts[job.id] ?? job.vendorInvoiceNumber ?? '').trim();
    if (!draft) {
      showToast('กรุณากรอกเลข Invoice ก่อนบันทึก', 'error');
      return;
    }
    setSavingJobId(job.id);
    try {
      const res = await updateJobInvoiceNumber(job.id, draft);
      if (res.success) {
        setVendorInvoiceDrafts((prev) => ({ ...prev, [job.id]: draft }));
        showToast(
          `อัปเดตเลข Invoice ใบงาน ${job.jobNumber} เป็น ${draft} เรียบร้อยแล้ว`,
          'success'
        );
      } else {
        showToast(res.error || 'ไม่สามารถอัปเดตเลข Invoice ได้', 'error');
      }
    } finally {
      setSavingJobId(null);
    }
  };

  const canEditVendorInvoice =
    currentRole === 'MASTER' || currentRole === 'ADMIN' || currentRole === 'SUPPLIER';
  const showTrackingSection =
    statusTab === 'PENDING_UPDATE' ||
    statusTab === 'UPDATED' ||
    (statusTab === 'ALL' && approvedTrackingJobs.length > 0);
  const showIssuedSection = statusTab === 'ALL' || statusTab === 'INVOICED';

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>จัดการใบวางบิล & Invoice (Billing Management)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            ติดตามเลข Invoice ชุดแรกหลังอนุมัติงาน (รออัปเดต / อัปเดตแล้ว) และออกใบวางบิลเพื่อเปิด D365 PO
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Company filter */}
          <div className="flex items-center bg-white p-1 rounded-full border border-emerald-950/10 shadow-xs">
            {(['ALL', 'EV7', 'GI'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCompanyFilter(c)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  companyFilter === c ? 'bg-[#0f5238] text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {c === 'ALL' ? 'ทุกบริษัท' : c}
              </button>
            ))}
          </div>

          {selectedDisplayedInvoices.length > 0 && showIssuedSection && (
            <button
              type="button"
              onClick={handleBatchPrintSelected}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#0f5238] border border-emerald-200 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รวมที่เลือก ({selectedDisplayedInvoices.length} ใบ)</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0f5238] hover:bg-[#0a3d28] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างใบวางบิลใหม่</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          {
            key: 'ALL',
            label: 'ทั้งหมด',
            count: approvedTrackingJobs.length + displayedInvoices.length,
            activeClass: 'bg-[#0f5238] text-white border-[#0f5238]',
          },
          {
            key: 'PENDING_UPDATE',
            label: 'รออัปเดต Invoice',
            count: pendingUpdateJobs.length,
            activeClass: 'bg-amber-600 text-white border-amber-600',
          },
          {
            key: 'UPDATED',
            label: 'อัปเดต Invoice แล้ว (รอออกบิล)',
            count: updatedReadyJobs.length,
            activeClass: 'bg-emerald-600 text-white border-emerald-600',
          },
          {
            key: 'INVOICED',
            label: 'ออกบิล & เปิด PO แล้ว',
            count: displayedInvoices.length,
            activeClass: 'bg-blue-700 text-white border-blue-700',
          },
        ] as const).map((tab) => {
          const isActive = statusTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusTab(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? `${tab.activeClass} shadow-xs`
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section 1: Approved Jobs Tracking (Initial Invoice Issued → Pending / Updated Invoice) */}
      {showTrackingSection && (
        <div className="bg-white rounded-2xl border border-emerald-950/10 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-[#f4f9f5] border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-[#0f5238]" />
              <h2 className="text-sm font-bold text-gray-900">
                รายการงานที่อนุมัติแล้ว — ติดตามสถานะ Invoice (ก่อนออกบิลเปิด PO)
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="w-3 h-3" />
                รออัปเดต {pendingUpdateJobs.length}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                อัปเดตแล้ว {updatedReadyJobs.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">เลข Invoice ชุดแรก (ระบบ)</th>
                  <th className="py-3 px-4">เลขที่ใบงาน</th>
                  <th className="py-3 px-4">บริษัท</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">เลข Invoice (Vendor)</th>
                  <th className="py-3 px-4 text-right">ยอดเงิน</th>
                  <th className="py-3 px-4 text-center">สถานะ Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedTrackingJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      ไม่มีรายการงานในสถานะนี้
                    </td>
                  </tr>
                ) : (
                  displayedTrackingJobs.map((job) => {
                    const updated = isJobInvoiceUpdated(job);
                    const statusMeta = getInvoiceUpdateStatusMeta(
                      job.invoiceUpdateStatus,
                      job.vendorInvoiceNumber
                    );
                    const draft = vendorInvoiceDrafts[job.id] ?? job.vendorInvoiceNumber ?? '';
                    const isSaving = savingJobId === job.id;
                    return (
                      <tr key={job.id} className="hover:bg-[#fbfdfc] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                          {job.initialInvoiceNumber || '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-semibold text-gray-800 block">
                            {job.jobNumber}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            อนุมัติเมื่อ {formatThaiDate(job.approvedAt || job.updatedAt)}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-[10px]">
                            {job.companyCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800 whitespace-nowrap">
                          {job.supplierName}
                        </td>
                        <td className="py-3 px-4 min-w-[260px]">
                          {canEditVendorInvoice ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={draft}
                                onChange={(e) =>
                                  setVendorInvoiceDrafts((prev) => ({
                                    ...prev,
                                    [job.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleSaveVendorInvoice(job);
                                  }
                                }}
                                placeholder="กรอกเลข Invoice (Vendor)..."
                                className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0f5238] focus:ring-2 focus:ring-[#0f5238]/15"
                              />
                              <button
                                type="button"
                                disabled={
                                  isSaving ||
                                  !draft.trim() ||
                                  (updated && draft.trim() === (job.vendorInvoiceNumber || '').trim())
                                }
                                onClick={() => void handleSaveVendorInvoice(job)}
                                className="h-8 px-2.5 rounded-lg bg-[#0f5238] hover:bg-[#0a3d28] text-white text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                              >
                                {isSaving ? 'บันทึก...' : updated ? 'แก้ไข' : 'อัปเดต'}
                              </button>
                            </div>
                          ) : (
                            <span className="font-mono font-semibold text-blue-800">
                              {job.vendorInvoiceNumber || '-'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#0f5238] whitespace-nowrap">
                          ฿{getJobTotalCost(job).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Issued Invoices List Table (Billed & PO Opened) */}
      {showIssuedSection && (
        <div className="bg-white rounded-2xl border border-emerald-950/10 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-[#f4f9f5] border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              ใบวางบิลที่ออกแล้ว (อัปเดต Invoice และเปิด D365 PO แล้ว)
            </h2>
            <span className="text-xs font-semibold text-gray-500">
              {displayedInvoices.length} ใบ
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 pl-4 pr-2 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAllDisplayed}
                      aria-label="เลือกใบวางบิลทั้งหมด"
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                        allDisplayedSelected
                          ? 'bg-[#0f5238] border-[#0f5238] text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {allDisplayedSelected && <Check className="w-3 h-3" />}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">เลขที่ใบแจ้งหนี้ (ระบบ / Vendor)</th>
                  <th className="py-3.5 px-4">บริษัท</th>
                  <th className="py-3.5 px-4">Supplier ผู้ออกบิล</th>
                  <th className="py-3.5 px-4">วันที่ออกบิล</th>
                  <th className="py-3.5 px-4">กำหนดชำระ</th>
                  <th className="py-3.5 px-4 text-center">จำนวนงาน</th>
                  <th className="py-3.5 px-4 text-right">ยอดรวมก่อน VAT</th>
                  <th className="py-3.5 px-4 text-right">ยอดสุทธิ (รวม VAT)</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-center">ดูเอกสาร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400">
                      ยังไม่มีรายการใบวางบิลที่ออกบิลแล้วในระบบ
                    </td>
                  </tr>
                ) : (
                  displayedInvoices.map(inv => {
                    const isChecked = selectedInvoiceIds.includes(inv.id);
                    const linkedJobs = (inv.jobIds || [])
                      .map((id) => jobsById.get(id))
                      .filter((j): j is Job => Boolean(j));
                    const poList = Array.from(
                      new Set(
                        linkedJobs
                          .map((j) => j.d365PoNumber)
                          .filter((po): po is string => Boolean(po))
                      )
                    );
                    const vendorInv =
                      inv.vendorInvoiceNumber ||
                      Array.from(
                        new Set(
                          linkedJobs
                            .map((j) => j.vendorInvoiceNumber)
                            .filter((v): v is string => Boolean(v))
                        )
                      ).join(', ');
                    return (
                    <tr key={inv.id} className={`transition-colors ${isChecked ? 'bg-emerald-50/40' : 'hover:bg-[#fbfdfc]'}`}>
                      <td className="py-3.5 pl-4 pr-2">
                        <button
                          type="button"
                          onClick={() => toggleInvoiceSelect(inv.id)}
                          aria-label={`เลือกใบวางบิล ${inv.invoiceNumber}`}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-[#0f5238] border-[#0f5238] text-white'
                              : 'border-gray-300 bg-white hover:border-[#0f5238]'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-gray-900 block">
                          {inv.invoiceNumber}
                        </span>
                        {vendorInv && (
                          <span className="font-mono text-[10px] font-semibold text-blue-700 block">
                            Vendor INV: {vendorInv}
                          </span>
                        )}
                        {poList.length > 0 && (
                          <span className="font-mono text-[10px] font-semibold text-emerald-700 block">
                            PO: {poList.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-[10px]">
                          {inv.companyCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800 whitespace-nowrap">
                        {inv.supplierName}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                        {formatThaiDate(inv.invoiceDate)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                        {formatThaiDate(inv.dueDate)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-gray-800">
                        {inv.jobIds.length} งาน
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-700">
                        ฿{inv.subtotal.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#0f5238]">
                        ฿{inv.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            {inv.status}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            อัปเดต Invoice แล้ว
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setPreviewInvoices([inv])}
                          className="px-2.5 py-1 rounded-lg bg-[#f4f9f5] hover:bg-emerald-100 text-[#0f5238] font-bold transition-colors cursor-pointer"
                        >
                          พิมพ์ / ดูบิล
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create New Invoice Modal */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        jobs={jobs}
        suppliers={suppliers}
        currentRole={currentRole}
        currentSupplierId={currentSupplierId}
        onCreateInvoice={createInvoice}
        onSuccess={(inv, allInvoices) =>
          setPreviewInvoices(allInvoices && allInvoices.length > 0 ? allInvoices : [inv])
        }
      />

      {/* Invoice Document Lightbox / Print Preview (Single or Batch) */}
      <InvoiceDetailModal
        invoices={previewInvoices}
        jobs={jobs}
        onClose={() => setPreviewInvoices([])}
      />
    </div>
  );
}
