'use client';

import React from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/billing-utils';
import { 
  FileText, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Receipt 
} from 'lucide-react';

interface DashboardStatsCardsProps {
  totalJobsCount: number;
  pendingSupplierCount: number;
  pendingCarWashCount: number;
  pendingSlideCount: number;
  waitingApprovalCount: number;
  rejectedCount: number;
  approvedCount: number;
  approvedAmount: number;
  invoicedCount: number;
  invoicedAmount: number;
}

export const DashboardStatsCards: React.FC<DashboardStatsCardsProps> = ({
  totalJobsCount,
  pendingSupplierCount,
  pendingCarWashCount,
  pendingSlideCount,
  waitingApprovalCount,
  rejectedCount,
  approvedCount,
  approvedAmount,
  invoicedCount,
  invoicedAmount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. งานทั้งหมด */}
      <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col min-h-[140px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            งานทั้งหมด
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-bold text-gray-900 font-mono">{totalJobsCount}</span>
          <span className="text-xs text-gray-500 font-medium">รายการ</span>
        </div>
        <p className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1 font-medium h-4">
          <TrendingUp className="w-3 h-3" />
          <span>ระบบอัปเดตเรียลไทม์</span>
        </p>
      </div>

      {/* 2. รอ Supplier รับงาน */}
      <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col min-h-[140px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            รอ Supplier ทำ
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-bold text-gray-900 font-mono">{pendingSupplierCount}</span>
          <span className="text-xs text-gray-500 font-medium">งาน</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-500 h-4">
          <span className="px-1.5 py-0.5 rounded bg-gray-100 font-medium">
            ล้าง {pendingCarWashCount}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-gray-100 font-medium">
            สไลด์ {pendingSlideCount}
          </span>
        </div>
      </div>

      {/* 3. รอสาขาตรวจรับ (Urgent Highlight) */}
      <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300 shadow-xs flex flex-col min-h-[140px] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
            รอสาขาตรวจรับ
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold animate-pulse">
            ด่วน
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-bold text-amber-950 font-mono">{waitingApprovalCount}</span>
          <span className="text-xs text-amber-800 font-medium">งาน</span>
        </div>
        <Link
          href="/approvals"
          className="inline-flex items-center gap-1 text-[11px] text-amber-900 font-semibold mt-1.5 hover:underline h-4"
        >
          <span>ส่งรูปหลักฐานแล้ว ตรวจสอบ &gt;</span>
        </Link>
      </div>

      {/* 4. งานที่ขอแก้ไข (Reject) */}
      <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col min-h-[140px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            งานขอแก้ไข
          </span>
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-bold text-red-600 font-mono">{rejectedCount}</span>
          <span className="text-xs text-gray-500 font-medium">งาน</span>
        </div>
        <p className="text-[11px] text-red-700 mt-1.5 font-medium h-4">
          รอช่างแก้ไขเก็บงานซ้ำ
        </p>
      </div>

      {/* 5. Approved พร้อมวางบิล */}
      <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col min-h-[140px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            พร้อมวางบิล
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-bold text-[#0f5238] font-mono">{approvedCount}</span>
          <span className="text-xs text-gray-500 font-medium">งาน</span>
        </div>
        <p className="text-[11px] text-emerald-800 font-bold mt-1.5 font-mono h-4">
          {formatCurrency(approvedAmount)} ประเมินแล้ว
        </p>
      </div>

      {/* 6. วางบิลแล้ว (Pending Payment) */}
      <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col min-h-[140px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            วางบิลแล้ว
          </span>
          <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <span className="text-3xl font-bold text-gray-900 font-mono">{invoicedCount}</span>
          <span className="text-xs text-gray-500 font-medium">งาน</span>
        </div>
        <p className="text-[11px] text-gray-600 font-medium mt-1.5 font-mono h-4">
          {formatCurrency(invoicedAmount)} ในใบแจ้งหนี้
        </p>
      </div>
    </div>
  );
};
