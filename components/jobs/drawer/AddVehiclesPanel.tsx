'use client';

import React from 'react';
import { ArrowRight, Check, Loader2, Lock, Plus, Search, Truck, X } from 'lucide-react';
import { Job } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
import { UseAddVehiclesReturn } from './useAddVehicles';

interface AddVehiclesPanelProps {
  job: Job;
  theme: ThemeColors;
  addVehicles: UseAddVehiclesReturn;
}

export function AddVehiclesPanel({ job, theme, addVehicles }: AddVehiclesPanelProps) {
  const {
    setIsAddingVehicles,
    addSearchQuery,
    setAddSearchQuery,
    selectedAddVins,
    setSelectedAddVins,
    setAddWashType,
    showAllBranchesForAdd,
    setShowAllBranchesForAdd,
    isSubmittingAddVehicles,
    branchMap,
    originBranchForAdd,
    destBranchForAdd,
    originAvailableCount,
    allAvailableCount,
    selectableVehiclesForAdd,
    washConfig,
    slidePricingForAdd,
    effectiveWashTypeForAdd,
    lockedUnitPriceForAdd,
    handleToggleAddVin,
    handleConfirmAddVehicles,
  } = addVehicles;

  return (
    <div className="mb-3 rounded-2xl bg-white border border-emerald-200/90 shadow-xs overflow-hidden animate-in fade-in duration-150">
      {/* Top Banner Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-white border-b border-emerald-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
            style={{ backgroundColor: theme.primary }}
          >
            <Plus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-900">
                เพิ่มรถเข้าใบงาน {job.jobNumber}
              </span>
              {job.jobType === 'VEHICLE_SLIDE' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200/80 text-[10px] font-semibold text-emerald-900 shadow-2xs">
                  <Truck className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>
                    {originBranchForAdd?.code || job.pickupBranchName || job.branchName}
                  </span>
                  <ArrowRight className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  <span>{destBranchForAdd?.code || job.destBranchName || 'ปลายทาง'}</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">
              {job.jobType === 'VEHICLE_SLIDE'
                ? `${job.pickupBranchName || job.branchName} ➔ ${job.destBranchName || job.customDestAddress || 'ปลายทาง'}`
                : 'เพิ่มได้ก่อนที่ Supplier จะกดยืนยันตัวรถคันแรก'}
            </p>
          </div>
        </div>

        {/* Locked Unit Price Box (ตามเรทราคาของ Supplier) */}
        <div
          className="flex items-center gap-2 shrink-0"
          title={slidePricingForAdd?.formulaDetail || 'อ้างอิงตามเรทราคาสัญญาของ Supplier'}
        >
          <span className="text-[11px] font-semibold text-gray-600 whitespace-nowrap flex items-center gap-1">
            <Lock className="w-3 h-3 text-gray-400" />
            <span>ราคาต่อคัน:</span>
          </span>
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs font-bold text-gray-400 select-none">฿</span>
            <input
              type="text"
              disabled
              readOnly
              value={lockedUnitPriceForAdd.toLocaleString()}
              className="w-28 h-8 pl-6 pr-8 rounded-xl bg-gray-100/90 border border-gray-200 text-xs font-mono font-bold text-gray-700 text-right cursor-not-allowed select-none"
            />
            <span className="absolute right-2.5 text-[10px] text-gray-400 font-medium select-none">
              /คัน
            </span>
          </div>
        </div>
      </div>

      {/* Controls Body */}
      <div className="p-3.5 space-y-2.5">
        {/* Car Wash Service Selector (only for CAR_WASH) */}
        {job.jobType === 'CAR_WASH' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-600 shrink-0">บริการล้าง:</span>
            <select
              value={effectiveWashTypeForAdd}
              onChange={(e) => setAddWashType(e.target.value)}
              className="flex-1 h-8 px-2.5 rounded-xl bg-gray-50/70 border border-gray-200 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {washConfig.services.map((s) => {
                const meta = getWashServiceDisplay(s.serviceCode);
                return (
                  <option key={s.serviceCode} value={s.serviceCode}>
                    {meta.name} (฿{s.price.toLocaleString()})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Search + Segmented Branch Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={addSearchQuery}
              onChange={(e) => setAddSearchQuery(e.target.value)}
              placeholder="ค้นหา VIN / รุ่น / ทะเบียน / รหัสสาขา..."
              className="w-full h-9 pl-8 pr-7 rounded-xl bg-gray-50/70 border border-gray-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
            />
            {addSearchQuery && (
              <button
                type="button"
                onClick={() => setAddSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Branch Switcher */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-gray-100 border border-gray-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setShowAllBranchesForAdd(false)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                !showAllBranchesForAdd
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              สาขาต้นทาง {originBranchForAdd?.code ? `(${originBranchForAdd.code})` : ''} ·{' '}
              {originAvailableCount}
            </button>
            <button
              type="button"
              onClick={() => setShowAllBranchesForAdd(true)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                showAllBranchesForAdd
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              ทุกสาขา · {allAvailableCount}
            </button>
          </div>
        </div>

        {/* Vehicle Selection List */}
        <div className="max-h-52 overflow-y-auto rounded-xl bg-white border border-gray-200/90 divide-y divide-gray-100">
          {selectableVehiclesForAdd.length === 0 ? (
            <div className="py-8 px-4 text-center text-[11px] text-gray-400">
              ไม่พบรถสถานะพร้อมใช้งาน (AVAILABLE) ใน
              {showAllBranchesForAdd ? 'ระบบ' : `สาขาต้นทาง ${originBranchForAdd?.code || ''}`}
              {!showAllBranchesForAdd && allAvailableCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllBranchesForAdd(true)}
                  className="block mx-auto mt-1.5 text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  ดูรถพร้อมใช้จากทุกสาขา ({allAvailableCount} คัน) →
                </button>
              )}
            </div>
          ) : (
            selectableVehiclesForAdd.slice(0, 60).map((v) => {
              const isSelected = selectedAddVins.includes(v.vin);
              const vBranch = branchMap.get(v.currentBranchId);
              return (
                <div
                  key={v.vin}
                  onClick={() => handleToggleAddVin(v.vin)}
                  className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors select-none ${
                    isSelected ? 'bg-emerald-50/70' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-[#0f5238] border-[#0f5238] text-white shadow-2xs'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-gray-900">{v.vin}</span>
                        {v.licensePlate && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold text-[10px] border border-gray-200/70">
                            {v.licensePlate}
                          </span>
                        )}
                        {vBranch?.code && (
                          <span
                            className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/60 font-bold text-[9px]"
                            title={vBranch.name}
                          >
                            {vBranch.code}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {v.model} {v.color ? `· ${v.color}` : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold shrink-0 px-2 py-0.5 rounded-lg ${
                      isSelected ? 'bg-emerald-600 text-white' : 'text-emerald-800 bg-emerald-50/80'
                    }`}
                  >
                    +฿{lockedUnitPriceForAdd.toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="px-4 py-2.5 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-gray-700">
            เลือกเพิ่ม <strong className="text-emerald-800">{selectedAddVins.length}</strong> คัน
          </span>
          {selectedAddVins.length > 0 && (
            <>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                +฿{(selectedAddVins.length * lockedUnitPriceForAdd).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setSelectedAddVins([])}
                className="text-[10px] text-gray-400 hover:text-red-600 underline cursor-pointer"
              >
                ล้างที่เลือก
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddingVehicles(false)}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirmAddVehicles}
            disabled={selectedAddVins.length === 0 || isSubmittingAddVehicles}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            style={{ backgroundColor: theme.primary }}
          >
            {isSubmittingAddVehicles ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>ยืนยันเพิ่มรถ ({selectedAddVins.length} คัน)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
