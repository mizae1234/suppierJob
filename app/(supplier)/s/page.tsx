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
} from 'lucide-react';

export default function SupplierDashboardPage() {
  const { jobs, invoices, activeSupplier } = useApp();
  const { user } = useAuth();
  const theme = useTheme();

  const supplierId = activeSupplier?.id || user?.supplierId;

  // Filter jobs for this supplier
  const myJobs = useMemo(() => {
    return jobs.filter(j => j.supplierId === supplierId);
  }, [jobs, supplierId]);

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
    return invoices.filter(i => i.supplierId === supplierId);
  }, [invoices, supplierId]);

  const counterCards = [
    {
      label: 'งานใหม่ (รอรับ)',
      count: stats.newJobs.length,
      icon: ClipboardList,
      color: '#3b82f6',
      bg: '#eff6ff',
      href: '/s/jobs?tab=new',
    },
    {
      label: 'กำลังทำ',
      count: stats.inProgress.length,
      icon: Clock,
      color: '#f59e0b',
      bg: '#fffbeb',
      href: '/s/jobs?tab=progress',
    },
    {
      label: 'รอตรวจรับ',
      count: stats.waiting.length,
      icon: AlertCircle,
      color: '#ef4444',
      bg: '#fef2f2',
      href: '/s/jobs?tab=waiting',
    },
    {
      label: 'ผ่านแล้ว',
      count: stats.approved.length,
      icon: CheckCircle2,
      color: theme.primary,
      bg: theme.badgeBg,
      href: '/s/jobs?tab=approved',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          สวัสดี, {user?.displayName || 'Supplier'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          สรุปภาพรวมงานของคุณในวันนี้ • งานทั้งหมด {myJobs.length} รายการ
        </p>
      </div>

      {/* Counter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {counterCards.map(card => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: card.bg, color: card.color }}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-gray-900 font-mono">{card.count}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* New Jobs Requiring Attention */}
        {stats.newJobs.length > 0 && (
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-blue-900">
                งานใหม่ {stats.newJobs.length} รายการรอรับ
              </h3>
            </div>
            {stats.newJobs.slice(0, 3).map(job => (
              <div key={job.id} className="flex items-center justify-between py-2 border-t border-blue-100 first:border-t-0">
                <div>
                  <p className="text-xs font-bold text-gray-900 font-mono">{job.jobNumber}</p>
                  <p className="text-[11px] text-gray-600">
                    {job.jobType === 'CAR_WASH' ? '🚿 ล้างรถ' : '🚛 สไลด์'} • {job.branchName}
                  </p>
                </div>
                <Link
                  href={`/s/jobs?tab=new`}
                  className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                  style={{ backgroundColor: theme.primary }}
                >
                  ดูงาน
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Approved — Ready to Invoice */}
        {stats.approved.length > 0 && (
          <div
            className="p-5 rounded-2xl border"
            style={{ backgroundColor: theme.bgSoft, borderColor: `${theme.primary}22` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-5 h-5" style={{ color: theme.primary }} />
              <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                พร้อมวางบิล {stats.approved.length} งาน
              </h3>
            </div>
            <p className="text-2xl font-bold font-mono" style={{ color: theme.primary }}>
              {formatCurrency(stats.approvedAmount)}
            </p>
            <p className="text-xs text-gray-500 mb-3">มูลค่ารวมที่พร้อมออกใบวางบิล</p>
            <Link
              href="/s/invoices"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-semibold"
              style={{ backgroundColor: theme.primary }}
            >
              <Receipt className="w-3.5 h-3.5" />
              ออกใบวางบิล
            </Link>
          </div>
        )}
      </div>

      {/* Recent Jobs List */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">งานล่าสุดของฉัน</h3>
          <Link
            href="/s/jobs"
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: theme.primary }}
          >
            ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {myJobs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">ยังไม่มีงานที่ได้รับมอบหมาย</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {myJobs.slice(0, 5).map(job => {
              const statusMap: Record<string, { label: string; color: string; bg: string }> = {
                PENDING_SUPPLIER: { label: 'รอรับงาน', color: '#3b82f6', bg: '#eff6ff' },
                IN_PROGRESS: { label: 'กำลังทำ', color: '#f59e0b', bg: '#fffbeb' },
                WAITING_APPROVAL: { label: 'รอตรวจรับ', color: '#ef4444', bg: '#fef2f2' },
                APPROVED: { label: 'ผ่านแล้ว', color: theme.primary, bg: theme.badgeBg },
                REJECTED: { label: 'ถูกตีกลับ', color: '#dc2626', bg: '#fef2f2' },
                INVOICED: { label: 'วางบิลแล้ว', color: '#6b7280', bg: '#f3f4f6' },
              };
              const status = statusMap[job.status] || statusMap.PENDING_SUPPLIER;

              return (
                <div key={job.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      {job.jobType === 'CAR_WASH'
                        ? <Sparkles className="w-4 h-4 text-blue-500" />
                        : <Truck className="w-4 h-4 text-purple-500" />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 font-mono">{job.jobNumber}</p>
                      <p className="text-[11px] text-gray-500">
                        {job.companyCode} • {job.branchName}
                      </p>
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
