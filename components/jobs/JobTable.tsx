'use client';

import React from 'react';
import { Job, UserRole } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { formatThaiDate } from '@/lib/date-utils';
import { Sparkles, Truck } from 'lucide-react';
import { STATUS_MAP } from './constants';

interface JobTableProps {
  jobs: Job[];
  currentRole: UserRole;
  theme: ThemeColors;
  onViewDetail: (job: Job) => void;
  onAcceptJob: (jobId: string) => void;
  onCompleteJob: (job: Job) => void;
  onApproveJob: (jobId: string) => void;
  onRejectJob: (job: Job) => void;
}

export const JobTable: React.FC<JobTableProps> = ({
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
    <div className="bg-white rounded-2xl border shadow-xs overflow-hidden" style={{ borderColor: theme.borderSoft }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider" style={{ backgroundColor: theme.bgSoft }}>
              <th className="py-3.5 px-4">เลขที่ใบสั่งงาน</th>
              <th className="py-3.5 px-4">ประเภท</th>
              <th className="py-3.5 px-4">สังกัด / สาขา</th>
              <th className="py-3.5 px-4">Supplier คู่ค้า</th>
              <th className="py-3.5 px-4">รายการรถ (VIN)</th>
              <th className="py-3.5 px-4">สถานะงาน</th>
              <th className="py-3.5 px-4 text-right">ค่าบริการ</th>
              <th className="py-3.5 px-4 text-center">การปฏิบัติการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  ไม่พบรายการงานที่ตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            ) : (
              jobs.map(job => {
                const currentStatus = STATUS_MAP[job.status] || { label: job.status, bg: 'bg-gray-100', text: 'text-gray-700' };

                return (
                  <tr key={job.id} className="hover:bg-[#fbfdfc] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{job.jobNumber}</div>
                      <div className="text-[11px] text-gray-400">{formatThaiDate(job.createdAt)}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                        {job.jobType === 'CAR_WASH' ? (
                          <>
                            <Sparkles className="w-4 h-4" style={{ color: theme.iconColor }} />
                            <span>Car Wash</span>
                          </>
                        ) : (
                          <>
                            <Truck className="w-4 h-4" style={{ color: theme.iconColor }} />
                            <span>Slide Transport</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                          {job.companyCode}
                        </span>
                        <span className="text-gray-800 font-medium">{job.branchName}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-gray-800 font-medium">{job.supplierName}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {job.jobType === 'CAR_WASH' ? (
                        <div>
                          <span className="font-semibold text-gray-900">
                            จำนวน {job.carWashItems?.length || 0} คัน
                          </span>
                          <div className="text-[11px] text-gray-500 font-mono truncate max-w-[180px]">
                            {job.carWashItems?.map(i => i.vin.slice(-6)).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="font-mono font-semibold text-gray-900">
                            {job.vin}
                          </span>
                          <div className="text-[11px] text-gray-500">
                            ไปยัง: {job.destBranchName}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] ${currentStatus.bg} ${currentStatus.text}`}>
                        {currentStatus.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-gray-900 whitespace-nowrap">
                      ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onViewDetail(job)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                          style={{ backgroundColor: theme.bgSoft, color: theme.textPrimary }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.badgeBg; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.bgSoft; }}
                        >
                          ดูข้อมูล
                        </button>

                        {currentRole === 'SUPPLIER' && job.status === 'PENDING_SUPPLIER' && (
                          <button
                            onClick={() => onAcceptJob(job.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                          >
                            รับงาน
                          </button>
                        )}

                        {currentRole === 'SUPPLIER' && job.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => onCompleteJob(job)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                          >
                            ส่งงาน / แนบรูป
                          </button>
                        )}

                        {currentRole !== 'SUPPLIER' && job.status === 'WAITING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => onApproveJob(job.id)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-white transition-colors"
                              style={{ backgroundColor: theme.primary }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryHover; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary; }}
                              title="Approve งาน"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onRejectJob(job)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                              title="Reject ให้แก้ไข"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
