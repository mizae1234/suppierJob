'use client';

import React from 'react';
import { Job, JobStatus } from '@/types';
import { JobCard } from './JobCard';
import { Search } from 'lucide-react';

interface MyJobsTabProps {
  jobs: Job[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'ALL' | JobStatus;
  onStatusFilterChange: (status: 'ALL' | JobStatus) => void;
  onAcceptJob: (job: Job) => void;
  onSubmitEvidence: (job: Job) => void;
  onViewEvidence: (job: Job) => void;
  onViewDetail: (job: Job) => void;
}

const FILTER_PILLS: Array<{ id: 'ALL' | JobStatus; label: string }> = [
  { id: 'ALL', label: 'ทั้งหมด' },
  { id: 'PENDING_SUPPLIER', label: 'งานใหม่' },
  { id: 'IN_PROGRESS', label: 'กำลังทำ' },
  { id: 'WAITING_APPROVAL', label: 'รอตรวจรับ' },
  { id: 'APPROVED', label: 'อนุมัติแล้ว' },
  { id: 'REJECTED', label: 'ขอแก้ไข' },
  { id: 'INVOICED', label: 'วางบิลแล้ว' },
];

export const MyJobsTab: React.FC<MyJobsTabProps> = ({
  jobs,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAcceptJob,
  onSubmitEvidence,
  onViewEvidence,
  onViewDetail,
}) => {
  return (
    <div className="space-y-3">
      {/* Title & Total count */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">งานของฉัน (Assigned Jobs)</h2>
        <span className="text-xs text-gray-500 font-medium font-mono">
          {jobs.length} รายการ
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหา Job No, VIN, รุ่นรถ..."
          className="w-full h-10 pl-9 pr-4 rounded-xl bg-white border border-gray-200 text-xs text-slate-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#0f5b44]"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {FILTER_PILLS.map((pill) => {
          const isActive = statusFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => onStatusFilterChange(pill.id)}
              className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#0f5b44] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Jobs List */}
      <div className="space-y-3 pt-1">
        {jobs.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-gray-200 text-xs text-gray-400">
            ไม่พบงานที่ตรงตามเงื่อนไขค้นหา
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onAcceptJob={onAcceptJob}
              onSubmitEvidence={onSubmitEvidence}
              onViewEvidence={onViewEvidence}
              onViewDetail={onViewDetail}
            />
          ))
        )}
      </div>
    </div>
  );
};
