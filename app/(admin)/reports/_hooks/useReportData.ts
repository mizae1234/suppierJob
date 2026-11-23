'use client';

import { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Branch, Job, JobStatus, UserRole } from '@/types';
import { DropdownOption } from '@/components/ui/CustomDropdown';
import {
  BranchExpenseSplit,
  CompanyFilter,
  OverviewExpenseStats,
  REPORT_STATUS_OPTIONS,
  ReportTab,
  SlideAnalytics,
  SlideDirectionFilter,
  SupplierOverviewStat,
  WashAnalytics,
  computeBranchExpenseSplit,
  computeOverviewExpenseStats,
  computeSlideAnalytics,
  computeSupplierOverviewStats,
  computeWashAnalytics,
  filterJobsByCompany,
  filterSlideReportJobs,
  filterWashReportJobs,
  scopeJobsByBranch,
} from '../_lib/report-calculations';
import { buildReportCsv, downloadCsvFile } from '../_lib/report-csv';

export interface ReportContextInfo {
  currentRole: UserRole;
  currentBranchId: string;
  activeBranch?: Branch;
  jobsTruncated: boolean;
}

export interface WashFiltersState {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  statusFilter: 'ALL' | JobStatus;
  setStatusFilter: (value: 'ALL' | JobStatus) => void;
  supplierFilter: string;
  setSupplierFilter: (value: string) => void;
  statusOptions: DropdownOption[];
  supplierOptions: DropdownOption[];
}

export interface SlideFiltersState {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  statusFilter: 'ALL' | JobStatus;
  setStatusFilter: (value: 'ALL' | JobStatus) => void;
  directionFilter: SlideDirectionFilter;
  setDirectionFilter: (value: SlideDirectionFilter) => void;
  statusOptions: DropdownOption[];
}

export interface OverviewReportData {
  expense: OverviewExpenseStats;
  branchSplit: BranchExpenseSplit;
  supplierOverviewStats: SupplierOverviewStat[];
}

export interface WashReportData {
  analytics: WashAnalytics;
  filteredJobs: Job[];
  filters: WashFiltersState;
}

export interface SlideReportData {
  analytics: SlideAnalytics;
  filteredJobs: Job[];
  filters: SlideFiltersState;
}

export function useReportData() {
  const { jobs, jobsTruncated, suppliers, currentRole, currentBranchId, activeBranch } = useApp();

  // Active tab: overview | wash | slide
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  // Company filter: ALL | EV7 | GI (Only for ADMIN / MASTER)
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('ALL');

  // Wash Report Filters
  const [washSearchQuery, setWashSearchQuery] = useState('');
  const [washStatusFilter, setWashStatusFilter] = useState<'ALL' | JobStatus>('ALL');
  const [washSupplierFilter, setWashSupplierFilter] = useState<string>('ALL');

  // Slide Report Filters
  const [slideSearchQuery, setSlideSearchQuery] = useState('');
  const [slideStatusFilter, setSlideStatusFilter] = useState<'ALL' | JobStatus>('ALL');
  const [slideDirectionFilter, setSlideDirectionFilter] = useState<SlideDirectionFilter>('ALL');

  // ขอบเขตงานตามสาขาและบริษัท
  const baseJobs = useMemo(
    () => scopeJobsByBranch(jobs, currentRole, currentBranchId),
    [jobs, currentRole, currentBranchId]
  );

  const filteredJobs = useMemo(
    () => filterJobsByCompany(baseJobs, companyFilter, currentRole),
    [baseJobs, companyFilter, currentRole]
  );

  // 1. OVERALL STATS
  const overviewExpense = useMemo(
    () => computeOverviewExpenseStats(baseJobs, filteredJobs),
    [baseJobs, filteredJobs]
  );

  const supplierOverviewStats = useMemo(
    () => computeSupplierOverviewStats(suppliers, filteredJobs),
    [suppliers, filteredJobs]
  );

  // 2. CAR WASH ANALYTICS
  const washAnalytics = useMemo(() => computeWashAnalytics(filteredJobs), [filteredJobs]);

  const filteredWashReportJobs = useMemo(
    () =>
      filterWashReportJobs(washAnalytics.washJobs, {
        status: washStatusFilter,
        supplier: washSupplierFilter,
        searchQuery: washSearchQuery,
      }),
    [washAnalytics.washJobs, washStatusFilter, washSupplierFilter, washSearchQuery]
  );

  // 3. VEHICLE SLIDE ANALYTICS
  const slideAnalytics = useMemo(
    () => computeSlideAnalytics(filteredJobs, currentBranchId),
    [filteredJobs, currentBranchId]
  );

  const filteredSlideReportJobs = useMemo(
    () =>
      filterSlideReportJobs(
        slideAnalytics.slideJobs,
        {
          status: slideStatusFilter,
          direction: slideDirectionFilter,
          searchQuery: slideSearchQuery,
        },
        currentRole,
        currentBranchId
      ),
    [
      slideAnalytics.slideJobs,
      slideStatusFilter,
      slideDirectionFilter,
      slideSearchQuery,
      currentRole,
      currentBranchId,
    ]
  );

  // Branch Expense Distribution (Wash vs Slide)
  const branchSplit = useMemo(
    () =>
      computeBranchExpenseSplit(
        washAnalytics.washTotalExpense,
        slideAnalytics.slideTotalExpense
      ),
    [washAnalytics.washTotalExpense, slideAnalytics.slideTotalExpense]
  );

  // 4. SMART CSV EXPORT (Context-Aware based on active tab)
  const handleExportCSV = useCallback(() => {
    const { filename, csvContent } = buildReportCsv({
      activeTab,
      filteredJobs,
      filteredWashReportJobs,
      slideJobs: slideAnalytics.slideJobs,
    });
    downloadCsvFile(filename, csvContent);
  }, [activeTab, filteredJobs, filteredWashReportJobs, slideAnalytics.slideJobs]);

  const context: ReportContextInfo = {
    currentRole,
    currentBranchId,
    activeBranch,
    jobsTruncated,
  };

  const overview: OverviewReportData = {
    expense: overviewExpense,
    branchSplit,
    supplierOverviewStats,
  };

  const wash: WashReportData = {
    analytics: washAnalytics,
    filteredJobs: filteredWashReportJobs,
    filters: {
      searchQuery: washSearchQuery,
      setSearchQuery: setWashSearchQuery,
      statusFilter: washStatusFilter,
      setStatusFilter: setWashStatusFilter,
      supplierFilter: washSupplierFilter,
      setSupplierFilter: setWashSupplierFilter,
      statusOptions: REPORT_STATUS_OPTIONS,
      supplierOptions: washAnalytics.washSupplierOptions,
    },
  };

  const slide: SlideReportData = {
    analytics: slideAnalytics,
    filteredJobs: filteredSlideReportJobs,
    filters: {
      searchQuery: slideSearchQuery,
      setSearchQuery: setSlideSearchQuery,
      statusFilter: slideStatusFilter,
      setStatusFilter: setSlideStatusFilter,
      directionFilter: slideDirectionFilter,
      setDirectionFilter: setSlideDirectionFilter,
      statusOptions: REPORT_STATUS_OPTIONS,
    },
  };

  return {
    context,
    activeTab,
    setActiveTab,
    companyFilter,
    setCompanyFilter,
    overview,
    wash,
    slide,
    handleExportCSV,
  };
}
