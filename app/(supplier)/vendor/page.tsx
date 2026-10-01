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
  XCircle,
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
  const { jobs, invoices, activeSupplier, currentSupplierId, currentBranchId, activeBranch } = useApp();
  const { user } = useAuth();
  const theme = useTheme();

  const isMaster = user?.role === 'MASTER';
  const isAll = (!activeSupplier || currentSupplierId === 'ALL') && isMaster;
  const supplierId = activeSupplier?.id || user?.supplierId;
  const supplierName = isAll
    ? (isMaster ? 'ทุก Supplier (All Partners)' : (user?.supplierName || 'Supplier'))
    : (activeSupplier?.name || user?.supplierName || 'Supplier');

  // Filter jobs for this supplier and selected branch
  const myJobs = useMemo(() => {
    let list = isAll ? jobs : jobs.filter(j => j.supplierId === supplierId);
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list;
  }, [jobs, supplierId, isAll, currentBranchId]);

  const stats = useMemo(() => {
    const inProgress = myJobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'PENDING_SUPPLIER');
    const waiting = myJobs.filter(j => j.status === 'WAITING_APPROVAL');
    const approved = myJobs.filter(j => j.status === 'APPROVED');
    const rejected = myJobs.filter(j => j.status === 'REJECTED');
    const cancelled = myJobs.filter(j => j.status === 'CANCELLED');
    const invoiced = myJobs.filter(j => j.status === 'INVOICED');

    return {
      inProgress,
      waiting,
      approved,
      rejected,
      cancelled,
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
      label: 'งานที่ต้องทำ',
      sublabel: 'กำลังดำเนินการ',
      count: stats.inProgress.length,
      icon: Clock,
      color: '#d97706',
      iconBg: '#fffbeb',
      href: '/vendor/jobs?tab=progress',
    },
    {
      label: 'รอตรวจรับ',
      sublabel: 'รอสาขาตรวจสอบ',
      count: stats.waiting.length,
      icon: AlertCircle,
      color: '#2563eb',
      iconBg: '#eff6ff',
      href: '/vendor/jobs?tab=waiting',
    },
    {
      label: 'ผ่านแล้ว',
      sublabel: stats.approvedAmount > 0 ? formatCurrency(stats.approvedAmount) : 'พร้อมวางบิล',
      count: stats.approved.length,
      icon: CheckCircle2,
      color: theme.primary,
      iconBg: theme.badgeBg,
      href: '/vendor/jobs?tab=approved',
    },
    {
      label: 'ปฏิเสธ/ตีกลับ',
      sublabel: 'ยกเลิกหรือขอแก้ไข',
      count: stats.rejected.length + stats.cancelled.length,
      icon: XCircle,
      color: '#ef4444',
      iconBg: '#fef2f2',
      href: '/vendor/jobs?tab=rejected',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ภาพรวมงาน • Dashboard
            </span>
            <span className="text-xs text-gray-400">
              • {activeBranch ? activeBranch.name : 'ทุกสาขา'} ({myJobs.length} รายการ)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isMaster ? `ภาพรวม: ${supplierName}` : `สวัสดี, ${user?.displayName || 'Supplier'}`}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {activeBranch
              ? `สรุปภาพรวมงานและการวางบิลเฉพาะ ${activeBranch.name}`
              : 'สรุปภาพรวมงานและการวางบิลของคุณวันนี้'}
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <Link
            href="/vendor/jobs"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200/80 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-2xs transition-all"
          >
            <ClipboardList className="w-3.5 h-3.5 text-gray-500" />
            <span>ดูงานทั้งหมด</span>
          </Link>
          <Link
            href="/vendor/invoices"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs hover:opacity-95 active:scale-95 transition-all"
            style={{ backgroundColor: theme.primary }}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>จัดการใบวางบิล</span>
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics 4-Cards Grid (Pure White, Calm & Clean - Matches Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {counterCards.map(card => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group active:scale-[0.98]"
            >
              {/* Top row: Icon + Arrow */}
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ backgroundColor: card.iconBg, color: card.color }}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Number and Unit */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono tracking-tight">
                    {card.count}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">งาน</span>
                </div>
                <p className="text-xs font-semibold text-gray-800 mt-1 leading-tight">
                  {card.label}
                </p>
                <p className="text-[11px] text-gray-400 font-normal mt-0.5 truncate">
                  {card.sublabel}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. Action Cards (Clean White with Subtle Borders - Matches Desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Active In-Progress Jobs Card */}
        {stats.inProgress.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      งานที่ต้องทำ ({stats.inProgress.length})
                    </h3>
                    <p className="text-[11px] text-gray-400">งานเข้าอัตโนมัติแล้ว</p>
                  </div>
                </div>
                <Link
                  href="/vendor/jobs?tab=progress"
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-0.5"
                >
                  ดูทั้งหมด <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Job items preview */}
              <div className="flex flex-col gap-2">
                {stats.inProgress.slice(0, 2).map(job => (
                  <div
                    key={job.id}
                    className="p-3 rounded-xl bg-gray-50/70 border border-gray-100 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 font-mono truncate">{job.jobNumber}</p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {job.jobType === 'CAR_WASH' ? '🚿 ล้างรถ' : '🚛 สไลด์'} • {job.branchName}
                      </p>
                    </div>
                    <Link
                      href={`/vendor/submit/${job.id}`}
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow-xs hover:opacity-95 active:scale-95 transition-all shrink-0"
                      style={{ backgroundColor: theme.primary }}
                    >
                      ส่งงาน
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
              <span>สามารถส่งงานพร้อมรูป หรือกดปฏิเสธได้</span>
            </div>
          </div>
        )}

        {/* Ready to Invoice Card */}
        {stats.approved.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">พร้อมออกใบวางบิล</h3>
                    <p className="text-[11px] text-gray-400">{stats.approved.length} งานที่ตรวจรับผ่านแล้ว</p>
                  </div>
                </div>
                <Link
                  href="/vendor/invoices"
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-0.5"
                >
                  ไปวางบิล <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="my-2">
                <p className="text-[11px] text-gray-400">ยอดรวมที่สามารถวางบิลได้</p>
                <p className="text-2xl font-bold font-mono tracking-tight" style={{ color: theme.primary }}>
                  {formatCurrency(stats.approvedAmount)}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">ตรวจรับผ่านเรียบร้อย</span>
              <Link
                href="/vendor/invoices"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold shadow-xs hover:opacity-95 active:scale-95 transition-all"
                style={{ backgroundColor: theme.primary }}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>ออกใบวางบิล</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 4. Recent Jobs List (Clean White Table-Card - Matches Desktop) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">งานล่าสุดของฉัน</h3>
          <Link
            href="/vendor/jobs"
            className="text-xs font-semibold flex items-center gap-0.5 hover:underline"
            style={{ color: theme.primary }}
          >
            ดูทั้งหมด ({myJobs.length}) <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {myJobs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">ยังไม่มีรายการงานในระบบ</p>
            <p className="text-xs text-gray-400 mt-0.5">งานใหม่จะแสดงที่นี่โดยอัตโนมัติ</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {myJobs.slice(0, 5).map(job => {
              const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                PENDING_SUPPLIER: { label: 'กำลังทำ', color: '#d97706', bg: '#fffbeb' },
                IN_PROGRESS: { label: 'กำลังทำ', color: '#d97706', bg: '#fffbeb' },
                WAITING_APPROVAL: { label: 'รอตรวจรับ', color: '#2563eb', bg: '#eff6ff' },
                APPROVED: { label: 'ผ่านแล้ว', color: theme.primary, bg: theme.badgeBg },
                REJECTED: { label: 'ถูกตีกลับ', color: '#dc2626', bg: '#fef2f2' },
                CANCELLED: { label: 'ปฏิเสธงาน', color: '#dc2626', bg: '#fef2f2' },
                INVOICED: { label: 'วางบิลแล้ว', color: '#6b7280', bg: '#f3f4f6' },
              };
              const status = statusMap[job.status] || statusMap.IN_PROGRESS;
              const isWash = job.jobType === 'CAR_WASH';

              return (
                <Link
                  key={job.id}
                  href="/vendor/jobs"
                  className="flex items-center justify-between py-3 px-1 rounded-xl hover:bg-gray-50/80 active:bg-gray-100/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      {isWash ? (
                        <Sparkles className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Truck className="w-4 h-4 text-purple-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-gray-900 font-mono truncate">
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
                      className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold"
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
