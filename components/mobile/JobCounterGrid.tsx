'use client';

import React from 'react';
import { Sparkles, ArrowUpRight, Clock, CheckCircle2, DollarSign } from 'lucide-react';

interface JobCounterGridProps {
  newCount: number;
  inProgressCount: number;
  waitingApprovalCount: number;
  approvedCount: number;
  readyToInvoiceCount: number;
  readyToInvoiceAmount: number;
  isSlideTypeInProgress?: boolean;
  onSelectFilter: (filterKey: 'NEW' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'APPROVED' | 'INVOICES') => void;
}

export const JobCounterGrid: React.FC<JobCounterGridProps> = ({
  newCount,
  inProgressCount,
  waitingApprovalCount,
  approvedCount,
  readyToInvoiceCount,
  readyToInvoiceAmount,
  isSlideTypeInProgress = false,
  onSelectFilter,
}) => {
  return (
    <section data-purpose="kpi-stat-grid">
      <div className="flex justify-between items-center px-1 mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          สถานะงาน (Job Counter)
        </h2>
        <span className="text-[11px] text-[#0f5b44] font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          อัปเดตเรียลไทม์
        </span>
      </div>

      {/* Top 3 Cards Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* 1. งานใหม่ */}
        <div
          onClick={() => onSelectFilter('NEW')}
          className="bg-white rounded-2xl p-3 border border-gray-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer active:scale-98"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0f5b44] flex items-center justify-center mb-2">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="text-xl font-bold text-slate-900 leading-none font-mono">
            {newCount}
          </div>
          <div className="text-[11px] font-medium text-gray-600 mt-1">งานใหม่</div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            +{newCount} วันนี้
          </div>
        </div>

        {/* 2. รอส่งงาน (กำลังดำเนินการ) */}
        <div
          onClick={() => onSelectFilter('IN_PROGRESS')}
          className="bg-white rounded-2xl p-3 border border-gray-200 shadow-xs hover:border-blue-300 transition-colors cursor-pointer active:scale-98"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold text-slate-900 leading-none font-mono">
            {inProgressCount}
          </div>
          <div className="text-[11px] font-medium text-gray-600 mt-1">รอส่งงาน</div>
          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
            {isSlideTypeInProgress ? 'รถสไลด์' : 'ล้างรถ'}
          </div>
        </div>

        {/* 3. รอตรวจรับ */}
        <div
          onClick={() => onSelectFilter('WAITING_APPROVAL')}
          className="bg-white rounded-2xl p-3 border border-gray-200 shadow-xs hover:border-amber-300 transition-colors cursor-pointer active:scale-98"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold text-slate-900 leading-none font-mono">
            {waitingApprovalCount}
          </div>
          <div className="text-[11px] font-medium text-gray-600 mt-1">รอตรวจรับ</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
            {waitingApprovalCount > 0 ? 'ต้องดำเนินการ' : 'เรียบร้อย'}
          </div>
        </div>
      </div>

      {/* Bottom 2 Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        {/* 4. อนุมัติแล้ว */}
        <div
          onClick={() => onSelectFilter('APPROVED')}
          className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-300 active:scale-98"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0f5b44] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 leading-none font-mono">
                {approvedCount}
              </div>
              <div className="text-[11px] text-gray-500 mt-1 font-medium">อนุมัติแล้ว</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
            ผ่านเกณฑ์
          </span>
        </div>

        {/* 5. พร้อมวางบิล */}
        <div
          onClick={() => onSelectFilter('INVOICES')}
          className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-300 active:scale-98"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0f5b44] flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 font-bold" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-900 leading-none font-mono">
                  {readyToInvoiceCount}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 font-mono">
                  ฿{readyToInvoiceAmount.toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 font-medium">พร้อมวางบิล</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-[#0f5b44] bg-[#e8f5ed] border border-emerald-200 px-2 py-0.5 rounded-full">
            ออกบิล
          </span>
        </div>
      </div>
    </section>
  );
};
