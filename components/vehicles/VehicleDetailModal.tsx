'use client';

import React from 'react';
import { formatThaiDate } from '@/lib/date-utils';
import { VehicleRecord } from './types';
import {
  Car,
  Printer,
  X,
  Receipt,
  Copy,
  CheckCheck,
  Clock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'รอดำเนินการ', color: '#d97706', bg: '#fffbeb', icon: Clock },
  IN_PROGRESS: { label: 'กำลังดำเนินงาน', color: '#2563eb', bg: '#eff6ff', icon: Truck },
  COMPLETED: { label: 'ส่งงานแล้ว', color: '#059669', bg: '#ecfdf5', icon: CheckCircle2 },
  WAITING_APPROVAL: { label: 'รอตรวจรับ', color: '#d97706', bg: '#fffbeb', icon: Clock },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#059669', bg: '#ecfdf5', icon: CheckCircle2 },
  INVOICED: { label: 'วางบิลแล้ว', color: '#6b7280', bg: '#f3f4f6', icon: Receipt },
  REJECTED: { label: 'ตีกลับ', color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle },
  CANCELLED: { label: 'ยกเลิก', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'ล้างปกติ (Standard)',
  DEEP_CLEAN: 'ล้างพิเศษ (Deep Clean)',
  POLISH: 'ขัดเคลือบ (Polish)',
  VEHICLE_SLIDE: 'รถสไลด์ (Slide)',
};

export interface VehicleDetailModalProps {
  vin: string;
  records: VehicleRecord[];
  onClose: () => void;
  onCopy: (text: string) => void;
  copiedText: string | null;
}

export function VehicleDetailModal({
  vin,
  records,
  onClose,
  onCopy,
  copiedText,
}: VehicleDetailModalProps) {
  const first = records[0];
  if (!first) return null;

  const activeRecords = records.filter(r => r.itemStatus !== 'CANCELLED');
  const totalCost = activeRecords.reduce((s, r) => s + r.unitPrice, 0);
  const invoiceNums = [...new Set(records.map(r => r.invoiceNumber).filter(Boolean))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-gray-900">
              ใบรายคัน (Vehicle Service Report)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="print-work-order p-6 md:p-8 border border-gray-200 rounded-2xl bg-white text-gray-900 flex flex-col gap-5 print:border-none print:p-0">
          {/* Title Bar */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#0f5238]">ใบรายคัน / Vehicle Service Report</h2>
              <p className="text-xs text-gray-500 mt-1">รายงานประวัติการให้บริการทั้งหมดของรถคันนี้</p>
            </div>
            <div className="text-right text-xs">
              <p className="text-gray-600">วันที่ออกรายงาน: {formatThaiDate(new Date())}</p>
            </div>
          </div>

          {/* Vehicle Info Card */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4 text-xs">
              <div>
                <span className="text-gray-400 text-[10px] font-semibold uppercase block">VIN</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-sm text-gray-900">{vin}</span>
                  <button onClick={() => onCopy(vin)} className="p-0.5 text-gray-300 hover:text-gray-600 cursor-pointer">
                    {copiedText === vin ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] font-semibold uppercase block">รุ่นรถ</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{first.vehicleModel}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] font-semibold uppercase block">สี</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{first.vehicleColor}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] font-semibold uppercase block">ทะเบียนรถ</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{first.licensePlate || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] font-semibold uppercase block">บริษัท</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{first.companyCode}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] font-semibold uppercase block">จำนวนรายการ</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">{records.length} รายการ</span>
              </div>
            </div>
          </div>

          {/* Invoice References */}
          {invoiceNums.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/50 text-xs">
              <div className="flex items-center gap-1.5 mb-1">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-emerald-800">เลข Invoice ที่เกี่ยวข้อง</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {invoiceNums.map(inv => (
                  <span key={inv} className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 font-mono font-bold text-emerald-700 text-[11px]">
                    {inv}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Service History Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 font-bold text-gray-700">
                <th className="py-2.5 px-2">ลำดับ</th>
                <th className="py-2.5 px-2">ใบสั่งงาน</th>
                <th className="py-2.5 px-2">ประเภทบริการ</th>
                <th className="py-2.5 px-2">วันที่</th>
                <th className="py-2.5 px-2">สาขา</th>
                <th className="py-2.5 px-2">Supplier</th>
                <th className="py-2.5 px-2 text-center">สถานะ</th>
                <th className="py-2.5 px-2 text-right">ราคา (บาท)</th>
                <th className="py-2.5 px-2">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((r, idx) => {
                const st = STATUS_STYLES[r.itemStatus] || STATUS_STYLES.PENDING;
                const isCancelled = r.itemStatus === 'CANCELLED';
                return (
                  <tr key={r.id} className={isCancelled ? 'bg-red-50/30' : ''}>
                    <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <span className={`font-mono font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {r.jobNumber}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-700">
                      {SERVICE_TYPE_LABELS[r.serviceType] || r.serviceType}
                    </td>
                    <td className="py-2 px-2 text-gray-600 whitespace-nowrap">{formatThaiDate(r.serviceDate)}</td>
                    <td className="py-2 px-2 text-gray-600">{r.branchName}</td>
                    <td className="py-2 px-2 text-gray-600">{r.supplierName}</td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ color: st.color, backgroundColor: st.bg }}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className={`font-mono font-bold ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        ฿{r.unitPrice.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {r.invoiceNumber ? (
                        <span className="font-mono text-[11px] text-emerald-700 font-semibold">{r.invoiceNumber}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300">
                <td colSpan={7} className="py-2 px-2 text-right font-semibold">
                  ยอดรวม ({activeRecords.length} รายการ):
                </td>
                <td className="py-2 px-2 text-right font-bold text-[#0f5238] text-sm">
                  ฿{totalCost.toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* Notes */}
          <div className="p-4 rounded-xl border border-dashed border-gray-300 text-xs">
            <p className="font-bold text-gray-700 mb-1">หมายเหตุ</p>
            <p className="text-gray-500">
              รายงานนี้แสดงประวัติการให้บริการทั้งหมดของรถ VIN: {vin} โดยแยกรายละเอียดตามใบสั่งงานแต่ละรายการ
              พร้อมเลข Invoice ที่เกี่ยวข้อง สำหรับใช้ตรวจสอบค่าบริการและการวางบิล
            </p>
          </div>

          {/* Signature */}
          <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-gray-200 text-xs text-center text-gray-600">
            <div>
              <div className="h-16 border-b border-dotted border-gray-300 mb-2"></div>
              <p className="font-bold">ผู้จัดทำรายงาน</p>
              <p className="text-[11px] text-gray-400">วันที่ ............/............/............</p>
            </div>
            <div>
              <div className="h-16 border-b border-dotted border-gray-300 mb-2"></div>
              <p className="font-bold">ผู้อนุมัติ / หัวหน้าสาขา</p>
              <p className="text-[11px] text-gray-400">วันที่ ............/............/............</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
