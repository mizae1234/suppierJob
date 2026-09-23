'use client';

import React from 'react';

interface CompanyComparisonCardsProps {
  ev7VehiclesCount: number;
  ev7JobsCount: number;
  ev7ApprovedCount: number;
  giVehiclesCount: number;
  giJobsCount: number;
  giApprovedCount: number;
}

export const CompanyComparisonCards: React.FC<CompanyComparisonCardsProps> = ({
  ev7VehiclesCount,
  ev7JobsCount,
  ev7ApprovedCount,
  giVehiclesCount,
  giJobsCount,
  giApprovedCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* EV7 Summary Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-[#eaf5ee] border border-emerald-800/10 shadow-xs flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-white font-bold text-xs font-mono">
                EV7
              </span>
              <h4 className="text-base font-bold text-gray-900">บริษัท อีวี เซเว่น จำกัด</h4>
            </div>
            <span className="text-xs text-gray-500">3 สาขา</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            รถในสต็อกทั้งหมด {ev7VehiclesCount} คัน • งานทั้งหมด {ev7JobsCount} งาน
          </p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-emerald-800/10">
          <span className="text-xs text-gray-600">พร้อมวางบิล:</span>
          <span className="text-sm font-bold text-[#0f5238] font-mono">
            {ev7ApprovedCount} งาน
          </span>
        </div>
      </div>

      {/* GI Summary Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-[#eef7ff] border border-blue-900/10 shadow-xs flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-700 text-white font-bold text-xs font-mono">
                GI Fleet
              </span>
              <h4 className="text-base font-bold text-gray-900">
                บริษัท เจเนอรัล อินเทลลิเจนท์ จำกัด
              </h4>
            </div>
            <span className="text-xs text-gray-500">2 Hubs</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            รถในสต็อกทั้งหมด {giVehiclesCount} คัน • งานทั้งหมด {giJobsCount} งาน
          </p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-blue-900/10">
          <span className="text-xs text-gray-600">พร้อมวางบิล:</span>
          <span className="text-sm font-bold text-blue-900 font-mono">
            {giApprovedCount} งาน
          </span>
        </div>
      </div>
    </div>
  );
};
