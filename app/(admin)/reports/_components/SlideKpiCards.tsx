'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { UserRole } from '@/types';
import { SlideAnalytics } from '../_lib/report-calculations';

interface SlideKpiCardsProps {
  currentRole: UserRole;
  analytics: SlideAnalytics;
}

export default function SlideKpiCards({ currentRole, analytics }: SlideKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
        <span className="text-[11px] font-semibold text-gray-400">ยอดเงินรถสไลด์ตรวจรับแล้ว</span>
        <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">
          ฿{analytics.slideTotalExpense.toLocaleString()}
        </p>
        <div className="mt-2 text-[10px] text-emerald-700 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>ตรวจรับแล้ว {analytics.approvedSlideJobs.length} เที่ยว</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
        <span className="text-[11px] font-semibold text-gray-400">จำนวนเที่ยวขนส่งทั้งหมด</span>
        <p className="text-2xl font-bold text-sky-700 mt-2">
          {analytics.slideJobs.length}{' '}
          <span className="text-xs font-normal text-gray-400">เที่ยว</span>
        </p>
        <div className="mt-2 text-[10px] text-gray-500 font-medium">
          ขนย้ายรถรวม {analytics.totalSlideCars} คัน
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
        <span className="text-[11px] font-semibold text-gray-400">ค่าบริการเฉลี่ยต่อเที่ยว</span>
        <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">
          ฿{analytics.avgCostPerSlideTrip.toLocaleString()}
        </p>
        <div className="mt-2 text-[10px] text-gray-500 font-medium">คำนวณจากยอดตรวจรับแล้ว</div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between">
        <span className="text-[11px] font-semibold text-gray-400">Supplier รถสไลด์</span>
        <p className="text-2xl font-bold text-gray-900 mt-2">
          {analytics.supplierSlideStats.length}{' '}
          <span className="text-xs font-normal text-gray-400">เจ้า</span>
        </p>
        <div className="mt-2 text-[10px] text-blue-700 font-medium">
          {currentRole === 'BRANCH'
            ? `ให้บริการสาขานี้ ${analytics.slideJobs.length} เที่ยว`
            : `ให้บริการรวม ${analytics.slideJobs.length} เที่ยว`}
        </div>
      </div>
    </div>
  );
}
