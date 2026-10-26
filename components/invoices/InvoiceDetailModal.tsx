'use client';

import React, { useState } from 'react';
import { Invoice, Job } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { thaiBahtText } from '@/lib/billing-utils';
import { useApp } from '@/context/AppContext';
import {
  Printer,
  X,
  Copy,
  Check,
  Building,
  FileText,
} from 'lucide-react';

interface VehicleBreakdownItem {
  vin: string;
  model: string;
  color: string;
  licensePlate: string;
  jobNumber: string;
  poNumber?: string | null;
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
  const { suppliers, companies, branches } = useApp();
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  if (!invoice) return null;

  // Identify current supplier and company details
  const currentSupplier = suppliers.find(
    s => s.id === invoice.supplierId || s.name === invoice.supplierName
  );

  const currentCompany = companies.find(
    c => c.id === invoice.companyId || c.code === invoice.companyCode
  );

  // Official registered corporate details
  const companyInfo = {
    name:
      currentCompany?.name ||
      (invoice.companyCode === 'EV7'
        ? 'บริษัท อีวี เซเว่น จำกัด (EV7 CO., LTD.)'
        : 'บริษัท โกลด์ อินทิเกรท จำกัด (GOLD INTEGRATE CO., LTD.)'),
    taxId:
      currentCompany?.taxId ||
      (invoice.companyCode === 'EV7' ? '0105565012345' : '0105564098765'),
    branch: 'สำนักงานใหญ่ (Head Office)',
    address:
      currentCompany?.address ||
      (invoice.companyCode === 'EV7'
        ? '99/9 อาคารอีวีทาวเวอร์ ชั้น 12 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310'
        : '888 หมู่ 5 ถนนบางนา-ตราด กม.18 ตำบลบางโฉลง อำเภอบางพลี จังหวัดสมุทรปราการ 10540'),
    phone: '02-000-0000',
    department: 'ฝ่ายบริหารยานพาหนะส่วนกลาง (Central Fleet Management)',
  };

  const supplierInfo = {
    name: invoice.supplierName,
    code: currentSupplier?.code || '',
    d365VendorCode: currentSupplier?.d365VendorCode || null,
    showroomLabel: currentSupplier?.showroomLabel || '',
    taxId: currentSupplier?.taxId || null,
    address: currentSupplier?.address || '',
    phone: currentSupplier?.phone || '',
    email: currentSupplier?.email || '',
    bankName: currentSupplier?.bankName || 'ธนาคารกสิกรไทย สาขาสวนหลวง',
    bankAccount: currentSupplier?.bankAccount || '789-2-34567-8',
    vatType: currentSupplier?.vatType || (invoice.vatAmount > 0 ? 'VAT_7' : 'NO_VAT'),
  };

  // Build per-vehicle breakdown from related jobs
  const invoiceJobs = invoice.jobIds
    .map(jid => jobs.find(job => job.id === jid))
    .filter(Boolean) as Job[];

  // Identify the ordering branch from the jobs in this invoice
  const primaryJob = invoiceJobs[0];
  const primaryBranch = branches.find(
    b =>
      b.id === primaryJob?.branchId ||
      b.name === primaryJob?.branchName ||
      b.code === primaryJob?.branchId
  );

  const orderingBranchName =
    primaryBranch?.name || primaryJob?.branchName || 'สาขาผู้สั่งงาน';
  const orderingBranchCode = primaryBranch?.code || '';
  const orderingBranchAddress =
    primaryBranch?.address ||
    primaryJob?.originBranchAddress ||
    '';
  const orderingBranchPhone = primaryBranch?.phone || primaryJob?.requesterPhone || '';
  const orderingRequester = primaryJob?.requestedBy || '';
  const orderingRequesterPosition = primaryJob?.requesterPosition || '';

  // Gather unique D365 PO numbers across all jobs in this invoice
  const allInvoiceJobs = invoiceJobs.length > 0 ? invoiceJobs : ((invoice.jobs as any[]) || []);
  const poNumbers = Array.from(
    new Set(allInvoiceJobs.map((j: any) => j.d365PoNumber).filter(Boolean))
  ) as string[];

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
          poNumber: j.d365PoNumber,
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
        poNumber: j.d365PoNumber,
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

  const formatFullThaiDate = (dateInput?: string | Date | null) => {
    if (!dateInput) return '-';
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleCopyInvoiceNumber = () => {
    navigator.clipboard.writeText(invoice.invoiceNumber);
    setCopiedInvoiceNo(true);
    setTimeout(() => setCopiedInvoiceNo(false), 2000);
  };

  const handleCopyBankAccount = () => {
    navigator.clipboard.writeText(supplierInfo.bankAccount);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-4xl my-auto flex flex-col gap-3">
        {/* ── Toolbar Bar (Above Document - Hidden when printing) ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                  ใบวางบิล / ใบแจ้งหนี้ (Billing Note & Invoice)
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {invoice.invoiceNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyInvoiceNumber}
                  title="คัดลอกเลขที่ใบแจ้งหนี้"
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {copiedInvoiceNo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร (Print / PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Official A4 Document Sheet ── */}
        <div className="print-work-order bg-white border border-gray-300 rounded-none shadow-2xl p-6 sm:p-10 text-gray-900 print:shadow-none print:border-none print:p-0">
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-gray-800">
            {/* Left: Supplier (Issuer) Info */}
            <div className="space-y-1 max-w-md">
              <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                {supplierInfo.name}
              </h1>
              <div className="text-xs text-gray-600 space-y-0.5">
                <p>
                  <span className="font-semibold text-gray-700">ผู้ให้บริการและคู่ค้าอย่างเป็นทางการ</span>
                  {supplierInfo.d365VendorCode && (
                    <span className="ml-1.5 font-mono text-[11px] font-bold text-gray-800">
                      (D365 Vendor: {supplierInfo.d365VendorCode})
                    </span>
                  )}
                </p>
                {supplierInfo.showroomLabel && (
                  <p>สาขา / พื้นที่บริการประจำ: <span className="font-medium text-gray-800">{supplierInfo.showroomLabel}</span></p>
                )}
                {supplierInfo.address && <p>ที่อยู่: {supplierInfo.address}</p>}
                <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-600">
                  {supplierInfo.taxId && <span>เลขประจำตัวผู้เสียภาษี: <strong className="font-mono text-gray-800">{supplierInfo.taxId}</strong></span>}
                  {supplierInfo.phone && <span>โทร: {supplierInfo.phone}</span>}
                  {supplierInfo.email && <span>อีเมล: {supplierInfo.email}</span>}
                </div>
                <p className="text-[11px] text-gray-500">
                  สถานะภาษี: {supplierInfo.vatType === 'VAT_7' ? 'จดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%)' : 'ได้รับการยกเว้นภาษีมูลค่าเพิ่ม (บุคคลธรรมดา/ไม่มี VAT)'}
                </p>
              </div>
            </div>

            {/* Right: Document Identity & Meta Box */}
            <div className="w-full sm:w-auto text-left sm:text-right shrink-0">
              <div className="mb-2">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
                  ใบวางบิล / ใบแจ้งหนี้
                </h2>
                <p className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase mt-0.5">
                  BILLING NOTE / INVOICE
                </p>
                <p className="text-[11px] font-bold text-gray-700 mt-1">
                  [ ต้นฉบับ / ORIGINAL ]
                </p>
              </div>

              {/* Document Meta Table */}
              <table className="border border-gray-400 text-xs border-collapse inline-table text-left w-full sm:w-[320px] bg-white">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="py-1.5 px-3 font-semibold text-gray-700 bg-gray-50/80 border-r border-gray-300 w-28 whitespace-nowrap">
                      เลขที่เอกสาร:
                    </td>
                    <td className="py-1.5 px-3 font-mono font-black text-gray-900 text-right whitespace-nowrap text-xs sm:text-sm">
                      {invoice.invoiceNumber}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="py-1.5 px-3 font-semibold text-gray-700 bg-gray-50/80 border-r border-gray-300 whitespace-nowrap">
                      วันที่:
                    </td>
                    <td className="py-1.5 px-3 font-medium text-gray-800 text-right whitespace-nowrap">
                      {formatFullThaiDate(invoice.invoiceDate)}
                    </td>
                  </tr>
                  <tr className={poNumbers.length > 0 ? 'border-b border-gray-300' : ''}>
                    <td className="py-1.5 px-3 font-semibold text-gray-700 bg-gray-50/80 border-r border-gray-300 whitespace-nowrap">
                      ครบกำหนดชำระ:
                    </td>
                    <td className="py-1.5 px-3 font-medium text-gray-800 text-right whitespace-nowrap">
                      {formatFullThaiDate(invoice.dueDate)}
                    </td>
                  </tr>
                  {poNumbers.length > 0 && (
                    <tr className="bg-emerald-50/30">
                      <td className="py-1.5 px-3 font-semibold text-emerald-900 border-r border-gray-300 whitespace-nowrap">
                        เลขที่ D365 PO:
                      </td>
                      <td className="py-1.5 px-3 font-mono font-bold text-gray-900 text-right whitespace-nowrap">
                        {poNumbers.join(', ')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer / Ordering & Paying Branch (Bill-To) Information Box */}
          <div className="border border-gray-400 bg-gray-50/60 p-3.5 my-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                  ลูกค้า / สาขาผู้ว่าจ้างและทำเรื่องเบิกจ่าย (CUSTOMER / ORDERING & PAYING BRANCH):
                </p>
                <p className="font-bold text-gray-900 text-sm">
                  {orderingBranchName}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium text-gray-600">รหัสสาขา: </span>
                  <span className="font-mono font-bold text-gray-900">{orderingBranchCode || '-'}</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="font-medium text-gray-600">เลขประจำตัวผู้เสียภาษีอากร: </span>
                  <span className="font-mono font-bold text-gray-900">{companyInfo.taxId}</span>
                  <span className="ml-1 text-gray-500">(สาขา {orderingBranchCode || orderingBranchName})</span>
                </p>
                {orderingBranchAddress && (
                  <p className="text-gray-600 leading-normal">
                    <span className="font-medium text-gray-600">ที่อยู่สาขา: </span>
                    {orderingBranchAddress}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 text-gray-600 pt-0.5">
                  {orderingRequester && (
                    <p>
                      <span className="font-medium text-gray-600">ผู้สั่งงาน / ผู้ประสานงาน: </span>
                      <strong className="text-gray-800">{orderingRequester}</strong>
                      {orderingRequesterPosition && <span className="text-gray-500 ml-1">({orderingRequesterPosition})</span>}
                    </p>
                  )}
                  {orderingBranchPhone && (
                    <p>
                      <span className="font-medium text-gray-600">โทร: </span>
                      <strong className="text-gray-800">{orderingBranchPhone}</strong>
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 pt-0.5">
                  สังกัดเครือ: {companyInfo.name} ({invoice.companyCode})
                </p>
              </div>

              <div className="shrink-0 self-start sm:self-center border border-gray-400 px-3 py-1.5 bg-white text-center">
                <span className="block text-[10px] text-gray-500 font-semibold uppercase">สาขาผู้สั่งงาน</span>
                <span className="font-mono font-black text-sm text-emerald-800">{orderingBranchCode || invoice.companyCode}</span>
                <span className="block text-[9px] text-gray-400 uppercase font-mono">{invoice.companyCode}</span>
              </div>
            </div>
          </div>

          {/* ── Table 1: สรุปรายการวางบิล (Job Summary Table) ── */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                1. สรุปรายการงานที่วางบิล (Billed Jobs Summary)
              </h3>
              <span className="text-[11px] text-gray-500 font-medium">
                จำนวน {invoiceJobs.length} ใบงานสั่งการ
              </span>
            </div>

            <table className="w-full border-collapse border border-gray-400 text-xs">
              <thead>
                <tr className="bg-gray-100 font-bold text-gray-800 border-b border-gray-400">
                  <th className="py-2 px-2 text-center w-10 border-r border-gray-300">ลำดับ</th>
                  <th className="py-2 px-2 text-left w-44 border-r border-gray-300">เลขที่ใบสั่งงาน / PO</th>
                  <th className="py-2 px-2 text-left border-r border-gray-300">รายการและขอบเขตงาน</th>
                  <th className="py-2 px-2 text-left w-36 border-r border-gray-300">สาขาที่ตรวจรับ</th>
                  <th className="py-2 px-2 text-center w-16 border-r border-gray-300">จำนวนคัน</th>
                  <th className="py-2 px-2 text-right w-28">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {invoiceJobs.map((j, i) => {
                  const carCount = j.carWashItems?.filter(item => item.status !== 'CANCELLED').length || 1;
                  const cost = getJobTotalCost(j);
                  const serviceDesc =
                    j.jobType === 'CAR_WASH'
                      ? 'งานบริการล้างและทำความสะอาดรถยนต์'
                      : 'งานบริการรถสไลด์ขนย้ายยานพาหนะ';

                  return (
                    <tr key={j.id} className="hover:bg-gray-50/50">
                      <td className="py-2 px-2 text-center text-gray-600 border-r border-gray-300">{i + 1}</td>
                      <td className="py-2 px-2 border-r border-gray-300">
                        <span className="font-mono font-bold text-gray-900 block">{j.jobNumber}</span>
                        {j.d365PoNumber ? (
                          <span className="font-mono text-[10px] text-emerald-800 font-semibold block">
                            PO: {j.d365PoNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2 border-r border-gray-300 text-gray-800">
                        <p className="font-semibold">{serviceDesc}</p>
                        <p className="text-[11px] text-gray-500 font-mono">
                          วันที่สั่งงาน: {formatThaiDate(j.createdAt)}
                        </p>
                      </td>
                      <td className="py-2 px-2 border-r border-gray-300 text-gray-700">{j.branchName}</td>
                      <td className="py-2 px-2 text-center font-medium text-gray-800 border-r border-gray-300">
                        {carCount}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-gray-900">
                        {formatMoney(cost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Table 2: รายการยานพาหนะแนบใบวางบิล (Vehicle Detail Schedule Attached) ── */}
          {vehicleItems.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  2. รายละเอียดรถยนต์แนบใบวางบิล (Vehicle Service Schedule Attached)
                </h3>
                <span className="text-[11px] text-gray-500 font-medium">
                  ผ่านการตรวจรับจริง {activeVehicleItems.length} คัน
                </span>
              </div>

              <div className="w-full">
                <table className="w-full border-collapse border border-gray-400 text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 font-bold text-gray-800 border-b border-gray-400">
                      <th className="py-1.5 px-1.5 text-center w-8 border-r border-gray-300">ลำดับ</th>
                      <th className="py-1.5 px-2 text-left w-36 border-r border-gray-300">เลขตัวถัง (VIN)</th>
                      <th className="py-1.5 px-2 text-center w-24 border-r border-gray-300">ทะเบียนรถ</th>
                      <th className="py-1.5 px-2 text-left border-r border-gray-300">ยี่ห้อ / รุ่น / สี</th>
                      <th className="py-1.5 px-2 text-left w-32 border-r border-gray-300">เลขที่ใบสั่งงาน</th>
                      <th className="py-1.5 px-2 text-left w-24 border-r border-gray-300">ประเภทบริการ</th>
                      <th className="py-1.5 px-2 text-center w-20 border-r border-gray-300">วันที่บริการ</th>
                      <th className="py-1.5 px-2 text-right w-24">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {vehicleItems.map((v, idx) => {
                      const isCancelled = v.status === 'CANCELLED';
                      return (
                        <tr key={`${v.vin}-${v.jobNumber}-${idx}`} className={isCancelled ? 'bg-red-50/20 text-gray-400' : ''}>
                          <td className="py-1.5 px-1.5 text-center text-gray-500 border-r border-gray-300">{idx + 1}</td>
                          <td className="py-1.5 px-2 font-mono font-bold text-gray-900 border-r border-gray-300">
                            {v.vin}
                          </td>
                          <td className="py-1.5 px-2 text-center font-medium text-gray-800 border-r border-gray-300">
                            {v.licensePlate || '-'}
                          </td>
                          <td className="py-1.5 px-2 text-gray-800 border-r border-gray-300">
                            <span>{v.model}</span>
                            {v.color !== '-' && <span className="text-gray-500 ml-1">({v.color})</span>}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-gray-700 border-r border-gray-300">
                            <div>{v.jobNumber}</div>
                            {v.poNumber && <div className="text-[10px] text-emerald-800 font-semibold">PO: {v.poNumber}</div>}
                          </td>
                          <td className="py-1.5 px-2 text-gray-800 border-r border-gray-300">
                            {v.serviceType}
                          </td>
                          <td className="py-1.5 px-2 text-center text-gray-600 border-r border-gray-300">
                            {formatThaiDate(v.serviceDate)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-gray-900">
                            {isCancelled ? '0.00' : formatMoney(v.unitPrice)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-400 bg-gray-50/80 font-bold">
                      <td colSpan={7} className="py-1.5 px-2 text-right text-gray-700 border-r border-gray-300">
                        ยอดรวมรายการรถยนต์ ({activeVehicleItems.length} คัน):
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-gray-900">
                        {formatMoney(vehicleTotalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Financial Summary & Thai Baht Text Block ── */}
          <div className="grid grid-cols-12 border border-gray-400 mt-4 text-xs print-avoid-break">
            {/* Left Column: Thai Baht Text & Banking Details */}
            <div className="col-span-12 sm:col-span-7 p-3.5 border-b sm:border-b-0 sm:border-r border-gray-400 flex flex-col justify-between gap-3 bg-gray-50/30">
              <div>
                <p className="text-[11px] font-bold text-gray-700">จำนวนเงินเป็นตัวอักษร (Amount in Words):</p>
                <div className="text-xs sm:text-sm font-bold text-gray-900 mt-1 px-3 py-1.5 bg-white border border-gray-300">
                  ( {thaiBahtText(invoice.totalAmount)} )
                </div>
              </div>

              <div className="text-[11px] border-t border-gray-300 pt-2.5 text-gray-700">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-gray-600" />
                    <span>ข้อมูลการชำระเงิน (Payment Information):</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyBankAccount}
                    className="no-print text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                    title="คัดลอกเลขบัญชี"
                  >
                    {copiedBank ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBank ? 'คัดลอกแล้ว' : 'คัดลอกเลขบัญชี'}</span>
                  </button>
                </div>
                <div className="mt-1 space-y-0.5">
                  <p>ธนาคาร: <strong className="text-gray-900">{supplierInfo.bankName}</strong></p>
                  <p>ชื่อบัญชี: <strong className="text-gray-900">{supplierInfo.name}</strong></p>
                  <p>เลขที่บัญชี: <strong className="font-mono text-gray-900 text-xs">{supplierInfo.bankAccount}</strong></p>
                  <p className="text-gray-500 text-[10px]">ชำระโดยการโอนเงินเข้าบัญชี (Direct Bank Transfer / Cheque)</p>
                </div>
              </div>
            </div>

            {/* Right Column: Financial Calculation */}
            <div className="col-span-12 sm:col-span-5 p-3.5 flex flex-col justify-between text-xs bg-white space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-medium">รวมเป็นเงิน (Subtotal):</span>
                  <span className="font-mono font-bold text-gray-900">
                    {formatMoney(invoice.subtotal)} ฿
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-medium">
                    ภาษีมูลค่าเพิ่ม {invoice.vatAmount > 0 ? '7% (VAT):' : '(VAT):'}
                  </span>
                  <span className="font-mono font-bold text-gray-900">
                    {invoice.vatAmount > 0 ? `${formatMoney(invoice.vatAmount)} ฿` : '0.00 ฿ (ยกเว้น)'}
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t-2 border-gray-800 flex justify-between items-baseline">
                <span className="font-bold text-gray-900 text-sm">
                  จำนวนเงินรวมทั้งสิ้น:
                </span>
                <div className="text-right">
                  <span className="font-mono font-black text-base text-gray-900 underline decoration-double underline-offset-4">
                    {formatMoney(invoice.totalAmount)} ฿
                  </span>
                  <p className="text-[10px] text-gray-500 font-medium">(Grand Total THB)</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Signature & Acceptance Section ── */}
          <div className="grid grid-cols-2 gap-4 sm:gap-8 mt-5 pt-3 border-t border-gray-300 text-xs print-avoid-break">
            {/* Customer (Ordering Branch) Box */}
            <div className="border border-gray-400 p-3.5 flex flex-col justify-between h-40 text-center bg-gray-50/30">
              <div>
                <p className="font-bold text-gray-900 text-xs">ผู้รับวางบิล / ผู้ตรวจสอบความถูกต้อง (สาขาผู้สั่งงาน)</p>
                <p className="text-[10px] text-gray-500">
                  (Received & Verified By Ordering Branch: {orderingBranchCode || orderingBranchName})
                </p>
                <p className="text-[10px] text-gray-600 mt-1 italic leading-tight">
                  ได้รับเอกสารใบวางบิลและตรวจสอบความถูกต้องของงานสาขาเรียบร้อยแล้ว
                </p>
              </div>

              <div className="space-y-1">
                <div className="w-4/5 mx-auto border-b border-gray-400 h-6"></div>
                <p className="text-[10px] text-gray-800 font-medium">
                  ( {orderingRequester ? orderingRequester : '................................................................'} )
                </p>
                <p className="text-[10px] text-gray-500">
                  ตำแหน่ง: {orderingRequesterPosition ? orderingRequesterPosition : 'ผู้มีอำนาจตรวจสอบประจำสาขา'}
                </p>
                <p className="text-[10px] text-gray-500">วันที่: .......... / .......... / ................</p>
              </div>
            </div>

            {/* Supplier Box */}
            <div className="border border-gray-400 p-3.5 flex flex-col justify-between h-40 text-center bg-gray-50/30">
              <div>
                <p className="font-bold text-gray-900 text-xs">ผู้วางบิล / ผู้มีอำนาจลงนาม</p>
                <p className="text-[10px] text-gray-500">(Billed By / Authorized Signature)</p>
                <p className="text-[10px] text-gray-600 mt-1 italic leading-tight">
                  ขอรับรองว่ารายการและยอดเงินดังกล่าวถูกต้องตรงตามความเป็นจริง
                </p>
              </div>

              <div className="space-y-1">
                <div className="w-4/5 mx-auto border-b border-gray-400 h-6"></div>
                <p className="text-[10px] text-gray-600">( ................................................................ )</p>
                <p className="text-[10px] text-gray-500">วันที่: .......... / .......... / ................</p>
              </div>
            </div>
          </div>

          {/* ── Document Footer ── */}
          <div className="mt-4 pt-2 border-t border-gray-300 flex justify-between items-center text-[10px] text-gray-400 print-avoid-break">
            <span>เอกสารนี้ออกโดยระบบบริหารงานคู่ค้า VendorOps Supplier Portal</span>
            <span className="font-mono font-medium text-gray-500">
              เลขที่อ้างอิง: {invoice.invoiceNumber} • หน้า 1/1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
