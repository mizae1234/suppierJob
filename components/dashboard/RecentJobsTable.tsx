'use client';

import React from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { getJobStatusBadge, getJobVehicleDisplay, getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { Sparkles, Truck, ArrowRight, Eye } from 'lucide-react';

interface RecentJobsTableProps {
  jobs: Job[];
  totalCount: number;
}

export const RecentJobsTable: React.FC<RecentJobsTableProps> = ({
  jobs,
  totalCount,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">รายการงานสั่งการล่าสุด</h3>
          <p className="text-xs text-gray-500">ติดตามสถานะความคืบหน้าระหว่างสาขาและคู่ค้า</p>
        </div>
        <Link
          href="/jobs"
          className="text-xs font-bold text-[#0f5238] hover:underline flex items-center gap-1"
        >
          <span>ดูงานทั้งหมด ({totalCount})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="py-3 px-3">Job Number</th>
              <th className="py-3 px-3">ประเภทงาน</th>
              <th className="py-3 px-3">บริษัท / สาขา</th>
              <th className="py-3 px-3">Supplier คู่ค้า</th>
              <th className="py-3 px-3">รายละเอียด / VIN</th>
              <th className="py-3 px-3">สถานะ</th>
              <th className="py-3 px-3 text-right">ค่าบริการ</th>
              <th className="py-3 px-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs">
            {jobs.slice(0, 8).map((job) => {
              const statusMeta = getJobStatusBadge(job.status);
              const vehicleInfo = getJobVehicleDisplay(job);
              const cost = getJobTotalCost(job);

              return (
                <tr key={job.id} className="hover:bg-[#fbfdfc] transition-colors">
                  <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap font-mono">
                    {job.jobNumber}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 font-medium">
                      {job.jobType === 'CAR_WASH' ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Car Wash</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Vehicle Slide</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 mr-1.5 font-mono">
                        {job.companyCode}
                      </span>
                      <span className="text-gray-800 font-medium">{job.branchName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-700 font-medium whitespace-nowrap">
                    {job.supplierName}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-gray-600 truncate block max-w-xs" title={vehicleInfo.title}>
                      {vehicleInfo.summaryText} ({vehicleInfo.vin})
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                    >
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-900 whitespace-nowrap font-mono">
                    {formatCurrency(cost)}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <Link
                      href={`/jobs?jobId=${job.id}`}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#0f5238] hover:bg-emerald-50 transition-colors inline-block"
                      title="ดูรายละเอียด"
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
    </div>
  );
};
