'use client';

import React from 'react';
import { Warehouse } from 'lucide-react';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';

interface DestWarehouseSelectProps {
  destBranchId: string;
  destWarehouseId: string;
  defaultDestWarehouse: string;
  options: DropdownOption[];
  selectedDestWarehouseName: string | null;
  originWarehouseSummary: [string, number][];
  onSelectWarehouse: (warehouseId: string) => void;
}

export default function DestWarehouseSelect({
  destBranchId,
  destWarehouseId,
  defaultDestWarehouse,
  options,
  selectedDestWarehouseName,
  originWarehouseSummary,
  onSelectWarehouse,
}: DestWarehouseSelectProps) {
  return (
    <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-700">
          Warehouse ID ปลายทาง (คลัง D365): <span className="text-red-500">*</span>
        </span>
        {defaultDestWarehouse && (
          <span className="text-[10px] text-gray-500">
            คลังหลักของสาขา: <b className="font-mono text-gray-700">{defaultDestWarehouse}</b>
          </span>
        )}
      </div>
      <CustomDropdown
        value={destWarehouseId}
        onChange={onSelectWarehouse}
        options={options}
        placeholder={
          !destBranchId
            ? 'กรุณาเลือกสาขาปลายทางก่อน'
            : options.length > 0
              ? 'กรุณาเลือกคลังปลายทาง'
              : 'ไม่พบคลัง D365 ของสาขานี้'
        }
        icon={Warehouse}
        disabled={options.length === 0}
        dropdownWidth="w-full"
        buttonClassName={`bg-white font-mono ${options.length === 0 && destBranchId ? 'border-red-300' : ''}`}
      />
      {options.length === 0 && destBranchId && (
        <p className="text-[10px] text-red-500">
          ไม่พบรายการคลัง D365 ของสาขาปลายทางนี้ กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มการแมปคลัง
        </p>
      )}
      {originWarehouseSummary.length > 0 && destWarehouseId && (
        <p className="text-[10px] text-gray-500 leading-relaxed">
          โอนคลังใน D365 เมื่อสาขาอนุมัติ:{' '}
          {originWarehouseSummary.map(([wh, count], idx) => (
            <span key={wh}>
              {idx > 0 && ', '}
              <b className="font-mono text-gray-700">{wh}</b> ({count} คัน)
            </span>
          ))}
          {' → '}
          <b className="font-mono text-[#0f5238]">{destWarehouseId}</b>
          {selectedDestWarehouseName && (
            <span className="text-gray-600"> ({selectedDestWarehouseName})</span>
          )}
        </p>
      )}
    </div>
  );
}
