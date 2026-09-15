'use client';

import React, { useState } from 'react';
import { Supplier, Job, Invoice } from '@/types';
import { calculateBillingSummary, formatCurrency } from '@/lib/billing-utils';
import { CheckSquare, Square, Receipt, CheckCircle2, FileText, ChevronRight } from 'lucide-react';

interface BillingTabProps {
  supplier: Supplier;
  readyJobs: Job[];
  invoices: Invoice[];
  onCreateInvoice: (jobIds: string[], dueDate: string, notes?: string) => void;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  supplier,
  readyJobs,
  invoices,
  onCreateInvoice,
}) => {
  // Checkbox state for ready jobs
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>(readyJobs.map(j => j.id));
  const [notes, setNotes] = useState('วางบิลผ่าน EV7 Mobile Supplier Portal');

  // Toggle selection
  const toggleJob = (id: string) => {
    setSelectedJobIds(prev => 
      prev.includes(id) ? prev.filter(jId => jId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedJobIds.length === readyJobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(readyJobs.map(j => j.id));
    }
  };

  // Selected financial calculations using shared calculateBillingSummary
  const selectedJobs = readyJobs.filter(j => selectedJobIds.includes(j.id));
  const { subtotal, vat, grandTotal } = calculateBillingSummary(selectedJobs);

  // Due date: 30 days from now
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const handleCreate = () => {
    if (selectedJobIds.length === 0) {
      alert('กรุณาเลือกงานอย่างน้อย 1 รายการเพื่อออกใบวางบิล');
      return;
    }
    onCreateInvoice(selectedJobIds, defaultDueDate, notes);
    setSelectedJobIds([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">จัดการวางบิล (Billing & Invoices)</h2>
        <span className="text-xs text-[#0f5b44] font-bold">EV7 &amp; GI</span>
      </div>

      {/* Summary Invoicing Card */}
      <div className="p-4 bg-gradient-to-br from-[#0f5b44] to-[#1b4332] text-white rounded-3xl shadow-md space-y-3">
        <div>
          <span className="text-xs font-medium text-emerald-100">
            ยอดงานตรวจรับแล้วที่เลือกวางบิล:
          </span>
          <div className="text-2xl font-bold font-mono mt-1">
            {formatCurrency(grandTotal, { showDecimal: true })}
          </div>
          <div className="text-[11px] text-emerald-200 mt-0.5 flex items-center justify-between">
            <span>ก่อนภาษี: {formatCurrency(subtotal)}</span>
            <span>VAT (7%): {formatCurrency(vat, { showDecimal: true })}</span>
          </div>
        </div>

        {readyJobs.length > 0 ? (
          <button
            onClick={handleCreate}
            disabled={selectedJobIds.length === 0}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs ${
              selectedJobIds.length === 0
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-white text-[#0f5b44] hover:bg-emerald-50 active:scale-98'
            }`}
          >
            สร้างใบวางบิลสำหรับ {selectedJobIds.length} งานที่เลือก
          </button>
        ) : (
          <div className="p-2 text-center text-emerald-200 text-xs bg-white/10 rounded-xl">
            ไม่มีงานที่ผ่านการตรวจรับค้างวางบิล
          </div>
        )}
      </div>

      {/* Selectable Ready Jobs List */}
      {readyJobs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-gray-700">
              งานที่พร้อมวางบิล ({readyJobs.length} งาน):
            </span>
            <button
              onClick={toggleAll}
              className="text-[#0f5b44] font-semibold hover:underline"
            >
              {selectedJobIds.length === readyJobs.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
            </button>
          </div>

          <div className="space-y-2">
            {readyJobs.map((job) => {
              const isChecked = selectedJobIds.includes(job.id);
              const cost = job.actualCost || job.estimatedCost || 0;
              return (
                <div
                  key={job.id}
                  onClick={() => toggleJob(job.id)}
                  className={`p-3 bg-white rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isChecked
                      ? 'border-[#0f5b44] bg-[#f4f9f5] ring-1 ring-[#0f5b44]/30'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button type="button" className="text-[#0f5b44] shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 fill-emerald-100" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900 truncate">
                          {job.jobNumber}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-[#0f5b44] font-bold shrink-0">
                          {job.companyCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {job.vin || (job.carWashItems && `${job.carWashItems.length} คัน`)} • {job.branchName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-[#0f5b44] block">
                      ฿{cost.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-400">อนุมัติแล้ว</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Issued Invoices History */}
      <div className="pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">
          ประวัติใบวางบิล ({invoices.length} ใบ)
        </h3>
        <div className="space-y-2.5">
          {invoices.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-2xl border border-gray-200 text-xs text-gray-400">
              ยังไม่มีประวัติใบวางบิล
            </div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 font-mono">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    ครบกำหนด: {inv.dueDate} • {inv.jobIds?.length || 0} รายการ
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#0f5b44] font-mono">
                    ฿{inv.totalAmount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400 block">{inv.companyCode}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
