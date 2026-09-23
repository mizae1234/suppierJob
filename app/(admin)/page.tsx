'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getJobTotalCost } from '@/lib/job-utils';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStatsCards } from '@/components/dashboard/DashboardStatsCards';
import { WorkflowPipeline } from '@/components/dashboard/WorkflowPipeline';
import { UrgentApprovalsSection } from '@/components/dashboard/UrgentApprovalsSection';
import { RecentJobsTable } from '@/components/dashboard/RecentJobsTable';
import { CompanyComparisonCards } from '@/components/dashboard/CompanyComparisonCards';

export default function DashboardPage() {
  const {
    currentRole,
    currentCompany,
    setCurrentCompany,
    filteredJobs,
    jobs,
    vehicles,
    activeBranch,
  } = useApp();

  // Metrics calculations (memoized for performance)
  const stats = useMemo(() => {
    const pendingSupplierJobs = filteredJobs.filter(j => j.status === 'PENDING_SUPPLIER');
    const inProgressJobs = filteredJobs.filter(j => j.status === 'IN_PROGRESS');
    const waitingApprovalJobs = filteredJobs.filter(j => j.status === 'WAITING_APPROVAL');
    const approvedJobs = filteredJobs.filter(j => j.status === 'APPROVED');
    const rejectedJobs = filteredJobs.filter(j => j.status === 'REJECTED');
    const invoicedJobs = filteredJobs.filter(j => j.status === 'INVOICED');

    const approvedAmount = approvedJobs.reduce((sum, j) => sum + getJobTotalCost(j), 0);
    const invoicedAmount = invoicedJobs.reduce((sum, j) => sum + getJobTotalCost(j), 0);

    return {
      totalCount: filteredJobs.length,
      pendingSupplier: pendingSupplierJobs,
      pendingCarWashCount: pendingSupplierJobs.filter(j => j.jobType === 'CAR_WASH').length,
      pendingSlideCount: pendingSupplierJobs.filter(j => j.jobType === 'VEHICLE_SLIDE').length,
      inProgressCount: inProgressJobs.length,
      waitingApproval: waitingApprovalJobs,
      approvedCount: approvedJobs.length,
      approvedAmount,
      rejectedCount: rejectedJobs.length,
      invoicedCount: invoicedJobs.length,
      invoicedAmount,
    };
  }, [filteredJobs]);

  // Multi-Company Breakdown
  const companyStats = useMemo(() => {
    const ev7Jobs = jobs.filter(j => j.companyCode === 'EV7');
    const giJobs = jobs.filter(j => j.companyCode === 'GI');

    return {
      ev7VehiclesCount: vehicles.filter(v => v.companyCode === 'EV7').length,
      ev7JobsCount: ev7Jobs.length,
      ev7ApprovedCount: ev7Jobs.filter(j => j.status === 'APPROVED').length,
      giVehiclesCount: vehicles.filter(v => v.companyCode === 'GI').length,
      giJobsCount: giJobs.length,
      giApprovedCount: giJobs.filter(j => j.status === 'APPROVED').length,
    };
  }, [jobs, vehicles]);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* 1. Dashboard Top Header & Controls */}
      <DashboardHeader
        currentRole={currentRole}
        currentCompany={currentCompany}
        onSelectCompany={setCurrentCompany}
        activeBranchName={activeBranch?.name}
      />

      {/* 2. Key Metrics KPI 6-Cards Grid */}
      <DashboardStatsCards
        totalJobsCount={stats.totalCount}
        pendingSupplierCount={stats.pendingSupplier.length}
        pendingCarWashCount={stats.pendingCarWashCount}
        pendingSlideCount={stats.pendingSlideCount}
        waitingApprovalCount={stats.waitingApproval.length}
        rejectedCount={stats.rejectedCount}
        approvedCount={stats.approvedCount}
        approvedAmount={stats.approvedAmount}
        invoicedCount={stats.invoicedCount}
        invoicedAmount={stats.invoicedAmount}
      />

      {/* 3. Workflow Pipeline (01 Dispatched -> 05 Invoiced) */}
      <WorkflowPipeline
        pendingSupplierCount={stats.pendingSupplier.length}
        inProgressCount={stats.inProgressCount}
        waitingApprovalCount={stats.waitingApproval.length}
        approvedCount={stats.approvedCount}
        invoicedCount={stats.invoicedCount}
      />

      {/* 4. Urgent Waiting Approvals Banner & Preview Cards */}
      <UrgentApprovalsSection waitingJobs={stats.waitingApproval} />

      {/* 5. Recent Jobs Detailed Table */}
      <RecentJobsTable jobs={filteredJobs} totalCount={stats.totalCount} />

      {/* 6. Multi-Company (EV7 vs GI) Summary Comparison */}
      <CompanyComparisonCards
        ev7VehiclesCount={companyStats.ev7VehiclesCount}
        ev7JobsCount={companyStats.ev7JobsCount}
        ev7ApprovedCount={companyStats.ev7ApprovedCount}
        giVehiclesCount={companyStats.giVehiclesCount}
        giJobsCount={companyStats.giJobsCount}
        giApprovedCount={companyStats.giApprovedCount}
      />
    </div>
  );
}
