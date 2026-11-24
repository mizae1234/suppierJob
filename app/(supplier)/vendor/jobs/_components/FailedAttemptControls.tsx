'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Job } from '@/types';
import { canReportFailedAttempt } from '../_utils';

interface FailedAttemptButtonProps {
  job: Job;
  disabled: boolean;
  onReport: (job: Job) => void;
}

export function FailedAttemptButton({ job, disabled, onReport }: FailedAttemptButtonProps) {
  if (!canReportFailedAttempt(job)) return null;
  const carCount = (job.carWashItems || []).filter(i => i.status !== 'CANCELLED').length;

  return (
    <button
      type="button"
      onClick={() => onReport(job)}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 bg-orange-50/70 hover:bg-orange-100 text-orange-800 text-[11px] font-bold transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
      <span>
        สไลด์ไม่ได้ / เที่ยวเปล่า{carCount > 1 ? ` (ทั้งใบงาน ${carCount} คัน)` : ''}
      </span>
    </button>
  );
}

export function FailedAttemptWaitingBanner() {
  return (
    <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-50 text-orange-800 text-xs font-bold border border-orange-200">
      <AlertTriangle className="w-4 h-4 text-orange-600" />
      <span>ส่งเป็นเที่ยวเปล่าแล้ว • รอสาขาอนุมัติ</span>
    </div>
  );
}
