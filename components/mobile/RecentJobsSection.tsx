'use client';

import React from 'react';
import { Job } from '@/types';
import { JobCard } from './JobCard';
import { ChevronRight } from 'lucide-react';

interface RecentJobsSectionProps {
  jobs: Job[];
  onViewAll: () => void;
  onAcceptJob: (job: Job) => void;
  onSubmitEvidence: (job: Job) => void;
  onViewEvidence: (job: Job) => void;
  onViewDetail: (job: Job) => void;
}

export const RecentJobsSection: React.FC<RecentJobsSectionProps> = ({
  jobs,
  onViewAll,
  onAcceptJob,
  onSubmitEvidence,
  onViewEvidence,
  onViewDetail,
}) => {
  return (
    <section className="pt-1" data-purpose="recent-tasks-list">
      <div className="flex justify-between items-center px-1 mb-2.5">
        <h2 className="text-sm font-bold text-slate-900">งานล่าสุด</h2>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-[#0f5b44] hover:underline flex items-center gap-0.5"
        >
          ดูทั้งหมด
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-xs text-gray-400">
            ไม่พบรายการงานที่มอบหมาย
          </div>
        ) : (
          jobs.map(job => (
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
    </section>
  );
};
