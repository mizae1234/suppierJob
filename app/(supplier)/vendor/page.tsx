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
  RotateCcw,
  ArrowRight,
  Sparkles,
  Truck,
  Receipt,
  ChevronRight,
  Zap,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileText,
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
      totalAmount: myJobs.reduce((sum, j) => sum + getJobTotalCost(j), 0),
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
      label: 'ตีกลับ',
      sublabel: 'สาขาให้แก้ไข',
      count: stats.rejected.length,
      icon: RotateCcw,
      color: '#ea580c',
      iconBg: '#fff7ed',
      href: '/vendor/jobs?tab=returned',
    },
    {
      label: 'ปฏิเสธ',
      sublabel: 'ปฏิเสธรับงาน',
      count: stats.cancelled.length,
      icon: XCircle,
      color: '#ef4444',
      iconBg: '#fef2f2',
      href: '/vendor/jobs?tab=declined',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Dashboard Header — Compact */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dashboard
            </span>
            {activeBranch && (
              <span className="text-[11px] text-gray-400">
                • {activeBranch.name}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight">
            {isMaster ? `ภาพรวม: ${supplierName}` : `สวัสดี, ${user?.displayName || 'Supplier'}`}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {myJobs.length > 0
              ? `${myJobs.length} งาน • มูลค่ารวม ${formatCurrency(stats.totalAmount)}`
              : 'ยังไม่มีงานในระบบ — งานใหม่จะแสดงที่นี่อัตโนมัติ'
            }
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/vendor/jobs"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200/80 text-gray-700 hover:bg-gray-50 shadow-2xs transition-all"
          >
            <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
            <span>ดูงานทั้งหมด</span>
          </Link>
          <Link
            href="/vendor/invoices"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-xs hover:opacity-95 active:scale-95 transition-all"
            style={{ backgroundColor: theme.primary }}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>จัดการใบวางบิล</span>
          </Link>
        </div>
      </div>

      {/* 2. Stat Cards — 4 columns, compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {counterCards.map(card => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5 group active:scale-[0.98]"
            >
              {/* Top: Icon + Arrow */}
              <div className="flex items-center justify-between">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ backgroundColor: card.iconBg, color: card.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Number */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900 font-mono tracking-tight leading-none">
                    {card.count}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">งาน</span>
                </div>
                <p className="text-xs font-semibold text-gray-800 mt-1 leading-tight">
                  {card.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                  {card.sublabel}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. Two-Column: Active Jobs + Invoice Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Recent Jobs (3/5) */}
        <div className="lg:col-span-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
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
              <p className="text-sm font-medium text-gray-500">ยังไม่มีรายการงาน</p>
              <p className="text-xs text-gray-400 mt-0.5">งานใหม่จะแสดงที่นี่โดยอัตโนมัติ</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {myJobs.slice(0, 6).map(job => {
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
                    className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                        {isWash ? (
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Truck className="w-3.5 h-3.5 text-purple-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-gray-900 font-mono truncate">
                            {job.jobNumber}
                          </p>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-gray-100 text-gray-500 font-medium shrink-0">
                            {job.companyCode}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">
                          {job.branchName}
                          {isAll && (
                            <span className="ml-1 text-[9px] text-emerald-800 bg-emerald-50 px-1 rounded font-medium">
                              {job.supplierName}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Summary Panel (2/5) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Invoice Summary */}
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.badgeBg, color: theme.primary }}
              >
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">สรุปการเงิน</h3>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/60">
                <div>
                  <p className="text-[10px] text-gray-500">พร้อมวางบิล</p>
                  <p className="text-lg font-bold font-mono" style={{ color: theme.primary }}>
                    {formatCurrency(stats.approvedAmount)}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {stats.approved.length} งาน
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-[10px] text-gray-500">วางบิลแล้ว</p>
                  <p className="text-sm font-bold font-mono text-gray-700">
                    {myInvoices.length} ใบ
                  </p>
                </div>
                <FileText className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            {stats.approved.length > 0 && (
              <Link
                href="/vendor/invoices"
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold shadow-xs hover:opacity-95 active:scale-95 transition-all"
                style={{ backgroundColor: theme.primary }}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>ออกใบวางบิล</span>
              </Link>
            )}
          </div>

          {/* Quick Stats */}
          <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">สถิติงาน</h3>
            <div className="space-y-2">
              {[
                { label: 'งานทั้งหมด', value: myJobs.length, color: '#374151' },
                { label: 'กำลังดำเนินการ', value: stats.inProgress.length, color: '#d97706' },
                { label: 'ผ่านการตรวจรับ', value: stats.approved.length + stats.invoiced.length, color: theme.primary },
                { label: 'ถูกตีกลับ/ยกเลิก', value: stats.rejected.length + stats.cancelled.length, color: '#ef4444' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">{item.label}</span>
                  <span className="text-sm font-bold font-mono" style={{ color: item.color }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
