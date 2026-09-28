'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { formatThaiDate } from '@/lib/date-utils';
import { Invoice } from '@/types';
import {
  Receipt,
  CheckCircle2,
  FileText,
  Plus,
  Sparkles,
  Truck,
  Printer,
  X,
  Eye,
} from 'lucide-react';

export default function SupplierInvoicesPage() {
  const { jobs, invoices, createInvoice, activeSupplier, currentSupplierId, suppliers } = useApp();
  const { user } = useAuth();
  const theme = useTheme();

  const isMaster = user?.role === 'MASTER';
  const isAll = (!activeSupplier || currentSupplierId === 'ALL') && isMaster;
  const supplierId = activeSupplier?.id || user?.supplierId;

  const [isCreating, setIsCreating] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Jobs that are APPROVED and belong to this supplier (or all for Master)
  const approvedJobs = useMemo(() => {
    if (isAll) {
      return jobs.filter(j => j.status === 'APPROVED');
    }
    return jobs.filter(j => j.supplierId === supplierId && j.status === 'APPROVED');
  }, [jobs, supplierId, isAll]);

  // Invoices for this supplier (or all for Master)
  const myInvoices = useMemo(() => {
    if (isAll) {
      return invoices;
    }
    return invoices.filter(i => i.supplierId === supplierId);
  }, [invoices, supplierId, isAll]);

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
      <div>
        <h1 className="text-xl font-bold text-gray-900">ใบวางบิล</h1>
        <p className="text-sm text-gray-500">จัดการใบวางบิลและออกบิลจากงานที่ผ่านการตรวจรับ</p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm font-semibold text-green-800">ออกใบวางบิลสำเร็จ! 🎉</p>
        </div>
      )}

      {/* Create Invoice Section */}
      {approvedJobs.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5" style={{ color: theme.primary }} />
              <h3 className="text-sm font-bold text-gray-900">
                ออกใบวางบิลใหม่
              </h3>
            </div>
            <span className="text-xs text-gray-500">{approvedJobs.length} งานพร้อมออกบิล</span>
          </div>

          <p className="text-xs text-gray-500 mb-3">เลือกงานที่ต้องการรวมในใบวางบิล:</p>

          <div className="flex flex-col gap-2 mb-4">
            {approvedJobs.map(job => {
              const isSelected = selectedJobIds.includes(job.id);
              const cost = getJobTotalCost(job);
              return (
                <button
                  key={job.id}
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
                    <div className="flex items-center gap-2">
                      {job.jobType === 'CAR_WASH'
                        ? <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        : <Truck className="w-3.5 h-3.5 text-purple-500" />
                      }
                      <span className="text-xs font-bold font-mono text-gray-900">{job.jobNumber}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {job.companyCode} • {job.branchName}
                    </p>
                  </div>

                  <span className="text-xs font-bold font-mono" style={{ color: theme.primary }}>
                    {formatCurrency(cost)}
                  </span>
                </button>
              );
            })}
          </div>

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
                {myInvoices.length}
              </span>
            </h3>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3">
            {myInvoices.map(inv => {
              const supplierObj = suppliers.find(s => s.id === inv.supplierId);
              const isPaid = inv.status === 'PAID';
              const isSubmitted = inv.status === 'SUBMITTED';

              return (
                <div
                  key={inv.id}
                  className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white hover:bg-gray-50/70 border border-gray-100 hover:border-gray-200 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Top/Left Section: Invoice Header, Badges, Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between sm:justify-start gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] font-mono text-white shadow-2xs ${
                            inv.companyCode === 'GI' ? 'bg-blue-600' : 'bg-emerald-700'
                          }`}
                        >
                          {inv.companyCode}
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-gray-900 font-mono tracking-tight">
                          {inv.invoiceNumber}
                        </p>
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
                        {isSubmitted ? '⏳ รอชำระ' : isPaid ? '✅ ชำระแล้ว' : inv.status}
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
                        {isSubmitted ? '⏳ รอชำระ' : isPaid ? '✅ ชำระแล้ว' : inv.status}
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
        </div>
      )}

      {/* Invoice Document Modal / Print Preview */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-4 border border-gray-100">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">
                  ใบแจ้งหนี้ / ใบวางบิล ({selectedInvoice.invoiceNumber})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ / Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Sheet */}
            <div className="p-8 border border-gray-200 rounded-2xl bg-white text-gray-900 flex flex-col gap-5 print:border-none print:p-0">
              <div className="flex items-start justify-between border-b border-gray-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#0f5238]">ใบวางบิล / ใบแจ้งหนี้ (INVOICE)</h2>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {selectedInvoice.supplierName || suppliers.find(s => s.id === selectedInvoice.supplierId)?.name || 'Supplier'}
                  </p>
                  <p className="text-xs text-gray-500">ผู้ให้บริการและคู่ค้าอย่างเป็นทางการ</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-mono font-bold text-base text-gray-900">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-gray-600 mt-0.5">วันที่ออกบิล: {formatThaiDate(selectedInvoice.invoiceDate)}</p>
                  {selectedInvoice.dueDate && (
                    <p className="text-gray-600">กำหนดชำระ: {formatThaiDate(selectedInvoice.dueDate)}</p>
                  )}
                </div>
              </div>

              {/* Bill To */}
              <div className="p-4 bg-gray-50 rounded-xl text-xs">
                <p className="font-bold text-gray-700 mb-1">เรียกเก็บเงินถึง (BILL TO):</p>
                <p className="font-bold text-gray-900 text-sm">
                  {selectedInvoice.companyCode === 'EV7'
                    ? 'บริษัท อีวี เซเว่น จำกัด (EV7 Co., Ltd.)'
                    : 'บริษัท โกลด์ อินทิเกรท จำกัด (Gold Integrate)'}
                </p>
                <p className="text-gray-600 mt-0.5">
                  สังกัด: {selectedInvoice.companyCode} Central Fleet Management
                </p>
              </div>

              {/* Jobs Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 font-bold text-gray-700">
                    <th className="py-2.5 px-2">ลำดับ</th>
                    <th className="py-2.5 px-2">เลขที่ใบสั่งงาน (Job No.)</th>
                    <th className="py-2.5 px-2">ประเภทงาน</th>
                    <th className="py-2.5 px-2">สาขา</th>
                    <th className="py-2.5 px-2 text-right">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedInvoice.jobIds?.map((jid, i) => {
                    const j = jobs.find(job => job.id === jid);
                    return (
                      <tr key={jid}>
                        <td className="py-2.5 px-2">{i + 1}</td>
                        <td className="py-2.5 px-2 font-mono font-bold">{j?.jobNumber || jid}</td>
                        <td className="py-2.5 px-2">{j?.jobType === 'CAR_WASH' ? 'ล้างรถ' : 'รถสไลด์'}</td>
                        <td className="py-2.5 px-2">{j?.branchName || '-'}</td>
                        <td className="py-2.5 px-2 text-right font-bold">
                          ฿{(j?.actualCost || j?.estimatedCost || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td colSpan={4} className="py-2 px-2 text-right font-semibold">ยอดรวมก่อนภาษี (Subtotal):</td>
                    <td className="py-2 px-2 text-right font-bold">฿{selectedInvoice.subtotal.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-1 px-2 text-right font-semibold">ภาษีมูลค่าเพิ่ม 7% (VAT):</td>
                    <td className="py-1 px-2 text-right font-bold">฿{selectedInvoice.vatAmount.toLocaleString()}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-900 text-sm">
                    <td colSpan={4} className="py-2.5 px-2 text-right font-bold text-[#0f5238]">
                      ยอดเงินสุทธิทั้งสิ้น (Grand Total):
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[#0f5238]">
                      ฿{selectedInvoice.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Payment Bank Details */}
              {(() => {
                const supObj = suppliers.find(s => s.id === selectedInvoice.supplierId);
                return (
                  <div className="p-4 rounded-xl border border-dashed border-gray-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-gray-700">ช่องทางการชำระเงิน:</span>
                      <p className="text-gray-600 mt-0.5">โอนเงินเข้าบัญชีคู่ค้า Supplier ผ่านระบบ Cheque / Direct Credit</p>
                    </div>
                    {supObj?.bankName && (
                      <div className="sm:text-right font-bold text-gray-900">
                        <span>{supObj.bankName}</span>
                        <p className="text-xs text-emerald-800">เลขที่บัญชี: {supObj.bankAccount || '-'}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
