'use client';

import React from 'react';
import { Job } from '@/types';
import { formatTimeOnly } from '@/lib/date-utils';
import { getJobStatusBadge, getJobVehicleDisplay, getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { Sparkles, Truck, Camera, CheckCircle2, AlertTriangle, Play } from 'lucide-react';

interface JobCardProps {
  job: Job;
  onAcceptJob?: (job: Job) => void;
  onSubmitEvidence?: (job: Job) => void;
  onViewEvidence?: (job: Job) => void;
  onViewDetail?: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onAcceptJob,
  onSubmitEvidence,
  onViewEvidence,
  onViewDetail,
}) => {
  const vehicleInfo = getJobVehicleDisplay(job);
  const statusMeta = getJobStatusBadge(job.status);
  const cost = getJobTotalCost(job);

  return (
    <div
      className={`bg-white rounded-2xl p-4 border shadow-xs transition-all ${
        job.status === 'IN_PROGRESS'
          ? 'border-emerald-200 hover:border-[#0f5b44]'
          : job.status === 'REJECTED'
          ? 'border-rose-200 bg-rose-50/20'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start space-x-3">
          {/* Service Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              job.jobType === 'CAR_WASH'
                ? 'bg-emerald-50 text-[#0f5b44]'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            {job.jobType === 'CAR_WASH' ? (
              <Sparkles className="w-4 h-4 fill-current" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs font-mono">
                {job.jobNumber}
              </span>
              {/* Status Badge */}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <div className="text-xs font-bold text-slate-800 mt-1 font-mono tracking-tight">
              {vehicleInfo.vin}
            </div>

            <div className="text-[11px] text-gray-500 mt-0.5">
              {vehicleInfo.title}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[11px] font-medium text-slate-800">
            {job.branchName}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
            {formatTimeOnly(job.updatedAt)}
          </div>
        </div>
      </div>

      {/* Reject Notice if any */}
      {job.status === 'REJECTED' && job.rejectReason && (
        <div className="mt-2.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
          <span>สาขาขอให้แก้ไข: {job.rejectReason}</span>
        </div>
      )}

      {/* Card Action Row */}
      {job.status === 'PENDING_SUPPLIER' ? (
        <div className="mt-3.5 flex items-center gap-2">
          {onAcceptJob && (
            <button
              onClick={() => onAcceptJob(job)}
              className="flex-1 bg-[#0f5b44] hover:bg-[#00422f] active:scale-98 text-white font-medium text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>กดรับงาน (เริ่มงาน)</span>
            </button>
          )}
          {onViewDetail && (
            <button
              onClick={() => onViewDetail(job)}
              className="bg-white hover:bg-gray-50 border border-gray-200 text-slate-700 font-medium text-xs py-2.5 px-3 rounded-xl transition-colors"
            >
              รายละเอียด
            </button>
          )}
        </div>
      ) : (job.status === 'IN_PROGRESS' || job.status === 'REJECTED') ? (
        <div className="mt-3.5 flex items-center gap-2">
          {onSubmitEvidence && (
            <button
              onClick={() => onSubmitEvidence(job)}
              className="flex-1 bg-[#0f5b44] hover:bg-[#00422f] active:scale-98 text-white font-medium text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>{job.status === 'REJECTED' ? 'ถ่ายรูปแก้ไขส่งงาน' : 'ถ่ายรูปส่งงาน'}</span>
            </button>
          )}
          {onViewDetail && (
            <button
              onClick={() => onViewDetail(job)}
              className="bg-white hover:bg-gray-50 border border-gray-200 text-slate-700 font-medium text-xs py-2.5 px-3 rounded-xl transition-colors"
            >
              รายละเอียด
            </button>
          )}
        </div>
      ) : job.status === 'WAITING_APPROVAL' ? (
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500 text-[11px] flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-[#0f5b44]" />
            แนบหลักฐาน {job.evidences?.length || 0} ภาพ
          </span>
          <div className="flex items-center gap-1.5">
            {onViewEvidence && (
              <button
                onClick={() => onViewEvidence(job)}
                className="font-semibold text-xs text-[#0f5b44] hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                ตรวจสอบรูปภาพ
              </button>
            )}
            {onViewDetail && (
              <button
                onClick={() => onViewDetail(job)}
                className="text-gray-500 hover:text-gray-800 px-2 py-1 text-xs"
              >
                รายละเอียด
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500 text-[11px]">
            {job.jobType === 'CAR_WASH' ? 'Wash Hub' : 'Transport'} · ยอดสุทธิ
          </span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0f5b44] font-mono text-xs">
              {formatCurrency(cost)}
            </span>
            {onViewDetail && (
              <button
                onClick={() => onViewDetail(job)}
                className="text-xs text-gray-500 hover:text-[#0f5b44] underline"
              >
                รายละเอียด
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
