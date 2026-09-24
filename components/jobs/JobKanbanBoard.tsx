'use client';

import React from 'react';
import { Job, UserRole } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { formatThaiDate } from '@/lib/date-utils';
import { Sparkles, Truck } from 'lucide-react';
import { KANBAN_COLUMNS } from './constants';

interface JobKanbanBoardProps {
  jobs: Job[];
  currentRole: UserRole;
  theme: ThemeColors;
  onViewDetail: (job: Job) => void;
  onAcceptJob: (jobId: string) => void;
  onCompleteJob: (job: Job) => void;
  onApproveJob: (jobId: string) => void;
  onRejectJob: (job: Job) => void;
}

export const JobKanbanBoard: React.FC<JobKanbanBoardProps> = ({
  jobs,
  currentRole,
  theme,
  onViewDetail,
  onAcceptJob,
  onCompleteJob,
  onApproveJob,
  onRejectJob,
}) => {
  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-[1500px]">
        {KANBAN_COLUMNS.map(col => {
          const colJobs = jobs.filter(j => j.status === col.id);
          const colTotal = colJobs.reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

          return (
            <div
              key={col.id}
              className={`flex-1 min-w-[280px] max-w-[340px] rounded-3xl border border-gray-200 border-t-4 ${col.borderColor} p-4 flex flex-col gap-3 shadow-xs`}
              style={{ backgroundColor: theme.bgSoft }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h3 className="font-bold text-xs text-gray-800 tracking-tight">
                    {col.title}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg} ${col.badgeText}`}>
                  {colJobs.length}
                </span>
              </div>

              {/* Column Summary */}
              <div className="text-[11px] text-gray-500 flex items-center justify-between border-b border-gray-200/80 pb-2">
                <span>ยอดรวมกลุ่มนี้:</span>
                <span className="font-bold text-gray-800">฿{colTotal.toLocaleString()}</span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                {colJobs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400 rounded-2xl border border-dashed border-gray-200 bg-white/60">
                    ไม่มีงานในสถานะนี้
                  </div>
                ) : (
                  colJobs.map(job => (
                    <div
                      key={job.id}
                      onClick={() => onViewDetail(job)}
                      className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5 cursor-pointer group"
                    >
                      {/* Card Top: Type & Company */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}>
                            {job.companyCode}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                            {job.jobType === 'CAR_WASH' ? (
                              <>
                                <Sparkles className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
                                <span>Car Wash</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
                                <span>Slide</span>
                              </>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formatThaiDate(job.createdAt)}
                        </span>
                      </div>

                      {/* Job Number */}
                      <div className="font-bold text-xs text-gray-900">{job.jobNumber}</div>

                      {/* Vehicle Details */}
                      <div className="p-2 rounded-xl bg-[#fbfdfc] border border-gray-100 text-xs">
                        {job.jobType === 'CAR_WASH' ? (
                          <div>
                            <p className="font-semibold text-gray-800">จำนวน {job.carWashItems?.length || 0} คัน</p>
                            <p className="text-[11px] text-gray-500 truncate font-mono mt-0.5">
                              {job.carWashItems?.map(i => i.vin.slice(-6)).join(', ')}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-mono font-semibold text-gray-800 text-[11px]">{job.vin}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">ไปยัง: {job.destBranchName}</p>
                          </div>
                        )}
                      </div>

                      {/* Branch & Supplier */}
                      <div className="text-[11px] text-gray-500 flex flex-col gap-0.5">
                        <p className="truncate">สาขา: <span className="font-medium text-gray-800">{job.branchName}</span></p>
                        <p className="truncate">คู่ค้า: <span className="font-medium text-gray-800">{job.supplierName}</span></p>
                      </div>

                      {/* Evidence Photo Preview */}
                      {job.evidences.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <div className="w-12 h-9 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={job.evidences[0].photoUrl} alt="evidence" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: theme.textPrimary, backgroundColor: theme.bgSoft }}>
                            มีรูปหลักฐาน ({job.evidences.length})
                          </span>
                        </div>
                      )}

                      {/* Price & Actions */}
                      <div
                        className="pt-2 border-t border-gray-100 flex items-center justify-between"
                        onClick={e => e.stopPropagation()}
                      >
                        <span className="font-bold text-xs" style={{ color: theme.textPrimary }}>
                          ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                        </span>

                        <div className="flex items-center gap-1">
                          {currentRole === 'SUPPLIER' && job.status === 'PENDING_SUPPLIER' && (
                            <button onClick={() => onAcceptJob(job.id)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                              รับงาน
                            </button>
                          )}
                          {currentRole === 'SUPPLIER' && job.status === 'IN_PROGRESS' && (
                            <button onClick={() => onCompleteJob(job)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs">
                              ส่งงาน
                            </button>
                          )}
                          {currentRole !== 'SUPPLIER' && job.status === 'WAITING_APPROVAL' && (
                            <>
                              <button
                                onClick={() => onApproveJob(job.id)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: theme.primary }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => onRejectJob(job)}
                                className="px-1.5 py-1 rounded-lg text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onViewDetail(job)}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            ดู
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
