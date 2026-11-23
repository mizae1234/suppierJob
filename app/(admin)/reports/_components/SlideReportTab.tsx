'use client';

import React from 'react';
import { ReportContextInfo, SlideReportData } from '../_hooks/useReportData';
import SlideAnalyticsSections from './SlideAnalyticsSections';
import SlideJobsTable from './SlideJobsTable';
import SlideKpiCards from './SlideKpiCards';

interface SlideReportTabProps {
  context: ReportContextInfo;
  slide: SlideReportData;
}

export default function SlideReportTab({ context, slide }: SlideReportTabProps) {
  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      <SlideKpiCards currentRole={context.currentRole} analytics={slide.analytics} />
      <SlideJobsTable
        context={context}
        jobs={slide.filteredJobs}
        analytics={slide.analytics}
        filters={slide.filters}
      />
      <SlideAnalyticsSections currentRole={context.currentRole} analytics={slide.analytics} />
    </div>
  );
}
