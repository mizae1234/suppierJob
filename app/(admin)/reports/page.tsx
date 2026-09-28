'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { 
  BarChart3, 
  FileDown, 
  Sparkles, 
  Truck, 
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';

export default function ReportsPage() {
  const { jobs, suppliers } = useApp();

  // Stats calculation
  const totalExpense = jobs
    .filter(j => j.status === 'APPROVED' || j.status === 'INVOICED')
    .reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

  const ev7Expense = jobs
    .filter(j => (j.status === 'APPROVED' || j.status === 'INVOICED') && j.companyCode === 'EV7')
    .reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

  const giExpense = jobs
    .filter(j => (j.status === 'APPROVED' || j.status === 'INVOICED') && j.companyCode === 'GI')
    .reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

  const washJobs = jobs.filter(j => j.jobType === 'CAR_WASH');
  const slideJobs = jobs.filter(j => j.jobType === 'VEHICLE_SLIDE');
  const totalCarsWashed = washJobs.reduce((sum, j) => sum + (j.carWashItems?.length || 0), 0);

  const ev7Pct = totalExpense > 0 ? Math.round((ev7Expense / totalExpense) * 100) : 0;
  const giPct = totalExpense > 0 ? Math.round((giExpense / totalExpense) * 100) : 0;

  // Export to CSV helper (Sanitized against Formula Injection & UTF-8 BOM for Thai Excel)
  const handleExportCSV = () => {
    const sanitizeCell = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Neutralize spreadsheet formula triggers (=, +, -, @)
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['JobNumber', 'JobType', 'Company', 'Branch', 'Supplier', 'Status', 'Cost', 'CreatedAt'];
    const rows = jobs.map(j => [
      sanitizeCell(j.jobNumber),
      sanitizeCell(j.jobType),
      sanitizeCell(j.companyCode),
      sanitizeCell(j.branchName),
      sanitizeCell(j.supplierName),
      sanitizeCell(j.status),
      sanitizeCell(j.actualCost || j.estimatedCost || 0),
      sanitizeCell(j.createdAt),
    ]);

    // Prepend UTF-8 BOM (\uFEFF) for correct Thai encoding in Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Supplier_Jobs_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 shrink-0" />
            <span className="truncate">รายงานสรุป</span>
          </h1>
          <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">
            ภาพรวมค่าใช้จ่ายและปริมาณงานจำแนกตามบริษัท สาขา และ Supplier
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white text-[11px] font-bold shadow-xs transition-colors shrink-0"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ส่งออก CSV</span>
          <span className="sm:hidden">CSV</span>
        </button>
      </div>

      {/* Total Expense — hero card */}
      <div className="p-4 md:p-6 rounded-2xl bg-gradient-to-br from-[#0f5238] to-[#1a7a56] text-white shadow-lg">
        <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider">
          ค่าบริการตรวจรับแล้วทั้งหมด
        </span>
        <div className="text-3xl md:text-4xl font-bold mt-1">
          ฿{totalExpense.toLocaleString()}
        </div>
        <p className="text-[11px] text-white/60 mt-1">
          งาน Approved + Invoiced ทั้งสิ้น
        </p>

        {/* EV7 vs GI bar */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden flex">
            {ev7Pct > 0 && <div className="h-full bg-emerald-300 rounded-l-full" style={{ width: `${ev7Pct}%` }} />}
            {giPct > 0 && <div className="h-full bg-blue-300 rounded-r-full" style={{ width: `${giPct}%` }} />}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-300" />
            <span className="text-white/80">EV7</span>
            <span className="font-bold">฿{ev7Expense.toLocaleString()}</span>
            <span className="text-white/50">({ev7Pct}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-300" />
            <span className="text-white/80">GI</span>
            <span className="font-bold">฿{giExpense.toLocaleString()}</span>
            <span className="text-white/50">({giPct}%)</span>
          </div>
        </div>
      </div>

      {/* Job Volume Cards — 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        {/* Car Wash */}
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-gray-900">ล้างรถ</span>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-gray-400">ใบสั่งงาน</p>
              <p className="text-xl font-bold text-gray-900">{washJobs.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">รถที่ล้าง</p>
              <p className="text-xl font-bold text-emerald-700">{totalCarsWashed} <span className="text-xs font-medium text-gray-400">คัน</span></p>
            </div>
          </div>
        </div>

        {/* Slide */}
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-gray-900">สไลด์</span>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-gray-400">ใบขอสไลด์</p>
              <p className="text-xl font-bold text-gray-900">{slideJobs.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">ส่งตรงเวลา</p>
              <p className="text-xl font-bold text-blue-700">98.5<span className="text-xs font-medium text-gray-400">%</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Performance — Card list for mobile, table for desktop */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">ผลงาน Supplier</h3>
          <span className="text-[10px] text-gray-400 font-medium">{suppliers.length} ราย</span>
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">ชื่อ Supplier</th>
                <th className="py-2.5 px-4">บริการ</th>
                <th className="py-2.5 px-4 text-center">งานทั้งหมด</th>
                <th className="py-2.5 px-4 text-center">Approved</th>
                <th className="py-2.5 px-4 text-center">ขอแก้ไข</th>
                <th className="py-2.5 px-4 text-right">ยอดรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map(sup => {
                const sJobs = jobs.filter(j => j.supplierId === sup.id);
                const sApproved = sJobs.filter(j => j.status === 'APPROVED' || j.status === 'INVOICED');
                const sRejected = sJobs.filter(j => j.status === 'REJECTED');
                const sCost = sApproved.reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

                return (
                  <tr key={sup.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">{sup.name}</td>
                    <td className="py-3 px-4 text-gray-600">{sup.services.join(', ')}</td>
                    <td className="py-3 px-4 text-center font-medium">{sJobs.length}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-800">{sApproved.length}</td>
                    <td className="py-3 px-4 text-center font-bold text-red-600">{sRejected.length}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      ฿{sCost.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: Card list */}
        <div className="md:hidden divide-y divide-gray-100">
          {suppliers.map(sup => {
            const sJobs = jobs.filter(j => j.supplierId === sup.id);
            const sApproved = sJobs.filter(j => j.status === 'APPROVED' || j.status === 'INVOICED');
            const sRejected = sJobs.filter(j => j.status === 'REJECTED');
            const sCost = sApproved.reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

            return (
              <div key={sup.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-900 truncate flex-1">{sup.name}</span>
                  <span className="text-xs font-bold text-gray-900 ml-2">฿{sCost.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-gray-500">งาน <span className="font-semibold text-gray-700">{sJobs.length}</span></span>
                  <span className="flex items-center gap-0.5 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="font-semibold">{sApproved.length}</span>
                  </span>
                  {sRejected.length > 0 && (
                    <span className="flex items-center gap-0.5 text-red-500">
                      <XCircle className="w-3 h-3" />
                      <span className="font-semibold">{sRejected.length}</span>
                    </span>
                  )}
                  <span className="text-gray-400 ml-auto">{sup.services.join(', ')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
