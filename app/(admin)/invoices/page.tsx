'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Invoice, CompanyCode } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { CreateInvoiceModal, InvoiceDetailModal } from '@/components/invoices';
import { 
  Receipt, 
  Plus, 
  Printer,
  Check,
} from 'lucide-react';

export default function InvoiceManagementPage() {
  const { 
    invoices, 
    jobs, 
    suppliers, 
    currentRole, 
    currentSupplierId, 
    createInvoice 
  } = useApp();

  const [companyFilter, setCompanyFilter] = useState<'ALL' | CompanyCode>('ALL');
  const [previewInvoices, setPreviewInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filtered invoices
  const displayedInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (companyFilter !== 'ALL' && inv.companyCode !== companyFilter) return false;
      if (currentRole === 'SUPPLIER' && inv.supplierId !== currentSupplierId) return false;
      return true;
    });
  }, [invoices, companyFilter, currentRole, currentSupplierId]);

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

        <div className="flex items-center gap-2.5 flex-wrap">
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

          {selectedDisplayedInvoices.length > 0 && (
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
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    ยังไม่มีรายการใบวางบิลในระบบ
                  </td>
                </tr>
              ) : (
                displayedInvoices.map(inv => {
                  const isChecked = selectedInvoiceIds.includes(inv.id);
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
