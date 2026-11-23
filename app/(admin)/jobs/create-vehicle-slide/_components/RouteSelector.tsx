'use client';

import React from 'react';
import {
  MapPin,
  Map,
  Building2,
  Navigation,
  Loader2,
  Warehouse,
} from 'lucide-react';
import BranchSelect from '@/components/ui/BranchSelect';
import type { DropdownOption } from '@/components/ui/CustomDropdown';
import type { Branch, UserRole } from '@/types';
import { getBranchDefaultCoords } from '@/lib/vehicle-slide-rates';
import type {
  CustomDestPoint,
  CustomOriginPoint,
  MapPickerMode,
  OriginWarehouseGroup,
  RouteMode,
} from '../_types';
import DestWarehouseSelect from './DestWarehouseSelect';

interface RouteSelectorProps {
  branches: Branch[];
  currentRole: UserRole;
  selectedVinsCount: number;
  origin: {
    selectedOriginBranchId: string;
    originBranchObj?: Branch;
    originMode: RouteMode;
    customOrigin: CustomOriginPoint | null;
    canEditBranchPin: boolean;
    isSavingBranchPin: boolean;
    originBranchMainWarehouse: string;
    originWarehouseGroups: OriginWarehouseGroup[];
    onOriginBranchChange: (branchId: string) => void;
    onOriginModeChange: (mode: RouteMode) => void;
  };
  destination: {
    destMode: RouteMode;
    destBranchId: string;
    customDest: CustomDestPoint | null;
    onDestModeChange: (mode: RouteMode) => void;
    onDestBranchChange: (branchId: string) => void;
  };
  destWarehouse: {
    destWarehouseId: string;
    defaultDestWarehouse: string;
    options: DropdownOption[];
    selectedDestWarehouseName: string | null;
    originWarehouseSummary: [string, number][];
    onSelectWarehouse: (warehouseId: string) => void;
  };
  pricingPreview: {
    distance: number;
    selectedSupplierId: string;
    previewCost: number;
  };
  onOpenMapPicker: (mode: Exclude<MapPickerMode, null>) => void;
}

export default function RouteSelector({
  branches,
  currentRole,
  selectedVinsCount,
  origin,
  destination,
  destWarehouse,
  pricingPreview,
  onOpenMapPicker,
}: RouteSelectorProps) {
  const {
    selectedOriginBranchId,
    originBranchObj,
    originMode,
    customOrigin,
    canEditBranchPin,
    isSavingBranchPin,
    originBranchMainWarehouse,
    originWarehouseGroups,
    onOriginBranchChange,
    onOriginModeChange,
  } = origin;

  const {
    destMode,
    destBranchId,
    customDest,
    onDestModeChange,
    onDestBranchChange,
  } = destination;

  const { distance, selectedSupplierId, previewCost } = pricingPreview;

  return (
    <>
      {/* Origin Branch + Pickup Point */}
      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
          <span>สาขาต้นทาง (Origin Branch):</span>
          {selectedVinsCount > 0 && originBranchObj && (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ตามตำแหน่งรถที่เลือก ({originBranchObj.code ? originBranchObj.code : originBranchObj.name})
            </span>
          )}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentRole === 'ADMIN' || selectedVinsCount === 0 ? (
            <BranchSelect
              branches={branches}
              value={selectedOriginBranchId}
              onChange={onOriginBranchChange}
            />
          ) : (
            <div
              className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-emerald-50/70 flex items-center gap-2 text-xs font-bold text-emerald-950 min-w-0"
              title={originBranchObj?.name ? `${originBranchObj.name} (${originBranchObj.code})` : ''}
            >
              <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="truncate flex-1">
                {originBranchObj?.name ? `${originBranchObj.name} (${originBranchObj.code})` : 'ไม่พบข้อมูลสาขา'}
              </span>
              <span className="shrink-0 text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                ตำแหน่งรถ
              </span>
            </div>
          )}

          {/* Pickup Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 h-10">
            <button
              type="button"
              onClick={() => onOriginModeChange('branch')}
              className={`flex-1 h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                originMode === 'branch'
                  ? 'bg-white text-[#0f5238] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>รับที่สาขา</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOriginModeChange('custom');
                // First time: open the map right away, pre-pinned at the branch location
                if (!customOrigin) onOpenMapPicker('origin');
              }}
              className={`flex-1 h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                originMode === 'custom'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>ปักหมุดจุดรับรถ</span>
            </button>
          </div>
        </div>

        {/* Branch pickup: show branch address / coordinate status + edit branch pin */}
        {originMode === 'branch' && (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div
              className={`min-w-0 text-[11px] flex items-center gap-1.5 flex-wrap ${
                originBranchObj?.latitude && originBranchObj?.longitude ? 'text-gray-600' : 'text-amber-600'
              }`}
            >
              <MapPin
                className={`w-3.5 h-3.5 shrink-0 ${
                  originBranchObj?.latitude && originBranchObj?.longitude ? 'text-emerald-600' : 'text-amber-500'
                }`}
              />
              <span className="truncate flex items-center gap-1.5 flex-wrap">
                {originBranchObj?.latitude && originBranchObj?.longitude ? (
                  <>
                    <span className="text-gray-700 font-medium">{originBranchObj.address || 'ปักหมุดแล้ว'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-200">
                      GPS: {originBranchObj.latitude.toFixed(5)}, {originBranchObj.longitude.toFixed(5)}
                    </span>
                  </>
                ) : (() => {
                  const fb = getBranchDefaultCoords(
                    originBranchObj?.code || originBranchObj?.name || selectedOriginBranchId
                  );
                  if (fb) {
                    return (
                      <>
                        <span className="text-gray-700 font-medium">{fb.address}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-200">
                          GPS: {fb.lat.toFixed(4)}, {fb.lng.toFixed(4)}
                        </span>
                      </>
                    );
                  }
                  return 'สาขานี้ยังไม่มีพิกัด GPS — Supplier จะนำทางได้ไม่แม่น';
                })()}
              </span>
            </div>
            {canEditBranchPin && originBranchObj && (
              <button
                type="button"
                onClick={() => onOpenMapPicker('branch')}
                disabled={isSavingBranchPin}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
                  originBranchObj.latitude && originBranchObj.longitude
                    ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
                title="แก้พิกัดสาขาถาวร (มีผลกับทุกงานที่ใช้สาขานี้)"
              >
                {isSavingBranchPin ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <MapPin className="w-3 h-3" />
                )}
                <span>{originBranchObj.latitude && originBranchObj.longitude ? 'แก้หมุดสาขา' : 'ปักหมุดสาขา'}</span>
              </button>
            )}
          </div>
        )}

        {/* Origin D365 Warehouse (คลังที่รถจอดอยู่ปัจจุบัน) */}
        <div className="mt-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-gray-500" />
              <span>Warehouse ต้นทาง (คลัง D365 ที่รถจอดอยู่):</span>
            </span>
            {originBranchMainWarehouse && (
              <span className="text-[10px] text-gray-500">
                คลังหลักของสาขา: <b className="font-mono text-gray-700">{originBranchMainWarehouse}</b>
              </span>
            )}
          </div>
          {originWarehouseGroups.length === 0 ? (
            <p className="text-[10px] text-gray-400">เลือกรถเพื่อดูคลังที่รถจอดอยู่ปัจจุบัน</p>
          ) : (
            <div className="flex flex-col gap-1">
              {originWarehouseGroups.map((g) => (
                <div
                  key={g.warehouseId || 'none'}
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg border text-[11px] ${
                    g.warehouseId ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'
                  }`}
                  title={g.labels.join(', ')}
                >
                  <span className="min-w-0 truncate">
                    {g.warehouseId ? (
                      <>
                        <b className="font-mono text-gray-900">{g.warehouseId}</b>
                        {g.warehouseName && <span className="text-gray-500"> · {g.warehouseName}</span>}
                      </>
                    ) : (
                      <b className="text-red-600">ไม่ระบุคลังใน D365</b>
                    )}
                  </span>
                  <span className={`shrink-0 font-semibold ${g.warehouseId ? 'text-gray-600' : 'text-red-600'}`}>
                    {g.labels.length} คัน
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom pickup pin */}
        {originMode === 'custom' && (
          <button
            type="button"
            onClick={() => onOpenMapPicker('origin')}
            className={`mt-3 w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all overflow-hidden ${
              customOrigin
                ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
                : 'border-gray-300 bg-gray-50 hover:bg-white hover:border-amber-500'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                customOrigin ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'
              }`}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left min-w-0">
              {customOrigin ? (
                <>
                  <p
                    className="text-xs font-bold text-gray-900 line-clamp-2 leading-relaxed break-words"
                    title={customOrigin.address}
                  >
                    {customOrigin.address}
                  </p>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {customOrigin.lat.toFixed(5)}, {customOrigin.lng.toFixed(5)}
                  </span>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-700">คลิกเพื่อปักหมุดจุดรับรถ</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    ใช้เมื่อรถไม่ได้จอดที่สาขา เช่น ลานจอดสำรอง, บ้านลูกค้า
                  </p>
                </>
              )}
            </div>
            <Navigation className={`w-4 h-4 flex-shrink-0 ${customOrigin ? 'text-amber-600' : 'text-gray-400'}`} />
          </button>
        )}
      </div>

      {/* Destination Mode Toggle + Picker */}
      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-gray-700 mb-2">
          ปลายทาง (Destination): *
        </label>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 mb-3">
          <button
            type="button"
            onClick={() => onDestModeChange('branch')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              destMode === 'branch'
                ? 'bg-white text-[#0f5238] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>เลือกสาขา</span>
          </button>
          <button
            type="button"
            onClick={() => onDestModeChange('custom')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              destMode === 'custom'
                ? 'bg-white text-[#0f5238] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>ปักหมุดบนแผนที่</span>
          </button>
        </div>

        {/* Branch Mode */}
        {destMode === 'branch' && (
          <div className="flex flex-col gap-3">
            <BranchSelect
              branches={branches}
              value={destBranchId}
              onChange={onDestBranchChange}
              disabledIds={selectedOriginBranchId ? { [selectedOriginBranchId]: 'ต้นทาง' } : {}}
              placeholder="เลือกสาขาปลายทาง"
            />

            {/* Destination D365 Warehouse ID (required for branch-to-branch slide) */}
            <DestWarehouseSelect
              destBranchId={destBranchId}
              destWarehouseId={destWarehouse.destWarehouseId}
              defaultDestWarehouse={destWarehouse.defaultDestWarehouse}
              options={destWarehouse.options}
              selectedDestWarehouseName={destWarehouse.selectedDestWarehouseName}
              originWarehouseSummary={destWarehouse.originWarehouseSummary}
              onSelectWarehouse={destWarehouse.onSelectWarehouse}
            />
          </div>
        )}

        {/* Custom Map Mode */}
        {destMode === 'custom' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onOpenMapPicker('dest')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all overflow-hidden ${
                customDest
                  ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50'
                  : 'border-gray-300 bg-gray-50 hover:bg-white hover:border-[#0f5238]'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  customDest ? 'bg-emerald-100 text-[#0f5238]' : 'bg-gray-200 text-gray-500'
                }`}
              >
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left min-w-0">
                {customDest ? (
                  <>
                    <p
                      className="text-xs font-bold text-gray-900 line-clamp-2 leading-relaxed break-words"
                      title={customDest.address}
                    >
                      {customDest.address}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-gray-500 font-mono">
                        {customDest.lat.toFixed(4)}, {customDest.lng.toFixed(4)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700">
                        ~{distance.toFixed(1)} กม.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-gray-700">คลิกเพื่อเปิดแผนที่</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      เลือกจุดปลายทาง เช่น บ้านลูกค้า, อู่ซ่อม ฯลฯ
                    </p>
                  </>
                )}
              </div>
              <Navigation
                className={`w-4 h-4 flex-shrink-0 ${customDest ? 'text-emerald-600' : 'text-gray-400'}`}
              />
            </button>

            {/* Distance & Cost Preview */}
            {customDest && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-[#f4f9f5] border border-emerald-950/10">
                  <p className="text-[10px] text-gray-500 font-semibold">ระยะทาง</p>
                  <p className="text-sm font-bold text-[#0f5238]">{distance.toFixed(1)} กม.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#f4f9f5] border border-emerald-950/10">
                  <p className="text-[10px] text-gray-500 font-semibold">ค่าบริการ (ประมาณ)</p>
                  <p className="text-sm font-bold text-[#0f5238]">
                    {selectedSupplierId ? `฿${previewCost.toLocaleString()}` : 'รอเลือก Supplier'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
