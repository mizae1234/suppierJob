'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import { thaiBahtText } from '@/lib/billing-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter out any cancelled records (คันที่ยกเลิกไม่ต้องเอาเข้ามา)
  const activeRecords = records.filter(
    r => r.itemStatus !== 'CANCELLED' && r.jobStatus !== 'CANCELLED'
  );

  const first = activeRecords[0] || records[0];
  if (!first) return null;

  const totalCost = activeRecords.reduce((s, r) => s + r.unitPrice, 0);
  const invoiceNums = [...new Set(activeRecords.map(r => r.invoiceNumber).filter(Boolean))] as string[];

  // Corporate details for official document
  const isEV7 = first.companyCode === 'EV7';
  const companyInfo = {
    nameTh: isEV7 ? 'บริษัท อีวี เซเว่น จำกัด (สำนักงานใหญ่)' : 'บริษัท โกลด์ อินทิเกรท จำกัด (สำนักงานใหญ่)',
    nameEn: isEV7 ? 'EV7 CO., LTD. (HEAD OFFICE)' : 'GOLD INTEGRATE CO., LTD. (HEAD OFFICE)',
    address: isEV7
      ? '99/9 อาคารอีวีทาวเวอร์ ชั้น 12 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310'
      : '888 หมู่ 5 ถนนบางนา-ตราด กม.18 ตำบลบางโฉลง อำเภอบางพลี จังหวัดสมุทรปราการ 10540',
    taxId: isEV7 ? '0105565012345' : '0105564098765',
    department: 'ฝ่ายบริหารงานยานพาหนะและสั่งจ้างคู่ค้า (Fleet & Vendor Operations)',
  };

  const bahtTextString = thaiBahtText(totalCost);

  const getServiceLabel = (serviceType: string) => {
    if (serviceType === 'VEHICLE_SLIDE') return 'ขนส่งรถสไลด์ (Vehicle Slide)';
    const display = getWashServiceDisplay(serviceType);
    return display?.name ? `${display.name} (${serviceType})` : serviceType;
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          ON-SCREEN MODAL PREVIEW (Hidden during Print)
          ══════════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
        <div className="bg-white rounded-3xl max-w-3xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-gray-900">
                ใบรายคัน (Vehicle Service Report)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์เอกสาร (Print / PDF)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* On-Screen Card Content */}
          <div className="flex flex-col gap-4 text-gray-900 text-xs">
            {/* Title Bar */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#0f5238]">ใบรายคัน / Vehicle Service Report</h2>
                <p className="text-xs text-gray-500 mt-0.5">รายงานประวัติการให้บริการทั้งหมดของรถคันนี้ (เฉพาะรายการที่ทำจริง)</p>
              </div>
              <div className="text-right text-xs">
                <p className="text-gray-600">วันที่ออกรายงาน: {formatThaiDate(new Date())}</p>
              </div>
            </div>

            {/* Vehicle Info Card */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4">
                <div>
                  <span className="text-gray-400 text-[10px] font-semibold uppercase block">VIN</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-sm text-gray-900">{vin}</span>
                    <button
                      type="button"
                      onClick={() => onCopy(vin)}
                      className="p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                      title="คัดลอก VIN"
                    >
                      {copiedText === vin ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
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
                  <span className="text-gray-400 text-[10px] font-semibold uppercase block">จำนวนรายการบริการ</span>
                  <span className="font-bold text-emerald-800 mt-0.5 block">{activeRecords.length} รายการ</span>
                </div>
              </div>
            </div>

            {/* Invoice References */}
            {invoiceNums.length > 0 && (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-emerald-900">เลข Invoice ที่เกี่ยวข้อง</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {invoiceNums.map(inv => (
                    <span key={inv} className="px-2.5 py-0.5 rounded-full bg-white border border-emerald-300 font-mono font-bold text-emerald-800 text-[11px] shadow-2xs">
                      {inv}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Service History Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                    <th className="py-2.5 px-3">ลำดับ</th>
                    <th className="py-2.5 px-3">ใบสั่งงาน</th>
                    <th className="py-2.5 px-3">ประเภทบริการ</th>
                    <th className="py-2.5 px-3">วันที่</th>
                    <th className="py-2.5 px-3">สาขา / เส้นทาง</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                    <th className="py-2.5 px-3 text-right">ราคา (บาท)</th>
                    <th className="py-2.5 px-3">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {activeRecords.map((r, idx) => {
                    const st = STATUS_STYLES[r.itemStatus] || STATUS_STYLES.PENDING;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/80">
                        <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                          {r.jobNumber}
                        </td>
                        <td className="py-2.5 px-3 text-gray-800 font-medium">
                          {getServiceLabel(r.serviceType)}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{formatThaiDate(r.serviceDate)}</td>
                        <td className="py-2.5 px-3 text-gray-600">{r.branchName}</td>
                        <td className="py-2.5 px-3 text-gray-600">{r.supplierName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-block"
                            style={{ color: st.color, backgroundColor: st.bg }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-950">
                          ฿{r.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.invoiceNumber ? (
                            <span className="font-mono text-[11px] text-emerald-700 font-bold">{r.invoiceNumber}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td colSpan={7} className="py-2.5 px-3 text-right text-gray-700">
                      ยอดรวมทั้งสิ้น ({activeRecords.length} รายการ):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-[#0f5238]">
                      ฿{totalCost.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes */}
            <div className="p-3 rounded-xl border border-dashed border-gray-300 text-[11px] text-gray-600 bg-gray-50/50">
              <p className="font-bold text-gray-700 mb-0.5">หมายเหตุ:</p>
              <p>
                รายงานนี้แสดงเฉพาะประวัติการให้บริการที่ปฏิบัติงานจริงของรถ VIN: {vin} ไม่รวมรายการที่ถูกยกเลิก
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          OFFICIAL PRINT DOCUMENT PORTAL (A4 Full-Width Document)
          ══════════════════════════════════════════════════════════ */}
      {mounted && createPortal(
        <div id="print-work-order-portal" className="hidden print:block text-black bg-white">
          <div className="official-work-order-sheet max-w-[210mm] mx-auto p-0 font-sans text-[11px] leading-normal text-gray-900">

            {/* ─── 1. Corporate Letterhead ─── */}
            <div className="border-b-2 border-gray-900 pb-3 mb-3 flex justify-between items-start gap-4">
              <div className="max-w-[55%]">
                <h1 className="text-[14px] font-black tracking-tight text-gray-950 uppercase leading-snug">
                  {companyInfo.nameTh}
                </h1>
                <p className="text-[10px] font-bold text-gray-700 tracking-wide">
                  {companyInfo.nameEn}
                </p>
                <p className="text-[9.5px] text-gray-600 mt-1 leading-relaxed">
                  {companyInfo.address}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 text-[9.5px] text-gray-700 mt-0.5">
                  <span>เลขประจำตัวผู้เสียภาษีอากร: <strong className="font-mono font-bold text-black">{companyInfo.taxId}</strong></span>
                  <span>•</span>
                  <span>{companyInfo.department}</span>
                </div>
              </div>

              {/* Document Identity & Meta Box */}
              <div className="text-right shrink-0">
                <div className="mb-1.5">
                  <h2 className="text-[16px] font-black text-gray-950 tracking-tight leading-none uppercase">
                    ใบรายงานประวัติการบริการยานพาหนะรายคัน
                  </h2>
                  <p className="text-[9.5px] font-bold text-gray-600 tracking-wider uppercase mt-0.5">
                    INDIVIDUAL VEHICLE SERVICE & BILLING REPORT
                  </p>
                  <div className="inline-block mt-1 px-2 py-0.5 border border-gray-700 text-[9px] font-bold text-gray-800 tracking-wider">
                    [ เอกสารทางการ / OFFICIAL REPORT ]
                  </div>
                </div>

                <table className="border border-gray-400 text-[10px] border-collapse inline-table text-left w-[240px] bg-white">
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="py-1 px-2 font-semibold text-gray-700 bg-gray-50 border-r border-gray-300 w-24">
                        หมายเลขตัวถัง:
                      </td>
                      <td className="py-1 px-2 font-mono font-black text-gray-950 text-right">
                        {vin}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-1 px-2 font-semibold text-gray-700 bg-gray-50 border-r border-gray-300">
                        วันที่ออกรายงาน:
                      </td>
                      <td className="py-1 px-2 font-medium text-gray-900 text-right">
                        {formatThaiDate(new Date())}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-1 px-2 font-semibold text-gray-700 bg-gray-50 border-r border-gray-300">
                        สังกัดบริษัท:
                      </td>
                      <td className="py-1 px-2 font-bold text-gray-900 text-right">
                        {first.companyCode}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 font-semibold text-gray-700 bg-gray-50 border-r border-gray-300">
                        จำนวนรายการ:
                      </td>
                      <td className="py-1 px-2 font-bold text-right text-gray-900">
                        {activeRecords.length} รายการ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── 2. Vehicle Profile Box ─── */}
            <div className="border border-gray-400 mb-3 bg-white divide-x divide-gray-400 grid grid-cols-2">
              <div className="p-2.5 space-y-1">
                <div className="text-[10px] font-black text-gray-900 border-b border-gray-200 pb-1 mb-1.5 uppercase">
                  ข้อมูลจำเพาะของตัวรถ (VEHICLE PROFILE)
                </div>
                <div>
                  <span className="text-gray-600">เลขตัวถัง (VIN): </span>
                  <strong className="font-mono font-bold text-gray-950">{vin}</strong>
                </div>
                <div>
                  <span className="text-gray-600">ยี่ห้อ / รุ่นรถ: </span>
                  <strong className="text-gray-950">{first.vehicleModel}</strong>
                </div>
                <div>
                  <span className="text-gray-600">สีตัวถัง: </span>
                  <strong className="text-gray-900">{first.vehicleColor}</strong>
                </div>
                <div>
                  <span className="text-gray-600">ป้ายทะเบียน: </span>
                  <strong className="text-gray-900">{first.licensePlate || 'ไม่มีป้ายทะเบียน (รถใหม่ Stock/PDI)'}</strong>
                </div>
              </div>

              <div className="p-2.5 space-y-1">
                <div className="text-[10px] font-black text-gray-900 border-b border-gray-200 pb-1 mb-1.5 uppercase">
                  ข้อมูลการวางบิลและสังกัด (BILLING & CORPORATE INFO)
                </div>
                <div>
                  <span className="text-gray-600">สังกัดองค์กร: </span>
                  <strong className="text-gray-950">{companyInfo.nameTh} ({first.companyCode})</strong>
                </div>
                <div>
                  <span className="text-gray-600">สถานะการวางบิล: </span>
                  <strong className={invoiceNums.length > 0 ? 'text-emerald-800' : 'text-amber-800'}>
                    {invoiceNums.length > 0 ? 'มีรายการวางบิลแล้ว' : 'ยังไม่มีการวางบิล'}
                  </strong>
                </div>
                {invoiceNums.length > 0 && (
                  <div>
                    <span className="text-gray-600">เลขที่ใบวางบิล: </span>
                    <strong className="font-mono text-gray-950">{invoiceNums.join(', ')}</strong>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">เงื่อนไขการรายงาน: </span>
                  <span className="text-gray-700">บันทึกประวัติเฉพาะงานที่ตรวจรับและให้บริการจริง (ไม่รวมงานยกเลิก)</span>
                </div>
              </div>
            </div>

            {/* ─── 3. Service History Table ─── */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-gray-900 uppercase">
                  รายการประวัติการให้บริการทั้งหมด ({activeRecords.length} รายการ)
                </span>
                <span className="text-[9px] text-gray-500">
                  สกุลเงิน: บาทไทย (THB)
                </span>
              </div>

              <table className="w-full border-collapse border border-gray-400 text-[10px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-400 text-gray-800 text-[9.5px]">
                    <th className="py-1.5 px-2 border-r border-gray-300 text-center w-8">#</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-left w-36">เลขที่ใบสั่งงาน</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-center w-24">วันที่ปฏิบัติงาน</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-left">ประเภทงาน / รายละเอียด</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-left">สาขาผู้สั่งงาน / เส้นทาง</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-left">Supplier ผู้รับจ้าง</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-center w-20">ผลตรวจรับ</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-center w-28">เลข Invoice</th>
                    <th className="py-1.5 px-2 text-right w-24">ค่าบริการ (฿)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecords.map((r, idx) => {
                    const st = STATUS_STYLES[r.itemStatus] || STATUS_STYLES.PENDING;
                    return (
                      <tr key={r.id} className={`border-b border-gray-300 ${idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-center text-gray-500">{idx + 1}</td>
                        <td className="py-1.5 px-2 border-r border-gray-300 font-mono font-bold text-gray-950">
                          {r.jobNumber}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-center text-gray-800 whitespace-nowrap">
                          {formatThaiDate(r.serviceDate)}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-gray-900 font-medium">
                          {getServiceLabel(r.serviceType)}
                          {r.remarks && <div className="text-[9px] text-gray-500 mt-0.5">{r.remarks}</div>}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-gray-700">
                          {r.branchName}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-gray-700">
                          {r.supplierName}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-center font-bold text-gray-900">
                          {st.label}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-center font-mono text-[9.5px]">
                          {r.invoiceNumber ? (
                            <strong className="text-gray-900">{r.invoiceNumber}</strong>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-gray-950">
                          {r.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── 4. Financial Summary & Baht Text ─── */}
            <div className="grid grid-cols-12 border border-gray-400 mb-3 bg-white divide-x divide-gray-400">
              <div className="col-span-7 p-2.5 flex flex-col justify-between">
                <div>
                  <div className="text-[9.5px] font-bold text-gray-600 uppercase mb-1">
                    จำนวนเงินตัวอักษร (TOTAL AMOUNT IN WORDS):
                  </div>
                  <div className="text-[12px] font-black text-gray-950 bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-xs">
                    ( {bahtTextString} )
                  </div>
                </div>
                <div className="text-[9px] text-gray-500 mt-2 space-y-0.5 leading-snug">
                  <p>* สรุปยอดรวมค่าบริการทั้งหมดที่เกิดขึ้นจริงสำหรับรถคันนี้ (ไม่นับรวมรายการที่ถูกยกเลิก)</p>
                  <p>* รายงานนี้ใช้สำหรับตรวจสอบประวัติค่าบริการ ตรวจรับงาน และประกอบการกระทบยอดบัญชี</p>
                </div>
              </div>

              <div className="col-span-5 p-2.5 bg-gray-50/50 flex flex-col justify-center">
                <table className="w-full text-[10px]">
                  <tbody>
                    <tr>
                      <td className="py-1 text-gray-600">จำนวนงานบริการทั้งหมด:</td>
                      <td className="py-1 text-right font-mono font-bold text-gray-900">
                        {activeRecords.length} รายการ
                      </td>
                    </tr>
                    <tr className="border-t border-gray-400 text-[11px]">
                      <td className="pt-2 font-black text-gray-950">ยอดรวมค่าบริการสะสมทั้งสิ้น:</td>
                      <td className="pt-2 text-right font-mono font-black text-gray-950 text-[13px]">
                        ฿{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── 5. Signatures ─── */}
            <div className="grid grid-cols-2 border border-gray-400 divide-x divide-gray-400 mb-3 bg-white text-center">
              <div className="p-3 flex flex-col justify-between h-[120px]">
                <div className="text-[10px] font-bold text-gray-800 uppercase border-b border-gray-200 pb-1">
                  ผู้จัดทำรายงาน / เจ้าหน้าที่ตรวจสอบ
                </div>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-gray-400 w-3/5 mx-auto mb-1 h-8" />
                  <div className="text-[10px] font-semibold text-gray-900">
                    ( .......................................................... )
                  </div>
                  <div className="text-[9px] text-gray-500">
                    ตำแหน่ง: เจ้าหน้าที่บริหารงานยานพาหนะ
                  </div>
                  <div className="text-[9px] text-gray-500">
                    วันที่: {formatThaiDate(new Date())}
                  </div>
                </div>
              </div>

              <div className="p-3 flex flex-col justify-between h-[120px]">
                <div className="text-[10px] font-bold text-gray-800 uppercase border-b border-gray-200 pb-1">
                  ผู้อนุมัติรายงาน / ผู้จัดการฝ่าย
                </div>
                <div className="space-y-1">
                  <div className="border-b border-dotted border-gray-400 w-3/5 mx-auto mb-1 h-8" />
                  <div className="text-[10px] font-semibold text-gray-900">
                    ( .......................................................... )
                  </div>
                  <div className="text-[9px] text-gray-500">
                    ตำแหน่ง: ผู้จัดการฝ่ายบริหารงานยานพาหนะ
                  </div>
                  <div className="text-[9px] text-gray-500">
                    วันที่: ...... / ...... / ..........
                  </div>
                </div>
              </div>
            </div>

            {/* ─── 6. Footer ─── */}
            <div className="text-[8.5px] text-gray-400 flex justify-between items-center border-t border-gray-200 pt-2">
              <span>รายงานนี้ออกโดยระบบบริหารจัดการสั่งจ้างและคู่ค้า (Vendor Job Management System) — {first.companyCode}</span>
              <span>VIN: {vin} • พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</span>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default VehicleDetailModal;
