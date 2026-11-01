'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Printer, Building2, Wrench, FileText } from 'lucide-react';
import { Job } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/context/AppContext';
import { getWashServiceDisplay, getSupplierWashConfig, calculateWashOrderFinancials } from '@/lib/car-wash-rates';
import { getSupplierVendorCode } from '@/lib/job-utils';
import { WorkOrderPrintDocument } from './WorkOrderPrintDocument';

export interface WashOrderPrintModalProps {
  createdJob: Job | null;
  onClose?: () => void;
}

function formatMoney(amount: number): string {
  const hasDecimals = Math.abs(amount % 1) > 0.001;
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function WashOrderPrintModal({
  createdJob,
  onClose,
}: WashOrderPrintModalProps) {
  const router = useRouter();
  const theme = useTheme();
  const { companies, branches, suppliers, vehicles } = useApp();

  if (!createdJob) return null;

  const company = companies.find(c => c.id === createdJob.companyId || c.code === createdJob.companyCode);
  const branch = branches.find(b => b.id === createdJob.branchId || b.name === createdJob.branchName);
  const supplier = suppliers.find(s => s.id === createdJob.supplierId || s.name === createdJob.supplierName);

  const companyCodeDisplay = createdJob.companyCode || company?.code || '-';
  const branchNameDisplay = createdJob.branchName || branch?.name || '-';
  const branchCodeDisplay = branch?.code || '';
  const supplierNameDisplay = createdJob.supplierName || supplier?.name || '-';
  const vendorCode = getSupplierVendorCode(supplier, { id: createdJob.branchId, code: branch?.code });

  const washConfig = getSupplierWashConfig(supplier?.code || createdJob.supplierId, supplierNameDisplay, supplier);
  const financials = calculateWashOrderFinancials(createdJob.carWashItems || [], washConfig.vatType);
  const itemCount = createdJob.carWashItems?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-[840px] w-full p-5 sm:p-6 max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col gap-5 border border-gray-100">
        {/* Modal Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${theme.primary}12`,
                borderColor: `${theme.primary}28`,
                color: theme.primary,
              }}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 leading-snug">
                บันทึกคำสั่งล้างรถสำเร็จ
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                Car Wash Order Created • แจ้งเตือนไปยัง Supplier เรียบร้อยแล้ว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all shadow-xs whitespace-nowrap cursor-pointer"
              style={{ backgroundColor: theme.primary }}
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>พิมพ์ / Export PDF</span>
            </button>
            <button
              onClick={() => {
                if (onClose) onClose();
                router.push('/jobs');
              }}
              className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 border border-gray-200/70 transition-colors whitespace-nowrap cursor-pointer"
            >
              ไปยังหน้ารวมงาน
            </button>
          </div>
        </div>

        {/* Official Document Print Portal */}
        <WorkOrderPrintDocument job={createdJob} />

        {/* On-Screen Order Slip Card */}
        <div className="border border-gray-200/90 rounded-2xl bg-white text-gray-900 shadow-2xs overflow-hidden flex flex-col">
          {/* Document Header */}
          <div
            className="px-5 py-4 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ background: 'linear-gradient(180deg, rgba(15,82,56,0.04) 0%, rgba(255,255,255,1) 100%)' }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-[#0f5238] border border-emerald-200/70">
                  <FileText className="w-3 h-3" />
                  CAR WASH ORDER SLIP
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-gray-100 text-gray-700 border border-gray-200">
                  {companyCodeDisplay}
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-[#0f5238] tracking-tight">
                ใบสั่งงานล้างทำความสะอาดรถยนต์
              </h2>
              <p className="text-xs text-gray-600">
                สังกัดสาขา: <span className="font-semibold text-gray-800">{branchNameDisplay}</span>
                {branchCodeDisplay ? <span className="text-gray-500"> ({branchCodeDisplay})</span> : null}
              </p>
            </div>

            <div className="sm:text-right bg-gray-50/90 border border-gray-200/80 rounded-xl px-3.5 py-2.5 shrink-0">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                เลขที่ใบสั่งงาน (Job No.)
              </p>
              <p className="font-mono font-extrabold text-sm text-gray-900 mt-0.5">
                {createdJob.jobNumber}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                วันที่สั่งงาน: <span className="font-medium text-gray-700">{formatThaiDate(createdJob.createdAt)}</span>
              </p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-5">
            {/* Contracting Parties Info (2 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Ordering Branch Card */}
              <div className="p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-gray-200/70 pb-1.5 mb-0.5">
                  <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0f5238]" />
                    สาขาผู้สั่งงาน
                  </span>
                  {branchCodeDisplay && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                      {branchCodeDisplay}
                    </span>
                  )}
                </div>
                <p className="font-bold text-gray-900 text-xs leading-snug">
                  {branchNameDisplay}
                </p>
                <div className="text-[11px] text-gray-600 space-y-0.5 pt-0.5">
                  <p>
                    <span className="text-gray-500">ผู้สั่งงาน:</span>{' '}
                    <span className="font-semibold text-gray-800">{createdJob.requestedBy || '-'}</span>
                    {createdJob.requesterPosition ? <span className="text-gray-500"> ({createdJob.requesterPosition})</span> : null}
                  </p>
                  {createdJob.requesterPhone && (
                    <p>
                      <span className="text-gray-500">โทร:</span>{' '}
                      <span className="font-mono text-gray-800">{createdJob.requesterPhone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Supplier Card */}
              <div className="p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center justify-between border-b border-gray-200/70 pb-1.5 mb-0.5">
                  <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-[#0f5238]" />
                    Supplier ผู้รับจ้าง
                  </span>
                  {vendorCode && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                      {vendorCode}
                    </span>
                  )}
                </div>
                <p className="font-bold text-gray-900 text-xs leading-snug">
                  {supplierNameDisplay}
                </p>
                <div className="text-[11px] text-gray-600 space-y-1 pt-0.5">
                  <p>
                    <span className="text-gray-500">สถานะภาษี:</span>{' '}
                    <span className="font-semibold text-gray-800">
                      {washConfig.vatType === 'VAT_7' ? 'มีภาษีมูลค่าเพิ่ม (VAT 7%)' : 'ไม่มี VAT (บุคคลธรรมดา)'}
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">สถานะใบงาน:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      รอ Supplier ปฏิบัติงาน
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-gray-200/90 rounded-xl overflow-hidden">
              <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200/90 flex items-center justify-between text-[11px]">
                <span className="font-bold text-gray-700">
                  รายการรถยนต์ในคำสั่งล้าง ({itemCount} คัน)
                </span>
                <span className="text-gray-500">สกุลเงิน: บาท (THB)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-gray-200 font-bold text-gray-600 text-[11px]">
                      <th className="py-2.5 px-3 text-center w-10 whitespace-nowrap">#</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">เลขตัวถัง (VIN)</th>
                      <th className="py-2.5 px-3 min-w-[160px]">รุ่น / สี</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">ทะเบียน</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">วันที่ล้างจริง</th>
                      <th className="py-2.5 px-3 min-w-[190px]">ประเภทบริการ</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">ราคา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/80">
                    {createdJob.carWashItems?.map((item, i) => {
                      const serviceMeta = getWashServiceDisplay(item.washType);
                      const matchedVehicle = vehicles.find(v => v.vin.toUpperCase() === item.vin.toUpperCase()) || (item as any).vehicle;
                      const vModel = item.vehicleModel || matchedVehicle?.model || '-';
                      const vColor = item.vehicleColor || matchedVehicle?.color || '';
                      const vPlate = item.licensePlate || matchedVehicle?.licensePlate || '-';
                      return (
                        <tr key={item.id || i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-3 text-center text-gray-500 font-medium">{i + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                            {item.vin}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-gray-900 leading-snug">{vModel}</div>
                            {vColor && vColor !== '-' && vColor !== 'ไม่ระบุสี' && (
                              <div className="text-[11px] text-gray-500 mt-0.5">สี: {vColor}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-gray-800 whitespace-nowrap">
                            {vPlate}
                          </td>
                          <td className="py-3 px-3 text-center text-gray-700 whitespace-nowrap">
                            {formatThaiDate(item.actualWashDate)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{serviceMeta.name}</div>
                            {item.remarks && (
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.remarks}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                            ฿{formatMoney(item.unitPrice)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary Bar */}
              <div className="bg-gray-50/70 border-t border-gray-200 px-4 py-3 flex flex-col items-end gap-1.5 text-xs">
                {washConfig.vatType === 'VAT_7' ? (
                  <div className="w-full sm:w-80 space-y-1.5">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>ยอดรวมค่าบริการ (Subtotal):</span>
                      <span className="font-mono font-semibold text-gray-900">
                        ฿{formatMoney(financials.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        +฿{formatMoney(financials.vatAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/90 font-bold text-gray-900">
                      <span>ยอดสุทธิรวมทั้งสิ้น (Grand Total):</span>
                      <span className="font-mono text-base font-extrabold text-[#0f5238]">
                        ฿{formatMoney(financials.grandTotal)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full sm:w-80 flex items-center justify-between font-bold text-gray-900">
                    <span>ยอดรวมทั้งสิ้น (ไม่มี VAT):</span>
                    <span className="font-mono text-base font-extrabold text-[#0f5238]">
                      ฿{formatMoney(financials.grandTotal)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Signatures Area */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200/80 text-xs text-center">
              <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-200/60 flex flex-col items-center justify-between gap-5">
                <span className="text-[11px] font-bold text-gray-600">ผู้สั่งงาน / ผู้มอบหมายงาน</span>
                <div className="w-full max-w-[200px] space-y-1.5">
                  <div className="border-b border-dashed border-gray-400 h-4" />
                  <p className="font-semibold text-gray-900">
                    ( {createdJob.requestedBy || '...................................................'} )
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {createdJob.requesterPosition || 'เจ้าหน้าที่สาขา'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-200/60 flex flex-col items-center justify-between gap-5">
                <span className="text-[11px] font-bold text-gray-600">ผู้รับจ้าง / Supplier</span>
                <div className="w-full max-w-[200px] space-y-1.5">
                  <div className="border-b border-dashed border-gray-400 h-4" />
                  <p className="font-semibold text-gray-900">
                    ( ................................................... )
                  </p>
                  <p className="text-[11px] text-gray-500">
                    ผู้แทน Supplier ผู้รับงาน
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WashOrderPrintModal;
