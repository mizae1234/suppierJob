'use client';

import React, { useState } from 'react';
import { Invoice, Job } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import {
  Receipt,
  Printer,
  X,
  Sparkles,
  Truck,
  Car,
  Copy,
  Check,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface VehicleBreakdownItem {
  vin: string;
  model: string;
  color: string;
  licensePlate: string;
  jobNumber: string;
  jobType: string;
  serviceType: string;
  serviceDate: string;
  unitPrice: number;
  status: string;
  branchName: string;
}

export interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  jobs: Job[];
  onClose: () => void;
}

export function InvoiceDetailModal({ invoice, jobs, onClose }: InvoiceDetailModalProps) {
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState(false);
  const [isVehicleExpanded, setIsVehicleExpanded] = useState(true);

  if (!invoice) return null;

  // Build per-vehicle breakdown from related jobs
  const invoiceJobs = invoice.jobIds
    .map(jid => jobs.find(job => job.id === jid))
    .filter(Boolean) as Job[];

  const vehicleItems: VehicleBreakdownItem[] = [];
  for (const j of invoiceJobs) {
    if (j.carWashItems && j.carWashItems.length > 0) {
      for (const item of j.carWashItems) {
        vehicleItems.push({
          vin: item.vin,
          model: item.vehicleModel || '-',
          color: item.vehicleColor || '-',
          licensePlate: item.licensePlate || '-',
          jobNumber: j.jobNumber,
          jobType: j.jobType,
          serviceType:
            j.jobType === 'VEHICLE_SLIDE'
              ? 'รถสไลด์'
              : item.washType === 'STANDARD'
              ? 'ล้างปกติ'
              : item.washType === 'DEEP_CLEAN'
              ? 'ล้างพิเศษ'
              : item.washType === 'POLISH'
              ? 'ขัดเคลือบ'
              : item.washType,
          serviceDate: item.actualWashDate,
          unitPrice: item.unitPrice,
          status: item.status,
          branchName: j.branchName,
        });
      }
    } else if (j.jobType === 'VEHICLE_SLIDE' && j.vin) {
      vehicleItems.push({
        vin: j.vin,
        model: j.vehicle?.model || '-',
        color: j.vehicle?.color || '-',
        licensePlate: j.vehicle?.licensePlate || '-',
        jobNumber: j.jobNumber,
        jobType: j.jobType,
        serviceType: 'รถสไลด์',
        serviceDate: j.createdAt,
        unitPrice: j.actualCost || j.estimatedCost || 0,
        status: j.status,
        branchName: j.branchName,
      });
    }
  }

  const activeVehicleItems = vehicleItems.filter(v => v.status !== 'CANCELLED');
  const vehicleTotalCost = activeVehicleItems.reduce((s, v) => s + v.unitPrice, 0);

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'รอดำเนินการ', color: '#d97706', bg: '#fffbeb' },
    COMPLETED: { label: 'เสร็จแล้ว', color: '#059669', bg: '#ecfdf5' },
    APPROVED: { label: 'อนุมัติ', color: '#059669', bg: '#ecfdf5' },
    INVOICED: { label: 'วางบิลแล้ว', color: '#6b7280', bg: '#f3f4f6' },
    REJECTED: { label: 'ตีกลับ', color: '#dc2626', bg: '#fef2f2' },
    CANCELLED: { label: 'ยกเลิก', color: '#ef4444', bg: '#fef2f2' },
  };

  const handleCopyInvoiceNumber = () => {
    navigator.clipboard.writeText(invoice.invoiceNumber);
    setCopiedInvoiceNo(true);
    setTimeout(() => setCopiedInvoiceNo(false), 2000);
  };

  const handleCopyBankAccount = () => {
    navigator.clipboard.writeText('789-2-34567-8');
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full p-3.5 sm:p-6 max-h-[96vh] sm:max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-3 sm:gap-4">
        {/* Modal Top Bar (Above Sheet) */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight truncate">
                ใบแจ้งหนี้ / ใบวางบิล
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-mono text-gray-500 font-bold truncate">
                  {invoice.invoiceNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyInvoiceNumber}
                  title="คัดลอกเลขที่ใบแจ้งหนี้"
                  className="text-gray-400 hover:text-emerald-700 p-0.5"
                >
                  {copiedInvoiceNo ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">พิมพ์ / Export PDF</span>
              <span className="xs:hidden sm:hidden">PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="print-work-order p-4 sm:p-8 border border-gray-200 rounded-2xl bg-white text-gray-900 flex flex-col gap-4 sm:gap-5 print:border-none print:p-0 shadow-2xs">
          {/* Header Row: Supplier & Invoice Meta */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <div className="inline-flex sm:hidden items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#0f5238] font-mono font-bold text-xs mb-1.5 border border-emerald-200/60">
                <Receipt className="w-3 h-3" />
                <span>{invoice.invoiceNumber}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#0f5238] tracking-tight">
                ใบวางบิล / ใบแจ้งหนี้ (INVOICE)
              </h2>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{invoice.supplierName}</p>
              <p className="text-xs text-gray-500">ผู้ให้บริการและคู่ค้าอย่างเป็นทางการ</p>
            </div>

            <div className="sm:text-right text-xs bg-gray-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-gray-100 flex flex-col justify-center">
              <p className="hidden sm:block font-mono font-bold text-base text-gray-900 tracking-wide">
                {invoice.invoiceNumber}
              </p>
              <div className="grid grid-cols-2 sm:block gap-2 sm:gap-0 mt-0.5 text-left sm:text-right">
                <p className="text-gray-600">
                  วันที่ออกบิล:{' '}
                  <span className="font-semibold text-gray-800 block sm:inline">
                    {formatThaiDate(invoice.invoiceDate)}
                  </span>
                </p>
                <p className="text-gray-600">
                  กำหนดชำระ:{' '}
                  <span className="font-semibold text-gray-800 block sm:inline">
                    {formatThaiDate(invoice.dueDate)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Bill To Box */}
          <div className="p-3.5 sm:p-4 bg-[#fbfdfc] rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-gray-100">
            <div>
              <p className="font-bold text-gray-500 text-[11px] uppercase tracking-wider mb-0.5">
                เรียกเก็บเงินถึง (BILL TO):
              </p>
              <p className="font-bold text-gray-900 text-sm">
                {invoice.companyCode === 'EV7'
                  ? 'บริษัท อีวี เซเว่น จำกัด (EV7 Co., Ltd.)'
                  : 'บริษัท โกลด์ อินทิเกรท จำกัด (Gold Integrate)'}
              </p>
              <p className="text-gray-500 text-[11px] mt-0.5">
                สังกัด: {invoice.companyCode} Central Fleet Management
              </p>
            </div>
            <div className="self-start sm:self-auto">
              <span
                className={`px-2 py-0.5 rounded text-xs font-black tracking-wider ${
                  invoice.companyCode === 'EV7' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {invoice.companyCode}
              </span>
            </div>
          </div>

          {/* ── Section 1: Jobs Summary ── */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-gray-400" />
              <span>สรุปรายการงาน (Job Summary)</span>
            </h3>

            {/* Desktop / Print Table (hidden sm:table print:table) */}
            <div className="hidden sm:block print:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 font-bold text-gray-700">
                    <th className="py-2.5 px-2">ลำดับ</th>
                    <th className="py-2.5 px-2">เลขที่ใบสั่งงาน (Job No.)</th>
                    <th className="py-2.5 px-2">ประเภทงาน</th>
                    <th className="py-2.5 px-2">สาขา</th>
                    <th className="py-2.5 px-2 text-center">จำนวนคัน</th>
                    <th className="py-2.5 px-2 text-right">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoiceJobs.map((j, i) => (
                    <tr key={j.id}>
                      <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                      <td className="py-2 px-2 font-mono font-bold text-gray-900">{j.jobNumber}</td>
                      <td className="py-2 px-2">
                        <span className="inline-flex items-center gap-1">
                          {j.jobType === 'CAR_WASH' ? (
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Truck className="w-3 h-3 text-blue-500" />
                          )}
                          {j.jobType === 'CAR_WASH' ? 'ล้างรถ' : 'รถสไลด์'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-700">{j.branchName}</td>
                      <td className="py-2 px-2 text-center font-semibold text-gray-800">
                        {j.carWashItems?.filter(item => item.status !== 'CANCELLED').length || 1}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-gray-900">
                        ฿{getJobTotalCost(j).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td colSpan={5} className="py-2 px-2 text-right font-semibold text-gray-700">
                      ยอดรวมก่อนภาษี (Subtotal):
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-gray-900">
                      ฿{invoice.subtotal.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="py-1 px-2 text-right font-semibold text-gray-700">
                      ภาษีมูลค่าเพิ่ม 7% (VAT):
                    </td>
                    <td className="py-1 px-2 text-right font-bold text-gray-900">
                      ฿{invoice.vatAmount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-gray-900 text-sm">
                    <td colSpan={5} className="py-2 px-2 text-right font-bold text-[#0f5238]">
                      ยอดเงินสุทธิทั้งสิ้น (Grand Total):
                    </td>
                    <td className="py-2 px-2 text-right font-black text-[#0f5238]">
                      ฿{invoice.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Card List (block sm:hidden print:hidden) */}
            <div className="block sm:hidden print:hidden space-y-2.5">
              {invoiceJobs.map((j, i) => {
                const carCount = j.carWashItems?.filter(item => item.status !== 'CANCELLED').length || 1;
                const cost = getJobTotalCost(j);
                return (
                  <div
                    key={j.id}
                    className="p-3 rounded-2xl bg-[#fbfdfc] border border-gray-200/80 flex flex-col gap-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-white text-gray-500 text-[10px] font-bold flex items-center justify-center border border-gray-200 shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-mono font-bold text-xs text-gray-900 truncate">
                          {j.jobNumber}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-gray-700 border border-gray-200 shrink-0">
                        {j.jobType === 'CAR_WASH' ? (
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Truck className="w-3 h-3 text-blue-500" />
                        )}
                        {j.jobType === 'CAR_WASH' ? 'ล้างรถ' : 'รถสไลด์'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-200/60">
                      <span className="text-gray-500 text-[11px]">
                        สาขา: <strong className="text-gray-700">{j.branchName}</strong> ({carCount} คัน)
                      </span>
                      <span className="font-mono font-bold text-sm text-gray-900">
                        ฿{cost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Mobile Totals Summary Box */}
              <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>ยอดรวมก่อนภาษี (Subtotal):</span>
                  <span className="font-mono font-bold text-gray-800">฿{invoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
                  <span className="font-mono font-bold text-gray-800">฿{invoice.vatAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-200 text-sm font-bold text-[#0f5238]">
                  <span>ยอดเงินสุทธิทั้งสิ้น:</span>
                  <span className="font-mono text-base font-black">฿{invoice.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Per-Vehicle Breakdown (ใบรายคัน) ── */}
          {vehicleItems.length > 0 && (
            <div className="mt-1">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setIsVehicleExpanded(!isVehicleExpanded)}
                  className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5 hover:text-emerald-700 transition-colors"
                >
                  <Car className="w-3.5 h-3.5 text-emerald-600" />
                  <span>รายละเอียดรายคัน (Per-Vehicle Breakdown)</span>
                  <span className="sm:hidden text-gray-400">
                    {isVehicleExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>
                <span className="text-[10px] text-gray-500 font-medium">
                  {activeVehicleItems.length} คัน • ฿{vehicleTotalCost.toLocaleString()}
                </span>
              </div>

              {/* Desktop / Print Table (hidden sm:table print:table) */}
              <div className="hidden sm:block print:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-emerald-200 font-bold text-emerald-800 bg-emerald-50/50">
                      <th className="py-2 px-2">ลำดับ</th>
                      <th className="py-2 px-2">VIN</th>
                      <th className="py-2 px-2">ทะเบียน</th>
                      <th className="py-2 px-2">รุ่นรถ / สี</th>
                      <th className="py-2 px-2">ใบสั่งงาน</th>
                      <th className="py-2 px-2">บริการ</th>
                      <th className="py-2 px-2">วันที่</th>
                      <th className="py-2 px-2 text-center">สถานะ</th>
                      <th className="py-2 px-2 text-right">ราคา (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vehicleItems.map((v, idx) => {
                      const isCancelled = v.status === 'CANCELLED';
                      const st = statusMap[v.status] || statusMap.PENDING;

                      return (
                        <tr
                          key={`${v.vin}-${v.jobNumber}-${idx}`}
                          className={isCancelled ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}
                        >
                          <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-2">
                            <span
                              className={`font-mono font-bold text-[11px] ${
                                isCancelled ? 'text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              {v.vin.length > 12 ? `...${v.vin.slice(-8)}` : v.vin}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <span
                              className={`text-[11px] ${
                                isCancelled ? 'text-gray-400' : 'text-gray-700 font-medium'
                              }`}
                            >
                              {v.licensePlate || '-'}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <span className={isCancelled ? 'text-gray-400' : 'text-gray-700'}>
                              {v.model}
                            </span>
                            {v.color !== '-' && (
                              <span className="text-[10px] text-gray-400 ml-1">({v.color})</span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono text-[11px] font-semibold text-gray-700">
                            {v.jobNumber}
                          </td>
                          <td className="py-2 px-2">
                            <span className="inline-flex items-center gap-1 text-gray-700">
                              {v.jobType === 'VEHICLE_SLIDE' ? (
                                <Truck className="w-3 h-3 text-blue-500" />
                              ) : (
                                <Sparkles className="w-3 h-3 text-emerald-500" />
                              )}
                              {v.serviceType}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-gray-600 whitespace-nowrap">
                            {formatThaiDate(v.serviceDate)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
                              style={{ color: st.color, backgroundColor: st.bg }}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span
                              className={`font-mono font-bold ${
                                isCancelled ? 'line-through text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              ฿{v.unitPrice.toLocaleString()}
                            </span>
                            {isCancelled && (
                              <span className="block text-[9px] text-red-500 font-medium">ไม่คิดเงิน</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-emerald-200 bg-emerald-50/30">
                      <td colSpan={8} className="py-2 px-2 text-right font-semibold text-gray-700">
                        ยอดรวมรายคัน ({activeVehicleItems.length} คัน):
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-[#0f5238] text-sm">
                        ฿{vehicleTotalCost.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Vehicle Cards (block sm:hidden print:hidden) */}
              {isVehicleExpanded && (
                <div className="block sm:hidden print:hidden space-y-2">
                  {vehicleItems.map((v, idx) => {
                    const isCancelled = v.status === 'CANCELLED';
                    const st = statusMap[v.status] || statusMap.PENDING;

                    return (
                      <div
                        key={`${v.vin}-${v.jobNumber}-${idx}`}
                        className={`p-3 rounded-2xl border text-xs flex flex-col gap-1.5 ${
                          isCancelled ? 'bg-red-50/30 border-red-100' : 'bg-white border-gray-100 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span
                              className={`font-mono font-bold text-[11px] truncate ${
                                isCancelled ? 'text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              {v.vin}
                            </span>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                            style={{ color: st.color, backgroundColor: st.bg }}
                          >
                            {st.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-gray-600 text-[11px]">
                          <span>
                            ทะเบียน: <strong className="text-gray-800">{v.licensePlate || '-'}</strong>
                          </span>
                          <span className="truncate max-w-[150px]">
                            {v.model} {v.color !== '-' && `(${v.color})`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px]">
                          <span className="text-gray-500">
                            {v.serviceType} • {formatThaiDate(v.serviceDate)}
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              isCancelled ? 'line-through text-gray-400' : 'text-gray-900'
                            }`}
                          >
                            {isCancelled ? 'ไม่คิดเงิน' : `฿${v.unitPrice.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">
                      ยอดรวมรายคัน ({activeVehicleItems.length} คัน):
                    </span>
                    <span className="font-mono font-bold text-[#0f5238]">
                      ฿{vehicleTotalCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Section 3: Payment Bank Details ── */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>ช่องทางการชำระเงิน:</span>
              </span>
              <p className="text-gray-600 mt-0.5 text-[11px]">
                โอนเงินเข้าบัญชีคู่ค้า Supplier ผ่านระบบ Cheque / Direct Credit
              </p>
            </div>
            <div className="sm:text-right font-bold text-gray-900 bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-gray-200">
              <span className="text-xs text-gray-700 block">ธนาคารกสิกรไทย สาขาสวนหลวง</span>
              <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                <span className="text-xs font-mono text-emerald-800 font-bold">
                  เลขที่บัญชี: 789-2-34567-8
                </span>
                <button
                  type="button"
                  onClick={handleCopyBankAccount}
                  title="คัดลอกเลขบัญชี"
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-700 cursor-pointer transition-colors"
                >
                  {copiedBank ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
