'use client';

import React from 'react';
import { ChevronRight, Sparkles, Truck } from 'lucide-react';
import {
  CompanyFilter,
  ReportTab,
  SlideAnalytics,
  WashAnalytics,
} from '../_lib/report-calculations';
import { OverviewReportData, ReportContextInfo } from '../_hooks/useReportData';

interface OverviewTabProps {
  context: ReportContextInfo;
  companyFilter: CompanyFilter;
  overview: OverviewReportData;
  washAnalytics: WashAnalytics;
  slideAnalytics: SlideAnalytics;
  onSelectTab: (tab: ReportTab) => void;
}

export default function OverviewTab({
  context,
  companyFilter,
  overview,
  washAnalytics,
  slideAnalytics,
  onSelectTab,
}: OverviewTabProps) {
  const { currentRole, activeBranch } = context;
  const { expense, branchSplit, supplierOverviewStats } = overview;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      {/* Hero Banner: Total Expense */}
      <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-[#0f5238] to-[#1a7a56] text-white shadow-md">
        <span className="text-xs font-medium text-emerald-200 uppercase tracking-wider">
          {currentRole === 'BRANCH'
            ? `ค่าบริการตรวจรับแล้วทั้งหมด (${activeBranch?.name || 'สาขาของคุณ'})`
            : `ค่าบริการตรวจรับแล้วทั้งหมด (${companyFilter === 'ALL' ? 'ทุกบริษัท' : companyFilter})`}
        </span>
        <div className="text-3xl md:text-5xl font-bold mt-1.5 tracking-tight font-mono">
          ฿{expense.totalExpense.toLocaleString()}
        </div>
        <p className="text-xs text-emerald-100/70 mt-1">
          {currentRole === 'BRANCH'
            ? `คำนวณจากงานสถานะ Approved และ Invoiced ทั้งหมดของสาขา ${activeBranch?.name || ''}`
            : 'คำนวณจากงานสถานะ Approved และ Invoiced ทั้งหมดในระบบ'}
        </p>

        {/* Split bar: For BRANCH -> Wash vs Slide; For ADMIN/MASTER -> EV7 vs GI */}
        {currentRole === 'BRANCH' ? (
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden flex">
                {branchSplit.branchWashPct > 0 && (
                  <div
                    className="h-full bg-amber-400 rounded-l-full transition-all"
                    style={{ width: `${branchSplit.branchWashPct}%` }}
                  />
                )}
                {branchSplit.branchSlidePct > 0 && (
                  <div
                    className="h-full bg-sky-400 rounded-r-full transition-all"
                    style={{ width: `${branchSplit.branchSlidePct}%` }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-white/80">
                  ล้างรถ ({washAnalytics.approvedWashJobs.length} ใบ)
                </span>
                <span className="font-bold">
                  ฿{washAnalytics.washTotalExpense.toLocaleString()}
                </span>
                <span className="text-amber-200/80 font-mono">({branchSplit.branchWashPct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-white/80">
                  รถสไลด์ ({slideAnalytics.approvedSlideJobs.length} เที่ยว)
                </span>
                <span className="font-bold">
                  ฿{slideAnalytics.slideTotalExpense.toLocaleString()}
                </span>
                <span className="text-sky-200/80 font-mono">({branchSplit.branchSlidePct}%)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden flex">
                {expense.ev7Pct > 0 && (
                  <div
                    className="h-full bg-emerald-300 rounded-l-full transition-all"
                    style={{ width: `${expense.ev7Pct}%` }}
                  />
                )}
                {expense.giPct > 0 && (
                  <div
                    className="h-full bg-sky-300 rounded-r-full transition-all"
                    style={{ width: `${expense.giPct}%` }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
                <span className="text-white/80">EV7</span>
                <span className="font-bold">฿{expense.ev7Expense.toLocaleString()}</span>
                <span className="text-emerald-200/60 font-mono">({expense.ev7Pct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-300" />
                <span className="text-white/80">GI</span>
                <span className="font-bold">฿{expense.giExpense.toLocaleString()}</span>
                <span className="text-sky-200/60 font-mono">({expense.giPct}%)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick-Switch Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Car Wash Quick Card */}
        <div
          onClick={() => onSelectTab('wash')}
          className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-amber-800 transition-colors">
                    งานล้างรถ (Car Wash)
                  </h3>
                  <p className="text-[11px] text-gray-400">สรุปงานล้างรถและคาร์แคร์</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                <span>ดูรายงาน</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
              <div>
                <p className="text-[10px] text-gray-400 font-medium">ใบสั่งงาน</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {washAnalytics.washJobs.length} ใบ
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">รถที่ส่งล้าง</p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">
                  {washAnalytics.totalCarsWashed} คัน
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">ยอดเงินรวม</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5 font-mono">
                  ฿{washAnalytics.washTotalExpense.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Slide Quick Card */}
        <div
          onClick={() => onSelectTab('slide')}
          className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/70 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Truck className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-sky-800 transition-colors">
                    งานรถสไลด์ (Vehicle Slide)
                  </h3>
                  <p className="text-[11px] text-gray-400">สรุปการขนส่งและย้ายรถ</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 group-hover:translate-x-0.5 transition-transform">
                <span>ดูรายงาน</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
              <div>
                <p className="text-[10px] text-gray-400 font-medium">จำนวนเที่ยว</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {slideAnalytics.slideJobs.length} เที่ยว
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">รถที่ขนย้าย</p>
                <p className="text-lg font-bold text-sky-700 mt-0.5">
                  {slideAnalytics.totalSlideCars} คัน
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">ยอดเงินรวม</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5 font-mono">
                  ฿{slideAnalytics.slideTotalExpense.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Performance Table */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">ผลงาน Supplier ทุกบริการ</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              สรุปผลงานและการเบิกจ่ายยอดเงินตาม Supplier ทั้งหมดในระบบ
            </p>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {supplierOverviewStats.length} ราย
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                <th className="py-3 px-5">ชื่อ Supplier</th>
                <th className="py-3 px-4">บริการ</th>
                <th className="py-3 px-4 text-center">งานทั้งหมด</th>
                <th className="py-3 px-4 text-center">Approved</th>
                <th className="py-3 px-4 text-center">ขอแก้ไข</th>
                <th className="py-3 px-5 text-right">ยอดรวมค่าบริการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {supplierOverviewStats.map(
                ({ supplier, jobsCount, approvedCount, rejectedCount, totalCost }) => (
                  <tr key={supplier.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-gray-900">{supplier.name}</td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-medium">
                        {Array.isArray(supplier.services)
                          ? supplier.services.join(', ')
                          : supplier.services}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-800">
                      {jobsCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {approvedCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {approvedCount}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-red-600">
                      {rejectedCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                          {rejectedCount}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono">
                      ฿{totalCost.toLocaleString()}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
