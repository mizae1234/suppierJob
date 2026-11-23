'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { WashAnalytics } from '../_lib/report-calculations';

interface WashKpiCardsProps {
  analytics: WashAnalytics;
}

export default function WashKpiCards({ analytics }: WashKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
        <span className="text-[11px] font-semibold text-gray-400">ยอดเงินล้างรถตรวจรับแล้ว</span>
        <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">
          ฿{analytics.washTotalExpense.toLocaleString()}
        </p>
        <div className="mt-2 text-[10px] text-emerald-700 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>ตรวจรับแล้ว {analytics.approvedWashJobs.length} ใบงาน</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
        <span className="text-[11px] font-semibold text-gray-400">จำนวนรถที่ส่งล้างทั้งหมด</span>
        <p className="text-2xl font-bold text-amber-700 mt-2">
          {analytics.totalCarsWashed} <span className="text-xs font-normal text-gray-400">คัน</span>
        </p>
        <div className="mt-2 text-[10px] text-gray-500 font-medium">
          จากใบสั่งงาน {analytics.washJobs.length} ใบ
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
        <span className="text-[11px] font-semibold text-gray-400">ค่าล้างเฉลี่ยต่อคัน</span>
        <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">
          ฿{analytics.avgCostPerCar.toLocaleString()}
        </p>
        <div className="mt-2 text-[10px] text-gray-500 font-medium">คำนวณจากยอดตรวจรับแล้ว</div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
        <span className="text-[11px] font-semibold text-gray-400">Supplier ผู้ให้บริการ</span>
        <p className="text-2xl font-bold text-gray-900 mt-2">
          {analytics.supplierWashStats.length}{' '}
          <span className="text-xs font-normal text-gray-400">เจ้า</span>
        </p>
        <div className="mt-2 text-[10px] text-gray-500 font-medium">
          ให้บริการ {analytics.branchWashStats.length} สาขา
        </div>
      </div>
    </div>
  );
}
