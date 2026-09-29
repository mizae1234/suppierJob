'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Truck,
  Receipt,
  ChevronRight,
  Zap,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export default function SupplierDashboardPage() {
  const { jobs, invoices, activeSupplier, currentSupplierId } = useApp();
  const { user } = useAuth();
  const theme = useTheme();

  const isMaster = user?.role === 'MASTER';
  const isAll = (!activeSupplier || currentSupplierId === 'ALL') && isMaster;
  const supplierId = activeSupplier?.id || user?.supplierId;

  // Filter jobs for this supplier (or all for Master)
  const myJobs = useMemo(() => {
    if (isAll) return jobs;
    return jobs.filter(j => j.supplierId === supplierId);
  }, [jobs, supplierId, isAll]);

  const stats = useMemo(() => {
    const newJobs = myJobs.filter(j => j.status === 'PENDING_SUPPLIER');
    const inProgress = myJobs.filter(j => j.status === 'IN_PROGRESS');
    const waiting = myJobs.filter(j => j.status === 'WAITING_APPROVAL');
    const approved = myJobs.filter(j => j.status === 'APPROVED');
    const rejected = myJobs.filter(j => j.status === 'REJECTED');
    const invoiced = myJobs.filter(j => j.status === 'INVOICED');

    return {
      newJobs,
      inProgress,
      waiting,
      approved,
      rejected,
      invoiced,
      approvedAmount: approved.reduce((sum, j) => sum + getJobTotalCost(j), 0),
    };
  }, [myJobs]);

  const myInvoices = useMemo(() => {
    if (isAll) return invoices;
    return invoices.filter(i => i.supplierId === supplierId);
  }, [invoices, supplierId, isAll]);

  const counterCards = [
    {
      label: 'งานใหม่',
      sublabel: 'รอตอบรับ',
      count: stats.newJobs.length,
      icon: ClipboardList,
      color: '#2563eb',
      bgGrad: 'from-blue-500/10 via-sky-50 to-blue-50/50',
      border: 'border-blue-200/60',
      iconBg: 'bg-blue-500 text-white shadow-blue-500/20',
      badge: stats.newJobs.length > 0 ? `${stats.newJobs.length} งาน` : null,
      badgeColor: 'bg-blue-600 text-white',
      href: '/vendor/jobs?tab=new',
    },
    {
      label: 'กำลังทำ',
      sublabel: 'อยู่ระหว่างดำเนินการ',
      count: stats.inProgress.length,
      icon: Clock,
      color: '#d97706',
      bgGrad: 'from-amber-500/10 via-amber-50 to-yellow-50/50',
      border: 'border-amber-200/60',
      iconBg: 'bg-amber-500 text-white shadow-amber-500/20',
      badge: stats.inProgress.length > 0 ? 'กำลังทำ' : null,
      badgeColor: 'bg-amber-600 text-white',
      href: '/vendor/jobs?tab=progress',
    },
    {
      label: 'รอตรวจรับ',
      sublabel: 'รอตรวจสอบงาน',
      count: stats.waiting.length,
      icon: AlertCircle,
      color: '#e11d48',
      bgGrad: 'from-rose-500/10 via-rose-50 to-red-50/50',
      border: 'border-rose-200/60',
      iconBg: 'bg-rose-500 text-white shadow-rose-500/20',
      badge: stats.waiting.length > 0 ? 'รอตรวจ' : null,
      badgeColor: 'bg-rose-600 text-white',
      href: '/vendor/jobs?tab=waiting',
    },
    {
      label: 'ผ่านแล้ว',
      sublabel: 'พร้อมออกบิล',
      count: stats.approved.length,
      icon: CheckCircle2,
      color: '#059669',
      bgGrad: 'from-emerald-500/10 via-emerald-50 to-teal-50/50',
      border: 'border-emerald-200/60',
      iconBg: 'bg-emerald-600 text-white shadow-emerald-500/20',
      badge: stats.approved.length > 0 ? 'พร้อมบิล' : null,
      badgeColor: 'bg-emerald-700 text-white',
      href: '/vendor/jobs?tab=approved',
    },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Native Mobile Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 sm:p-6 border border-emerald-100/70 shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <Calendar className="w-3 h-3" />
                วันนี้
              </span>
              <span className="text-[11px] font-medium text-gray-400">
                • {myJobs.length} งานในระบบ
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-1.5">
              <span>สวัสดี, {user?.displayName || 'Supplier'}</span>
              <span className="text-2xl animate-pulse">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              ยินดีต้อนรับสู่ระบบบริหารงาน Supplier ตรวจสอบและอัปเดตงานได้ทันที
            </p>
          </div>

          {/* Quick Notice Pill if new jobs */}
          {stats.newJobs.length > 0 && (
            <Link
              href="/vendor/jobs?tab=new"
              className="inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <span>มีงานใหม่ {stats.newJobs.length} งานรอคุณรับ</span>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Link>
          )}
        </div>
      </div>

      {/* 4 Status Widgets (2x2 Mobile App Grid) */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            สถานะงานของคุณ
          </p>
          <span className="text-[11px] text-gray-400 font-medium">แตะเพื่อดูรายละเอียด</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {counterCards.map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                href={card.href}
                className={`relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br ${card.bgGrad} border ${card.border} shadow-xs active:scale-[0.97] transition-all overflow-hidden group`}
              >
                {/* Header row in widget */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-xs ${card.iconBg}`}>
                    <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-400/80 group-hover:text-gray-700 transition-colors" />
                </div>

                {/* Big Metric Number */}
                <div className="my-1">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
                    {card.count}
                  </span>
                </div>

                {/* Widget Label & Subtitle */}
                <div className="flex items-baseline justify-between mt-0.5">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                      {card.label}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5 hidden xs:block">
                      {card.sublabel}
                    </p>
                  </div>
                  {card.badge && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Urgent Action Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* New Jobs Alert Card */}
        {stats.newJobs.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-blue-950">
                    งานใหม่ {stats.newJobs.length} รายการรอยืนยัน
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200/70 text-blue-800">
                  ด่วน
                </span>
              </div>

              <div className="flex flex-col gap-2 mt-3">
                {stats.newJobs.slice(0, 2).map(job => (
                  <div
                    key={job.id}
                    className="p-2.5 rounded-xl bg-white/90 border border-blue-100 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 font-mono truncate">{job.jobNumber}</p>
                      <p className="text-[11px] text-gray-600 truncate mt-0.5">
                        {job.jobType === 'CAR_WASH' ? '🚿 ล้างรถ' : '🚛 สไลด์'} • {job.branchName}
                      </p>
                    </div>
                    <Link
                      href="/vendor/jobs?tab=new"
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0"
                      style={{ backgroundColor: theme.primary }}
                    >
                      รับงาน
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-blue-200/60 flex items-center justify-between">
              <span className="text-[11px] text-blue-700 font-medium">กรุณากดรับงานเพื่อเริ่มบริการ</span>
              <Link
                href="/vendor/jobs?tab=new"
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                ดูทั้งหมด <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Ready to Invoice Financial Card */}
        {stats.approved.length > 0 && (
          <div
            className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-xs flex flex-col justify-between"
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #e6fcf5 100%)',
              borderColor: `${theme.primary}25`,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Receipt className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                    พร้อมออกใบวางบิล
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  {stats.approved.length} งาน
                </span>
              </div>

              <div className="mt-3 mb-1">
                <p className="text-[11px] text-emerald-800 font-medium">มูลค่ารวมที่สามารถวางบิลได้</p>
                <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight" style={{ color: theme.primary }}>
                  {formatCurrency(stats.approvedAmount)}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between">
              <span className="text-[11px] text-emerald-800 font-medium">ตรวจรับผ่านเรียบร้อยแล้ว</span>
              <Link
                href="/vendor/invoices"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                style={{ backgroundColor: theme.primary }}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>ออกใบวางบิล</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Recent Jobs Mobile List View */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-gray-100 shadow-xs">
        <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">งานล่าสุดของฉัน</h3>
          </div>
          <Link
            href="/vendor/jobs"
            className="text-xs font-bold flex items-center gap-0.5 hover:underline"
            style={{ color: theme.primary }}
          >
            ดูทั้งหมด ({myJobs.length}) <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {myJobs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">ยังไม่มีรายการงานในระบบ</p>
            <p className="text-xs text-gray-400 mt-0.5">งานใหม่ที่ได้รับมอบหมายจะแสดงที่นี่</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100/80">
            {myJobs.slice(0, 5).map(job => {
              const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                PENDING_SUPPLIER: { label: 'รอรับงาน', color: '#2563eb', bg: '#eff6ff' },
                IN_PROGRESS: { label: 'กำลังทำ', color: '#d97706', bg: '#fffbeb' },
                WAITING_APPROVAL: { label: 'รอตรวจรับ', color: '#e11d48', bg: '#fef2f2' },
                APPROVED: { label: 'ผ่านแล้ว', color: theme.primary, bg: theme.badgeBg },
                REJECTED: { label: 'ถูกตีกลับ', color: '#dc2626', bg: '#fef2f2' },
                INVOICED: { label: 'วางบิลแล้ว', color: '#6b7280', bg: '#f3f4f6' },
              };
              const status = statusMap[job.status] || statusMap.PENDING_SUPPLIER;

              const isWash = job.jobType === 'CAR_WASH';
              const jobTab = job.status === 'PENDING_SUPPLIER'
                ? 'new'
                : job.status === 'IN_PROGRESS'
                ? 'progress'
                : job.status === 'WAITING_APPROVAL'
                ? 'waiting'
                : 'approved';

              return (
                <Link
                  key={job.id}
                  href={`/vendor/jobs?tab=${jobTab}`}
                  className="flex items-center justify-between py-3 px-1.5 rounded-xl hover:bg-gray-50/80 active:bg-gray-100/70 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {/* Native App Squircle Service Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isWash ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                      }`}
                    >
                      {isWash ? <Sparkles className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-gray-900 font-mono tracking-tight truncate">
                          {job.jobNumber}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-gray-100 text-gray-600 font-medium shrink-0">
                          {job.companyCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {job.branchName}
                        {isAll && (
                          <span className="ml-1 text-[10px] text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded font-medium">
                            • {job.supplierName}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="px-2.5 py-0.8 rounded-full text-[10.5px] font-bold shadow-2xs"
                      style={{ backgroundColor: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
