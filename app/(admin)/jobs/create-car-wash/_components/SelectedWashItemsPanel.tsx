'use client';

import React, { useState } from 'react';
import { Car } from 'lucide-react';
import { VatType } from '@/lib/car-wash-rates';
import {
  CarCategory,
  SelectedWashItem,
  SupplierServiceOption,
  WashOrderFinancials,
} from '../_types';
import { BatchWashReasonBar } from './BatchWashReasonBar';
import { WashItemCard } from './WashItemCard';
import { WashOrderSummaryBar } from './WashOrderSummaryBar';

interface SelectedWashItemsPanelProps {
  selectedItems: SelectedWashItem[];
  carCategory: CarCategory;
  supplierServices: SupplierServiceOption[];
  batchReason: string;
  onBatchReasonChange: (reason: string) => void;
  onApplyReasonToAll: (customReasonValue?: string) => void;
  onUpdateItemField: <K extends keyof SelectedWashItem>(
    vin: string,
    field: K,
    value: SelectedWashItem[K]
  ) => void;
  onRemoveItem: (vin: string) => void;
  orderFinancials: WashOrderFinancials;
  vatType: VatType;
  isLocked: boolean;
  themePrimary: string;
  themeBgSoft: string;
}

export function SelectedWashItemsPanel({
  selectedItems,
  carCategory,
  supplierServices,
  batchReason,
  onBatchReasonChange,
  onApplyReasonToAll,
  onUpdateItemField,
  onRemoveItem,
  orderFinancials,
  vatType,
  isLocked,
  themePrimary,
  themeBgSoft,
}: SelectedWashItemsPanelProps) {
  const [openWashTypeVin, setOpenWashTypeVin] = useState<string | null>(null);
  const [openWashReasonVin, setOpenWashReasonVin] = useState<string | null>(null);

  return (
    <div
      className={`lg:col-span-2 flex flex-col gap-5 transition-opacity ${
        isLocked ? 'pointer-events-none opacity-45 select-none' : ''
      }`}
    >
      <div className="p-6 rounded-2xl bg-white border shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold"
                style={{ backgroundColor: themePrimary }}
              >
                4
              </span>
              <span>รายการและกำหนดวันปฏิบัติงานจริงของแต่ละ VIN</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              ระบุวันที่ล้างจริง ประเภทบริการ เหตุผลการล้าง และหมายเหตุเฉพาะคัน
            </p>
          </div>

          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ color: themePrimary, backgroundColor: themeBgSoft }}
          >
            รวม {selectedItems.length} คัน
          </span>
        </div>

        {/* Quick Batch Apply Reason Bar */}
        {selectedItems.length > 0 && (
          <BatchWashReasonBar
            selectedCount={selectedItems.length}
            batchReason={batchReason}
            onBatchReasonChange={onBatchReasonChange}
            onApplyToAll={onApplyReasonToAll}
          />
        )}

        {selectedItems.length === 0 ? (
          <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
            <Car className="w-12 h-12 text-gray-300" />
            <p className="text-xs font-medium">ยังไม่ได้เลือกรถจากสต็อกสาขา</p>
            <p className="text-[11px] text-gray-400">
              คลิกเลือกรถจากช่องด้านซ้ายเพื่อเพิ่มในรายการสั่งล้าง
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {selectedItems.map((item, idx) => (
              <WashItemCard
                key={item.vin}
                item={item}
                index={idx}
                totalSelected={selectedItems.length}
                carCategory={carCategory}
                supplierServices={supplierServices}
                themePrimary={themePrimary}
                isWashTypeOpen={openWashTypeVin === item.vin}
                isWashReasonOpen={openWashReasonVin === item.vin}
                onToggleWashType={() => {
                  setOpenWashReasonVin(null);
                  setOpenWashTypeVin(openWashTypeVin === item.vin ? null : item.vin);
                }}
                onCloseWashType={() => setOpenWashTypeVin(null)}
                onToggleWashReason={() => {
                  setOpenWashTypeVin(null);
                  setOpenWashReasonVin(openWashReasonVin === item.vin ? null : item.vin);
                }}
                onCloseWashReason={() => setOpenWashReasonVin(null)}
                onUpdateField={onUpdateItemField}
                onRemove={onRemoveItem}
                onApplyReasonToAll={onApplyReasonToAll}
              />
            ))}
          </div>
        )}

        {/* Bottom Summary Bar */}
        {selectedItems.length > 0 && (
          <WashOrderSummaryBar
            financials={orderFinancials}
            vatType={vatType}
            themePrimary={themePrimary}
          />
        )}
      </div>
    </div>
  );
}
