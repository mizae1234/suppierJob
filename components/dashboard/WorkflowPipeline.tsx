'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/lib/billing-utils';
import { 
  Clock, 
  Wrench, 
  Eye, 
  CheckCircle2, 
  Receipt,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface WorkflowPipelineProps {
  totalJobsCount: number;
  pendingSupplierCount: number;
  inProgressCount: number;
  waitingApprovalCount: number;
  approvedCount: number;
  approvedAmount: number;
  rejectedCount?: number;
  invoicedCount: number;
  invoicedAmount: number;
}

export const WorkflowPipeline: React.FC<WorkflowPipelineProps> = ({
  totalJobsCount,
  pendingSupplierCount,
  inProgressCount,
  waitingApprovalCount,
  approvedCount,
  approvedAmount,
  rejectedCount = 0,
  invoicedCount,
  invoicedAmount,
}) => {
  const theme = useTheme();

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl bg-white border shadow-xs flex flex-col gap-5 transition-colors duration-300"
      style={{ borderColor: theme.borderSoft }}
    >
      {/* Top Header: Title + Status Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">
              ขั้นตอนกระบวนการปฏิบัติงาน (Workflow Pipeline)
            </h2>
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-colors"
              style={{
                color: theme.primary,
                backgroundColor: theme.bgSoft,
                borderColor: `${theme.primary}22`,
              }}
            >
              {totalJobsCount} งานทั้งหมด
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            ติดตามสถานะงานตามลำดับขั้นตอนและมูลค่างานสะสมในระบบแบบเรียลไทม์
          </p>
        </div>

        {/* Right side badges: Flow hint & Rejected alert */}
        <div className="flex flex-wrap items-center gap-2">
          {rejectedCount > 0 && (
            <Link
              href="/jobs"
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5 hover:bg-red-100 transition-colors"
              title="มีงานที่ส่งกลับไปให้ Supplier แก้ไข"
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>ขอแก้ไข {rejectedCount} งาน</span>
            </Link>
          )}

          <div
            className="text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 transition-colors"
            style={{
              color: theme.iconColor,
              backgroundColor: theme.badgeBg,
              borderColor: `${theme.primary}33`,
            }}
          >
            <span>สั่งงาน</span>
            <span className="text-gray-400">➔</span>
            <span>ปฏิบัติงาน</span>
            <span className="text-gray-400">➔</span>
            <span className="font-bold text-amber-700">ตรวจรับ</span>
            <span className="text-gray-400">➔</span>
            <span>วางบิล</span>
          </div>
        </div>
      </div>

      {/* 5-Step Pipeline Grid with Amounts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Step 1: สั่งงานแล้ว / รอ Supplier */}
        <Link
          href="/jobs"
          className="group p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 hover:shadow-md hover:border-blue-200"
          style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 font-mono tracking-tight flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>01 • DISPATCHED</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-gray-900 font-mono">{pendingSupplierCount}</p>
              <span className="text-[11px] text-gray-400">งาน</span>
            </div>
            <p className="text-xs text-gray-700 font-bold mt-0.5">รอ Supplier รับงาน</p>
            <p className="text-[10px] text-gray-400 mt-0.5">มอบหมายงานแล้ว</p>
          </div>
        </Link>

        {/* Step 2: กำลังทำงาน */}
        <Link
          href="/jobs"
          className="group p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 hover:shadow-md hover:border-amber-200"
          style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 font-mono tracking-tight flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              <span>02 • IN PROGRESS</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-gray-900 font-mono">{inProgressCount}</p>
              <span className="text-[11px] text-gray-400">งาน</span>
            </div>
            <p className="text-xs text-gray-700 font-bold mt-0.5">กำลังดำเนินการ</p>
            <p className="text-[10px] text-gray-400 mt-0.5">อยู่ระหว่างปฏิบัติงาน</p>
          </div>
        </Link>

        {/* Step 3: ส่งงานรอตรวจ (Interactive Review) */}
        <Link
          href="/approvals"
          className={`group p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 hover:shadow-md ${
            waitingApprovalCount > 0
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-100 hover:border-amber-400'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 font-mono tracking-tight flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>03 • REVIEW</span>
            </span>
            <span className="relative flex h-2 w-2">
              {waitingApprovalCount > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className={`text-2xl font-black font-mono ${waitingApprovalCount > 0 ? 'text-amber-950' : 'text-gray-900'}`}>
                {waitingApprovalCount}
              </p>
              <span className="text-[11px] text-amber-700 font-medium">งาน</span>
            </div>
            <p className="text-xs text-amber-900 font-black mt-0.5 flex items-center justify-between">
              <span>รอสาขาตรวจรับ</span>
              {waitingApprovalCount > 0 && (
                <span className="text-[10px] text-amber-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                  ตรวจรับ <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                </span>
              )}
            </p>
            <p className="text-[10px] text-amber-700/80 mt-0.5">รอส่งมอบและอนุมัติ</p>
          </div>
        </Link>

        {/* Step 4: อนุมัติแล้ว / พร้อมวางบิล (พร้อมยอดเงิน ฿) */}
        <Link
          href="/invoices"
          className="group p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 hover:shadow-md hover:border-emerald-300"
          style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 font-mono tracking-tight flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>04 • APPROVED</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-gray-900 font-mono">{approvedCount}</p>
              <span className="text-[11px] text-gray-400">งาน</span>
            </div>
            <p className="text-xs text-gray-700 font-bold mt-0.5">พร้อมวางบิล</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs font-black font-mono text-emerald-700">
                {formatCurrency(approvedAmount)}
              </span>
            </div>
          </div>
        </Link>

        {/* Step 5: วางบิลแล้ว (พร้อมยอดเงิน ฿) */}
        <Link
          href="/invoices"
          className="group p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 hover:shadow-md hover:border-purple-300"
          style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 font-mono tracking-tight flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-purple-600" />
              <span>05 • INVOICED</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-purple-600" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-gray-900 font-mono">{invoicedCount}</p>
              <span className="text-[11px] text-gray-400">งาน</span>
            </div>
            <p className="text-xs text-gray-700 font-bold mt-0.5">ออก Invoice แล้ว</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs font-black font-mono text-purple-700">
                {formatCurrency(invoicedAmount)}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};
