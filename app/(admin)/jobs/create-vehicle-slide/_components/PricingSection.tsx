'use client';

import React from 'react';
import {
  AlertCircle,
  Calculator,
  PencilLine,
  RotateCcw,
} from 'lucide-react';
import type { SlideCalculationResult } from '@/lib/vehicle-slide-rates';
import {
  SlidePricingMode,
  SLIDE_PRICING_AUTO,
  SLIDE_PRICING_MANUAL,
  MANUAL_PRICE_NOTE_MIN_LENGTH,
  MANUAL_PRICE_NOTE_MAX_LENGTH,
} from '@/lib/slide-pricing';

interface PricingSectionProps {
  isManualPricing: boolean;
  routeDistance: number;
  distance: number;
  estimatedCost: number;
  contractCostPerCar: number;
  manualPriceNote: string;
  manualPriceDiff: { diff: number; percent: number } | null;
  pricingCalculation: SlideCalculationResult | null;
  selectedSupplierId: string;
  selectedVinsCount: number;
  onChangePricingMode: (mode: SlidePricingMode) => void;
  onManualDistanceChange: (val: number) => void;
  onManualCostChange: (val: number) => void;
  onManualPriceNoteChange: (val: string) => void;
  onResetManualToAuto: () => void;
}

export default function PricingSection({
  isManualPricing,
  routeDistance,
  distance,
  estimatedCost,
  contractCostPerCar,
  manualPriceNote,
  manualPriceDiff,
  pricingCalculation,
  selectedSupplierId,
  selectedVinsCount,
  onChangePricingMode,
  onManualDistanceChange,
  onManualCostChange,
  onManualPriceNoteChange,
  onResetManualToAuto,
}: PricingSectionProps) {
  return (
    <>
      {/* Pricing Mode Toggle (AUTO / MANUAL) */}
      <div className="md:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="block text-xs font-semibold text-gray-700">
            วิธีคิดค่าบริการ (Pricing Method):
          </label>
          <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 border border-gray-200/80 gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onChangePricingMode(SLIDE_PRICING_AUTO)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isManualPricing ? 'bg-white text-[#0f5238] shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>คำนวณอัตโนมัติ</span>
            </button>
            <button
              type="button"
              onClick={() => onChangePricingMode(SLIDE_PRICING_MANUAL)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isManualPricing ? 'bg-white text-amber-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <PencilLine className="w-3.5 h-3.5" />
              <span>กรอกเอง</span>
            </button>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          {isManualPricing
            ? 'กรอกระยะทางและค่าใช้จ่ายต่อคันเอง (เช่น Supplier คิดระยะทางจากจุดจอดรถ → จุดรับ → จุดส่ง) พร้อมระบุหมายเหตุ'
            : 'ระบบคำนวณระยะทางจากแผนที่ และค่าบริการต่อคันตามสัญญาของ Supplier'}
        </p>
      </div>

      {/* Distance */}
      <div>
        <div className="flex items-center justify-between mb-1 gap-2">
          <label className="block text-xs font-semibold text-gray-700 whitespace-nowrap">
            ระยะทาง (Distance): <span className="text-red-500">*</span>
          </label>
          <span
            className={`text-[10px] font-medium whitespace-nowrap ${
              isManualPricing ? 'text-amber-700' : 'text-gray-400'
            }`}
          >
            {isManualPricing
              ? routeDistance > 0
                ? `ระบบคำนวณได้ ${routeDistance.toFixed(1)} กม.`
                : 'ยังไม่ได้เลือกเส้นทาง'
              : 'คำนวณตามเส้นทาง'}
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            min={0}
            step="any"
            value={distance === 0 ? '' : distance}
            readOnly={!isManualPricing}
            onChange={(e) => {
              if (!isManualPricing) return;
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              onManualDistanceChange(Number.isFinite(val) ? val : 0);
            }}
            placeholder="เช่น 35"
            required
            className={`w-full h-10 pl-3 pr-12 rounded-xl border text-xs font-bold text-gray-900 outline-none transition-all ${
              isManualPricing
                ? 'border-amber-300 bg-white focus:ring-2 focus:ring-amber-400'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
            กม.
          </div>
        </div>
      </div>

      {/* Cost per car */}
      <div>
        <div className="flex items-center justify-between mb-1 gap-2">
          <label className="block text-xs font-semibold text-gray-700 whitespace-nowrap">
            ค่าใช้จ่ายต่อคัน (Cost): <span className="text-red-500">*</span>
          </label>
          {isManualPricing ? (
            <button
              type="button"
              onClick={onResetManualToAuto}
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg border text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300 transition-colors cursor-pointer whitespace-nowrap"
              title="ตั้งค่าระยะทางและราคากลับเป็นค่าที่ระบบคำนวณ (ยังอยู่ในโหมดกรอกเอง)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ใช้ค่าที่ระบบคำนวณ</span>
            </button>
          ) : (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border text-emerald-700 bg-emerald-50 border-emerald-200/80 whitespace-nowrap max-w-[210px] truncate"
              title={pricingCalculation?.formulaDetail || 'ราคาคำนวณตามสัญญาของ Supplier นี้'}
            >
              {pricingCalculation?.formulaBadge || (selectedSupplierId ? 'คำนวณตามสัญญา' : 'กรุณาเลือก Supplier')}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type="number"
            min={0}
            step="any"
            value={estimatedCost === 0 ? '' : estimatedCost}
            readOnly={!isManualPricing}
            onChange={(e) => {
              if (!isManualPricing) return;
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              onManualCostChange(Number.isFinite(val) ? val : 0);
            }}
            placeholder="เช่น 1600"
            required
            className={`w-full h-10 pl-3 pr-14 rounded-xl border text-xs font-bold text-[#0f5238] outline-none transition-all ${
              isManualPricing
                ? 'border-amber-300 bg-white focus:ring-2 focus:ring-amber-400'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            บาท
          </div>
        </div>
        <div className="mt-1 flex flex-col gap-0.5">
          {selectedVinsCount > 1 && (
            <p className="text-[10px] text-emerald-700 font-semibold">
              ต่อคัน (รวม {selectedVinsCount} คัน = ฿{(estimatedCost * selectedVinsCount).toLocaleString()})
            </p>
          )}
          {!selectedSupplierId ? (
            <p className="text-[10px] text-amber-600 font-medium">
              กรุณาเลือก Supplier รถสไลด์ในขั้นตอนที่ 1 เพื่อคำนวณอัตราค่าบริการตามสัญญา
            </p>
          ) : isManualPricing ? (
            <p className="text-[10px] text-gray-500 leading-tight">
              ราคาตามสัญญา (ที่ระยะ {distance.toFixed(1)} กม.): ฿{contractCostPerCar.toLocaleString()}/คัน
              {manualPriceDiff && manualPriceDiff.diff !== 0 && (
                <span
                  className={`ml-1 font-bold ${
                    manualPriceDiff.diff > 0 ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  ({manualPriceDiff.diff > 0 ? '+' : ''}
                  {manualPriceDiff.diff.toLocaleString()} บาท / {manualPriceDiff.diff > 0 ? '+' : ''}
                  {manualPriceDiff.percent}%)
                </span>
              )}
            </p>
          ) : pricingCalculation ? (
            <p className="text-[10px] text-gray-500 leading-tight">{pricingCalculation.formulaDetail}</p>
          ) : null}
          {!isManualPricing && pricingCalculation?.isSpecialQuote && (
            <div className="mt-1 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>ระยะทางเกิน 1,000 กม. กรุณาติดต่อขอราคาพิเศษ หรือเลือก &quot;กรอกเอง&quot;</span>
            </div>
          )}
        </div>
      </div>

      {/* Manual pricing note (required) */}
      {isManualPricing && (
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1 gap-2">
            <label htmlFor="manual-price-note" className="block text-xs font-semibold text-gray-700">
              หมายเหตุการกรอกค่าบริการเอง: <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-gray-400">
              {manualPriceNote.length}/{MANUAL_PRICE_NOTE_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="manual-price-note"
            value={manualPriceNote}
            onChange={(e) => onManualPriceNoteChange(e.target.value.slice(0, MANUAL_PRICE_NOTE_MAX_LENGTH))}
            placeholder="เช่น Supplier คิดระยะทางจากจุดจอดรถ (บางนา) → จุดรับรถ → จุดส่งรถ รวม 71 กม."
            rows={2}
            required
            className="w-full p-3 rounded-xl border border-amber-300 text-xs focus:ring-2 focus:ring-amber-400 outline-none resize-none bg-white"
          />
          {manualPriceNote.length > 0 && manualPriceNote.trim().length < MANUAL_PRICE_NOTE_MIN_LENGTH && (
            <p className="text-[10px] text-red-500 mt-1">
              กรุณาระบุอย่างน้อย {MANUAL_PRICE_NOTE_MIN_LENGTH} ตัวอักษร
            </p>
          )}
        </div>
      )}
    </>
  );
}
