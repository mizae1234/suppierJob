'use client';

import React from 'react';
import { CheckCheck, ChevronLeft, ChevronRight, Copy, X } from 'lucide-react';
import { CompanyCode, Job } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { getSlideDirection } from '@/lib/job-utils';
import { STATUS_MAP } from '../constants';

export interface DrawerNavigation {
  currentJobIndex: number;
  totalJobs: number;
  hasPrevJob: boolean;
  hasNextJob: boolean;
  onPrevJob?: () => void;
  onNextJob?: () => void;
}

interface DrawerHeaderProps {
  job: Job;
  theme: ThemeColors;
  copiedText: string | null;
  onCopyText: (text: string) => void;
  onClose: () => void;
  myBranchId: string | undefined;
  currentCompany: CompanyCode | 'ALL';
  navigation: DrawerNavigation;
}

export function DrawerHeader({
  job,
  theme,
  copiedText,
  onCopyText,
  onClose,
  myBranchId,
  currentCompany,
  navigation,
}: DrawerHeaderProps) {
  const { currentJobIndex, totalJobs, hasPrevJob, hasNextJob, onPrevJob, onNextJob } = navigation;

  return (
    <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0 gap-3">
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
        <span
          className="px-2.5 py-0.5 rounded-full font-bold text-xs shrink-0"
          style={{ backgroundColor: '#dcfce7', color: '#0f5238' }}
        >
          {job.companyCode}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 font-mono tracking-tight">
            {job.jobNumber}
          </h3>
          <button
            type="button"
            onClick={() => onCopyText(job.jobNumber)}
            title="คัดลอกเลขที่งาน"
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            {copiedText === job.jobNumber ? (
              <CheckCheck className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {job.d365PoNumber && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0f5238] border border-emerald-300 font-mono font-bold text-xs whitespace-nowrap shrink-0"
            title={`D365 Purchase Order: ${job.d365PoNumber}`}
          >
            PO: {job.d365PoNumber}
          </span>
        )}

        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
            STATUS_MAP[job.status]?.bg || 'bg-gray-100'
          } ${STATUS_MAP[job.status]?.text || 'text-gray-700'}`}
        >
          {STATUS_MAP[job.status]?.label || job.status}
        </span>

        {/* Direction Badge for Vehicle Slide */}
        {job.jobType === 'VEHICLE_SLIDE' &&
          (() => {
            const dir = getSlideDirection(job, myBranchId, currentCompany);

            if (dir === 'INBOUND') {
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  รับเข้า (สาขาปลายทาง)
                  {job.destWarehouseId ? ` · คลัง ${job.destWarehouseId}` : ''}
                </span>
              );
            }
            if (dir === 'OUTBOUND') {
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-bold text-xs whitespace-nowrap shrink-0">
                  ส่งออก (สาขาต้นทาง)
                  {job.destWarehouseId ? ` · คลัง ${job.destWarehouseId}` : ''}
                </span>
              );
            }
            if (dir === 'INTERNAL' || job.destBranchId) {
              return (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs whitespace-nowrap shrink-0"
                  title={`${job.pickupBranchName || job.branchName} → ${job.destBranchName}`}
                >
                  ย้ายสาขา: {job.pickupBranchName || job.branchName} → {job.destBranchName}
                  {job.destWarehouseId ? ` (คลัง ${job.destWarehouseId})` : ''}
                </span>
              );
            }
            return null;
          })()}
      </div>

      {/* Right controls: Prev/Next & Close */}
      <div className="flex items-center gap-2 shrink-0">
        {currentJobIndex >= 0 && (totalJobs || 0) > 1 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100/90 text-xs text-gray-700 select-none whitespace-nowrap shrink-0 border border-gray-200/60 shadow-2xs">
            <span className="font-semibold font-mono tabular-nums whitespace-nowrap text-[11px]">
              {currentJobIndex + 1} / {totalJobs || 0}
            </span>
            <div className="flex items-center ml-1 border-l border-gray-300 pl-1 gap-0.5">
              <button
                type="button"
                onClick={onPrevJob}
                disabled={!hasPrevJob}
                title="งานก่อนหน้า (ลูกศรซ้าย)"
                className="p-1 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={onNextJob}
                disabled={!hasNextJob}
                title="งานถัดไป (ลูกศรขวา)"
                className="p-1 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => onClose()}
          title="ปิด (Esc)"
          className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
