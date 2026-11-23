'use client';

import React from 'react';
import { ReportContextInfo, WashReportData } from '../_hooks/useReportData';
import WashAnalyticsSections from './WashAnalyticsSections';
import WashJobsTable from './WashJobsTable';
import WashKpiCards from './WashKpiCards';

interface WashReportTabProps {
  context: ReportContextInfo;
  wash: WashReportData;
}

export default function WashReportTab({ context, wash }: WashReportTabProps) {
  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      <WashKpiCards analytics={wash.analytics} />
      <WashJobsTable
        context={context}
        jobs={wash.filteredJobs}
        supplierStats={wash.analytics.supplierWashStats}
        filters={wash.filters}
      />
      <WashAnalyticsSections currentRole={context.currentRole} analytics={wash.analytics} />
    </div>
  );
}
