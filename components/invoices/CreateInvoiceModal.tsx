'use client';

import React, { useState, useMemo } from 'react';
import { Job, CompanyCode, Supplier, Invoice } from '@/types';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatThaiDate } from '@/lib/date-utils';
import { Receipt, AlertCircle, X, Check, Sparkles, Truck } from 'lucide-react';

export interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  suppliers: Supplier[];
  currentRole?: string;
  currentSupplierId?: string;
  onCreateInvoice: (data: {
    companyCode: CompanyCode;
    supplierId: string;
    jobIds: string[];
    dueDate: string;
    notes?: string;
  }) => Promise<{ success: boolean; invoice?: Invoice; error?: string }>;
  onSuccess: (invoice: Invoice) => void;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  jobs,
  suppliers,
  currentRole,
  currentSupplierId,
  onCreateInvoice,
  onSuccess,
}: CreateInvoiceModalProps) {
  const [invoiceCompany, setInvoiceCompany] = useState<CompanyCode>('EV7');
  const [invoiceSupplierId, setInvoiceSupplierId] = useState<string>(
    currentRole === 'SUPPLIER' && currentSupplierId ? currentSupplierId : suppliers[0]?.id || ''
  );
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [invoiceNotes, setInvoiceNotes] = useState<string>('วางบิลรอบงวดประจำเดือน');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Eligible jobs for invoice creation:
  // Must be APPROVED, matching company, matching supplier, and NOT yet invoiced
  const eligibleJobs = useMemo(() => {
    return jobs.filter(
      j =>
        j.status === 'APPROVED' &&
        !j.invoiceId &&
        j.companyCode === invoiceCompany &&
        j.supplierId === invoiceSupplierId
    );
  }, [jobs, invoiceCompany, invoiceSupplierId]);

  // Calculate selected jobs total
  const selectedJobs = jobs.filter(j => selectedJobIds.includes(j.id));
  const subtotal = selectedJobs.reduce((sum, j) => sum + getJobTotalCost(j), 0);
  const vat = Number((subtotal * 0.07).toFixed(2));
  const total = Number((subtotal + vat).toFixed(2));

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedJobIds.length === 0) {
      setErrorMessage('กรุณาเลือกอย่างน้อย 1 รายการงานที่ Approved แล้ว');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onCreateInvoice({
        companyCode: invoiceCompany,
        supplierId: invoiceSupplierId,
        jobIds: selectedJobIds,
        dueDate,
        notes: invoiceNotes,
      });

      if (res.success && res.invoice) {
        setSelectedJobIds([]);
        onSuccess(res.invoice);
        onClose();
      } else {
        setErrorMessage(res.error || 'เกิดข้อผิดพลาดในการสร้างใบวางบิล');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            onClick={onClose}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
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
                  บริษัท GI (Gold Integrate)
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
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900">{job.jobNumber}</span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                              {job.jobType === 'CAR_WASH' ? <Sparkles className="w-3 h-3 text-emerald-500" /> : <Truck className="w-3 h-3 text-blue-500" />}
                              {job.jobType === 'CAR_WASH' ? 'ล้างรถ' : 'รถสไลด์'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            สาขา {job.branchName} • {formatThaiDate(job.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-gray-900">
                          ฿{getJobTotalCost(job).toLocaleString()}
                        </span>
                        <p className="text-[10px] text-gray-400">
                          {job.carWashItems?.filter(i => i.status !== 'CANCELLED').length || 1} คัน
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pricing Preview Summary */}
          <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between text-gray-600">
              <span>จำนวนงานที่เลือก:</span>
              <span className="font-bold">{selectedJobIds.length} รายการ</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>ยอดรวมก่อนภาษี (Subtotal):</span>
              <span className="font-mono font-bold">฿{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
              <span className="font-mono font-bold">฿{vat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#0f5238] pt-2 border-t border-gray-200">
              <span>ยอดรวมสุทธิทั้งสิ้น (Total):</span>
              <span className="font-mono">฿{total.toLocaleString()}</span>
            </div>
          </div>

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
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={selectedJobIds.length === 0 || isSubmitting}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'กำลังสร้างใบวางบิล...' : 'ยืนยันการสร้างใบวางบิล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
