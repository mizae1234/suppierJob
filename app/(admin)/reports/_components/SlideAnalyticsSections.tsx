'use client';

import React from 'react';
import { Building2, Truck } from 'lucide-react';
import { UserRole } from '@/types';
import { SlideAnalytics } from '../_lib/report-calculations';

interface SlideAnalyticsSectionsProps {
  currentRole: UserRole;
  analytics: SlideAnalytics;
}

export default function SlideAnalyticsSections({
  currentRole,
  analytics,
}: SlideAnalyticsSectionsProps) {
  const { branchSlideStats, supplierSlideStats } = analytics;

  return (
    <>
      {/* Section 2: สถิติรถสไลด์แยกตามสาขาต้นทาง (Origin Branch Breakdown) - เฉพาะแอดมิน */}
      {currentRole !== 'BRANCH' && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-gray-900">
                สถิติรถสไลด์แยกตามสาขาต้นทาง (ส่งรถออก)
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {branchSlideStats.length} สาขา
            </span>
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
                    <td className="py-3.5 px-4 text-center font-medium text-gray-700">
                      {b.outboundTrips} เที่ยว
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-sky-700">
                      {b.outboundCars} คัน
                    </td>
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
      )}

      {/* Section 3: สถิติแยกตาม Supplier รถสไลด์ (Slide Providers) */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-gray-900">
              ผลงาน Supplier รถสไลด์ (Slide Providers)
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {supplierSlideStats.length} เจ้า
          </span>
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
                  <td className="py-3.5 px-4 text-center font-medium text-gray-700">
                    {s.tripsCount} เที่ยว
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-sky-700">
                    {s.carsCount} คัน
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                    {s.approvedCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {s.approvedCount}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-red-600">
                    {s.rejectedCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        {s.rejectedCount}
                      </span>
                    ) : (
                      '-'
                    )}
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
    </>
  );
}
