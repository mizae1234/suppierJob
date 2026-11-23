'use client';

import React from 'react';
import { Building2, Calendar, Sparkles, Truck, User } from 'lucide-react';
import { Job } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatThaiDate } from '@/lib/date-utils';

interface JobOverviewProps {
  job: Job;
  theme: ThemeColors;
}

export function JobOverview({ job, theme }: JobOverviewProps) {
  const isJobCancelled = job.status === 'CANCELLED';
  const effectiveCost = getJobTotalCost(job);
  const hasCancelledWash = Boolean(job.carWashItems?.some((i) => i.status === 'CANCELLED'));
  const originalCost = job.estimatedCost || 0;

  return (
    <div className="flex items-start justify-between gap-4">
      {/* Left: Key Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
            style={{
              color: theme.textPrimary,
              backgroundColor: theme.bgSoft,
              borderColor: theme.borderSoft,
            }}
          >
            {job.jobType === 'CAR_WASH' ? (
              <>
                <Sparkles className="w-3 h-3" /> Car Wash
              </>
            ) : (
              <>
                <Truck className="w-3 h-3" /> Vehicle Slide
              </>
            )}
          </span>
          {job.jobType === 'CAR_WASH' && job.transferReason && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              {job.transferReason.includes('Service') ? 'รถ Service' : 'รถใหม่'}
            </span>
          )}
          <span className="text-[10px] text-gray-500 font-medium">
            {job.carWashItems && job.carWashItems.length > 0
              ? `${job.carWashItems.filter((i) => i.status !== 'CANCELLED').length || job.carWashItems.length} คัน`
              : '1 คัน'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate">
              <strong className="text-gray-800">{job.branchName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <User className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="truncate">
              <strong className="text-gray-800">{job.supplierName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{formatThaiDate(job.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Right: Cost */}
      <div className="text-right shrink-0">
        <span className="text-[10px] text-gray-400 block">
          {isJobCancelled ? 'ค่าบริการ' : hasCancelledWash ? 'ค่าบริการสุทธิ' : 'ค่าบริการ'}
        </span>
        <div className="flex items-baseline justify-end gap-1.5">
          {isJobCancelled && originalCost > 0 && (
            <span className="text-xs text-gray-400 font-mono">
              ฿{originalCost.toLocaleString()}
            </span>
          )}
          {hasCancelledWash && originalCost > effectiveCost && (
            <span className="text-xs text-gray-400 font-mono">
              ฿{originalCost.toLocaleString()}
            </span>
          )}
          <p
            className="text-xl font-black tracking-tight"
            style={{
              color: isJobCancelled ? '#dc2626' : hasCancelledWash ? '#059669' : theme.textPrimary,
            }}
          >
            ฿{effectiveCost.toLocaleString()}
          </p>
        </div>
        {isJobCancelled && (
          <span className="text-[9px] text-red-500 font-semibold block">
            (ปฏิเสธงาน / ไม่คิดค่าบริการ)
          </span>
        )}
        {hasCancelledWash && !isJobCancelled && (
          <span className="text-[9px] text-red-500 font-semibold block">
            (หักคันที่ปฏิเสธแล้ว)
          </span>
        )}
      </div>
    </div>
  );
}
