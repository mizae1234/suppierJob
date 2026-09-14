'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  BarChart3, 
  FileDown, 
  Sparkles, 
  Truck, 
  Building2, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Receipt,
  PieChart
} from 'lucide-react';

export default function ReportsPage() {
  const { jobs, vehicles, suppliers, branches, invoices } = useApp();

  const [selectedPeriod, setSelectedPeriod] = useState('MONTH');

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

  // Export to CSV helper
  const handleExportCSV = () => {
    const headers = ['JobNumber', 'JobType', 'Company', 'Branch', 'Supplier', 'Status', 'Cost', 'CreatedAt'];
    const rows = jobs.map(j => [
      j.jobNumber,
      j.jobType,
      j.companyCode,
      `"${j.branchName}"`,
      `"${j.supplierName}"`,
      j.status,
      j.actualCost || j.estimatedCost,
      j.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Supplier_Jobs_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>รายงานวิเคราะห์ & สรุปค่าใช้จ่าย (Operational Reports)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            ภาพรวมค่าใช้จ่ายและปริมาณงานจำแนกตามบริษัท EV7 / GI, สาขา และผู้ให้บริการ Supplier
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0f5238] hover:bg-[#0a3d28] text-white text-xs font-bold shadow-xs transition-colors"
        >
          <FileDown className="w-4 h-4" />
          <span>ส่งออกไฟล์รายงาน (CSV)</span>
        </button>
      </div>

      {/* Top Expense KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl bg-white border border-emerald-950/10 shadow-xs flex flex-col justify-between gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            ค่าบริการที่ตรวจรับแล้วทั้งหมด
          </span>
          <div>
            <div className="text-3xl font-bold text-[#0f5238]">
              ฿{totalExpense.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              จากงานที่ Approved และ Invoiced ทั้งสิ้น
            </p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-white to-[#eaf5ee] border border-emerald-950/10 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              ค่าใช้จ่าย EV7
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-white font-bold text-[10px]">
              EV7
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">
              ฿{ev7Expense.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              สัดส่วน {totalExpense > 0 ? Math.round((ev7Expense / totalExpense) * 100) : 0}% ของค่าใช้จ่ายรวม
            </p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-white to-[#eef7ff] border border-blue-900/10 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              ค่าใช้จ่าย GI Fleet
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-700 text-white font-bold text-[10px]">
              GI
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900">
              ฿{giExpense.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              สัดส่วน {totalExpense > 0 ? Math.round((giExpense / totalExpense) * 100) : 0}% ของค่าใช้จ่ายรวม
            </p>
          </div>
        </div>
      </div>

      {/* Volume Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Car Wash Analytics */}
        <div className="p-6 rounded-3xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900">สรุปงานล้างรถ (Car Wash)</h3>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
              {washJobs.length} ใบสั่งงาน
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#f4f9f5]">
              <span className="text-gray-500">จำนวนรถที่ล้างทั้งหมด:</span>
              <p className="text-xl font-bold text-gray-900 mt-1">{totalCarsWashed} คัน</p>
            </div>
            <div className="p-3 rounded-xl bg-[#f4f9f5]">
              <span className="text-gray-500">อัตราตรวจรับผ่าน:</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">94.2%</p>
            </div>
          </div>
        </div>

        {/* Slide Analytics */}
        <div className="p-6 rounded-3xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900">สรุปงานรถสไลด์ (Transportation)</h3>
            </div>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full">
              {slideJobs.length} ใบขอสไลด์
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#f4f9f5]">
              <span className="text-gray-500">ระยะทางขนส่งสะสม:</span>
              <p className="text-xl font-bold text-gray-900 mt-1">1,480 กม.</p>
            </div>
            <div className="p-3 rounded-xl bg-[#f4f9f5]">
              <span className="text-gray-500">ตรงเวลาส่งมอบ:</span>
              <p className="text-xl font-bold text-blue-800 mt-1">98.5%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Performance Table */}
      <div className="p-6 rounded-3xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
        <h3 className="text-base font-bold text-gray-900">ผลงานคู่ค้า Supplier แยกรายบริษัท</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">ชื่อ Supplier</th>
                <th className="py-2.5 px-3">บริการ</th>
                <th className="py-2.5 px-3 text-center">งานทั้งหมด</th>
                <th className="py-2.5 px-3 text-center">Approved</th>
                <th className="py-2.5 px-3 text-center">ขอแก้ไข</th>
                <th className="py-2.5 px-3 text-right">ยอดรวมค่าบริการ</th>
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
                    <td className="py-3 px-3 font-bold text-gray-900">{sup.name}</td>
                    <td className="py-3 px-3 text-gray-600">{sup.services.join(', ')}</td>
                    <td className="py-3 px-3 text-center font-medium">{sJobs.length}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-800">{sApproved.length}</td>
                    <td className="py-3 px-3 text-center font-bold text-red-600">{sRejected.length}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">
                      ฿{sCost.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
