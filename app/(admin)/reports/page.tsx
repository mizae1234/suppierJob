'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatThaiDate } from '@/lib/date-utils';
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
  Receipt
} from 'lucide-react';

export default function ReportsPage() {
  const { jobs, suppliers, branches } = useApp();

  // Active tab: overview | wash | slide
  const [activeTab, setActiveTab] = useState<'overview' | 'wash' | 'slide'>('overview');

  // Company filter: ALL | EV7 | GI
  const [companyFilter, setCompanyFilter] = useState<'ALL' | 'EV7' | 'GI'>('ALL');

  // Filter jobs by selected company
  const filteredJobs = useMemo(() => {
    if (companyFilter === 'ALL') return jobs;
    return jobs.filter(j => j.companyCode === companyFilter);
  }, [jobs, companyFilter]);

  // ─────────────────────────────────────────────────────────────
  // 1. OVERALL STATS
  // ─────────────────────────────────────────────────────────────
  const totalExpense = useMemo(() => {
    return filteredJobs
      .filter(j => j.status === 'APPROVED' || j.status === 'INVOICED')
      .reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [filteredJobs]);

  const ev7Expense = useMemo(() => {
    return jobs
      .filter(j => (j.status === 'APPROVED' || j.status === 'INVOICED') && j.companyCode === 'EV7')
      .reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [jobs]);

  const giExpense = useMemo(() => {
    return jobs
      .filter(j => (j.status === 'APPROVED' || j.status === 'INVOICED') && j.companyCode === 'GI')
      .reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [jobs]);

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

  // Top Routes for Vehicle Slide
  const topSlideRoutes = useMemo(() => {
    const map = new Map<string, { origin: string; dest: string; tripsCount: number; carsCount: number; totalCost: number; avgDistance: number; totalDist: number }>();

    slideJobs.forEach(j => {
      const orig = j.originBranchName || j.branchName || 'ต้นทาง';
      const dest = j.destBranchName || j.customDestAddress || 'ปลายทาง';
      const key = `${orig} ➔ ${dest}`;

      const carCount = j.carWashItems && j.carWashItems.length > 0 ? j.carWashItems.length : (j.vin ? 1 : 0);
      const dist = j.distance || 0;

      const existing = map.get(key) || { origin: orig, dest, tripsCount: 0, carsCount: 0, totalCost: 0, avgDistance: 0, totalDist: 0 };
      existing.tripsCount += 1;
      existing.carsCount += carCount;
      existing.totalDist += dist;
      if (['APPROVED', 'INVOICED'].includes(j.status)) {
        existing.totalCost += getJobTotalCost(j);
      }
      map.set(key, existing);
    });

    return Array.from(map.values())
      .map(r => ({
        ...r,
        avgDistance: r.tripsCount > 0 ? Math.round(r.totalDist / r.tripsCount) : 0
      }))
      .sort((a, b) => b.tripsCount - a.tripsCount);
  }, [slideJobs]);

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
      washJobs.forEach(j => {
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
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            ภาพรวมค่าใช้จ่าย สถิติงานล้างรถ และงานรถสไลด์ขนส่งรถยนต์
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Company Filter Pill */}
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
              ค่าบริการตรวจรับแล้วทั้งหมด ({companyFilter === 'ALL' ? 'ทุกบริษัท' : companyFilter})
            </span>
            <div className="text-3xl md:text-5xl font-bold mt-1.5 tracking-tight font-mono">
              ฿{totalExpense.toLocaleString()}
            </div>
            <p className="text-xs text-emerald-100/70 mt-1">
              คำนวณจากงานสถานะ Approved และ Invoiced ทั้งหมดในระบบ
            </p>

            {/* EV7 vs GI split bar */}
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

          {/* Section 1: สถิติงานล้างรถแยกตามสาขา (Branch Breakdown) */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-gray-900">ปริมาณงานล้างรถแยกตามสาขา</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">{branchWashStats.length} สาขา</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                    <th className="py-3 px-5">สาขา</th>
                    <th className="py-3 px-4 text-center">ใบสั่งงาน</th>
                    <th className="py-3 px-4 text-center">จำนวนรถ (คัน)</th>
                    <th className="py-3 px-6">สัดส่วนจำนวนรถ</th>
                    <th className="py-3 px-5 text-right">ยอดรวมค่าล้าง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {branchWashStats.map(b => {
                    const pct = totalCarsWashed > 0 ? Math.round((b.carsCount / totalCarsWashed) * 100) : 0;
                    return (
                      <tr key={b.branchName} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-gray-900">{b.branchName}</td>
                        <td className="py-3.5 px-4 text-center font-medium text-gray-700">{b.jobsCount} ใบ</td>
                        <td className="py-3.5 px-4 text-center font-bold text-amber-700">{b.carsCount} คัน</td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono text-[10px] text-gray-500 w-8">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono">
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

          {/* Section 2: สถิติแยกตาม Supplier คาร์แคร์ (Supplier Breakdown) */}
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
                    <th className="py-3 px-5">ชื่อ Supplier</th>
                    <th className="py-3 px-4 text-center">ใบสั่งงาน</th>
                    <th className="py-3 px-4 text-center">จำนวนรถ (คัน)</th>
                    <th className="py-3 px-4 text-center">ตรวจรับผ่าน</th>
                    <th className="py-3 px-4 text-center">ขอแก้ไข</th>
                    <th className="py-3 px-5 text-right">ยอดเบิกจ่ายสะสม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplierWashStats.map(s => (
                    <tr key={s.supplierName} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-gray-900">{s.supplierName}</td>
                      <td className="py-3.5 px-4 text-center font-medium text-gray-700">{s.jobsCount} ใบ</td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-700">{s.carsCount} คัน</td>
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
                  {supplierWashStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        ยังไม่มีข้อมูล Supplier คาร์แคร์
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: สรุปตามประเภทการล้าง (Wash Type Breakdown) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {washTypeStats.map(t => (
              <div key={t.label} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900">{t.label}</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className="text-xl font-bold text-amber-800">{t.count} <span className="text-xs font-normal text-gray-400">คัน</span></p>
                    <p className="text-sm font-bold text-gray-900 font-mono">฿{t.cost.toLocaleString()}</p>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-100 mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full" 
                    style={{ width: `${totalCarsWashed > 0 ? Math.round((t.count / totalCarsWashed) * 100) : 0}%` }} 
                  />
                </div>
              </div>
            ))}
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
                เส้นทางใช้งาน {topSlideRoutes.length} เส้นทาง
              </div>
            </div>
          </div>

          {/* Section 1: เส้นทางยอดนิยม (Top Routes) */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-gray-900">เส้นทางขนส่งยอดนิยม (Top Routes)</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">{topSlideRoutes.length} เส้นทาง</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                    <th className="py-3 px-5">เส้นทางการเดินทาง (ต้นทาง ➔ ปลายทาง)</th>
                    <th className="py-3 px-4 text-center">จำนวนเที่ยว</th>
                    <th className="py-3 px-4 text-center">รถที่ย้าย (คัน)</th>
                    <th className="py-3 px-4 text-center">ระยะทางเฉลี่ย</th>
                    <th className="py-3 px-5 text-right">ยอดรวมค่าสไลด์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topSlideRoutes.map(r => (
                    <tr key={`${r.origin}-${r.dest}`} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <span>{r.origin}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span className="text-sky-950">{r.dest}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-800">{r.tripsCount} เที่ยว</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-sky-700">{r.carsCount} คัน</td>
                      <td className="py-3.5 px-4 text-center text-gray-500 font-mono">
                        {r.avgDistance > 0 ? `${r.avgDistance} กม.` : '-'}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono">
                        ฿{r.totalCost.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {topSlideRoutes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        ยังไม่มีประวัติการสไลด์รถในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: สถิติรถสไลด์แยกตามสาขาต้นทาง (Origin Branch Breakdown) */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-gray-900">สถิติรถสไลด์แยกตามสาขาต้นทาง (ส่งรถออก)</h3>
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
