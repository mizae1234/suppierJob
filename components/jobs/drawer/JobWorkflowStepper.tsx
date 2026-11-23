'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Job } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';

interface JobWorkflowStepperProps {
  job: Job;
  theme: ThemeColors;
}

export function JobWorkflowStepper({ job, theme }: JobWorkflowStepperProps) {
  const steps = [
    { label: 'เปิดงาน', key: 'CREATED' },
    { label: 'ดำเนินการ', key: 'IN_PROGRESS' },
    { label: job.status === 'REJECTED' ? 'ขอแก้ไข' : 'ตรวจรับ', key: 'WAITING_APPROVAL' },
    { label: 'อนุมัติ', key: 'APPROVED' },
  ];

  const currentIdx = (() => {
    if (['APPROVED', 'INVOICED'].includes(job.status)) return 3;
    if (job.status === 'WAITING_APPROVAL') return 2;
    if (job.status === 'REJECTED') return 2;
    if (job.status === 'IN_PROGRESS' || job.status === 'PENDING_SUPPLIER') return 1;
    return 0;
  })();

  return (
    <>
      {/* Reject Reason Alert */}
      {job.rejectReason && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">
              {job.status === 'CANCELLED'
                ? 'เหตุผลที่ Supplier ปฏิเสธงาน:'
                : 'หมายเหตุขอแก้ไขจากสาขา (ตีกลับ):'}
            </p>
            <p className="text-red-600 mt-0.5">{job.rejectReason}</p>
          </div>
        </div>
      )}

      {/* ─── Compact Workflow Stepper ─── */}
      {job.status === 'CANCELLED' ? (
        <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm shrink-0">
              ✕
            </div>
            <div>
              <p className="font-bold text-red-800">
                {job.rejectReason?.includes('Supplier')
                  ? 'Supplier ปฏิเสธงานนี้'
                  : 'งานนี้ถูกปฏิเสธ / ยกเลิกแล้ว'}
              </p>
              <p className="text-[11px] text-red-600 mt-0.5">
                {job.rejectReason
                  ? `เหตุผล: ${job.rejectReason}`
                  : 'คำสั่งงานสิ้นสุด ไม่มีการดำเนินการต่อ'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white shrink-0">
            ปฏิเสธงาน
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-[10px]">
          {steps.map((step, idx) => {
            const isCompleted =
              idx < currentIdx ||
              (idx === currentIdx && ['APPROVED', 'INVOICED'].includes(job.status));
            const isCurrent = idx === currentIdx && !['APPROVED', 'INVOICED'].includes(job.status);
            const isRejected = isCurrent && job.status === 'REJECTED';

            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <div
                    className={`flex-1 h-px ${isCompleted || isCurrent ? '' : 'bg-gray-200'}`}
                    style={
                      isCompleted || isCurrent
                        ? { backgroundColor: isRejected ? '#dc2626' : theme.primary }
                        : {}
                    }
                  />
                )}
                <div className="flex items-center gap-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                      isCompleted
                        ? 'text-white'
                        : isCurrent
                          ? isRejected
                            ? 'bg-red-600 text-white ring-2 ring-red-100'
                            : 'text-white ring-2'
                          : 'bg-gray-200 text-gray-400'
                    }`}
                    style={{
                      ...(isCompleted ? { backgroundColor: theme.primary } : {}),
                      ...(isCurrent && !isRejected
                        ? ({
                            backgroundColor: theme.primary,
                            '--tw-ring-color': theme.badgeBg,
                          } as React.CSSProperties)
                        : {}),
                    }}
                  >
                    {isCompleted ? '✓' : isRejected ? '!' : idx + 1}
                  </div>
                  <span
                    className={`hidden sm:inline whitespace-nowrap ${
                      isCurrent
                        ? isRejected
                          ? 'font-bold text-red-600'
                          : 'font-bold'
                        : isCompleted
                          ? 'text-gray-600'
                          : 'text-gray-400'
                    }`}
                    style={isCurrent && !isRejected ? { color: theme.textPrimary } : {}}
                  >
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </>
  );
}
