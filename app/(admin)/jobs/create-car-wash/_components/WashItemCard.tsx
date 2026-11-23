'use client';

import React from 'react';
import { Check, CheckCheck, ChevronDown, Trash2 } from 'lucide-react';
import { CarCategory, SelectedWashItem, SupplierServiceOption } from '../_types';
import { CAR_WASH_REASONS, getWashReasonItem } from '../_utils';

interface WashItemCardProps {
  item: SelectedWashItem;
  index: number;
  totalSelected: number;
  carCategory: CarCategory;
  supplierServices: SupplierServiceOption[];
  themePrimary: string;
  isWashTypeOpen: boolean;
  isWashReasonOpen: boolean;
  onToggleWashType: () => void;
  onCloseWashType: () => void;
  onToggleWashReason: () => void;
  onCloseWashReason: () => void;
  onUpdateField: <K extends keyof SelectedWashItem>(
    vin: string,
    field: K,
    value: SelectedWashItem[K]
  ) => void;
  onRemove: (vin: string) => void;
  onApplyReasonToAll: (reasonValue: string) => void;
}

export function WashItemCard({
  item,
  index,
  totalSelected,
  carCategory,
  supplierServices,
  themePrimary,
  isWashTypeOpen,
  isWashReasonOpen,
  onToggleWashType,
  onCloseWashType,
  onToggleWashReason,
  onCloseWashReason,
  onUpdateField,
  onRemove,
  onApplyReasonToAll,
}: WashItemCardProps) {
  const selectedSvc = supplierServices.find(s => s.code === item.washType);
  const isDropdownOpen = isWashTypeOpen || isWashReasonOpen;
  const itemReasonObj = getWashReasonItem(item.washReason);

  const matchingServices = supplierServices.filter(s => s.category === carCategory);
  const otherServices = supplierServices.filter(s => s.category !== carCategory);

  const renderServiceBtn = (svc: SupplierServiceOption) => {
    const isSelected = item.washType === svc.code;
    return (
      <button
        type="button"
        key={svc.code}
        onMouseDown={e => {
          e.preventDefault();
          onUpdateField(item.vin, 'washType', svc.code);
          onCloseWashType();
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors cursor-pointer text-left ${
          isSelected
            ? 'bg-emerald-50 text-emerald-950 font-bold border-l-2 border-l-[#0f5238]'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <div className="min-w-0 pr-3">
          <p className="truncate font-semibold">{svc.name}</p>
          <span className="text-[10px] text-gray-400 block mt-0.5">{svc.categoryName}</span>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-xs font-mono font-bold text-[#0f5238] px-2 py-0.5 rounded bg-emerald-50/70 border border-emerald-100">
            {svc.priceType === 'RANGE' ? `฿${svc.minPrice} - ฿${svc.maxPrice}` : `฿${svc.price}`}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div
      className={`rounded-2xl border border-gray-200/90 bg-white shadow-xs hover:border-gray-300 transition-all duration-200 ${
        isDropdownOpen ? 'relative z-20' : 'relative z-0'
      }`}
    >
      {/* 1. Vehicle Header Bar */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-gray-50/90 via-slate-50/50 to-white rounded-t-2xl border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0f5238] text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono font-bold text-gray-900 text-sm tracking-wide">
              {item.vin}
            </span>
            {item.licensePlate && (
              <span className="px-2.5 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 font-semibold text-xs shadow-2xs">
                {item.licensePlate}
              </span>
            )}
            {item.isCustomServiceVehicle && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px] shadow-2xs">
                🔧 รถลูกค้า Service
              </span>
            )}
            {item.roNumber && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-bold text-[10px] shadow-2xs">
                RO: {item.roNumber}
              </span>
            )}
            <span className="text-gray-500 text-xs font-medium">
              • {item.model} <span className="text-gray-400 font-normal">({item.color})</span>
            </span>
          </div>
        </div>

        {/* Subtotal & Delete Action */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block leading-none mb-0.5">
              รวมคันนี้
            </span>
            <span className="text-base font-extrabold text-[#0f5238] leading-none">
              ฿{(item.unitPrice || 0).toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.vin)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
            title="ลบรายการนี้"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Controls Grid */}
      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Row 1: Service Selector, Unit Price, Actual Date */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
          {/* 1. Service Selector (col-span-12 md:col-span-6) */}
          <div className="sm:col-span-12 md:col-span-6">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 leading-5">
              ประเภทบริการล้างรถ
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={onToggleWashType}
                className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs font-semibold text-left flex items-center justify-between gap-2 cursor-pointer hover:border-gray-300 transition-colors bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238]"
                style={{ color: themePrimary }}
              >
                <span className="truncate pr-2">
                  {selectedSvc?.name || item.washType}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-mono font-bold text-[#0f5238]">
                    {selectedSvc?.priceType === 'RANGE'
                      ? `฿${selectedSvc.minPrice}-${selectedSvc.maxPrice}`
                      : `฿${selectedSvc?.price}`}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                      isWashTypeOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {isWashTypeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={onCloseWashType} />
                  <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden z-50 py-1 max-h-72 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-emerald-50/70 border-b border-emerald-100 text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                      <span>
                        {carCategory === 'NEW_CAR'
                          ? '🚗 บริการสำหรับรถใหม่'
                          : '🔧 บริการสำหรับรถ Service'}
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded font-bold">
                        {matchingServices.length > 0
                          ? matchingServices.length
                          : supplierServices.length}{' '}
                        บริการ
                      </span>
                    </div>
                    {(matchingServices.length > 0 ? matchingServices : supplierServices).map(
                      renderServiceBtn
                    )}

                    {matchingServices.length > 0 && otherServices.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-gray-50 border-y border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between mt-1">
                          <span>บริการประเภทอื่นๆ ของ Supplier</span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            ({otherServices.length})
                          </span>
                        </div>
                        {otherServices.map(renderServiceBtn)}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2. Unit Price (col-span-12 sm:col-span-6 md:col-span-3) */}
          <div className="sm:col-span-6 md:col-span-3">
            <div className="h-5 flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700 leading-5">
                ราคาต่อคัน (บาท)
              </label>
              {item.priceType === 'RANGE' && (
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80 leading-none">
                  ช่วงราคา
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">
                ฿
              </span>
              <input
                type="number"
                min={0}
                step="any"
                value={item.unitPrice}
                onChange={e =>
                  onUpdateField(item.vin, 'unitPrice', parseFloat(e.target.value) || 0)
                }
                className="w-full h-10 pl-7 pr-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white transition-all"
              />
            </div>

            {item.priceType === 'RANGE' &&
              item.minPrice !== undefined &&
              item.maxPrice !== undefined && (
                <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1 truncate">
                  <span>💡 ช่วงแนะนำ:</span>
                  <span className="font-mono font-bold">
                    ฿{item.minPrice} - ฿{item.maxPrice}
                  </span>
                </p>
              )}
          </div>

          {/* 3. Actual Wash Date (col-span-12 sm:col-span-6 md:col-span-3) */}
          <div className="sm:col-span-6 md:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 leading-5">
              วันปฏิบัติงานจริง
            </label>

            <input
              type="date"
              value={item.actualWashDate}
              onChange={e => onUpdateField(item.vin, 'actualWashDate', e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white transition-all"
            />
          </div>
        </div>

        {/* Row 2: Wash Reason Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>เหตุผลการล้าง</span>
              <span className="text-emerald-700 text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-medium">
                ระบุเหตุผล
              </span>
            </span>
            {totalSelected > 1 ? (
              <button
                type="button"
                onClick={() => onApplyReasonToAll(itemReasonObj.value)}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                title="นำเหตุผลของคันนี้ไปใช้กับทุกคัน"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Apply เหตุผลนี้ให้ทุกคัน</span>
              </button>
            ) : (
              <span className="text-[11px] font-normal text-gray-400">สำหรับแต่ละคัน</span>
            )}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleWashReason}
              className={`w-full h-10 px-3.5 rounded-xl border text-xs font-semibold text-left flex items-center justify-between gap-2 cursor-pointer transition-all bg-white shadow-2xs hover:border-gray-300 ${
                isWashReasonOpen
                  ? 'border-[#0f5238] ring-2 ring-emerald-500/20 text-gray-900'
                  : 'border-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base leading-none shrink-0">{itemReasonObj.icon}</span>
                <span className="truncate font-semibold text-gray-800">{itemReasonObj.label}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                  isWashReasonOpen ? 'rotate-180 text-[#0f5238]' : ''
                }`}
              />
            </button>

            {isWashReasonOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={onCloseWashReason} />
                <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden z-50 py-1 divide-y divide-gray-50">
                  <div className="px-3.5 py-2 bg-gray-50/90 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>เหตุผลการล้าง</span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      ({CAR_WASH_REASONS.length} ตัวเลือก)
                    </span>
                  </div>
                  {CAR_WASH_REASONS.map(r => {
                    const isSelected = itemReasonObj.value === r.value;
                    return (
                      <button
                        type="button"
                        key={r.value}
                        onMouseDown={e => {
                          e.preventDefault();
                          onUpdateField(item.vin, 'washReason', r.value);
                          onCloseWashReason();
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-950 font-bold border-l-3 border-l-[#0f5238]'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base leading-none shrink-0">{r.icon}</span>
                          <span className="truncate">{r.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#0f5238] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 3: Remarks / จุดระวังเฉพาะคัน (ไว้ใต้เหตุผล) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
            <span>หมายเหตุ / จุดระวังเฉพาะคัน</span>
            <span className="text-[11px] font-normal text-gray-400">ไม่บังคับ</span>
          </label>
          <input
            type="text"
            value={item.remarks}
            onChange={e => onUpdateField(item.vin, 'remarks', e.target.value)}
            placeholder={
              item.washType === 'POLISH_STAINS'
                ? 'ระบุตำแหน่งรอย เช่น รอยขูดขีดกันชนหน้า, คราบยางมะตอย...'
                : 'ระบุรายละเอียดเพิ่มเติม หรือจุดที่ต้องการให้เน้นเป็นพิเศษ (ถ้ามี)...'
            }
            className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white transition-all shadow-2xs hover:border-gray-300"
          />
        </div>
      </div>
    </div>
  );
}
