'use client';

import React from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { getJobStatusBadge, getJobVehicleDisplay, getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { useTheme } from '@/hooks/useTheme';
import { Sparkles, Truck, ArrowRight, Eye, Building2, ChevronRight } from 'lucide-react';

interface RecentJobsTableProps {
  jobs: Job[];
  totalCount: number;
}

export const RecentJobsTable: React.FC<RecentJobsTableProps> = ({
  jobs,
  totalCount,
}) => {
  const theme = useTheme();

  return (
    <div
      className="p-5 sm:p-6 rounded-3xl bg-white border shadow-xs flex flex-col gap-5 transition-colors duration-300"
      style={{ borderColor: theme.borderSoft }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-gray-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>รายการงานสั่งการล่าสุด</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600 font-mono">
              {jobs.length} งานล่าสุด
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ติดตามสถานะและความคืบหน้าระหว่างสาขาและคู่ค้าแบบเรียลไทม์
          </p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-90 shadow-xs cursor-pointer"
          style={{ backgroundColor: `${theme.primary}12`, color: theme.primary }}
        >
          <span>ดูงานทั้งหมด ({totalCount})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="py-3 px-3 min-w-[170px]">รหัสงาน & ประเภท</th>
              <th className="py-3 px-3 min-w-[210px]">บริษัท / สาขา</th>
              <th className="py-3 px-3 min-w-[180px]">Supplier คู่ค้า</th>
              <th className="py-3 px-3 min-w-[200px]">รายละเอียด / VIN</th>
              <th className="py-3 px-3 min-w-[125px]">สถานะ</th>
              <th className="py-3 px-3 min-w-[100px] text-right">ค่าบริการ</th>
              <th className="py-3 px-3 min-w-[70px] text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {jobs.slice(0, 8).map((job) => {
              const statusMeta = getJobStatusBadge(job.status);
              const vehicleInfo = getJobVehicleDisplay(job);
              const cost = getJobTotalCost(job);

              // Clean branch name so it doesn't repeat "EV7 EV7" or "GI GI"
              const cleanBranch = job.branchName.replace(/^(EV7|GI)\s+/, '');
              const isEV7 = job.companyCode === 'EV7';

              return (
                <tr
                  key={job.id}
                  className="hover:bg-gray-50/80 transition-colors group"
                >
                  {/* Job Number & Type */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {job.jobNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {job.jobType === 'CAR_WASH' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Car Wash</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">
                            <Truck className="w-3 h-3 text-blue-600" />
                            <span>Vehicle Slide</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Company & Branch */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 mt-0.5 ${
                          isEV7
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}
                      >
                        {job.companyCode}
                      </span>
                      <span className="text-gray-800 font-medium leading-relaxed">
                        {cleanBranch}
                      </span>
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="py-3.5 px-3 text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-semibold text-gray-800 truncate max-w-[170px]" title={job.supplierName}>
                        {job.supplierName}
                      </span>
                    </div>
                  </td>

                  {/* Details / VIN */}
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col gap-0.5 max-w-[220px]">
                      <span className="text-gray-800 font-medium truncate" title={vehicleInfo.title}>
                        {vehicleInfo.summaryText}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 w-fit truncate">
                        {vehicleInfo.vin}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border font-semibold ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor || 'bg-current'}`} />
                      <span>{statusMeta.label}</span>
                    </span>
                  </td>

                  {/* Cost */}
                  <td className="py-3.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap font-mono text-sm">
                    {formatCurrency(cost)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <Link
                      href={`/jobs?jobId=${job.id}`}
                      className="p-2 rounded-xl text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all inline-flex items-center justify-center cursor-pointer"
                      title="ดูรายละเอียดงาน"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile & Tablet Card View (< md) */}
      <div className="block md:hidden flex flex-col divide-y divide-gray-100">
        {jobs.slice(0, 6).map((job) => {
          const statusMeta = getJobStatusBadge(job.status);
          const vehicleInfo = getJobVehicleDisplay(job);
          const cost = getJobTotalCost(job);
          const cleanBranch = job.branchName.replace(/^(EV7|GI)\s+/, '');
          const isEV7 = job.companyCode === 'EV7';

          return (
            <Link
              key={job.id}
              href={`/jobs?jobId=${job.id}`}
              className="py-3.5 flex flex-col gap-2.5 hover:bg-gray-50/50 transition-colors rounded-xl px-1"
            >
              {/* Card Top: Job No + Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {job.jobType === 'CAR_WASH' ? (
                    <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="p-1 rounded-md bg-blue-50 text-blue-700">
                      <Truck className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span className="font-mono font-bold text-xs text-gray-900">
                    {job.jobNumber}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColor || 'bg-current'}`} />
                  <span>{statusMeta.label}</span>
                </span>
              </div>

              {/* Card Middle: Company / Branch & Supplier */}
              <div className="text-xs text-gray-600 flex flex-col gap-1 pl-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isEV7 ? 'bg-emerald-100 text-emerald-900' : 'bg-blue-100 text-blue-900'
                    }`}
                  >
                    {job.companyCode}
                  </span>
                  <span className="font-medium text-gray-800">{cleanBranch}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Building2 className="w-3 h-3 text-gray-400" />
                  <span className="truncate">{job.supplierName}</span>
                </div>
                <div className="text-[11px] text-gray-500 font-mono">
                  🚗 {vehicleInfo.summaryText} ({vehicleInfo.vin})
                </div>
              </div>

              {/* Card Bottom: Cost & View link */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                <span className="font-bold text-sm font-mono text-gray-900">
                  {formatCurrency(cost)}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
                  <span>ดูรายละเอียด</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

