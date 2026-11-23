'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { Job, JobStatus } from '@/types';
import { SlideAnalytics, cleanBranchName, getStatusMeta } from '../_lib/report-calculations';
import { ReportContextInfo, SlideFiltersState } from '../_hooks/useReportData';

interface SlideJobsTableProps {
  context: ReportContextInfo;
  jobs: Job[];
  analytics: SlideAnalytics;
  filters: SlideFiltersState;
}

export default function SlideJobsTable({
  context,
  jobs,
  analytics,
  filters,
}: SlideJobsTableProps) {
  const { currentRole, currentBranchId, activeBranch } = context;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-xs">
      {/* ── Card Header (Title & Subtitle) ── */}
      <div className="p-5 border-b border-gray-100 rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-sky-50/40 via-white to-white">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                {currentRole === 'BRANCH'
                  ? 'รายงานการสไลด์รถทั้งหมดของสาขา'
                  : 'รายงานการสไลด์รถทั้งหมด (Vehicle Slide Report)'}
              </h3>
              {currentRole === 'BRANCH' && activeBranch && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-bold whitespace-nowrap">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{activeBranch.name}</span>
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full bg-sky-100/80 text-sky-900 text-xs font-bold whitespace-nowrap">
                รวม {jobs.length} ใบงาน
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {currentRole === 'BRANCH'
                ? 'รายการใบงานขนส่งรถสไลด์ทั้งหมดของสาขา ทั้งเที่ยวส่งรถออกและรับรถเข้า พร้อมสถานะและค่าบริการ'
                : 'ประวัติและรายการใบงานขนส่งรถสไลด์ทั้งหมดในระบบ พร้อมสถานะและค่าบริการ'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="p-3 bg-gray-50/70 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Direction Tabs (for Branch) */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentRole === 'BRANCH' && (
            <div className="flex items-center p-1 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => filters.setDirectionFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                  filters.directionFilter === 'ALL'
                    ? 'bg-sky-600 text-white shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>ทั้งหมด</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    filters.directionFilter === 'ALL'
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {analytics.slideJobs.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => filters.setDirectionFilter('OUTBOUND')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                  filters.directionFilter === 'OUTBOUND'
                    ? 'bg-amber-500 text-white shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>ส่งออก</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    filters.directionFilter === 'OUTBOUND'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {analytics.outboundSlideJobsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => filters.setDirectionFilter('INBOUND')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                  filters.directionFilter === 'INBOUND'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>รับเข้า</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    filters.directionFilter === 'INBOUND'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {analytics.inboundSlideJobsCount}
                </span>
              </button>
            </div>
          )}
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
              placeholder="ค้นหาใบงาน, ทะเบียน, VIN..."
              className="w-full h-9 pl-9 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none shadow-2xs transition-all"
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
              <th className="py-3.5 px-4 whitespace-nowrap">เส้นทางขนส่ง (ต้นทาง ➔ ปลายทาง)</th>
              <th className="py-3.5 px-4 whitespace-nowrap">รถที่ขนย้าย</th>
              <th className="py-3.5 px-4 whitespace-nowrap">Supplier ผู้ให้บริการ</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">ระยะทาง</th>
              <th className="py-3.5 px-4 text-right whitespace-nowrap">ค่าบริการสไลด์</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">สถานะ</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map(j => {
              const st = getStatusMeta(j.status);
              const isOutbound =
                currentRole === 'BRANCH' && currentBranchId && j.pickupBranchId === currentBranchId;
              const isInbound =
                currentRole === 'BRANCH' && currentBranchId && j.destBranchId === currentBranchId;

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

                  {/* Route & Direction */}
                  <td className="py-4 px-4 min-w-[280px]">
                    <div className="flex flex-col gap-1.5">
                      {currentRole === 'BRANCH' && (
                        <div>
                          {isOutbound ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs whitespace-nowrap">
                              <ArrowUpRight className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>ส่งรถออก (Outbound)</span>
                            </span>
                          ) : isInbound ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>รับรถเข้า (Inbound)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                              <span>ทั่วไป</span>
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="flex items-center gap-1 min-w-0 max-w-[150px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span
                            className="font-semibold text-gray-900 truncate"
                            title={j.pickupBranchName || j.branchName}
                          >
                            {cleanBranchName(j.pickupBranchName || j.branchName || 'ต้นทาง')}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <div className="flex items-center gap-1 min-w-0 max-w-[150px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span
                            className="font-bold text-sky-950 truncate"
                            title={j.destBranchName || j.customDestAddress}
                          >
                            {cleanBranchName(j.destBranchName || j.customDestAddress || 'ปลายทาง')}
                          </span>
                        </div>
                      </div>
                      {j.distance ? (
                        <span className="text-[10px] text-gray-400 font-mono">
                          ระยะทาง {j.distance} กม.
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Vehicles */}
                  <td className="py-4 px-4 min-w-[160px]">
                    {j.carWashItems && j.carWashItems.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold whitespace-nowrap">
                            {j.carWashItems.length} คัน
                          </span>
                          <span className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                            {j.carWashItems[0]?.vehicleModel ||
                              j.carWashItems[0]?.licensePlate ||
                              'รถยนต์'}
                          </span>
                        </div>
                        {j.carWashItems.length > 1 ? (
                          <span className="text-[10px] text-gray-500">
                            + อีก {j.carWashItems.length - 1} คัน
                          </span>
                        ) : j.carWashItems[0]?.vin ? (
                          <span className="text-[10px] text-gray-400 font-mono">
                            VIN: ...{j.carWashItems[0].vin.slice(-8)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-100 whitespace-nowrap">
                            1 คัน
                          </span>
                          <span className="text-xs font-semibold text-gray-900 truncate max-w-[130px]">
                            {j.vehicle?.model || 'รถยนต์'}
                          </span>
                        </div>
                        {j.vehicle?.licensePlate && (
                          <span className="text-[10px] text-gray-600 font-medium">
                            ทะเบียน: {j.vehicle.licensePlate}
                          </span>
                        )}
                        {j.vin && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            VIN: ...{j.vin.slice(-8)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Supplier */}
                  <td className="py-4 px-4 min-w-[160px]">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 text-xs leading-snug">
                          {j.supplierName || 'ไม่ระบุ Supplier'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Distance */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    {j.distance ? (
                      <span className="font-mono text-xs font-medium text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/80">
                        {j.distance} กม.
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
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
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                      <Truck className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">
                      {filters.searchQuery ||
                      filters.statusFilter !== 'ALL' ||
                      filters.directionFilter !== 'ALL'
                        ? 'ไม่พบข้อมูลใบงานรถสไลด์ตามเงื่อนไขที่ค้นหา'
                        : 'ยังไม่มีประวัติการสไลด์รถของสาขานี้ในระบบ'}
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
