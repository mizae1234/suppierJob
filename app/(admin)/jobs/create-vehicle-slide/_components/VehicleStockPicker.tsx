'use client';

import React from 'react';
import {
  Truck,
  Building2,
  Loader2,
  Check,
  Minus,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';
import TagSearch from '@/components/ui/TagSearch';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';
import type { Branch, UserRole, Vehicle } from '@/types';
import { getBranchShortLabel } from '../_utils';

interface VehicleStockPickerProps {
  isLockedBySupplier: boolean;
  currentRole: UserRole;
  branches: Branch[];
  availableStockCount: number;
  filter: {
    selectedBranchFilter: string;
    onBranchFilterChange: (val: string) => void;
    branchFilterOptions: DropdownOption[];
    searchTags: string[];
    onSearchTagsChange: (tags: string[]) => void;
  };
  selection: {
    selectedVins: string[];
    selectedVinSet: Set<string>;
    selectedVehicles: Vehicle[];
    filteredVehicles: Vehicle[];
    selectableVehiclesCount: number;
    isAllFilteredSelected: boolean;
    someFilteredSelected: boolean;
    onToggleSelectAll: () => void;
    onToggleVehicle: (vin: string) => void;
  };
  cancelBusyJob: {
    vehicleToCancel: Vehicle | null;
    isCancellingBusyJob: boolean;
    onOpenCancelModal: (e: React.MouseEvent, vehicle: Vehicle) => void;
  };
}

export default function VehicleStockPicker({
  isLockedBySupplier,
  currentRole,
  branches,
  availableStockCount,
  filter,
  selection,
  cancelBusyJob,
}: VehicleStockPickerProps) {
  const {
    selectedBranchFilter,
    onBranchFilterChange,
    branchFilterOptions,
    searchTags,
    onSearchTagsChange,
  } = filter;

  const {
    selectedVins,
    selectedVinSet,
    selectedVehicles,
    filteredVehicles,
    selectableVehiclesCount,
    isAllFilteredSelected,
    someFilteredSelected,
    onToggleSelectAll,
    onToggleVehicle,
  } = selection;

  const { vehicleToCancel, isCancellingBusyJob, onOpenCancelModal } = cancelBusyJob;

  return (
    <>
      {/* Step 2: Select VIN from any branch */}
      <div
        className={`p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-3 transition-opacity ${
          isLockedBySupplier ? 'pointer-events-none opacity-45 select-none' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">
              2
            </span>
            <span>เลือกรถที่ต้องการสไลด์ (VIN)</span>
          </h2>
          <span className="text-xs text-gray-500">เลือกแล้ว {selectedVins.length} คัน</span>
        </div>

        {/* Filter by Branch */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-gray-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>สาขาที่รถจอดอยู่:</span>
            </span>
            {selectedBranchFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => onBranchFilterChange('ALL')}
                className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                ดูรถทุกสาขา ({availableStockCount} คัน)
              </button>
            )}
          </label>
          <CustomDropdown
            options={branchFilterOptions}
            value={selectedBranchFilter}
            onChange={(val) => onBranchFilterChange(val)}
            placeholder="เลือกสาขาที่รถจอดอยู่"
            className="w-full text-xs"
          />
        </div>

        <TagSearch
          tags={searchTags}
          onTagsChange={onSearchTagsChange}
          placeholder="ค้นหาตาม VIN / รุ่น / ทะเบียน / สาขา... (กด Enter เพื่อเพิ่ม)"
          accentColor="#0f5238"
        />

        {/* Select All Bar */}
        {filteredVehicles.length > 0 && (
          <div className="flex items-center justify-between px-1 py-1 text-xs border-b border-gray-100">
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="flex items-center gap-2 font-medium text-gray-700 hover:text-emerald-900 transition-colors select-none py-1 group cursor-pointer"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  isAllFilteredSelected
                    ? 'bg-[#0f5238] border-[#0f5238] text-white'
                    : someFilteredSelected
                      ? 'bg-emerald-100 border-[#0f5238] text-[#0f5238]'
                      : 'border-gray-300 group-hover:border-gray-400 bg-white'
                }`}
              >
                {isAllFilteredSelected && <Check className="w-3 h-3 stroke-[3]" />}
                {!isAllFilteredSelected && someFilteredSelected && <Minus className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="font-semibold text-xs text-gray-800 group-hover:text-emerald-900">
                {isAllFilteredSelected
                  ? 'ยกเลิกการเลือกทั้งหมด'
                  : `เลือกทั้งหมด (${selectableVehiclesCount} คัน)`}
              </span>
            </button>

            {searchTags.length > 0 && (
              <span className="text-[11px] text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                ผลการค้นหา {filteredVehicles.length} คัน
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {filteredVehicles.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">
              {selectedBranchFilter === 'ALL'
                ? 'ไม่มีรถสถานะพร้อมย้ายในสต็อก หรือไม่ตรงกับการค้นหา'
                : 'ไม่มีรถสถานะพร้อมย้ายในสาขานี้ หรือไม่ตรงกับการค้นหา'}
            </div>
          ) : (
            filteredVehicles.map((v) => {
              const isSelected = selectedVinSet.has(v.vin);
              const busyJob = v.activeJob;
              const isWash = busyJob?.jobType === 'CAR_WASH';
              const branchDisplay =
                v.currentBranchName ||
                branches.find((b) => b.id === v.currentBranchId)?.name ||
                v.currentBranchCode ||
                'ไม่ระบุสาขา';
              const branchCode = getBranchShortLabel(v.currentBranchCode, v.currentBranchName);
              const isEv7 = v.companyCode === 'EV7' || branchCode === 'EV7';

              return (
                <div
                  key={v.vin}
                  onClick={() => onToggleVehicle(v.vin)}
                  title={
                    busyJob
                      ? `รถคันนี้มีงานค้างอยู่: ${busyJob.jobNumber} (${isWash ? 'งานล้างรถ' : 'งานรถสไลด์'})`
                      : undefined
                  }
                  className={`p-3 rounded-xl border transition-all flex items-start gap-3 select-none ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/20 cursor-pointer'
                      : busyJob
                        ? 'border-gray-200/80 bg-gray-50/90 hover:bg-gray-100/60 cursor-not-allowed'
                        : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/20 hover:shadow-2xs cursor-pointer'
                  }`}
                >
                  {/* Left icon / checkbox */}
                  <div className="pt-0.5 shrink-0">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : busyJob ? (
                      <div className="w-5 h-5 rounded-lg bg-amber-100/90 text-amber-700 border border-amber-300/70 flex items-center justify-center shadow-2xs">
                        <Lock className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-lg border-2 border-gray-300 hover:border-emerald-500 bg-white transition-colors" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: Primary Identifier (Plate / VIN) & Branch Badge */}
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      {v.licensePlate ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-gray-300 text-gray-900 text-xs font-bold shadow-2xs shrink-0 tracking-tight">
                          {v.licensePlate}
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-bold text-gray-900 truncate">{v.vin}</span>
                      )}

                      {/* Branch badge */}
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 border ${
                          isEv7
                            ? 'bg-emerald-50 text-[#0f5238] border-emerald-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200/80'
                        }`}
                        title={branchDisplay}
                      >
                        {branchCode}
                      </span>
                    </div>

                    {/* Secondary row: VIN (only shown if license plate exists above) */}
                    {v.licensePlate && (
                      <div className="flex items-center gap-1.5 mt-1 min-w-0">
                        <span className="text-[10px] font-medium text-gray-400 shrink-0">VIN:</span>
                        <span className="font-mono text-[11px] font-semibold text-gray-600 truncate">
                          {v.vin}
                        </span>
                      </div>
                    )}

                    {/* Model & Color */}
                    <div className="flex items-center justify-between gap-1.5 mt-0.5">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {v.model}
                        {v.color && <span className="text-gray-400 font-normal"> · {v.color}</span>}
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-semibold shrink-0 border ${
                          v.d365WarehouseId
                            ? 'bg-gray-50 text-gray-600 border-gray-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}
                        title="รหัสคลัง D365 ที่รถจอดอยู่ปัจจุบัน (Warehouse ID)"
                      >
                        WH {v.d365WarehouseId || 'ไม่ระบุ'}
                      </span>
                    </div>

                    {/* Status tag */}
                    {busyJob ? (
                      <div className="mt-2 flex items-center justify-between gap-2 p-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-50/90 via-amber-50/70 to-orange-50/50 border border-amber-200/80 shadow-2xs">
                        {/* Left: Icon & Details */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                              isWash
                                ? 'bg-amber-100/90 text-amber-700 border border-amber-200/80'
                                : 'bg-sky-100/90 text-sky-700 border border-sky-200/80'
                            }`}
                          >
                            {isWash ? (
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <Truck className="w-3.5 h-3.5 text-sky-600" />
                            )}
                          </div>

                          <div className="min-w-0 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[11px] text-amber-950 tracking-tight leading-none">
                                ติดงาน{isWash ? 'ล้างรถ' : 'รถสไลด์'}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-amber-900 bg-white/90 px-1.5 py-0.5 rounded-md border border-amber-200/70 leading-none shadow-2xs">
                                {busyJob.jobNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-800/80 leading-none">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  busyJob.verifiedAt ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                                }`}
                              />
                              <span className="font-medium">
                                {busyJob.verifiedAt ? 'ยืนยันตัวรถแล้ว' : 'รอดำเนินการ'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Cancel Action / Verified badge */}
                        <div className="shrink-0 flex items-center">
                          {currentRole !== 'SUPPLIER' &&
                            (busyJob.canCancel !== false && !busyJob.verifiedAt ? (
                              <button
                                type="button"
                                onClick={(e) => onOpenCancelModal(e, v)}
                                disabled={isCancellingBusyJob && vehicleToCancel?.vin === v.vin}
                                className="w-7 h-7 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 border border-amber-200/80 hover:border-red-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 group"
                                title="ยกเลิกคำสั่งงานสำหรับรถคันนี้"
                                aria-label="ยกเลิกคำสั่งงานสำหรับรถคันนี้"
                              >
                                {isCancellingBusyJob && vehicleToCancel?.vin === v.vin ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                ) : (
                                  <X className="w-3.5 h-3.5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                                )}
                              </button>
                            ) : (
                              <span
                                className="text-[9px] text-gray-400 italic px-1.5 py-0.5 rounded bg-white/70 border border-amber-200/60"
                                title="Supplier ถ่ายรูปยืนยันตัวรถแล้ว ไม่สามารถยกเลิกได้"
                              >
                                เริ่มงานแล้ว
                              </span>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>พร้อมย้าย</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Vehicle Card Preview */}
      {selectedVehicles.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0f5238] to-[#1b4332] text-white shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
              {selectedVehicles.length === 1
                ? 'คันที่เลือกจะขนย้าย'
                : `รถที่เลือกขนย้าย (${selectedVehicles.length} คัน)`}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
              {selectedVehicles.length === 1
                ? selectedVehicles[0].vehicleType
                : `รวม ${selectedVehicles.length} คัน`}
            </span>
          </div>
          {selectedVehicles.length === 1 ? (
            <>
              <div>
                <h3 className="text-lg font-bold">{selectedVehicles[0].model}</h3>
                <p className="font-mono text-xs text-emerald-200 mt-0.5">{selectedVehicles[0].vin}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                <div>
                  <span className="text-emerald-300">สีตัวถัง:</span>
                  <p className="font-semibold">{selectedVehicles[0].color}</p>
                </div>
                <div>
                  <span className="text-emerald-300">ทะเบียน:</span>
                  <p className="font-semibold">{selectedVehicles[0].licensePlate || 'ป้ายแดง/ไม่มีทะเบียน'}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedVehicles.map((sv, idx) => (
                <div
                  key={sv.vin}
                  className="flex items-center justify-between text-xs py-1 border-b border-white/10 last:border-none"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-mono font-bold truncate">
                      {idx + 1}. {sv.vin}
                    </p>
                    <p className="text-[11px] text-emerald-200 truncate">
                      {sv.model} • {sv.color}
                    </p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] shrink-0 font-medium">
                    {sv.licensePlate || 'ป้ายแดง'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
