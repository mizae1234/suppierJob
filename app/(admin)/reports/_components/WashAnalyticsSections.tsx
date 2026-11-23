'use client';

import React from 'react';
import { Building2, Car, Layers, Sparkles } from 'lucide-react';
import { UserRole } from '@/types';
import { WashAnalytics } from '../_lib/report-calculations';

interface WashAnalyticsSectionsProps {
  currentRole: UserRole;
  analytics: WashAnalytics;
}

export default function WashAnalyticsSections({
  currentRole,
  analytics,
}: WashAnalyticsSectionsProps) {
  const {
    totalCarsWashed,
    branchWashStats,
    supplierWashStats,
    dynamicWashServiceStats,
    carModelStats,
  } = analytics;

  return (
    <>
      {/* Section 2: สถิติงานล้างรถแยกตามสาขา (Branch Breakdown) - เฉพาะแอดมิน */}
      {currentRole !== 'BRANCH' && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-gray-900">ปริมาณงานล้างรถแยกตามสาขา</h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {branchWashStats.length} สาขา
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                  <th className="py-3 px-5 whitespace-nowrap">สาขา</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">ใบสั่งงาน</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">จำนวนรถ (คัน)</th>
                  <th className="py-3 px-6 whitespace-nowrap">สัดส่วนจำนวนรถ</th>
                  <th className="py-3 px-5 text-right whitespace-nowrap">ยอดรวมค่าล้าง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {branchWashStats.map(b => {
                  const pct =
                    totalCarsWashed > 0 ? Math.round((b.carsCount / totalCarsWashed) * 100) : 0;
                  return (
                    <tr key={b.branchName} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-gray-900 whitespace-nowrap">
                        {b.branchName}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-gray-700 whitespace-nowrap">
                        {b.jobsCount} ใบ
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-700 whitespace-nowrap">
                        {b.carsCount} คัน
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-gray-500 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono whitespace-nowrap">
                        ฿{b.totalCost.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {branchWashStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      ยังไม่มีประวัติการส่งล้างรถในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: สถิติแยกตาม Supplier คาร์แคร์ (Supplier Breakdown) */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-gray-900">
              ผลงาน Supplier คาร์แคร์ (Car Wash Suppliers)
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">{supplierWashStats.length} ราย</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold text-[11px]">
                <th className="py-3 px-5 whitespace-nowrap">ชื่อ Supplier</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">ใบสั่งงาน</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">จำนวนรถ (คัน)</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">ตรวจรับผ่าน</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">ขอแก้ไข</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">อัตราผ่านตรวจรับ</th>
                <th className="py-3 px-5 text-right whitespace-nowrap">ยอดเบิกจ่ายสะสม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {supplierWashStats.map(s => {
                const totalReviewed = s.approvedCount + s.rejectedCount;
                const passRate =
                  totalReviewed > 0 ? Math.round((s.approvedCount / totalReviewed) * 100) : 100;
                return (
                  <tr key={s.supplierName} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-gray-900 whitespace-nowrap">
                      {s.supplierName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-gray-700 whitespace-nowrap">
                      {s.jobsCount} ใบ
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-700 whitespace-nowrap">
                      {s.carsCount} คัน
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700 whitespace-nowrap">
                      {s.approvedCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {s.approvedCount}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-red-600 whitespace-nowrap">
                      {s.rejectedCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                          {s.rejectedCount}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {totalReviewed > 0 ? (
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                passRate >= 90
                                  ? 'bg-emerald-500'
                                  : passRate >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${passRate}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono text-[11px] font-bold ${
                              passRate >= 90
                                ? 'text-emerald-700'
                                : passRate >= 70
                                  ? 'text-amber-700'
                                  : 'text-red-600'
                            }`}
                          >
                            {passRate}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 font-mono">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-gray-900 font-mono whitespace-nowrap">
                      ฿{s.totalCost.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {supplierWashStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    ยังไม่มีข้อมูล Supplier คาร์แคร์
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: สรุปตามบริการคาร์แคร์จริง และ สถิติแยกรุ่นรถยนต์ (Actual Wash Services & Car Models) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Dynamic Service Breakdown */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-gray-900">
                บริการคาร์แคร์ที่สั่งทำจริง (Services Provided)
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {dynamicWashServiceStats.length} รายการบริการ
            </span>
          </div>

          <div className="p-4 flex-1">
            {dynamicWashServiceStats.length > 0 ? (
              <div className="space-y-3">
                {dynamicWashServiceStats.map(s => {
                  const pct =
                    totalCarsWashed > 0 ? Math.round((s.count / totalCarsWashed) * 100) : 0;
                  return (
                    <div key={s.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className="font-semibold text-gray-800 truncate max-w-[240px]"
                          title={s.label}
                        >
                          {s.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-800">{s.count} คัน</span>
                          <span className="text-gray-400 font-mono text-[11px]">({pct}%)</span>
                          <span className="font-mono font-semibold text-gray-700 text-xs">
                            ฿{s.cost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center py-6 text-gray-400 text-xs">
                ยังไม่มีข้อมูลบริการล้างรถที่ส่งทำ
              </div>
            )}
          </div>
        </div>

        {/* Right: Car Models Breakdown */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-gray-900">สถิติแยกรุ่นรถยนต์ (Car Models)</h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">{carModelStats.length} รุ่น</span>
          </div>

          <div className="p-4 flex-1">
            {carModelStats.length > 0 ? (
              <div className="space-y-3">
                {carModelStats.slice(0, 5).map(m => {
                  const pct =
                    totalCarsWashed > 0 ? Math.round((m.count / totalCarsWashed) * 100) : 0;
                  return (
                    <div key={m.model} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className="font-semibold text-gray-800 truncate max-w-[180px]"
                          title={m.model}
                        >
                          {m.model}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-800">{m.count} คัน</span>
                          <span className="text-gray-400 font-mono text-[11px]">({pct}%)</span>
                          <span className="font-mono font-semibold text-gray-700 text-xs">
                            ฿{m.totalCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center py-6 text-gray-400 text-xs">
                ยังไม่มีข้อมูลรุ่นรถที่ส่งล้าง
              </div>
            )}
          </div>

          {carModelStats.length > 5 && (
            <div className="px-5 py-2.5 bg-gray-50/70 border-t border-gray-100 text-[11px] text-gray-500 text-center font-medium">
              แสดง 5 อันดับแรก จากทั้งหมด {carModelStats.length} รุ่น
            </div>
          )}
        </div>
      </div>
    </>
  );
}
