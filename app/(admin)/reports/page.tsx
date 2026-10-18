'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatThaiDate } from '@/lib/date-utils';
import { JobStatus } from '@/types';
import CustomDropdown, { DropdownOption } from '@/components/ui/CustomDropdown';
import { 
  BarChart3, 
  FileDown, 
  Sparkles, 
  Truck, 
  CheckCircle2,
  XCircle,
  ArrowRight,
  Building2,
  MapPin,
  TrendingUp,
  Car,
  Clock,
  Layers,
  ChevronRight,
  Receipt,
  Search,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING_SUPPLIER: { label: 'รอ Supplier รับงาน', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'กำลังทำงาน', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
  WAITING_APPROVAL: { label: 'รอตรวจรับ', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-900 font-bold', dot: 'bg-orange-500' },
  APPROVED: { label: 'Approved พร้อมวางบิล', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-900 font-bold', dot: 'bg-emerald-600' },
  REJECTED: { label: 'ขอแก้ไข', bg: 'bg-red-50 border-red-200', text: 'text-red-800 font-bold', dot: 'bg-red-500' },
  INVOICED: { label: 'วางบิลแล้ว', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500' },
  CANCELLED: { label: 'ยกเลิก', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', dot: 'bg-gray-400' },
};

const cleanBranchName = (rawName?: string | null): string => {
  if (!rawName) return '-';
  return rawName.replace(/\s*CO\.,?\s*LTD\.?/gi, '').trim();
};

export default function ReportsPage() {
  const { jobs, suppliers, branches, currentRole, currentBranchId, activeBranch } = useApp();

  // Active tab: overview | wash | slide
  const [activeTab, setActiveTab] = useState<'overview' | 'wash' | 'slide'>('overview');

  // Company filter: ALL | EV7 | GI (Only for ADMIN / MASTER)
  const [companyFilter, setCompanyFilter] = useState<'ALL' | 'EV7' | 'GI'>('ALL');

  // Wash Report Filters
  const [washSearchQuery, setWashSearchQuery] = useState('');
  const [washStatusFilter, setWashStatusFilter] = useState<'ALL' | JobStatus>('ALL');
  const [washPackageFilter, setWashPackageFilter] = useState<'ALL' | 'STANDARD' | 'DEEP_CLEAN' | 'POLISH'>('ALL');

  // Status dropdown options for car wash reports matching project UI
  const washStatusOptions: DropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'สถานะทั้งหมด', dot: '#9ca3af' },
    { value: 'WAITING_APPROVAL', label: 'รอตรวจรับ', dot: '#f97316' },
    { value: 'APPROVED', label: 'Approved แล้ว', dot: '#10b981' },
    { value: 'IN_PROGRESS', label: 'กำลังทำงาน', dot: '#f59e0b' },
    { value: 'INVOICED', label: 'วางบิลแล้ว', dot: '#a855f7' },
    { value: 'REJECTED', label: 'ขอแก้ไข', dot: '#ef4444' },
  ], []);

  // Slide Report Filters
  const [slideSearchQuery, setSlideSearchQuery] = useState('');
  const [slideStatusFilter, setSlideStatusFilter] = useState<'ALL' | JobStatus>('ALL');
  const [slideDirectionFilter, setSlideDirectionFilter] = useState<'ALL' | 'OUTBOUND' | 'INBOUND'>('ALL');

  // Status dropdown options for slide reports matching project UI
  const slideStatusOptions: DropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'สถานะทั้งหมด', dot: '#9ca3af' },
    { value: 'WAITING_APPROVAL', label: 'รอตรวจรับ', dot: '#f97316' },
    { value: 'APPROVED', label: 'Approved แล้ว', dot: '#10b981' },
    { value: 'IN_PROGRESS', label: 'กำลังทำงาน', dot: '#f59e0b' },
    { value: 'INVOICED', label: 'วางบิลแล้ว', dot: '#a855f7' },
    { value: 'REJECTED', label: 'ขอแก้ไข', dot: '#ef4444' },
  ], []);

  // Base jobs: for BRANCH role, scope to jobs related to their branch
  const baseJobs = useMemo(() => {
    if (currentRole === 'BRANCH' && currentBranchId) {
      return jobs.filter(
        j => j.branchId === currentBranchId || j.originBranchId === currentBranchId || j.destBranchId === currentBranchId
      );
    }
    return jobs;
  }, [jobs, currentRole, currentBranchId]);

  // Filter jobs by selected company (Only applies to ADMIN / MASTER)
  const filteredJobs = useMemo(() => {
    if (currentRole === 'BRANCH' || companyFilter === 'ALL') return baseJobs;
    return baseJobs.filter(j => j.companyCode === companyFilter);
  }, [baseJobs, companyFilter, currentRole]);

  // ─────────────────────────────────────────────────────────────
  // 1. OVERALL STATS
  // ─────────────────────────────────────────────────────────────
  const totalExpense = useMemo(() => {
    return filteredJobs
      .filter(j => j.status === 'APPROVED' || j.status === 'INVOICED')
      .reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [filteredJobs]);

  const ev7Expense = useMemo(() => {
    return baseJobs
      .filter(j => (j.status === 'APPROVED' || j.status === 'INVOICED') && j.companyCode === 'EV7')
      .reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [baseJobs]);

  const giExpense = useMemo(() => {
    return baseJobs
      .filter(j => (j.status === 'APPROVED' || j.status === 'INVOICED') && j.companyCode === 'GI')
      .reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [baseJobs]);

  const ev7Pct = totalExpense > 0 ? Math.round((ev7Expense / totalExpense) * 100) : 0;
  const giPct = totalExpense > 0 ? Math.round((giExpense / totalExpense) * 100) : 0;

  // ─────────────────────────────────────────────────────────────
  // 2. CAR WASH ANALYTICS
  // ─────────────────────────────────────────────────────────────
  const washJobs = useMemo(() => filteredJobs.filter(j => j.jobType === 'CAR_WASH'), [filteredJobs]);
  const approvedWashJobs = useMemo(() => washJobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status)), [washJobs]);
  
  const washTotalExpense = useMemo(() => {
    return approvedWashJobs.reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [approvedWashJobs]);

  const totalCarsWashed = useMemo(() => {
    return washJobs.reduce((sum, j) => sum + (j.carWashItems?.length || 0), 0);
  }, [washJobs]);

  const avgCostPerCar = totalCarsWashed > 0 ? Math.round(washTotalExpense / totalCarsWashed) : 0;

  // Branch breakdown for Car Wash
  const branchWashStats = useMemo(() => {
    const map = new Map<string, { branchName: string; jobsCount: number; carsCount: number; totalCost: number }>();
    
    washJobs.forEach(j => {
      const bName = j.branchName || 'ไม่ระบุสาขา';
      const existing = map.get(bName) || { branchName: bName, jobsCount: 0, carsCount: 0, totalCost: 0 };
      existing.jobsCount += 1;
      existing.carsCount += (j.carWashItems?.length || 0);
      if (['APPROVED', 'INVOICED'].includes(j.status)) {
        existing.totalCost += getJobTotalCost(j);
      }
      map.set(bName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.carsCount - a.carsCount);
  }, [washJobs]);

  // Supplier breakdown for Car Wash
  const supplierWashStats = useMemo(() => {
    const map = new Map<string, { supplierName: string; jobsCount: number; carsCount: number; approvedCount: number; rejectedCount: number; totalCost: number }>();

    washJobs.forEach(j => {
      const sName = j.supplierName || 'ไม่ระบุ Supplier';
      const existing = map.get(sName) || { supplierName: sName, jobsCount: 0, carsCount: 0, approvedCount: 0, rejectedCount: 0, totalCost: 0 };
      existing.jobsCount += 1;
      existing.carsCount += (j.carWashItems?.length || 0);
      if (['APPROVED', 'INVOICED'].includes(j.status)) {
        existing.approvedCount += 1;
        existing.totalCost += getJobTotalCost(j);
      } else if (j.status === 'REJECTED') {
        existing.rejectedCount += 1;
      }
      map.set(sName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [washJobs]);

  // Wash Types breakdown
  const washTypeStats = useMemo(() => {
    const stats: Record<string, { label: string; count: number; cost: number }> = {
      STANDARD: { label: 'ล้างมาตรฐาน (Standard Wash)', count: 0, cost: 0 },
      DEEP_CLEAN: { label: 'ล้างพิเศษ / ดูดฝุ่น (Deep Clean)', count: 0, cost: 0 },
      POLISH: { label: 'ขัดเคลือบสี (Polish)', count: 0, cost: 0 },
    };

    washJobs.forEach(j => {
      const isApproved = ['APPROVED', 'INVOICED'].includes(j.status);
      (j.carWashItems || []).forEach(item => {
        const type = item.washType && stats[item.washType] ? item.washType : 'STANDARD';
        stats[type].count += 1;
        if (isApproved) {
          stats[type].cost += item.unitPrice || 0;
        }
      });
    });

    return Object.values(stats);
  }, [washJobs]);

  // Filtered wash jobs for the report table
  const filteredWashReportJobs = useMemo(() => {
    return washJobs.filter(j => {
      // Status filter
      if (washStatusFilter !== 'ALL' && j.status !== washStatusFilter) return false;

      // Package filter (match if job has any item with this washType)
      if (washPackageFilter !== 'ALL') {
        const hasPkg = (j.carWashItems || []).some(item => (item.washType || 'STANDARD') === washPackageFilter);
        if (!hasPkg) return false;
      }

      // Search query
      if (washSearchQuery.trim()) {
        const q = washSearchQuery.toLowerCase().trim();
        const matchJobNo = j.jobNumber?.toLowerCase().includes(q);
        const matchSupplier = j.supplierName?.toLowerCase().includes(q);
        const matchBranch = (j.branchName || '').toLowerCase().includes(q);
        const matchVin = j.carWashItems?.some(item => item.vin?.toLowerCase().includes(q));
        const matchPlate = j.carWashItems?.some(item => item.licensePlate?.toLowerCase().includes(q));
        const matchModel = j.carWashItems?.some(item => item.vehicleModel?.toLowerCase().includes(q));

        if (!matchJobNo && !matchSupplier && !matchBranch && !matchVin && !matchPlate && !matchModel) {
          return false;
        }
      }

      return true;
    });
  }, [washJobs, washStatusFilter, washPackageFilter, washSearchQuery]);

  // Package filter counts
  const washPackageCounts = useMemo(() => {
    let standard = 0;
    let deepClean = 0;
    let polish = 0;
    washJobs.forEach(j => {
      const items = j.carWashItems || [];
      if (items.some(i => (i.washType || 'STANDARD') === 'STANDARD')) standard += 1;
      if (items.some(i => i.washType === 'DEEP_CLEAN')) deepClean += 1;
      if (items.some(i => i.washType === 'POLISH')) polish += 1;
    });
    return { standard, deepClean, polish };
  }, [washJobs]);

  // Car models breakdown
  const carModelStats = useMemo(() => {
    const map = new Map<string, { model: string; count: number; totalCost: number }>();
    washJobs.forEach(j => {
      const isApproved = ['APPROVED', 'INVOICED'].includes(j.status);
      (j.carWashItems || []).forEach(item => {
        const modelName = item.vehicleModel?.trim() || 'ไม่ระบุรุ่น';
        const existing = map.get(modelName) || { model: modelName, count: 0, totalCost: 0 };
        existing.count += 1;
        if (isApproved) {
          existing.totalCost += item.unitPrice || 0;
        }
        map.set(modelName, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [washJobs]);

  // ─────────────────────────────────────────────────────────────
  // 3. VEHICLE SLIDE ANALYTICS
  // ─────────────────────────────────────────────────────────────
  const slideJobs = useMemo(() => filteredJobs.filter(j => j.jobType === 'VEHICLE_SLIDE'), [filteredJobs]);
  const approvedSlideJobs = useMemo(() => slideJobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status)), [slideJobs]);

  const slideTotalExpense = useMemo(() => {
    return approvedSlideJobs.reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [approvedSlideJobs]);

  const totalSlideCars = useMemo(() => {
    return slideJobs.reduce((sum, j) => {
      if (j.carWashItems && j.carWashItems.length > 0) return sum + j.carWashItems.length;
      return sum + (j.vin ? 1 : 0);
    }, 0);
  }, [slideJobs]);

  const avgCostPerSlideTrip = slideJobs.length > 0 ? Math.round(slideTotalExpense / slideJobs.length) : 0;

  // Branch Expense Distribution (Wash vs Slide)
  const combinedApprovedExpense = washTotalExpense + slideTotalExpense;
  const branchWashPct = combinedApprovedExpense > 0 ? Math.round((washTotalExpense / combinedApprovedExpense) * 100) : 0;
  const branchSlidePct = combinedApprovedExpense > 0 ? Math.round((slideTotalExpense / combinedApprovedExpense) * 100) : 0;

  // Filtered slide jobs for the report table
  const filteredSlideReportJobs = useMemo(() => {
    return slideJobs.filter(j => {
      // Status filter
      if (slideStatusFilter !== 'ALL' && j.status !== slideStatusFilter) return false;

      // Direction filter (for BRANCH role)
      if (currentRole === 'BRANCH' && currentBranchId) {
        const isOutbound = j.originBranchId === currentBranchId;
        const isInbound = j.destBranchId === currentBranchId;
        if (slideDirectionFilter === 'OUTBOUND' && !isOutbound) return false;
        if (slideDirectionFilter === 'INBOUND' && !isInbound) return false;
      }

      // Search query
      if (slideSearchQuery.trim()) {
        const q = slideSearchQuery.toLowerCase().trim();
        const matchJobNo = j.jobNumber?.toLowerCase().includes(q);
        const matchSupplier = j.supplierName?.toLowerCase().includes(q);
        const matchOrigin = (j.originBranchName || j.branchName || '').toLowerCase().includes(q);
        const matchDest = (j.destBranchName || j.customDestAddress || '').toLowerCase().includes(q);
        const matchVin = j.vin?.toLowerCase().includes(q) || j.carWashItems?.some(item => item.vin?.toLowerCase().includes(q));
        const matchPlate = j.vehicle?.licensePlate?.toLowerCase().includes(q) || j.carWashItems?.some(item => item.licensePlate?.toLowerCase().includes(q));
        const matchModel = j.vehicle?.model?.toLowerCase().includes(q) || j.carWashItems?.some(item => item.vehicleModel?.toLowerCase().includes(q));

        if (!matchJobNo && !matchSupplier && !matchOrigin && !matchDest && !matchVin && !matchPlate && !matchModel) {
          return false;
        }
      }

      return true;
    });
  }, [slideJobs, slideStatusFilter, slideDirectionFilter, slideSearchQuery, currentRole, currentBranchId]);

  // Direction counts for slide report tabs
  const outboundSlideJobsCount = useMemo(() => {
    if (!currentBranchId) return 0;
    return slideJobs.filter(j => j.originBranchId === currentBranchId).length;
  }, [slideJobs, currentBranchId]);

  const inboundSlideJobsCount = useMemo(() => {
    if (!currentBranchId) return 0;
    return slideJobs.filter(j => j.destBranchId === currentBranchId).length;
  }, [slideJobs, currentBranchId]);

  // Branch breakdown for Slide (Origin branches sending cars out)
  const branchSlideStats = useMemo(() => {
    const map = new Map<string, { branchName: string; outboundTrips: number; outboundCars: number; totalCost: number }>();

    slideJobs.forEach(j => {
      const bName = j.originBranchName || j.branchName || 'ไม่ระบุสาขา';
      const carCount = j.carWashItems && j.carWashItems.length > 0 ? j.carWashItems.length : (j.vin ? 1 : 0);

      const existing = map.get(bName) || { branchName: bName, outboundTrips: 0, outboundCars: 0, totalCost: 0 };
      existing.outboundTrips += 1;
      existing.outboundCars += carCount;
      if (['APPROVED', 'INVOICED'].includes(j.status)) {
        existing.totalCost += getJobTotalCost(j);
      }
      map.set(bName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.outboundCars - a.outboundCars);
  }, [slideJobs]);

  // Supplier breakdown for Vehicle Slide
  const supplierSlideStats = useMemo(() => {
    const map = new Map<string, { supplierName: string; tripsCount: number; carsCount: number; approvedCount: number; rejectedCount: number; totalCost: number }>();

    slideJobs.forEach(j => {
      const sName = j.supplierName || 'ไม่ระบุ Supplier';
      const carCount = j.carWashItems && j.carWashItems.length > 0 ? j.carWashItems.length : (j.vin ? 1 : 0);

      const existing = map.get(sName) || { supplierName: sName, tripsCount: 0, carsCount: 0, approvedCount: 0, rejectedCount: 0, totalCost: 0 };
      existing.tripsCount += 1;
      existing.carsCount += carCount;
      if (['APPROVED', 'INVOICED'].includes(j.status)) {
        existing.approvedCount += 1;
        existing.totalCost += getJobTotalCost(j);
      } else if (j.status === 'REJECTED') {
        existing.rejectedCount += 1;
      }
      map.set(sName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [slideJobs]);

  // ─────────────────────────────────────────────────────────────
  // 4. SMART CSV EXPORT (Context-Aware based on active tab)
  // ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const sanitizeCell = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    let filename = `Supplier_Jobs_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === 'wash') {
      filename = `Car_Wash_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['เลขที่ใบงาน', 'วันที่สร้าง', 'บริษัท', 'สาขา', 'Supplier', 'VIN', 'ทะเบียน', 'รุ่นรถ', 'แพ็กเกจล้าง', 'ราคาต่อคัน', 'สถานะ'];
      rows = [];
      filteredWashReportJobs.forEach(j => {
        if (j.carWashItems && j.carWashItems.length > 0) {
          j.carWashItems.forEach(item => {
            rows.push([
              sanitizeCell(j.jobNumber),
              sanitizeCell(formatThaiDate(j.createdAt)),
              sanitizeCell(j.companyCode),
              sanitizeCell(j.branchName),
              sanitizeCell(j.supplierName),
              sanitizeCell(item.vin),
              sanitizeCell(item.licensePlate || '-'),
              sanitizeCell(item.vehicleModel || '-'),
              sanitizeCell(item.washType || 'STANDARD'),
              sanitizeCell(item.unitPrice || 0),
              sanitizeCell(j.status),
            ]);
          });
        } else {
          rows.push([
            sanitizeCell(j.jobNumber),
            sanitizeCell(formatThaiDate(j.createdAt)),
            sanitizeCell(j.companyCode),
            sanitizeCell(j.branchName),
            sanitizeCell(j.supplierName),
            sanitizeCell('-'),
            sanitizeCell('-'),
            sanitizeCell('-'),
            sanitizeCell('-'),
            sanitizeCell(getJobTotalCost(j)),
            sanitizeCell(j.status),
          ]);
        }
      });
    } else if (activeTab === 'slide') {
      filename = `Vehicle_Slide_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['เลขที่ใบงาน', 'วันที่สร้าง', 'บริษัท', 'สาขาต้นทาง', 'สาขาปลายทาง', 'ระยะทาง(กม.)', 'Supplier', 'จำนวนรถ', 'ค่าบริการรวม', 'สถานะ'];
      rows = slideJobs.map(j => {
        const carCount = j.carWashItems && j.carWashItems.length > 0 ? j.carWashItems.length : (j.vin ? 1 : 0);
        return [
          sanitizeCell(j.jobNumber),
          sanitizeCell(formatThaiDate(j.createdAt)),
          sanitizeCell(j.companyCode),
          sanitizeCell(j.originBranchName || j.branchName || '-'),
          sanitizeCell(j.destBranchName || j.customDestAddress || '-'),
          sanitizeCell(j.distance || '-'),
          sanitizeCell(j.supplierName),
          sanitizeCell(carCount),
          sanitizeCell(getJobTotalCost(j)),
          sanitizeCell(j.status),
        ];
      });
    } else {
      headers = ['JobNumber', 'JobType', 'Company', 'Branch', 'Supplier', 'Status', 'Cost', 'CreatedAt'];
      rows = filteredJobs.map(j => [
        sanitizeCell(j.jobNumber),
        sanitizeCell(j.jobType),
        sanitizeCell(j.companyCode),
        sanitizeCell(j.branchName),
        sanitizeCell(j.supplierName),
        sanitizeCell(j.status),
        sanitizeCell(getJobTotalCost(j)),
        sanitizeCell(j.createdAt),
      ]);
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-700 shrink-0" />
            <span>รายงานสรุปและสถิติ</span>
            {currentRole === 'BRANCH' && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                {activeBranch?.name || 'สาขา'}
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentRole === 'BRANCH'
              ? `ภาพรวมค่าใช้จ่ายและสถิติงานบริการเฉพาะสาขา ${activeBranch?.name || ''}`
              : 'ภาพรวมค่าใช้จ่าย สถิติงานล้างรถ และงานรถสไลด์ขนส่งรถยนต์'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Branch Badge - Only for BRANCH users */}
          {currentRole === 'BRANCH' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-900 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{activeBranch?.name || 'สาขาของคุณ'}</span>
            </div>
          )}

          {/* Company Filter Pill - Only for ADMIN / MASTER */}
          {currentRole !== 'BRANCH' && (
            <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-semibold">
              {(['ALL', 'EV7', 'GI'] as const).map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCompanyFilter(code)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    companyFilter === code
                      ? 'bg-white text-emerald-950 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {code === 'ALL' ? 'ทุกบริษัท' : code}
                </button>
              ))}
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* ─── Segmented Tab Bar ─── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-gray-100/90 rounded-2xl w-full sm:w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-emerald-950 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-700" />
          <span>ภาพรวมระบบ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wash')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'wash'
              ? 'bg-white text-emerald-950 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>งานล้างรถ (Car Wash)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
            {washJobs.length} ใบ
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('slide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'slide'
              ? 'bg-white text-emerald-950 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Truck className="w-4 h-4 text-sky-600" />
          <span>งานรถสไลด์ (Vehicle Slide)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-900 text-[10px] font-bold">
            {slideJobs.length} เที่ยว
          </span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* TAB 1: OVERVIEW (ภาพรวม)                                  */}
      {/* ═════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Hero Banner: Total Expense */}
          <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-[#0f5238] to-[#1a7a56] text-white shadow-md">
            <span className="text-xs font-medium text-emerald-200 uppercase tracking-wider">
              {currentRole === 'BRANCH'
                ? `ค่าบริการตรวจรับแล้วทั้งหมด (${activeBranch?.name || 'สาขาของคุณ'})`
                : `ค่าบริการตรวจรับแล้วทั้งหมด (${companyFilter === 'ALL' ? 'ทุกบริษัท' : companyFilter})`}
            </span>
            <div className="text-3xl md:text-5xl font-bold mt-1.5 tracking-tight font-mono">
              ฿{totalExpense.toLocaleString()}
            </div>
            <p className="text-xs text-emerald-100/70 mt-1">
              {currentRole === 'BRANCH'
                ? `คำนวณจากงานสถานะ Approved และ Invoiced ทั้งหมดของสาขา ${activeBranch?.name || ''}`
                : 'คำนวณจากงานสถานะ Approved และ Invoiced ทั้งหมดในระบบ'}
            </p>

            {/* Split bar: For BRANCH -> Wash vs Slide; For ADMIN/MASTER -> EV7 vs GI */}
            {currentRole === 'BRANCH' ? (
              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden flex">
                    {branchWashPct > 0 && <div className="h-full bg-amber-400 rounded-l-full transition-all" style={{ width: `${branchWashPct}%` }} />}
                    {branchSlidePct > 0 && <div className="h-full bg-sky-400 rounded-r-full transition-all" style={{ width: `${branchSlidePct}%` }} />}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-white/80">ล้างรถ ({approvedWashJobs.length} ใบ)</span>
                    <span className="font-bold">฿{washTotalExpense.toLocaleString()}</span>
                    <span className="text-amber-200/80 font-mono">({branchWashPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span className="text-white/80">รถสไลด์ ({approvedSlideJobs.length} เที่ยว)</span>
                    <span className="font-bold">฿{slideTotalExpense.toLocaleString()}</span>
                    <span className="text-sky-200/80 font-mono">({branchSlidePct}%)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden flex">
                    {ev7Pct > 0 && <div className="h-full bg-emerald-300 rounded-l-full transition-all" style={{ width: `${ev7Pct}%` }} />}
                    {giPct > 0 && <div className="h-full bg-sky-300 rounded-r-full transition-all" style={{ width: `${giPct}%` }} />}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
                    <span className="text-white/80">EV7</span>
                    <span className="font-bold">฿{ev7Expense.toLocaleString()}</span>
                    <span className="text-emerald-200/60 font-mono">({ev7Pct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-300" />
                    <span className="text-white/80">GI</span>
                    <span className="font-bold">฿{giExpense.toLocaleString()}</span>
                    <span className="text-sky-200/60 font-mono">({giPct}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick-Switch Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Car Wash Quick Card */}
            <div 
              onClick={() => setActiveTab('wash')}
              className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-amber-800 transition-colors">
                        งานล้างรถ (Car Wash)
                      </h3>
                      <p className="text-[11px] text-gray-400">สรุปงานล้างรถและคาร์แคร์</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                    <span>ดูรายงาน</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">ใบสั่งงาน</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{washJobs.length} ใบ</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">รถที่ส่งล้าง</p>
                    <p className="text-lg font-bold text-amber-700 mt-0.5">{totalCarsWashed} คัน</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">ยอดเงินรวม</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5 font-mono">฿{washTotalExpense.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Slide Quick Card */}
            <div 
              onClick={() => setActiveTab('slide')}
              className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/70 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      <Truck className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-sky-800 transition-colors">
                        งานรถสไลด์ (Vehicle Slide)
                      </h3>
                      <p className="text-[11px] text-gray-400">สรุปการขนส่งและย้ายรถ</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 group-hover:translate-x-0.5 transition-transform">
                    <span>ดูรายงาน</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">จำนวนเที่ยว</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{slideJobs.length} เที่ยว</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">รถที่ขนย้าย</p>
                    <p className="text-lg font-bold text-sky-700 mt-0.5">{totalSlideCars} คัน</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">ยอดเงินรวม</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5 font-mono">฿{slideTotalExpense.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Performance Table */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">ผลงาน Supplier ทุกบริการ</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">สรุปผลงานและการเบิกจ่ายยอดเงินตาม Supplier ทั้งหมดในระบบ</p>
              </div>
              <span className="text-xs text-gray-500 font-medium">{suppliers.length} ราย</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                    <th className="py-3 px-5">ชื่อ Supplier</th>
                    <th className="py-3 px-4">บริการ</th>
                    <th className="py-3 px-4 text-center">งานทั้งหมด</th>
                    <th className="py-3 px-4 text-center">Approved</th>
                    <th className="py-3 px-4 text-center">ขอแก้ไข</th>
                    <th className="py-3 px-5 text-right">ยอดรวมค่าบริการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suppliers.map(sup => {
                    const sJobs = filteredJobs.filter(j => j.supplierId === sup.id);
                    const sApproved = sJobs.filter(j => j.status === 'APPROVED' || j.status === 'INVOICED');
                    const sRejected = sJobs.filter(j => j.status === 'REJECTED');
                    const sCost = sApproved.reduce((sum, j) => sum + getJobTotalCost(j), 0);

                    return (
                      <tr key={sup.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-gray-900">{sup.name}</td>
                        <td className="py-3.5 px-4 text-gray-600">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-medium">
                            {Array.isArray(sup.services) ? sup.services.join(', ') : sup.services}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-gray-800">{sJobs.length}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                          {sApproved.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {sApproved.length}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-red-600">
                          {sRejected.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              {sRejected.length}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono">
                          ฿{sCost.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* TAB 2: CAR WASH REPORT (รายงานงานล้างรถ)                  */}
      {/* ═════════════════════════════════════════════════════════ */}
      {activeTab === 'wash' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400">ยอดเงินล้างรถตรวจรับแล้ว</span>
              <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">฿{washTotalExpense.toLocaleString()}</p>
              <div className="mt-2 text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>ตรวจรับแล้ว {approvedWashJobs.length} ใบงาน</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400">จำนวนรถที่ส่งล้างทั้งหมด</span>
              <p className="text-2xl font-bold text-amber-700 mt-2">{totalCarsWashed} <span className="text-xs font-normal text-gray-400">คัน</span></p>
              <div className="mt-2 text-[10px] text-gray-500 font-medium">
                จากใบสั่งงาน {washJobs.length} ใบ
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400">ค่าล้างเฉลี่ยต่อคัน</span>
              <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">฿{avgCostPerCar.toLocaleString()}</p>
              <div className="mt-2 text-[10px] text-gray-500 font-medium">
                คำนวณจากยอดตรวจรับแล้ว
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400">ร้านคาร์แคร์ที่ร่วมงาน</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{supplierWashStats.length} <span className="text-xs font-normal text-gray-400">ร้าน</span></p>
              <div className="mt-2 text-[10px] text-gray-500 font-medium">
                ให้บริการ {branchWashStats.length} สาขา
              </div>
            </div>
          </div>

          {/* Section 1: รายงานการล้างรถทั้งหมดของสาขา (All Car Wash Jobs Report) */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-xs">
            {/* ── Card Header (Title & Subtitle) ── */}
            <div className="p-5 border-b border-gray-100 rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-amber-50/40 via-white to-white">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">
                      {currentRole === 'BRANCH'
                        ? 'รายงานการล้างรถทั้งหมดของสาขา'
                        : 'รายงานการล้างรถทั้งหมด (Car Wash Report)'}
                    </h3>
                    {currentRole === 'BRANCH' && activeBranch && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-bold whitespace-nowrap">
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{activeBranch.name}</span>
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-xs font-bold whitespace-nowrap">
                      รวม {filteredWashReportJobs.length} ใบงาน
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {currentRole === 'BRANCH'
                      ? 'รายการใบสั่งล้างรถทั้งหมดของสาขา พร้อมรายละเอียดรถ แพ็กเกจที่ล้าง และค่าบริการ'
                      : 'ประวัติและรายการใบสั่งล้างรถทั้งหมดในระบบ พร้อมรายละเอียดรถ แพ็กเกจที่ล้าง และค่าบริการ'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Filter Toolbar ── */}
            <div className="p-3 bg-gray-50/70 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Left: Service Package Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center p-1 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setWashPackageFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                      washPackageFilter === 'ALL'
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>ทั้งหมด</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      washPackageFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {washJobs.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWashPackageFilter('STANDARD')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                      washPackageFilter === 'STANDARD'
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>ล้างมาตรฐาน</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      washPackageFilter === 'STANDARD' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {washPackageCounts.standard}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWashPackageFilter('DEEP_CLEAN')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                      washPackageFilter === 'DEEP_CLEAN'
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>ล้างพิเศษ / ดูดฝุ่น</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      washPackageFilter === 'DEEP_CLEAN' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {washPackageCounts.deepClean}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWashPackageFilter('POLISH')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                      washPackageFilter === 'POLISH'
                        ? 'bg-amber-600 text-white shadow-2xs font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>ขัดเคลือบสี</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      washPackageFilter === 'POLISH' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {washPackageCounts.polish}
                    </span>
                  </button>
                </div>
              </div>

              {/* Right: Status Dropdown & Search Input */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-44 sm:w-48">
                  <CustomDropdown
                    value={washStatusFilter}
                    onChange={(val) => setWashStatusFilter(val as any)}
                    options={washStatusOptions}
                    dropdownWidth="w-48"
                    align="right"
                    buttonClassName="!h-9 !py-1.5 !px-3 !rounded-xl !bg-white text-xs font-semibold"
                  />
                </div>

                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={washSearchQuery}
                    onChange={(e) => setWashSearchQuery(e.target.value)}
                    placeholder="ค้นหาใบงาน, ทะเบียน, VIN, รุ่นรถ..."
                    className="w-full h-9 pl-9 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-2xs transition-all"
                  />
                  {washSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWashSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-b-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4 whitespace-nowrap">เลขที่ใบงาน / วันที่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">ร้านคาร์แคร์ (Supplier)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">จำนวนรถ & รายการรถ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">แพ็กเกจบริการ</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">ยอดรวมค่าล้าง</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredWashReportJobs.map(j => {
                    const st = STATUS_MAP[j.status] || { label: j.status, bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', dot: 'bg-gray-400' };
                    const items = j.carWashItems || [];
                    const stdCount = items.filter(i => (i.washType || 'STANDARD') === 'STANDARD').length;
                    const deepCount = items.filter(i => i.washType === 'DEEP_CLEAN').length;
                    const polCount = items.filter(i => i.washType === 'POLISH').length;

                    return (
                      <tr key={j.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Job Number & Date */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-gray-900 text-xs tracking-tight whitespace-nowrap">
                                {j.jobNumber}
                              </span>
                              {j.companyCode && (
                                <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded-md bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                                  {j.companyCode}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                              {formatThaiDate(j.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* Supplier */}
                        <td className="py-4 px-4 min-w-[170px]">
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0 mt-0.5">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 text-xs leading-snug">
                                {j.supplierName || 'ไม่ระบุ Supplier'}
                              </span>
                              {currentRole !== 'BRANCH' && j.branchName && (
                                <span className="text-[10px] text-gray-400">
                                  สาขา: {cleanBranchName(j.branchName)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cars & Details */}
                        <td className="py-4 px-4 min-w-[200px]">
                          {items.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold whitespace-nowrap">
                                  {items.length} คัน
                                </span>
                                <span className="text-xs font-semibold text-gray-900 truncate max-w-[140px]" title={items[0]?.vehicleModel || 'รถยนต์'}>
                                  {items[0]?.vehicleModel || 'รถยนต์'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                {items[0]?.licensePlate ? (
                                  <span className="font-medium text-gray-700">
                                    ทะเบียน: {items[0].licensePlate}
                                  </span>
                                ) : items[0]?.vin ? (
                                  <span className="font-mono text-gray-400">
                                    VIN: ...{items[0].vin.slice(-8)}
                                  </span>
                                ) : null}

                                {items.length > 1 && (
                                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50/80 px-1.5 py-0.2 rounded">
                                    + อีก {items.length - 1} คัน
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        {/* Packages */}
                        <td className="py-4 px-4 min-w-[180px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {stdCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 text-[10px] font-semibold whitespace-nowrap">
                                ล้างมาตรฐาน {stdCount > 1 ? `(${stdCount})` : ''}
                              </span>
                            )}
                            {deepCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200/80 text-[10px] font-semibold whitespace-nowrap">
                                ดูดฝุ่น {deepCount > 1 ? `(${deepCount})` : ''}
                              </span>
                            )}
                            {polCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200/80 text-[10px] font-semibold whitespace-nowrap">
                                ขัดเคลือบสี {polCount > 1 ? `(${polCount})` : ''}
                              </span>
                            )}
                            {items.length === 0 && (
                              <span className="text-[11px] text-gray-400">ล้างมาตรฐาน</span>
                            )}
                          </div>
                        </td>

                        {/* Total Cost */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span className="font-bold text-gray-900 font-mono text-sm">
                            ฿{getJobTotalCost(j).toLocaleString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.text} shadow-2xs whitespace-nowrap`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0`} />
                            <span>{st.label}</span>
                          </span>
                        </td>

                        {/* Action Link */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <a
                            href={`/jobs?q=${encodeURIComponent(j.jobNumber)}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-[#0f5238] hover:text-white border border-gray-200 text-gray-700 text-xs font-semibold transition-all shadow-2xs whitespace-nowrap cursor-pointer group"
                          >
                            <span>ดูใบงาน</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredWashReportJobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-semibold text-gray-600">
                            {washSearchQuery || washStatusFilter !== 'ALL' || washPackageFilter !== 'ALL'
                              ? 'ไม่พบข้อมูลใบงานล้างรถตามเงื่อนไขที่ค้นหา'
                              : 'ยังไม่มีประวัติการสั่งล้างรถในระบบ'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: สถิติงานล้างรถแยกตามสาขา (Branch Breakdown) - เฉพาะแอดมิน */}
          {currentRole !== 'BRANCH' && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-gray-900">
                    ปริมาณงานล้างรถแยกตามสาขา
                  </h3>
                </div>
                <span className="text-xs text-gray-400 font-medium">{branchWashStats.length} สาขา</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                      <th className="py-3 px-5 whitespace-nowrap">สาขา</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap">ใบสั่งงาน</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap">จำนวนรถ (คัน)</th>
                      <th className="py-3 px-6 whitespace-nowrap">สัดส่วนจำนวนรถ</th>
                      <th className="py-3 px-5 text-right whitespace-nowrap">ยอดรวมค่าล้าง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {branchWashStats.map(b => {
                      const pct = totalCarsWashed > 0 ? Math.round((b.carsCount / totalCarsWashed) * 100) : 0;
                      return (
                        <tr key={b.branchName} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-5 font-bold text-gray-900 whitespace-nowrap">{b.branchName}</td>
                          <td className="py-3.5 px-4 text-center font-medium text-gray-700 whitespace-nowrap">{b.jobsCount} ใบ</td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-700 whitespace-nowrap">{b.carsCount} คัน</td>
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="font-mono text-[10px] text-gray-500 w-8">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono whitespace-nowrap">
                            ฿{b.totalCost.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                    {branchWashStats.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          ยังไม่มีประวัติการส่งล้างรถในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: สถิติแยกตาม Supplier คาร์แคร์ (Supplier Breakdown) */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-gray-900">ผลงานร้านคาร์แคร์ (Car Wash Suppliers)</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">{supplierWashStats.length} ราย</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                    <th className="py-3 px-5 whitespace-nowrap">ชื่อ Supplier</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">ใบสั่งงาน</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">จำนวนรถ (คัน)</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">ตรวจรับผ่าน</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">ขอแก้ไข</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">อัตราผ่านตรวจรับ</th>
                    <th className="py-3 px-5 text-right whitespace-nowrap">ยอดเบิกจ่ายสะสม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplierWashStats.map(s => {
                    const totalReviewed = s.approvedCount + s.rejectedCount;
                    const passRate = totalReviewed > 0 ? Math.round((s.approvedCount / totalReviewed) * 100) : 100;
                    return (
                      <tr key={s.supplierName} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-gray-900 whitespace-nowrap">{s.supplierName}</td>
                        <td className="py-3.5 px-4 text-center font-medium text-gray-700 whitespace-nowrap">{s.jobsCount} ใบ</td>
                        <td className="py-3.5 px-4 text-center font-bold text-amber-700 whitespace-nowrap">{s.carsCount} คัน</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-700 whitespace-nowrap">
                          {s.approvedCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {s.approvedCount}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-red-600 whitespace-nowrap">
                          {s.rejectedCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              {s.rejectedCount}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {totalReviewed > 0 ? (
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${passRate >= 90 ? 'bg-emerald-500' : passRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${passRate}%` }}
                                />
                              </div>
                              <span className={`font-mono text-[11px] font-bold ${passRate >= 90 ? 'text-emerald-700' : passRate >= 70 ? 'text-amber-700' : 'text-red-600'}`}>
                                {passRate}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono whitespace-nowrap">
                          ฿{s.totalCost.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {supplierWashStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        ยังไม่มีข้อมูล Supplier คาร์แคร์
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: สรุปตามประเภทการล้าง และ สถิติแยกรุ่นรถยนต์ (Service Packages & Car Models) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: 3 Service Package Cards */}
            <div className="lg:col-span-7 flex flex-col gap-3.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-gray-900">แพ็กเกจบริการล้างรถ (Service Packages)</h3>
                </div>
                <span className="text-xs text-gray-400 font-medium">รวม 3 แพ็กเกจ</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {washTypeStats.map(t => {
                  const pct = totalCarsWashed > 0 ? Math.round((t.count / totalCarsWashed) * 100) : 0;
                  return (
                    <div key={t.label} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-900 leading-snug line-clamp-1" title={t.label}>
                          {t.label}
                        </span>
                        <div className="flex items-baseline justify-between mt-3">
                          <p className="text-xl font-bold text-amber-800">{t.count} <span className="text-xs font-normal text-gray-400">คัน</span></p>
                          <p className="text-xs font-bold text-gray-900 font-mono">฿{t.cost.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span>สัดส่วน</span>
                          <span className="font-mono font-semibold">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full" 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Car Models Breakdown */}
            <div className="lg:col-span-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-gray-900">สถิติแยกรุ่นรถยนต์ (Car Models)</h3>
                </div>
                <span className="text-xs text-gray-400 font-medium">{carModelStats.length} รุ่น</span>
              </div>

              <div className="p-4 flex-1">
                {carModelStats.length > 0 ? (
                  <div className="space-y-3">
                    {carModelStats.slice(0, 5).map(m => {
                      const pct = totalCarsWashed > 0 ? Math.round((m.count / totalCarsWashed) * 100) : 0;
                      return (
                        <div key={m.model} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800 truncate max-w-[180px]" title={m.model}>
                              {m.model}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-800">{m.count} คัน</span>
                              <span className="text-gray-400 font-mono text-[11px]">({pct}%)</span>
                              <span className="font-mono font-semibold text-gray-700 text-xs">฿{m.totalCost.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center py-6 text-gray-400 text-xs">
                    ยังไม่มีข้อมูลรุ่นรถที่ส่งล้าง
                  </div>
                )}
              </div>

              {carModelStats.length > 5 && (
                <div className="px-5 py-2.5 bg-gray-50/70 border-t border-gray-100 text-[11px] text-gray-500 text-center font-medium">
                  แสดง 5 อันดับแรก จากทั้งหมด {carModelStats.length} รุ่น
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* TAB 3: VEHICLE SLIDE REPORT (รายงานรถสไลด์)              */}
      {/* ═════════════════════════════════════════════════════════ */}
      {activeTab === 'slide' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400">ยอดเงินรถสไลด์ตรวจรับแล้ว</span>
              <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">฿{slideTotalExpense.toLocaleString()}</p>
              <div className="mt-2 text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>ตรวจรับแล้ว {approvedSlideJobs.length} เที่ยว</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400">จำนวนเที่ยวขนส่งทั้งหมด</span>
              <p className="text-2xl font-bold text-sky-700 mt-2">{slideJobs.length} <span className="text-xs font-normal text-gray-400">เที่ยว</span></p>
              <div className="mt-2 text-[10px] text-gray-500 font-medium">
                ขนย้ายรถรวม {totalSlideCars} คัน
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400">ค่าบริการเฉลี่ยต่อเที่ยว</span>
              <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">฿{avgCostPerSlideTrip.toLocaleString()}</p>
              <div className="mt-2 text-[10px] text-gray-500 font-medium">
                คำนวณจากยอดตรวจรับแล้ว
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-gray-400">Supplier รถสไลด์</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{supplierSlideStats.length} <span className="text-xs font-normal text-gray-400">เจ้า</span></p>
              <div className="mt-2 text-[10px] text-blue-700 font-medium">
                {currentRole === 'BRANCH' ? `ให้บริการสาขานี้ ${slideJobs.length} เที่ยว` : `ให้บริการรวม ${slideJobs.length} เที่ยว`}
              </div>
            </div>
          </div>

          {/* Section 1: รายงานการสไลด์รถทั้งหมดของสาขา (All Vehicle Slide Jobs) */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-xs">
            {/* ── Card Header (Title & Subtitle) ── */}
            <div className="p-5 border-b border-gray-100 rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-sky-50/40 via-white to-white">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">
                      {currentRole === 'BRANCH'
                        ? 'รายงานการสไลด์รถทั้งหมดของสาขา'
                        : 'รายงานการสไลด์รถทั้งหมด (Vehicle Slide Report)'}
                    </h3>
                    {currentRole === 'BRANCH' && activeBranch && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-bold whitespace-nowrap">
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{activeBranch.name}</span>
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-100/80 text-sky-900 text-xs font-bold whitespace-nowrap">
                      รวม {filteredSlideReportJobs.length} ใบงาน
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {currentRole === 'BRANCH'
                      ? 'รายการใบงานขนส่งรถสไลด์ทั้งหมดของสาขา ทั้งเที่ยวส่งรถออกและรับรถเข้า พร้อมสถานะและค่าบริการ'
                      : 'ประวัติและรายการใบงานขนส่งรถสไลด์ทั้งหมดในระบบ พร้อมสถานะและค่าบริการ'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Filter Toolbar ── */}
            <div className="p-3 bg-gray-50/70 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Left: Direction Tabs (for Branch) */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentRole === 'BRANCH' && (
                  <div className="flex items-center p-1 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setSlideDirectionFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                        slideDirectionFilter === 'ALL'
                          ? 'bg-sky-600 text-white shadow-2xs font-bold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span>ทั้งหมด</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        slideDirectionFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {slideJobs.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlideDirectionFilter('OUTBOUND')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                        slideDirectionFilter === 'OUTBOUND'
                          ? 'bg-amber-500 text-white shadow-2xs font-bold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>ส่งออก</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        slideDirectionFilter === 'OUTBOUND' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {outboundSlideJobsCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlideDirectionFilter('INBOUND')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                        slideDirectionFilter === 'INBOUND'
                          ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>รับเข้า</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        slideDirectionFilter === 'INBOUND' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {inboundSlideJobsCount}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Status Dropdown & Search Input */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-44 sm:w-48">
                  <CustomDropdown
                    value={slideStatusFilter}
                    onChange={(val) => setSlideStatusFilter(val as any)}
                    options={slideStatusOptions}
                    dropdownWidth="w-48"
                    align="right"
                    buttonClassName="!h-9 !py-1.5 !px-3 !rounded-xl !bg-white text-xs font-semibold"
                  />
                </div>

                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={slideSearchQuery}
                    onChange={(e) => setSlideSearchQuery(e.target.value)}
                    placeholder="ค้นหาใบงาน, ทะเบียน, VIN..."
                    className="w-full h-9 pl-9 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none shadow-2xs transition-all"
                  />
                  {slideSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSlideSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-b-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4 whitespace-nowrap">เลขที่ใบงาน / วันที่</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">เส้นทางขนส่ง (ต้นทาง ➔ ปลายทาง)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">รถที่ขนย้าย</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Supplier ผู้ให้บริการ</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">ระยะทาง</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">ค่าบริการสไลด์</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">สถานะ</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSlideReportJobs.map(j => {
                    const st = STATUS_MAP[j.status] || { label: j.status, bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', dot: 'bg-gray-400' };
                    const isOutbound = currentRole === 'BRANCH' && currentBranchId && j.originBranchId === currentBranchId;
                    const isInbound = currentRole === 'BRANCH' && currentBranchId && j.destBranchId === currentBranchId;

                    return (
                      <tr key={j.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Job Number & Date */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-gray-900 text-xs tracking-tight whitespace-nowrap">
                                {j.jobNumber}
                              </span>
                              {j.companyCode && (
                                <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded-md bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                                  {j.companyCode}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                              {formatThaiDate(j.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* Route & Direction */}
                        <td className="py-4 px-4 min-w-[280px]">
                          <div className="flex flex-col gap-1.5">
                            {currentRole === 'BRANCH' && (
                              <div>
                                {isOutbound ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs whitespace-nowrap">
                                    <ArrowUpRight className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>ส่งรถออก (Outbound)</span>
                                  </span>
                                ) : isInbound ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs whitespace-nowrap">
                                    <ArrowDownLeft className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>รับรถเข้า (Inbound)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                                    <span>ทั่วไป</span>
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="flex items-center gap-1 min-w-0 max-w-[150px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span className="font-semibold text-gray-900 truncate" title={j.originBranchName || j.branchName}>
                                  {cleanBranchName(j.originBranchName || j.branchName || 'ต้นทาง')}
                                </span>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <div className="flex items-center gap-1 min-w-0 max-w-[150px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-bold text-sky-950 truncate" title={j.destBranchName || j.customDestAddress}>
                                  {cleanBranchName(j.destBranchName || j.customDestAddress || 'ปลายทาง')}
                                </span>
                              </div>
                            </div>
                            {j.distance ? (
                              <span className="text-[10px] text-gray-400 font-mono">ระยะทาง {j.distance} กม.</span>
                            ) : null}
                          </div>
                        </td>

                        {/* Vehicles */}
                        <td className="py-4 px-4 min-w-[160px]">
                          {j.carWashItems && j.carWashItems.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold whitespace-nowrap">
                                  {j.carWashItems.length} คัน
                                </span>
                                <span className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                                  {j.carWashItems[0]?.vehicleModel || j.carWashItems[0]?.licensePlate || 'รถยนต์'}
                                </span>
                              </div>
                              {j.carWashItems.length > 1 ? (
                                <span className="text-[10px] text-gray-500">
                                  + อีก {j.carWashItems.length - 1} คัน
                                </span>
                              ) : j.carWashItems[0]?.vin ? (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  VIN: ...{j.carWashItems[0].vin.slice(-8)}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-100 whitespace-nowrap">1 คัน</span>
                                <span className="text-xs font-semibold text-gray-900 truncate max-w-[130px]">
                                  {j.vehicle?.model || 'รถยนต์'}
                                </span>
                              </div>
                              {j.vehicle?.licensePlate && (
                                <span className="text-[10px] text-gray-600 font-medium">
                                  ทะเบียน: {j.vehicle.licensePlate}
                                </span>
                              )}
                              {j.vin && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  VIN: ...{j.vin.slice(-8)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="py-4 px-4 min-w-[160px]">
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                              <Truck className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 text-xs leading-snug">
                                {j.supplierName || 'ไม่ระบุ Supplier'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Distance */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {j.distance ? (
                            <span className="font-mono text-xs font-medium text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/80">
                              {j.distance} กม.
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* Total Cost */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span className="font-bold text-gray-900 font-mono text-sm">
                            ฿{getJobTotalCost(j).toLocaleString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.text} shadow-2xs whitespace-nowrap`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0`} />
                            <span>{st.label}</span>
                          </span>
                        </td>

                        {/* Action Link */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <a
                            href={`/jobs?q=${encodeURIComponent(j.jobNumber)}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-[#0f5238] hover:text-white border border-gray-200 text-gray-700 text-xs font-semibold transition-all shadow-2xs whitespace-nowrap cursor-pointer group"
                          >
                            <span>ดูใบงาน</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSlideReportJobs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                            <Truck className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-semibold text-gray-600">
                            {slideSearchQuery || slideStatusFilter !== 'ALL' || slideDirectionFilter !== 'ALL'
                              ? 'ไม่พบข้อมูลใบงานรถสไลด์ตามเงื่อนไขที่ค้นหา'
                              : 'ยังไม่มีประวัติการสไลด์รถของสาขานี้ในระบบ'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: สถิติรถสไลด์แยกตามสาขาต้นทาง (Origin Branch Breakdown) - เฉพาะแอดมิน */}
          {currentRole !== 'BRANCH' && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-gray-900">
                    สถิติรถสไลด์แยกตามสาขาต้นทาง (ส่งรถออก)
                  </h3>
                </div>
                <span className="text-xs text-gray-400 font-medium">{branchSlideStats.length} สาขา</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                      <th className="py-3 px-5">สาขาต้นทาง</th>
                      <th className="py-3 px-4 text-center">เที่ยวส่งออก</th>
                      <th className="py-3 px-4 text-center">รถที่ส่งออก (คัน)</th>
                      <th className="py-3 px-5 text-right">ยอดค่าบริการสไลด์รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {branchSlideStats.map(b => (
                      <tr key={b.branchName} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-gray-900">{b.branchName}</td>
                        <td className="py-3.5 px-4 text-center font-medium text-gray-700">{b.outboundTrips} เที่ยว</td>
                        <td className="py-3.5 px-4 text-center font-bold text-sky-700">{b.outboundCars} คัน</td>
                        <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono">
                          ฿{b.totalCost.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {branchSlideStats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          ยังไม่มีข้อมูลสาขาต้นทาง
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: สถิติแยกตาม Supplier รถสไลด์ (Slide Providers) */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-gray-900">ผลงาน Supplier รถสไลด์ (Slide Providers)</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">{supplierSlideStats.length} เจ้า</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                    <th className="py-3 px-5">ชื่อ Supplier</th>
                    <th className="py-3 px-4 text-center">จำนวนเที่ยว</th>
                    <th className="py-3 px-4 text-center">รถที่ย้าย (คัน)</th>
                    <th className="py-3 px-4 text-center">ตรวจรับผ่าน</th>
                    <th className="py-3 px-4 text-center">ขอแก้ไข</th>
                    <th className="py-3 px-5 text-right">ยอดเบิกจ่ายสะสม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplierSlideStats.map(s => (
                    <tr key={s.supplierName} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-gray-900">{s.supplierName}</td>
                      <td className="py-3.5 px-4 text-center font-medium text-gray-700">{s.tripsCount} เที่ยว</td>
                      <td className="py-3.5 px-4 text-center font-bold text-sky-700">{s.carsCount} คัน</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                        {s.approvedCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {s.approvedCount}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-red-600">
                        {s.rejectedCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            {s.rejectedCount}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono">
                        ฿{s.totalCost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {supplierSlideStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        ยังไม่มีข้อมูล Supplier รถสไลด์
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
