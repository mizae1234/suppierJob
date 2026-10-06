'use client';

import React from 'react';
import { Invoice, Job } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { Receipt, Printer, X, Sparkles, Truck, Car } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-gray-900">
              ใบแจ้งหนี้ / ใบวางบิล ({invoice.invoiceNumber})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="print-work-order p-8 border border-gray-200 rounded-2xl bg-white text-gray-900 flex flex-col gap-5 print:border-none print:p-0">
          <div className="flex items-start justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#0f5238]">ใบวางบิล / ใบแจ้งหนี้ (INVOICE)</h2>
              <p className="text-sm font-bold text-gray-800 mt-1">{invoice.supplierName}</p>
              <p className="text-xs text-gray-500">ผู้ให้บริการและคู่ค้าอย่างเป็นทางการ</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-mono font-bold text-base text-gray-900">{invoice.invoiceNumber}</p>
              <p className="text-gray-600 mt-0.5">วันที่ออกบิล: {formatThaiDate(invoice.invoiceDate)}</p>
              <p className="text-gray-600">กำหนดชำระ: {formatThaiDate(invoice.dueDate)}</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="p-4 bg-gray-50 rounded-xl text-xs">
            <p className="font-bold text-gray-700 mb-1">เรียกเก็บเงินถึง (BILL TO):</p>
            <p className="font-bold text-gray-900 text-sm">
              {invoice.companyCode === 'EV7'
                ? 'บริษัท อีวี เซเว่น จำกัด (EV7 Co., Ltd.)'
                : 'บริษัท โกลด์ อินทิเกรท จำกัด (Gold Integrate)'}
            </p>
            <p className="text-gray-600 mt-0.5">
              สังกัด: {invoice.companyCode} Central Fleet Management
            </p>
          </div>

          {/* Jobs Summary Table */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-gray-400" />
              สรุปรายการงาน (Job Summary)
            </h3>
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
                    <td className="py-2 px-2">{i + 1}</td>
                    <td className="py-2 px-2 font-mono font-bold">{j.jobNumber}</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-1">
                        {j.jobType === 'CAR_WASH' ? <Sparkles className="w-3 h-3 text-emerald-500" /> : <Truck className="w-3 h-3 text-blue-500" />}
                        {j.jobType === 'CAR_WASH' ? 'ล้างรถ' : 'รถสไลด์'}
                      </span>
                    </td>
                    <td className="py-2 px-2">{j.branchName}</td>
                    <td className="py-2 px-2 text-center font-semibold">
                      {j.carWashItems?.filter(item => item.status !== 'CANCELLED').length || 1}
                    </td>
                    <td className="py-2 px-2 text-right font-bold">
                      ฿{getJobTotalCost(j).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td colSpan={5} className="py-2 px-2 text-right font-semibold">ยอดรวมก่อนภาษี (Subtotal):</td>
                  <td className="py-2 px-2 text-right font-bold">฿{invoice.subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="py-1 px-2 text-right font-semibold">ภาษีมูลค่าเพิ่ม 7% (VAT):</td>
                  <td className="py-1 px-2 text-right font-bold">฿{invoice.vatAmount.toLocaleString()}</td>
                </tr>
                <tr className="border-t-2 border-gray-900 text-sm">
                  <td colSpan={5} className="py-2 px-2 text-right font-bold text-[#0f5238]">
                    ยอดเงินสุทธิทั้งสิ้น (Grand Total):
                  </td>
                  <td className="py-2 px-2 text-right font-bold text-[#0f5238]">
                    ฿{invoice.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Per-Vehicle Breakdown (ใบรายคัน) */}
          {vehicleItems.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-600" />
                  รายละเอียดรายคัน (Per-Vehicle Breakdown)
                </h3>
                <span className="text-[10px] text-gray-400 font-medium">
                  {activeVehicleItems.length} คัน • ฿{vehicleTotalCost.toLocaleString()}
                </span>
              </div>

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
                      <tr key={`${v.vin}-${v.jobNumber}-${idx}`} className={isCancelled ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}>
                        <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <span className={`font-mono font-bold text-[11px] ${isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>
                            {v.vin.length > 12 ? `...${v.vin.slice(-8)}` : v.vin}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`text-[11px] ${isCancelled ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
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
                        <td className="py-2 px-2 font-mono text-[11px] font-semibold text-gray-700">{v.jobNumber}</td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center gap-1 text-gray-700">
                            {v.jobType === 'VEHICLE_SLIDE' ? <Truck className="w-3 h-3 text-blue-500" /> : <Sparkles className="w-3 h-3 text-emerald-500" />}
                            {v.serviceType}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{formatThaiDate(v.serviceDate)}</td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
                            style={{ color: st.color, backgroundColor: st.bg }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className={`font-mono font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
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
          )}

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
  );
}
