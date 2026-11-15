'use client';

import React from 'react';
import { PencilLine } from 'lucide-react';
import type { Job } from '@/types';
import { getManualPriceDiff, isManualPricingJob } from '@/lib/slide-pricing';

/** ป้ายเล็ก "กรอกเอง" สำหรับการ์ด / ตาราง */
export function ManualPricingBadge({ job, className = '' }: { job: Pick<Job, 'pricingMode'>; className?: string }) {
  if (!isManualPricingJob(job)) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 ${className}`}
      title="ค่าบริการกรอกเองโดยผู้สั่งงาน (ไม่ได้คำนวณตามสัญญา)"
    >
      <PencilLine className="w-2.5 h-2.5" />
      กรอกเอง
    </span>
  );
}

/** กล่องรายละเอียดค่าบริการที่กรอกเอง (หน้าตรวจรับ / รายละเอียดใบงาน) */
export function ManualPricingNotice({
  job,
  className = '',
}: {
  job: Pick<Job, 'pricingMode' | 'distance' | 'contractCost' | 'manualPriceNote' | 'carWashItems' | 'estimatedCost'>;
  className?: string;
}) {
  if (!isManualPricingJob(job)) return null;

  const unitPrice =
    job.carWashItems?.find(i => i.status !== 'CANCELLED' && i.unitPrice > 0)?.unitPrice ??
    job.carWashItems?.[0]?.unitPrice ??
    job.estimatedCost ??
    0;
  const diff = getManualPriceDiff(unitPrice, job.contractCost);

  return (
    <div className={`p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-950 flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
        <PencilLine className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>ค่าบริการกรอกเองโดยผู้สั่งงาน</span>
      </div>
      <div className="grid gap-0.5">
        <p>
          <span className="text-amber-800/80 mr-1">ระยะทาง:</span>
          <b>{job.distance != null ? `${job.distance.toLocaleString()} กม.` : '-'}</b>
          <span className="text-amber-800/80 mx-1">• ราคาที่กรอก:</span>
          <b>฿{unitPrice.toLocaleString()}/คัน</b>
          {job.contractCost != null && job.contractCost > 0 && (
            <>
              <span className="text-amber-800/80 mx-1">• ราคาตามสัญญา:</span>
              <b>฿{job.contractCost.toLocaleString()}/คัน</b>
              {diff && diff.diff !== 0 && (
                <span className={`ml-1 font-bold ${diff.diff > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  ({diff.diff > 0 ? '+' : ''}{diff.diff.toLocaleString()} บาท / {diff.diff > 0 ? '+' : ''}{diff.percent}%)
                </span>
              )}
            </>
          )}
        </p>
        <p className="whitespace-pre-line">
          <span className="text-amber-800/80 mr-1">หมายเหตุ:</span>
          <b>{job.manualPriceNote || '-'}</b>
        </p>
      </div>
    </div>
  );
}

export default ManualPricingNotice;

