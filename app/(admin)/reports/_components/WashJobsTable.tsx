'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, Search, Sparkles, XCircle } from 'lucide-react';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { Job, JobStatus } from '@/types';
import {
  SupplierWashStat,
  buildWashItemServiceCounts,
  cleanBranchName,
  getStatusMeta,
} from '../_lib/report-calculations';
import { ReportContextInfo, WashFiltersState } from '../_hooks/useReportData';

interface WashJobsTableProps {
  context: ReportContextInfo;
  jobs: Job[];
  supplierStats: SupplierWashStat[];
  filters: WashFiltersState;
}

export default function WashJobsTable({
  context,
  jobs,
  supplierStats,
  filters,
}: WashJobsTableProps) {
  const { currentRole, activeBranch } = context;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-xs">
      {/* ── Card Header (Title & Subtitle) ── */}
      <div className="p-5 border-b border-gray-100 rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-amber-50/40 via-white to-white">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                {currentRole === 'BRANCH'
                  ? 'รายงานการล้างรถทั้งหมดของสาขา'
                  : 'รายงานการล้างรถทั้งหมด (Car Wash Report)'}
              </h3>
              {currentRole === 'BRANCH' && activeBranch && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-bold whitespace-nowrap">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{activeBranch.name}</span>
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-xs font-bold whitespace-nowrap">
                รวม {jobs.length} ใบงาน
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {currentRole === 'BRANCH'
                ? 'รายการใบสั่งล้างรถทั้งหมดของสาขา พร้อมรายละเอียดรถ แพ็กเกจที่ล้าง และค่าบริการ'
                : 'ประวัติและรายการใบสั่งล้างรถทั้งหมดในระบบ พร้อมรายละเอียดรถ แพ็กเกจที่ล้าง และค่าบริการ'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="p-3 bg-gray-50/70 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Supplier Filter Dropdown (if multiple suppliers) */}
        <div className="flex items-center gap-2 flex-wrap">
          {supplierStats.length > 1 ? (
            <div className="w-56 sm:w-64">
              <CustomDropdown
                value={filters.supplierFilter}
                onChange={val => filters.setSupplierFilter(val)}
                options={filters.supplierOptions}
                dropdownWidth="w-64"
                buttonClassName="!h-9 !py-1.5 !px-3 !rounded-xl !bg-white text-xs font-semibold"
              />
            </div>
          ) : supplierStats.length === 1 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-xs font-semibold text-amber-900 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Supplier: {supplierStats[0].supplierName}</span>
            </div>
          ) : null}
        </div>

        {/* Right: Status Dropdown & Search Input */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-44 sm:w-48">
            <CustomDropdown
              value={filters.statusFilter}
              onChange={val => filters.setStatusFilter(val as 'ALL' | JobStatus)}
              options={filters.statusOptions}
              dropdownWidth="w-48"
              align="right"
              buttonClassName="!h-9 !py-1.5 !px-3 !rounded-xl !bg-white text-xs font-semibold"
            />
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={e => filters.setSearchQuery(e.target.value)}
              placeholder="ค้นหาใบงาน, ทะเบียน, VIN, รุ่นรถ..."
              className="w-full h-9 pl-9 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-all"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => filters.setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-b-2xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 font-bold text-[11px] uppercase tracking-wider">
              <th className="py-3.5 px-4 whitespace-nowrap">เลขที่ใบงาน / วันที่</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Supplier ผู้ให้บริการ</th>
              <th className="py-3.5 px-4 whitespace-nowrap">จำนวนรถ & รายการรถ</th>
              <th className="py-3.5 px-4 whitespace-nowrap">รายการบริการ (Services)</th>
              <th className="py-3.5 px-4 text-right whitespace-nowrap">ยอดรวมค่าล้าง</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">สถานะ</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map(j => {
              const st = getStatusMeta(j.status);
              const items = j.carWashItems || [];
              const serviceCounts = buildWashItemServiceCounts(items);

              return (
                <tr key={j.id} className="hover:bg-gray-50/80 transition-colors">
                  {/* Job Number & Date */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-gray-900 text-xs tracking-tight whitespace-nowrap">
                          {j.jobNumber}
                        </span>
                        {j.companyCode && (
                          <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded-md bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                            {j.companyCode}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                        {formatThaiDate(j.createdAt)}
                      </span>
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="py-4 px-4 min-w-[170px]">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 text-xs leading-snug">
                          {j.supplierName || 'ไม่ระบุ Supplier'}
                        </span>
                        {currentRole !== 'BRANCH' && j.branchName && (
                          <span className="text-[10px] text-gray-400">
                            สาขา: {cleanBranchName(j.branchName)}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cars & Details */}
                  <td className="py-4 px-4 min-w-[200px]">
                    {items.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold whitespace-nowrap">
                            {items.length} คัน
                          </span>
                          <span
                            className="text-xs font-semibold text-gray-900 truncate max-w-[140px]"
                            title={items[0]?.vehicleModel || 'รถยนต์'}
                          >
                            {items[0]?.vehicleModel || 'รถยนต์'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          {items[0]?.licensePlate ? (
                            <span className="font-medium text-gray-700">
                              ทะเบียน: {items[0].licensePlate}
                            </span>
                          ) : items[0]?.vin ? (
                            <span className="font-mono text-gray-400">
                              VIN: ...{items[0].vin.slice(-8)}
                            </span>
                          ) : null}

                          {items.length > 1 && (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50/80 px-1.5 py-0.2 rounded">
                              + อีก {items.length - 1} คัน
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>

                  {/* Services */}
                  <td className="py-4 px-4 min-w-[180px]">
                    {serviceCounts.length === 0 ? (
                      <span className="text-[11px] text-gray-400">ล้างทำความสะอาด</span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {serviceCounts.map(([name, count]) => (
                          <span
                            key={name}
                            className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 text-[10px] font-semibold whitespace-nowrap"
                          >
                            {name} {count > 1 ? `(${count})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Total Cost */}
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <span className="font-bold text-gray-900 font-mono text-sm">
                      ฿{getJobTotalCost(j).toLocaleString()}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.text} shadow-2xs whitespace-nowrap`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0`} />
                      <span>{st.label}</span>
                    </span>
                  </td>

                  {/* Action Link */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <Link
                      href={`/jobs?q=${encodeURIComponent(j.jobNumber)}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-[#0f5238] hover:text-white border border-gray-200 text-gray-700 text-xs font-semibold transition-all shadow-2xs whitespace-nowrap cursor-pointer group"
                    >
                      <span>ดูใบงาน</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">
                      {filters.searchQuery ||
                      filters.statusFilter !== 'ALL' ||
                      filters.supplierFilter !== 'ALL'
                        ? 'ไม่พบข้อมูลใบงานล้างรถตามเงื่อนไขที่ค้นหา'
                        : 'ยังไม่มีประวัติการสั่งล้างรถในระบบ'}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
