'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { formatThaiDateTime } from '@/lib/date-utils';

export interface SlideConfirmModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  selectedVins: string[];
  originLabel: string;
  destLabel: string;
  distance: number | null;
  supplierName: string;
  pickupDateTime: string;
  estimatedCost: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function SlideConfirmModal({
  isOpen,
  isSubmitting,
  selectedVins,
  originLabel,
  destLabel,
  distance,
  supplierName,
  pickupDateTime,
  estimatedCost,
  onClose,
  onConfirm,
}: SlideConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-gray-100">
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#0f5238] flex items-center justify-center shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              ยืนยันการมอบหมายงานรถสไลด์
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              กรุณาตรวจสอบข้อมูลก่อนส่งคำขอไปยัง Supplier
            </p>
          </div>
        </div>

        {/* Summary Information Card */}
        <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 text-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">จำนวนรถที่ขอสไลด์:</span>
            <span className="font-bold text-gray-900">{selectedVins.length} คัน</span>
          </div>
          <div className="flex flex-col gap-1 pb-2 border-b border-gray-200">
            <span className="text-gray-500">เลขตัวถัง (VIN):</span>
            {selectedVins.length === 1 ? (
              <span className="font-mono font-bold text-gray-900">{selectedVins[0]}</span>
            ) : (
              <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1 mt-0.5">
                {selectedVins.map(vin => (
                  <span key={vin} className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-800">
                    {vin}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">เส้นทางขนส่ง:</span>
            <span className="font-medium text-gray-800 text-right max-w-[220px] truncate">
              {originLabel} &rarr; {destLabel}
            </span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">ระยะทางโดยประมาณ:</span>
            <span className="font-bold text-gray-900">{distance ? `${distance} กม.` : '-'}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">Supplier ผู้รับงาน:</span>
            <span className="font-bold text-gray-900">{supplierName || '-'}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">กำหนดรับรถ:</span>
            <span className="font-medium text-gray-800">{formatThaiDateTime(pickupDateTime)}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-gray-600 font-medium">
              {selectedVins.length > 1 ? `ประมาณการค่าบริการรวม (${selectedVins.length} คัน):` : 'ประมาณการค่าบริการ:'}
            </span>
            <span className="text-base font-bold text-[#0f5238]">
              ฿{(estimatedCost * selectedVins.length).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md bg-[#0f5238] hover:bg-[#0a3d28] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันมอบหมาย</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SlideConfirmModal;
