'use client';

import React from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { getJobVehicleDisplay, getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface UrgentApprovalsSectionProps {
  waitingJobs: Job[];
}

export const UrgentApprovalsSection: React.FC<UrgentApprovalsSectionProps> = ({
  waitingJobs,
}) => {
  if (waitingJobs.length === 0) return null;

  return (
    <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              รายการที่รอการตรวจรับจากสาขา ({waitingJobs.length} งาน)
            </h3>
            <p className="text-xs text-gray-500">
              Supplier แนบรูปถ่ายหลักฐานเสร็จสิ้นแล้ว กรุณาตรวจสอบความสะอาดและความเรียบร้อย
            </p>
          </div>
        </div>
        <Link
          href="/approvals"
          className="text-xs font-bold text-[#0f5238] bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-200 transition-colors inline-flex items-center gap-1"
        >
          <span>ไปหน้าตรวจรับทั้งหมด</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grid of Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-1">
        {waitingJobs.slice(0, 3).map((job) => {
          const vehicleInfo = getJobVehicleDisplay(job);
          const cost = getJobTotalCost(job);

          return (
            <div
              key={job.id}
              className="p-4 rounded-xl bg-[#fbfdfc] border border-emerald-950/10 flex flex-col justify-between gap-3 hover:shadow-xs transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#0f5238] text-[10px] font-bold">
                    {job.jobType === 'CAR_WASH' ? 'Car Wash' : 'Vehicle Slide'}
                  </span>
                  <span className="text-[11px] font-bold text-gray-600 font-mono">
                    {job.jobNumber}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 mt-2">
                  {job.branchName}
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  โดย: <span className="font-semibold">{job.supplierName}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {vehicleInfo.summaryText} ({vehicleInfo.vin})
                </p>
              </div>

              {/* Photos Preview */}
              {job.evidences && job.evidences.length > 0 && (
                <div className="flex items-center gap-2 overflow-hidden py-1">
                  {job.evidences.slice(0, 2).map((evi, i) => (
                    <div
                      key={i}
                      className="relative w-16 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={evi.photoUrl}
                        alt={evi.caption}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  <span className="text-[11px] text-gray-500 font-medium">
                    +{job.evidences.length} รูปหลักฐาน
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-bold text-[#0f5238] font-mono">
                  {formatCurrency(cost)}
                </span>
                <Link
                  href={`/approvals?jobId=${job.id}`}
                  className="px-3 py-1 rounded-full bg-[#0f5238] text-white text-xs font-semibold hover:bg-[#0a3d28] transition-colors"
                >
                  ตรวจรับงาน
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
