'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Job, Vehicle } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import { thaiBahtText } from '@/lib/billing-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
import { STATUS_MAP } from './constants';

export interface WorkOrderPrintDocumentProps {
  job: Job | null;
}

export function WorkOrderPrintDocument({ job }: WorkOrderPrintDocumentProps) {
  const [mounted, setMounted] = useState(false);
  const { companies, branches, suppliers, vehicles } = useApp();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !job) return null;

  // Identify related company, branch, and supplier
  const company = companies.find(c => c.id === job.companyId || c.code === job.companyCode);
  const branch = branches.find(b => b.id === job.branchId || b.name === job.branchName || b.code === job.branchId);
  const supplier = suppliers.find(s => s.id === job.supplierId || s.name === job.supplierName);

  // Official corporate entity details
  const isEV7 = job.companyCode === 'EV7';
  const companyInfo = {
    nameTh: isEV7 ? 'บริษัท อีวี เซเว่น จำกัด (สำนักงานใหญ่)' : 'บริษัท โกลด์ อินทิเกรท จำกัด (สำนักงานใหญ่)',
    nameEn: isEV7 ? 'EV7 CO., LTD. (HEAD OFFICE)' : 'GOLD INTEGRATE CO., LTD. (HEAD OFFICE)',
    address: company?.address || (isEV7
      ? '99/9 อาคารอีวีทาวเวอร์ ชั้น 12 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310'
      : '888 หมู่ 5 ถนนบางนา-ตราด กม.18 ตำบลบางโฉลง อำเภอบางพลี จังหวัดสมุทรปราการ 10540'),
    taxId: company?.taxId || (isEV7 ? '0105565012345' : '0105564098765'),
    phone: '02-000-0000',
    department: 'ฝ่ายบริหารงานยานพาหนะและสั่งจ้างคู่ค้า (Fleet & Vendor Operations)',
  };

  // Branch info
  const orderingBranchName = branch?.name || job.branchName || '-';
  const orderingBranchCode = branch?.code || '';
  const orderingBranchAddress = branch?.address || '';
  const orderingBranchPhone = job.requesterPhone || branch?.phone || '';

  // Supplier info
  const supplierCode = supplier?.d365VendorCode || supplier?.code || '';
  const supplierTaxId = supplier?.taxId || '';
  const supplierAddress = supplier?.address || '';
  const supplierPhone = supplier?.phone || '';
  const supplierVatType = supplier?.vatType || 'NO_VAT';

  // Title info
  const isCarWash = job.jobType === 'CAR_WASH';
  const docTitleTh = isCarWash ? 'ใบสั่งงานล้างทำความสะอาดรถยนต์' : 'ใบสั่งงานขนส่งและเคลื่อนย้ายรถสไลด์';
  const docTitleEn = isCarWash ? 'CAR WASH SERVICE WORK ORDER' : 'VEHICLE SLIDE TRANSPORT WORK ORDER';

  // Calculate financials
  let subtotal = 0;
  let hasCancelledItems = false;
  let validItemsCount = 0;

  if (isCarWash && job.carWashItems && job.carWashItems.length > 0) {
    const validItems = job.carWashItems.filter(i => i.status !== 'CANCELLED');
    validItemsCount = validItems.length;
    hasCancelledItems = job.carWashItems.some(i => i.status === 'CANCELLED');
    subtotal = validItems.reduce((sum, item) => sum + (item.unitPrice || 0), 0);
  } else {
    const isJobCancelled = job.status === 'CANCELLED';
    subtotal = isJobCancelled ? 0 : (job.actualCost ?? job.estimatedCost ?? 0);
  }

  const vatRate = supplierVatType === 'VAT_7' ? 0.07 : 0;
  const vatAmount = subtotal * vatRate;
  const grandTotal = subtotal + vatAmount;
  const bahtTextString = thaiBahtText(grandTotal);

  // Status mapping
  const statusMeta = STATUS_MAP[job.status] || { label: job.status };

  return createPortal(
    <div id="print-work-order-portal" className="hidden print:block text-black bg-white">
      <div className="official-work-order-sheet max-w-[210mm] mx-auto p-0 font-sans text-[11px] leading-normal text-gray-900">
        
        {/* ══════════════════════════════════════════════════════════
            1. CORPORATE LETTERHEAD & DOCUMENT HEADER
            ══════════════════════════════════════════════════════════ */}
        <div className="border-b-2 border-gray-900 pb-3 mb-3 flex justify-between items-start gap-4">
          {/* Left: Official Company Info */}
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

          {/* Right: Document Identity & Meta Box */}
          <div className="text-right shrink-0">
            <div className="mb-1.5">
              <h2 className="text-[16px] font-black text-gray-950 tracking-tight leading-none uppercase">
                {docTitleTh}
              </h2>
              <p className="text-[9.5px] font-bold text-gray-600 tracking-wider uppercase mt-0.5">
                {docTitleEn}
              </p>
              <div className="inline-block mt-1 px-2 py-0.5 border border-gray-700 text-[9px] font-bold text-gray-800 tracking-wider">
                [ ต้นฉบับ / ORIGINAL ]
              </div>
            </div>

            {/* Document Meta Table */}
            <table className="border border-gray-400 text-[10px] border-collapse inline-table text-left w-[240px] bg-white">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-1 px-2 font-semibold text-gray-700 bg-gray-50 border-r border-gray-300 w-24">
                    เลขที่ใบสั่งงาน:
                  </td>
                  <td className="py-1 px-2 font-mono font-black text-gray-950 text-right">
                    {job.jobNumber}
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1 px-2 font-semibold text-gray-700 bg-gray-50 border-r border-gray-300">
                    วันที่สั่งงาน:
                  </td>
                  <td className="py-1 px-2 font-medium text-gray-900 text-right">
                    {formatThaiDateTime(job.createdAt)}
                  </td>
                </tr>
                {job.d365PoNumber && (
                  <tr className="border-b border-gray-300 bg-emerald-50/40">
                    <td className="py-1 px-2 font-bold text-emerald-900 border-r border-gray-300">
                      เลขที่ D365 PO:
                    </td>
                    <td className="py-1 px-2 font-mono font-black text-emerald-900 text-right">
                      {job.d365PoNumber}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 px-2 font-semibold text-gray-700 bg-gray-50 border-r border-gray-300">
                    สถานะใบงาน:
                  </td>
                  <td className="py-1 px-2 font-bold text-right text-gray-900">
                    {statusMeta.label}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            2. CONTRACTING PARTIES (สาขาผู้ว่าจ้าง & คู่ค้าผู้รับจ้าง)
            ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 border border-gray-400 mb-3 bg-white divide-x divide-gray-400">
          {/* Left Column: Ordering Branch (Customer) */}
          <div className="p-2.5 space-y-1">
            <div className="text-[10px] font-black text-gray-900 border-b border-gray-200 pb-1 mb-1.5 uppercase flex items-center justify-between">
              <span>ข้อมูลสาขาผู้ว่าจ้าง (ORDERING BRANCH)</span>
              <span className="font-mono text-[9px] bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                {job.companyCode}
              </span>
            </div>
            <div>
              <span className="text-gray-600">สาขา: </span>
              <strong className="text-gray-950 font-bold">{orderingBranchName}</strong>
              {orderingBranchCode && <span className="font-mono text-gray-700 ml-1">({orderingBranchCode})</span>}
            </div>
            {orderingBranchAddress && (
              <div className="text-[10px] text-gray-600 leading-snug">
                <span>ที่อยู่: </span>{orderingBranchAddress}
              </div>
            )}
            <div className="flex flex-wrap gap-x-3 text-[10px] pt-0.5">
              <div>
                <span className="text-gray-600">ผู้สั่งงาน: </span>
                <strong className="text-gray-900">{job.requestedBy || '-'}</strong>
                {job.requesterPosition && <span className="text-gray-600 ml-1">({job.requesterPosition})</span>}
              </div>
              {orderingBranchPhone && (
                <div>
                  <span className="text-gray-600">โทร: </span>
                  <span className="font-mono text-gray-900">{orderingBranchPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Supplier (Contractor) */}
          <div className="p-2.5 space-y-1">
            <div className="text-[10px] font-black text-gray-900 border-b border-gray-200 pb-1 mb-1.5 uppercase flex items-center justify-between">
              <span>ข้อมูลคู่ค้าผู้รับจ้าง (SERVICE CONTRACTOR)</span>
              {supplierCode && (
                <span className="font-mono text-[9px] bg-gray-100 px-1.5 py-0.5 border border-gray-300 font-bold">
                  {supplierCode}
                </span>
              )}
            </div>
            <div>
              <span className="text-gray-600">ชื่อผู้รับจ้าง: </span>
              <strong className="text-gray-950 font-bold">{job.supplierName}</strong>
            </div>
            {supplierAddress && (
              <div className="text-[10px] text-gray-600 leading-snug">
                <span>ที่อยู่: </span>{supplierAddress}
              </div>
            )}
            <div className="flex flex-wrap gap-x-3 text-[10px] pt-0.5">
              {supplierTaxId && (
                <div>
                  <span className="text-gray-600">เลขประจำตัวผู้เสียภาษี: </span>
                  <span className="font-mono font-bold text-gray-900">{supplierTaxId}</span>
                </div>
              )}
              {supplierPhone && (
                <div>
                  <span className="text-gray-600">โทร: </span>
                  <span className="font-mono text-gray-900">{supplierPhone}</span>
                </div>
              )}
            </div>
            <div className="text-[9.5px] text-gray-500 pt-0.5">
              สถานะภาษี: {supplierVatType === 'VAT_7' ? 'จดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%)' : 'ไม่มี VAT (บุคคลธรรมดา/ได้รับการยกเว้น)'}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            3. VEHICLE SLIDE TRANSPORT ROUTE DETAILS (If Slide Job)
            ══════════════════════════════════════════════════════════ */}
        {!isCarWash && (
          <div className="border border-gray-400 mb-3 bg-white p-2.5 space-y-2">
            <div className="text-[10px] font-black text-gray-900 border-b border-gray-200 pb-1 uppercase">
              รายละเอียดเส้นทางและการนัดหมายขนส่ง (ROUTE & TRANSPORT SCHEDULE)
            </div>
            <div className="grid grid-cols-2 gap-4 text-[10px]">
              {/* Origin */}
              <div className="space-y-1 bg-gray-50/70 p-2 border border-gray-200">
                <div className="font-bold text-gray-800 text-[10.5px]">
                  📍 จุดรับรถ (ต้นทาง / Origin)
                </div>
                <div>
                  <span className="text-gray-600">สาขา/สถานที่: </span>
                  <strong className="text-gray-950">{job.originBranchName || job.branchName}</strong>
                </div>
                {(job.customOriginAddress || job.originBranchAddress) && (
                  <div className="text-gray-600 text-[9.5px]">
                    {job.customOriginAddress || job.originBranchAddress}
                  </div>
                )}
                <div>
                  <span className="text-gray-600">กำหนดการรับรถ: </span>
                  <strong className="text-gray-900">{job.pickupDateTime ? formatThaiDateTime(job.pickupDateTime) : '-'}</strong>
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-1 bg-gray-50/70 p-2 border border-gray-200">
                <div className="font-bold text-gray-800 text-[10.5px]">
                  🏁 จุดส่งมอบ (ปลายทาง / Destination)
                </div>
                <div>
                  <span className="text-gray-600">สาขา/สถานที่: </span>
                  <strong className="text-gray-950">{job.destBranchName || job.customDestAddress || '-'}</strong>
                </div>
                {(job.customDestAddress || job.destBranchAddress) && (
                  <div className="text-gray-600 text-[9.5px]">
                    {job.customDestAddress || job.destBranchAddress}
                  </div>
                )}
                <div>
                  <span className="text-gray-600">กำหนดการส่งมอบ: </span>
                  <strong className="text-gray-900">{job.deliveryDateTime ? formatThaiDateTime(job.deliveryDateTime) : '-'}</strong>
                </div>
              </div>
            </div>

            {/* Extra Info */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-gray-700 border-t border-gray-100">
              <div className="flex items-center gap-4">
                {job.distance && (
                  <span>ระยะทางคำนวณ: <strong className="font-mono font-bold text-gray-900">{job.distance} กม.</strong></span>
                )}
                {job.contactPerson && (
                  <span>ผู้ติดต่อหน้างาน: <strong className="text-gray-900">{job.contactPerson}</strong> {job.contactPhone ? `(${job.contactPhone})` : ''}</span>
                )}
              </div>
              {job.transferReason && (
                <div className="text-[9.5px] text-gray-600">
                  <span className="font-semibold text-gray-700">วัตถุประสงค์: </span>{job.transferReason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            4. ITEMS TABLE (รายการรถยนต์และงานที่สั่ง)
            ══════════════════════════════════════════════════════════ */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-gray-900 uppercase">
              {isCarWash ? `รายการรถยนต์ในคำสั่งล้าง (${job.carWashItems?.length || 0} คัน)` : 'รายการรถยนต์ในคำสั่งขนส่งรถสไลด์'}
            </span>
            <span className="text-[9px] text-gray-500">
              สกุลเงิน: บาทไทย (THB)
            </span>
          </div>

          <table className="w-full border-collapse border border-gray-400 text-[10px]">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-400 text-gray-800 text-[9.5px]">
                <th className="py-1.5 px-2 border-r border-gray-300 text-center w-8">#</th>
                <th className="py-1.5 px-2 border-r border-gray-300 text-left w-36">เลขตัวถัง (VIN)</th>
                <th className="py-1.5 px-2 border-r border-gray-300 text-left">รุ่นรถ / สี</th>
                <th className="py-1.5 px-2 border-r border-gray-300 text-center w-24">ทะเบียน</th>
                {isCarWash ? (
                  <>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-left">รายการบริการ</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-center w-24">วันที่ล้าง</th>
                  </>
                ) : (
                  <>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-left">เส้นทางขนส่ง</th>
                    <th className="py-1.5 px-2 border-r border-gray-300 text-center w-28">กำหนดการ</th>
                  </>
                )}
                <th className="py-1.5 px-2 border-r border-gray-300 text-center w-20">ผลตรวจรับ</th>
                <th className="py-1.5 px-2 text-right w-24">ค่าบริการ (฿)</th>
              </tr>
            </thead>
            <tbody>
              {/* Car Wash Items */}
              {isCarWash && job.carWashItems && job.carWashItems.map((item, idx) => {
                const isItemCancelled = item.status === 'CANCELLED';
                const serviceDisplay = getWashServiceDisplay(item.washType);

                return (
                  <tr key={item.id || idx} className={`border-b border-gray-300 ${isItemCancelled ? 'bg-red-50/50 text-gray-500' : idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-center text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 font-mono font-bold text-gray-950">
                      {item.vin}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-gray-900">
                      <span>{item.vehicleModel || '-'}</span>
                      {item.vehicleColor && <span className="text-gray-500 ml-1">({item.vehicleColor})</span>}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-center font-bold text-gray-900">
                      {item.licensePlate || '-'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-gray-900">
                      <div className="font-semibold">{serviceDisplay.name}</div>
                      {item.remarks && <div className="text-[9px] text-gray-500 mt-0.5">{item.remarks}</div>}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-center text-gray-800">
                      {formatThaiDate(item.actualWashDate)}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-center font-bold">
                      {isItemCancelled ? (
                        <span className="text-red-700">ปฏิเสธ</span>
                      ) : item.status === 'APPROVED' ? (
                        <span className="text-emerald-700">ผ่าน</span>
                      ) : item.status === 'COMPLETED' ? (
                        <span className="text-blue-700">เสร็จสิ้น</span>
                      ) : (
                        <span className="text-amber-700">รอทำ</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-gray-950">
                      {isItemCancelled ? (
                        <span className="text-red-600 line-through">0.00</span>
                      ) : (
                        item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Vehicle Slide Items */}
              {!isCarWash && (() => {
                const slideItems = job.carWashItems;
                const isCancelled = job.status === 'CANCELLED';

                if (slideItems && slideItems.length > 0) {
                  return slideItems.map((item, idx) => {
                    const isItemCancelled = item.status === 'CANCELLED';
                    const isItemDone = item.status === 'COMPLETED' || item.status === 'APPROVED';
                    const statusText = isItemCancelled
                      ? 'ปฏิเสธ'
                      : ['APPROVED', 'INVOICED'].includes(job.status) || item.status === 'APPROVED'
                        ? 'ตรวจรับแล้ว'
                        : isItemDone
                          ? 'ส่งแล้ว'
                          : 'รอดำเนินการ';

                    return (
                      <tr key={item.id || idx} className={`border-b border-gray-300 ${isItemCancelled ? 'bg-red-50/50 text-gray-500' : idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-center text-gray-500">{idx + 1}</td>
                        <td className="py-1.5 px-2 border-r border-gray-300 font-mono font-bold text-gray-950">
                          {item.vin}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-gray-900">
                          <span>{item.vehicleModel || '-'}</span>
                          {item.vehicleColor && <span className="text-gray-500 ml-1">({item.vehicleColor})</span>}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-center font-bold text-gray-900">
                          {item.licensePlate || '-'}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-gray-900">
                          {(job.originBranchName || job.branchName)} → {(job.destBranchName || job.customDestAddress || '-')}
                          {job.distance ? ` (${job.distance} กม.)` : ''}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-center text-gray-800">
                          {job.pickupDateTime ? formatThaiDate(job.pickupDateTime) : '-'}
                        </td>
                        <td className="py-1.5 px-2 border-r border-gray-300 text-center font-bold">
                          {isItemCancelled ? (
                            <span className="text-red-700">ปฏิเสธ</span>
                          ) : (
                            <span className={statusText === 'ตรวจรับแล้ว' ? 'text-emerald-700' : 'text-blue-700'}>{statusText}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-gray-950">
                          {isItemCancelled ? '0.00' : item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  });
                }

                // Single car fallback
                const v = vehicles.find(item => item.vin === job.vin) || job.vehicle;
                const vModel = v?.model || 'ไม่ระบุรุ่น';
                const vColor = v?.color || '';
                const vPlate = v?.licensePlate || '-';
                const finalCost = isCancelled ? 0 : (job.actualCost ?? job.estimatedCost ?? 0);

                return (
                  <tr className="border-b border-gray-300 bg-white">
                    <td className="py-1.5 px-2 border-r border-gray-300 text-center text-gray-500">1</td>
                    <td className="py-1.5 px-2 border-r border-gray-300 font-mono font-bold text-gray-950">
                      {job.vin || '-'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-gray-900">
                      <span>{vModel}</span>
                      {vColor && <span className="text-gray-500 ml-1">({vColor})</span>}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-center font-bold text-gray-900">
                      {vPlate}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-gray-900">
                      {(job.originBranchName || job.branchName)} → {(job.destBranchName || job.customDestAddress || '-')}
                      {job.distance ? ` (${job.distance} กม.)` : ''}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-center text-gray-800">
                      {job.pickupDateTime ? formatThaiDate(job.pickupDateTime) : '-'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-300 text-center font-bold">
                      {isCancelled ? (
                        <span className="text-red-700">ยกเลิก</span>
                      ) : ['APPROVED', 'INVOICED'].includes(job.status) ? (
                        <span className="text-emerald-700">ตรวจรับแล้ว</span>
                      ) : (
                        <span className="text-blue-700">{statusMeta.label}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-gray-950">
                      {isCancelled ? '0.00' : finalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>

        {/* ══════════════════════════════════════════════════════════
            5. FINANCIAL SUMMARY & BAHT TEXT
            ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 border border-gray-400 mb-3 bg-white divide-x divide-gray-400">
          {/* Left: Thai Baht Text & Notes */}
          <div className="col-span-7 p-2.5 flex flex-col justify-between">
            <div>
              <div className="text-[9.5px] font-bold text-gray-600 uppercase mb-1">
                จำนวนเงินตัวอักษร (TOTAL IN WORDS):
              </div>
              <div className="text-[12px] font-black text-gray-950 bg-gray-50 border border-gray-300 px-3 py-1.5 rounded-xs">
                ( {bahtTextString} )
              </div>
            </div>

            {/* Note / Cancellation explanation */}
            <div className="text-[9px] text-gray-500 mt-2 space-y-0.5 leading-snug">
              {hasCancelledItems && (
                <p className="text-red-700 font-semibold">
                  * คำนวณค่าบริการเฉพาะรายการที่ปฏิบัติงานจริง ({validItemsCount} คัน) รายการที่ปฏิเสธไม่คิดค่าบริการ
                </p>
              )}
              {job.rejectReason && (
                <p className="text-red-700 font-semibold">
                  * หมายเหตุการปฏิเสธงาน: {job.rejectReason}
                </p>
              )}
              <p>เอกสารใบสั่งงานนี้ใช้เป็นหลักฐานเพื่อการตรวจรับงานและแนบประกอบการวางบิล</p>
            </div>
          </div>

          {/* Right: Numbers Summary */}
          <div className="col-span-5 p-2 bg-gray-50/50 flex flex-col justify-center">
            <table className="w-full text-[10px]">
              <tbody>
                <tr>
                  <td className="py-0.5 text-gray-600">รวมค่าบริการ (Subtotal):</td>
                  <td className="py-0.5 text-right font-mono font-bold text-gray-900">
                    ฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                {supplierVatType === 'VAT_7' && (
                  <tr>
                    <td className="py-0.5 text-gray-600">ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
                    <td className="py-0.5 text-right font-mono font-bold text-gray-900">
                      ฿{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-gray-400 text-[11px]">
                  <td className="pt-1.5 font-black text-gray-950">ยอดรวมสุทธิทั้งสิ้น:</td>
                  <td className="pt-1.5 text-right font-mono font-black text-gray-950 text-[12px]">
                    ฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            6. AUDIT TRAIL / INSPECTION & D365 PO RECORD
            ══════════════════════════════════════════════════════════ */}
        {(job.approvedAt || job.d365PoNumber) && (
          <div className="border border-gray-300 bg-gray-50/70 p-2 mb-3 text-[9.5px] flex items-center justify-between flex-wrap gap-2">
            {job.approvedAt && (
              <div>
                <span className="font-bold text-emerald-800">✓ ผลการตรวจรับงาน: </span>
                <span className="text-gray-700">
                  ผ่านการตรวจรับเมื่อ {formatThaiDateTime(job.approvedAt)} {job.approvedBy ? `โดย ${job.approvedBy}` : ''}
                </span>
              </div>
            )}
            {job.d365PoNumber && (
              <div>
                <span className="font-bold text-emerald-800">✓ ระบบ ERP (D365): </span>
                <span className="text-gray-700 font-mono font-semibold">PO Number: {job.d365PoNumber}</span>
                {job.d365PoSentAt && <span className="text-gray-500 ml-1">({formatThaiDateTime(job.d365PoSentAt)})</span>}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            7. OFFICIAL 3-PARTY SIGNATURES (ช่องลงนาม 3 ฝ่าย)
            ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-3 border border-gray-400 divide-x divide-gray-400 mb-3 bg-white text-center">
          {/* Party 1: Requester */}
          <div className="p-2.5 flex flex-col justify-between h-[120px]">
            <div className="text-[10px] font-bold text-gray-800 uppercase border-b border-gray-200 pb-1">
              ผู้สั่งงาน / ผู้มอบหมายงาน
            </div>
            <div className="space-y-1">
              <div className="border-b border-dotted border-gray-400 w-4/5 mx-auto mb-1 h-8" />
              <div className="text-[10px] font-semibold text-gray-900">
                ( {job.requestedBy || '..........................................................'} )
              </div>
              <div className="text-[9px] text-gray-500">
                ตำแหน่ง: {job.requesterPosition || 'เจ้าหน้าที่สาขา'}
              </div>
              <div className="text-[9px] text-gray-500">
                วันที่: {formatThaiDate(job.createdAt)}
              </div>
            </div>
          </div>

          {/* Party 2: Supplier / Contractor */}
          <div className="p-2.5 flex flex-col justify-between h-[120px]">
            <div className="text-[10px] font-bold text-gray-800 uppercase border-b border-gray-200 pb-1">
              ผู้รับจ้าง / ผู้ให้บริการ
            </div>
            <div className="space-y-1">
              <div className="border-b border-dotted border-gray-400 w-4/5 mx-auto mb-1 h-8" />
              <div className="text-[10px] font-semibold text-gray-900">
                ( .......................................................... )
              </div>
              <div className="text-[9px] text-gray-500">
                ผู้แทน Supplier ผู้รับงาน
              </div>
              <div className="text-[9px] text-gray-500">
                วันที่: ...... / ...... / ..........
              </div>
            </div>
          </div>

          {/* Party 3: Approver */}
          <div className="p-2.5 flex flex-col justify-between h-[120px]">
            <div className="text-[10px] font-bold text-gray-800 uppercase border-b border-gray-200 pb-1">
              ผู้ตรวจรับงาน / ผู้มีอำนาจ
            </div>
            <div className="space-y-1">
              <div className="border-b border-dotted border-gray-400 w-4/5 mx-auto mb-1 h-8" />
              <div className="text-[10px] font-semibold text-gray-900">
                ( {job.approvedBy || '..........................................................'} )
              </div>
              <div className="text-[9px] text-gray-500">
                {job.approvedBy ? 'ผู้ตรวจรับงาน / ผู้จัดการ' : 'ตำแหน่ง: ....................................'}
              </div>
              <div className="text-[9px] text-gray-500">
                วันที่: {job.approvedAt ? formatThaiDate(job.approvedAt) : '...... / ...... / ..........'}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            8. TERMS & CONDITIONS & FOOTER
            ══════════════════════════════════════════════════════════ */}
        <div className="text-[8.5px] text-gray-500 space-y-0.5 border-t border-gray-200 pt-2 leading-relaxed">
          <p className="font-semibold text-gray-600">ข้อกำหนดและเงื่อนไขการปฏิบัติงาน (Terms & Conditions):</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>ผู้รับจ้างต้องตรวจสอบสภาพรถยนต์ และบันทึกภาพถ่ายหลักฐานก่อน-หลังการปฏิบัติงานลงในระบบทุกครั้ง</li>
            <li>กรณีพบความเสียหายหรือตำหนิของตัวรถก่อนเริ่มงาน ต้องแจ้งผู้สั่งงานและบันทึกภาพถ่ายยืนยันก่อนเริ่มปฏิบัติงาน</li>
            <li>เอกสารใบสั่งงานนี้ใช้เป็นหลักฐานรับรองการสั่งงานในระบบ ใช้ประกอบการตรวจรับงาน การวางบิล และการจ่ายเงิน</li>
          </ol>
          <div className="flex justify-between items-center pt-2 text-[8px] text-gray-400 border-t border-gray-100">
            <span>เอกสารนี้พิมพ์จากระบบสั่งงานและจัดการคู่ค้า (Vendor Job Management System) — {job.companyCode}</span>
            <span>เลขที่อ้างอิง: {job.jobNumber} • วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</span>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
