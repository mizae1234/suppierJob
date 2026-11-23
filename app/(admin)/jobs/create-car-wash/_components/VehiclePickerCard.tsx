'use client';

import React from 'react';
import {
  Check,
  Loader2,
  Lock,
  Minus,
  Plus,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import TagSearch from '@/components/ui/TagSearch';
import { UserRole, Vehicle } from '@/types';
import { CarCategory, CustomServiceVehicleInput } from '../_types';
import { getBranchShortLabel } from '../_utils';

interface VehiclePickerState {
  searchTags: string[];
  onSearchTagsChange: (tags: string[]) => void;
  isSearchingGlobal: boolean;
  filteredVehicles: Vehicle[];
  selectableVehicles: Vehicle[];
  isAllFilteredSelected: boolean;
  someFilteredSelected: boolean;
  onToggleSelectAll: () => void;
  onOpenAddServiceModal: (initialTerm: string) => void;
}

interface BusyVehicleCancelState {
  vehicleToCancelVin?: string;
  isCancelling: boolean;
  onOpenCancelModal: (e: React.MouseEvent, vehicle: Vehicle) => void;
}

interface VehiclePickerCardProps {
  carCategory: CarCategory;
  selectedBranchId: string;
  currentRole: UserRole;
  isLocked: boolean;
  themePrimary: string;
  selectedVins: Set<string>;
  selectedCount: number;
  picker: VehiclePickerState;
  onToggleVehicle: (vehicle: Vehicle) => void;
  onQuickAddCustomVehicle: (data: CustomServiceVehicleInput) => void;
  cancelState: BusyVehicleCancelState;
}

export function VehiclePickerCard({
  carCategory,
  selectedBranchId,
  currentRole,
  isLocked,
  themePrimary,
  selectedVins,
  selectedCount,
  picker,
  onToggleVehicle,
  onQuickAddCustomVehicle,
  cancelState,
}: VehiclePickerCardProps) {
  const {
    searchTags,
    onSearchTagsChange,
    isSearchingGlobal,
    filteredVehicles,
    selectableVehicles,
    isAllFilteredSelected,
    someFilteredSelected,
    onToggleSelectAll,
    onOpenAddServiceModal,
  } = picker;

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/90 shadow-xs flex flex-col gap-3 transition-opacity ${
        isLocked ? 'pointer-events-none opacity-45 select-none' : ''
      }`}
    >
      {/* Header: Clean, balanced, single-line title and counter */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 min-w-0">
          <span
            className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold shrink-0 shadow-2xs"
            style={{ backgroundColor: themePrimary }}
          >
            3
          </span>
          <span className="truncate">
            {carCategory === 'NEW_CAR' ? 'เลือกรถในสต็อกสาขา' : 'เลือกรถ Service'}
          </span>
        </h2>

        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/70 shadow-2xs shrink-0 whitespace-nowrap">
          เลือกแล้ว <span className="font-extrabold text-[#0f5238]">{selectedCount}</span> คัน
        </span>
      </div>

      {/* Scope info & Quick Add Bar when SERVICE */}
      {carCategory === 'SERVICE' ? (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50/90 border border-slate-200/70 text-[11px]">
          <span className="text-slate-600 font-medium truncate flex items-center gap-1.5">
            <span className="text-xs">🌐</span>
            <span>ค้นหาจากรถทุกสาขาทั่วประเทศ</span>
          </span>
          <button
            type="button"
            onClick={() => onOpenAddServiceModal(searchTags[0] || '')}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/60 shrink-0 cursor-pointer flex items-center gap-1 transition-all"
            title="คลิกเพื่อระบุรถที่ไม่มีข้อมูลในระบบ"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>เพิ่มรถนอกสต็อก</span>
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 -mt-1 px-0.5 leading-tight">
          เลือกรถจากสต็อกสาขาที่ต้องการส่งล้าง
        </p>
      )}

      {/* VIN & License search — Tag-based */}
      <div className="flex flex-col gap-1">
        <TagSearch
          tags={searchTags}
          onTagsChange={onSearchTagsChange}
          placeholder={
            carCategory === 'NEW_CAR'
              ? 'ค้นหาทะเบียน, VIN หรือรุ่น...'
              : 'พิมพ์เลขทะเบียน หรือ VIN เพื่อค้นหารถทุกสาขา...'
          }
          accentColor={themePrimary}
        />
        {isSearchingGlobal && (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 px-1 pt-0.5 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
            <span>กำลังค้นหาทะเบียนทั่วทั้งระบบ...</span>
          </div>
        )}
      </div>

      {/* Select All Bar */}
      {filteredVehicles.length > 0 && (
        <div className="flex items-center justify-between px-1 py-1 text-xs border-b border-gray-100">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="flex items-center gap-2 font-medium text-gray-700 hover:text-emerald-900 transition-colors select-none py-0.5 group cursor-pointer"
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
              {!isAllFilteredSelected && someFilteredSelected && (
                <Minus className="w-3 h-3 stroke-[3]" />
              )}
            </div>
            <span className="font-semibold text-xs text-gray-800 group-hover:text-emerald-900">
              {isAllFilteredSelected
                ? 'ยกเลิกการเลือกทั้งหมด'
                : `เลือกทั้งหมด (${selectableVehicles.length} คัน)`}
            </span>
          </button>

          {searchTags.length > 0 && (
            <span className="text-[11px] text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              ผลการค้นหา {filteredVehicles.length} คัน
            </span>
          )}
        </div>
      )}

      {/* Vehicles List */}
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {filteredVehicles.length === 0 ? (
          <div className="py-7 px-4 text-center text-xs text-gray-500 flex flex-col items-center gap-2.5 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0f5238] border border-emerald-100 flex items-center justify-center text-base shadow-2xs">
              🚗
            </div>
            <div className="max-w-xs">
              <p className="text-xs font-bold text-gray-900">
                {carCategory === 'SERVICE'
                  ? searchTags.length > 0
                    ? `ไม่พบทะเบียน "${searchTags.join(', ')}" ในระบบ`
                    : 'ไม่พบข้อมูลรถในระบบ'
                  : 'ไม่มีรถในสต็อกสาขานี้ หรือไม่ตรงกับการค้นหา'}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                {carCategory === 'SERVICE'
                  ? searchTags.length > 0
                    ? 'หากเป็นรถลูกค้านอกสต็อก สามารถคลิกเพิ่มเพื่อส่งล้างได้ทันที'
                    : 'ลองพิมพ์เลขทะเบียนรถเพื่อค้นหา หรือคลิกปุ่มเพื่อระบุรถนอกสต็อก'
                  : 'ลองเปลี่ยนคำค้นหา หรือเลือกสาขาอื่น'}
              </p>
            </div>
            {carCategory === 'SERVICE' && (
              <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
                {searchTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuickAddCustomVehicle({
                        licensePlate: searchTags[searchTags.length - 1],
                        model: 'รถลูกค้า Service',
                        color: 'ไม่ระบุสี',
                      });
                      onSearchTagsChange([]);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0c402b] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ เพิ่มทะเบียน &quot;{searchTags[searchTags.length - 1]}&quot; ทันที</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenAddServiceModal(searchTags[searchTags.length - 1] || '')}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 py-1 px-2 cursor-pointer"
                >
                  {searchTags.length > 0 ? 'หรือระบุรุ่น / สี เพิ่มเติม' : '+ ระบุข้อมูลรถลูกค้านอกสต็อก'}
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredVehicles.map(v => {
            const isSelected = selectedVins.has(v.vin);
            const busyJob = v.activeJob;
            const isWash = busyJob?.jobType === 'CAR_WASH';
            const isCustomerCar = v.vehicleType === 'CUSTOMER_SERVICE';
            const isOtherBranch = v.currentBranchId && v.currentBranchId !== selectedBranchId;

            return (
              <div
                key={v.vin}
                onClick={() => onToggleVehicle(v)}
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
                  {/* Top row: Primary Identifier (Plate / VIN) & Branch/Customer Badge */}
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    {v.licensePlate ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-gray-300 text-gray-900 text-xs font-bold shadow-2xs shrink-0 tracking-tight">
                        {v.licensePlate}
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-bold text-gray-900 truncate">
                        {v.vin}
                      </span>
                    )}

                    {/* Source badge */}
                    {isCustomerCar ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold shrink-0 whitespace-nowrap">
                        รถลูกค้า
                      </span>
                    ) : isOtherBranch ? (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold shrink-0"
                        title={
                          v.currentBranchName
                            ? `${v.currentBranchCode || ''}: ${v.currentBranchName}`
                            : 'ต่างสาขา'
                        }
                      >
                        {getBranchShortLabel(v.currentBranchCode, v.currentBranchName)}
                      </span>
                    ) : null}
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
                              onClick={e => cancelState.onOpenCancelModal(e, v)}
                              disabled={
                                cancelState.isCancelling &&
                                cancelState.vehicleToCancelVin === v.vin
                              }
                              className="w-7 h-7 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 border border-amber-200/80 hover:border-red-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 group"
                              title="ยกเลิกคำสั่งงานสำหรับรถคันนี้"
                              aria-label="ยกเลิกคำสั่งงานสำหรับรถคันนี้"
                            >
                              {cancelState.isCancelling &&
                              cancelState.vehicleToCancelVin === v.vin ? (
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
                      <span>พร้อมส่งล้าง</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
