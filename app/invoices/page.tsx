'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Invoice, CompanyCode } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { 
  Receipt, 
  Plus, 
  CheckCircle2, 
  Building2, 
  Printer, 
  Eye, 
  AlertCircle, 
  X, 
  Check, 
  Calendar,
  CreditCard
} from 'lucide-react';

export default function InvoiceManagementPage() {
  const { 
    invoices, 
    jobs, 
    suppliers, 
    companies, 
    currentRole, 
    currentSupplierId, 
    createInvoice 
  } = useApp();

  const [companyFilter, setCompanyFilter] = useState<'ALL' | CompanyCode>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceCompany, setInvoiceCompany] = useState<CompanyCode>('EV7');
  const [invoiceSupplierId, setInvoiceSupplierId] = useState<string>(
    currentRole === 'SUPPLIER' ? currentSupplierId : suppliers[0]?.id || ''
  );
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [invoiceNotes, setInvoiceNotes] = useState<string>('วางบิลรอบงวดประจำเดือน');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtered invoices
  const displayedInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (companyFilter !== 'ALL' && inv.companyCode !== companyFilter) return false;
      if (currentRole === 'SUPPLIER' && inv.supplierId !== currentSupplierId) return false;
      return true;
    });
  }, [invoices, companyFilter, currentRole, currentSupplierId]);

  // Eligible jobs for invoice creation:
  // Must be APPROVED, matching company, matching supplier, and NOT yet invoiced
  const eligibleJobs = useMemo(() => {
    return jobs.filter(j => 
      j.status === 'APPROVED' &&
      !j.invoiceId &&
      j.companyCode === invoiceCompany &&
      j.supplierId === invoiceSupplierId
    );
  }, [jobs, invoiceCompany, invoiceSupplierId]);

  // Calculate selected jobs total
  const selectedJobs = jobs.filter(j => selectedJobIds.includes(j.id));
  const subtotal = selectedJobs.reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);
  const vat = Number((subtotal * 0.07).toFixed(2));
  const total = Number((subtotal + vat).toFixed(2));

  const handleToggleJob = (jobId: string) => {
    setSelectedJobIds(prev => 
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const handleSelectAllEligible = () => {
    if (selectedJobIds.length === eligibleJobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(eligibleJobs.map(j => j.id));
    }
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedJobIds.length === 0) {
      setErrorMessage('กรุณาเลือกอย่างน้อย 1 รายการงานที่ Approved แล้ว');
      return;
    }

    const res = createInvoice({
      companyCode: invoiceCompany,
      supplierId: invoiceSupplierId,
      jobIds: selectedJobIds,
      dueDate,
      notes: invoiceNotes,
    });

    if (res.success && res.invoice) {
      setShowCreateModal(false);
      setSelectedJobIds([]);
      setSelectedInvoice(res.invoice);
    } else {
      setErrorMessage(res.error || 'เกิดข้อผิดพลาดในการสร้างใบวางบิล');
    }
  };

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
            รวบรวมงานที่ผ่านการตรวจรับ (Approved) เพื่อออกใบวางบิลแยก EV7 และ GI โดยเด็ดขาด
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Company filter */}
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
            onClick={() => {
              setSelectedJobIds([]);
              setErrorMessage(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0f5238] hover:bg-[#0a3d28] text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างใบวางบิลใหม่</span>
          </button>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-emerald-950/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f4f9f5] border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">เลขที่ใบแจ้งหนี้</th>
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
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    ยังไม่มีรายการใบวางบิลในระบบ
                  </td>
                </tr>
              ) : (
                displayedInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-[#fbfdfc] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                      {inv.invoiceNumber}
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
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2.5 py-1 rounded-lg bg-[#f4f9f5] hover:bg-emerald-100 text-[#0f5238] font-bold transition-colors"
                      >
                        พิมพ์ / ดูบิล
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">
                  สร้างใบวางบิลใหม่ (Create Supplier Invoice)
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvoiceSubmit} className="flex flex-col gap-4 text-xs">
              {/* Strict Company Selection Rule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    1. บริษัทที่เรียกเก็บเงิน (แยกบิลเด็ดขาด): *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceCompany('EV7');
                        setSelectedJobIds([]);
                      }}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        invoiceCompany === 'EV7'
                          ? 'border-[#0f5238] bg-[#f4f9f5] text-[#0f5238] ring-2 ring-[#0f5238]/20'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      บริษัท EV7 จำกัด
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceCompany('GI');
                        setSelectedJobIds([]);
                      }}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        invoiceCompany === 'GI'
                          ? 'border-[#0f5238] bg-[#f4f9f5] text-[#0f5238] ring-2 ring-[#0f5238]/20'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      บริษัท GI Fleet
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    2. Supplier ผู้ออกใบแจ้งหนี้:
                  </label>
                  <select
                    value={invoiceSupplierId}
                    onChange={(e) => {
                      setInvoiceSupplierId(e.target.value);
                      setSelectedJobIds([]);
                    }}
                    disabled={currentRole === 'SUPPLIER'}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 font-semibold focus:ring-2 focus:ring-[#0f5238] outline-none"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Eligible Approved Jobs List */}
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">
                    3. เลือกรายการงานที่สาขา Approve แล้ว (พร้อมวางบิล):
                  </span>
                  {eligibleJobs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllEligible}
                      className="text-xs font-bold text-[#0f5238] hover:underline"
                    >
                      {selectedJobIds.length === eligibleJobs.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                    </button>
                  )}
                </div>

                <div className="border border-gray-200 rounded-2xl max-h-56 overflow-y-auto divide-y divide-gray-100 p-1">
                  {eligibleJobs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      ไม่มีงานที่ได้รับการ Approve สำหรับ {invoiceCompany} ที่พร้อมวางบิลในขณะนี้
                    </div>
                  ) : (
                    eligibleJobs.map(job => {
                      const isChecked = selectedJobIds.includes(job.id);
                      return (
                        <div
                          key={job.id}
                          onClick={() => handleToggleJob(job.id)}
                          className={`p-3 cursor-pointer flex items-center justify-between gap-2 rounded-xl transition-colors ${
                            isChecked ? 'bg-[#f4f9f5]' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isChecked ? 'bg-[#0f5238] border-[#0f5238] text-white' : 'border-gray-300'
                            }`}>
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-900">{job.jobNumber}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                                  {job.jobType}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                สาขา: {job.branchName} • Approve เมื่อ: {formatThaiDate(job.approvedAt)}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-[#0f5238]">
                            ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Financial Calculation Box */}
              <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 flex flex-col gap-2">
                <div className="flex items-center justify-between text-gray-600">
                  <span>ยอดรวมค่าบริการ ({selectedJobIds.length} งาน):</span>
                  <span className="font-semibold text-gray-900">฿{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                  <span className="font-semibold text-gray-900">฿{vat.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-[#0f5238] pt-2 border-t border-emerald-950/10">
                  <span>ยอดเงินสุทธิที่เรียกเก็บ:</span>
                  <span className="text-base">฿{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Due Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    กำหนดชำระเงิน (Due Date):
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0f5238] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    หมายเหตุในใบแจ้งหนี้:
                  </label>
                  <input
                    type="text"
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    placeholder="เช่น วางบิลประจำปักษ์แรก..."
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0f5238] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={selectedJobIds.length === 0}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  ยืนยันการสร้างใบวางบิล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Document Lightbox / Print Preview */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">
                  ใบแจ้งหนี้ / ใบวางบิล ({selectedInvoice.invoiceNumber})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบวางบิล</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
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
                  <p className="text-sm font-bold text-gray-800 mt-1">{selectedInvoice.supplierName}</p>
                  <p className="text-xs text-gray-500">ผู้ให้บริการและคู่ค้าอย่างเป็นทางการ</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-mono font-bold text-base text-gray-900">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-gray-600 mt-0.5">วันที่ออกบิล: {formatThaiDate(selectedInvoice.invoiceDate)}</p>
                  <p className="text-gray-600">กำหนดชำระ: {formatThaiDate(selectedInvoice.dueDate)}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="p-4 bg-gray-50 rounded-xl text-xs">
                <p className="font-bold text-gray-700 mb-1">เรียกเก็บเงินถึง (BILL TO):</p>
                <p className="font-bold text-gray-900 text-sm">
                  {selectedInvoice.companyCode === 'EV7'
                    ? 'บริษัท อีวี เซเว่น จำกัด (EV7 Co., Ltd.)'
                    : 'บริษัท เจเนอรัล อินเทลลิเจนท์ จำกัด (GI Fleet)'}
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
                  {selectedInvoice.jobIds.map((jid, i) => {
                    const j = jobs.find(job => job.id === jid);
                    return (
                      <tr key={jid}>
                        <td className="py-2 px-2">{i + 1}</td>
                        <td className="py-2 px-2 font-mono font-bold">{j?.jobNumber || jid}</td>
                        <td className="py-2 px-2">{j?.jobType}</td>
                        <td className="py-2 px-2">{j?.branchName}</td>
                        <td className="py-2 px-2 text-right font-bold">
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
                    <td colSpan={4} className="py-2 px-2 text-right font-bold text-[#0f5238]">
                      ยอดเงินสุทธิทั้งสิ้น (Grand Total):
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-[#0f5238]">
                      ฿{selectedInvoice.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Payment Bank Details */}
              <div className="p-4 rounded-xl border border-dashed border-gray-300 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-700">ช่องทางการชำระเงิน:</span>
                  <p className="text-gray-600 mt-0.5">โอนเงินเข้าบัญชีคู่ค้า Supplier ผ่านระบบ Cheque / Direct Credit</p>
                </div>
                <div className="text-right font-bold text-gray-900">
                  <span>ธนาคารกสิกรไทย สาขาสวนหลวง</span>
                  <p className="text-xs text-emerald-800">เลขที่บัญชี: 789-2-34567-8</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
