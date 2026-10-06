'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Truck, Car, XCircle } from 'lucide-react';
import { WorkModalTarget } from './types';

const CAR_WASH_REASONS = [
  'คิวงานเต็ม / ช่างไม่พอ',
  'เกินเวลาทำการ',
  'อุปกรณ์ซ่อมบำรุง',
  'ไม่สามารถให้บริการประเภทนี้ได้',
  'รถไม่อยู่ในจุดนัดหมาย',
];

const SLIDE_REASONS = [
  'คิวงานเต็ม / คนขับไม่พอ',
  'เกินเวลาทำการ',
  'รถสไลด์ซ่อมบำรุง / ไม่พร้อม',
  'ระยะทางเกินพื้นที่ให้บริการ',
  'รถไม่อยู่ในจุดนัดหมาย',
];

export interface VendorRejectModalProps {
  target: WorkModalTarget | null;
  onClose: () => void;
  onConfirm: (target: WorkModalTarget, reason: string) => Promise<void>;
}

export function VendorRejectModal({
  target,
  onClose,
  onConfirm,
}: VendorRejectModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!target) return null;

  const handleConfirm = async () => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(target, rejectReason.trim());
      setRejectReason('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header — Clean Red Banner (fixed at top) */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-red-50 to-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {target.type === 'VEHICLE_SLIDE' ? 'ปฏิเสธงานรถสไลด์' : 'ปฏิเสธรถคันนี้'}
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {target.type === 'VEHICLE_SLIDE'
                    ? 'ระบบจะแจ้งเตือนสาขาผู้สั่งงาน'
                    : 'คันอื่นในใบงานเดียวกันไม่ได้รับผลกระทบ'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Compact Vehicle Info */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs text-xs">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              target.type === 'VEHICLE_SLIDE' ? 'bg-purple-50 text-purple-500' : 'bg-sky-50 text-sky-500'
            }`}>
              {target.type === 'VEHICLE_SLIDE' ? <Truck className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 truncate">
                {target.vehicleModel || 'รถยนต์'}
                {target.licensePlate && <span className="text-gray-500 font-normal"> • {target.licensePlate}</span>}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">{target.jobNumber}</p>
            </div>
            <span className="text-xs font-bold text-gray-900 font-mono shrink-0">฿{target.unitPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Scrollable Body — Reason Selection */}
        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
          {/* Quick Reasons as Compact List */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">เลือกเหตุผล</p>
            <div className="flex flex-col gap-1.5">
              {(target.type === 'VEHICLE_SLIDE' ? SLIDE_REASONS : CAR_WASH_REASONS).map(r => {
                const isSelected = rejectReason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRejectReason(isSelected ? '' : r)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-50 border-red-300 text-red-700 font-bold border'
                        : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-700 border'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Reason */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              หรือระบุเหตุผลเอง
            </label>
            <textarea
              value={(target.type === 'VEHICLE_SLIDE' ? SLIDE_REASONS : CAR_WASH_REASONS).includes(rejectReason) ? '' : rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="พิมพ์เหตุผลเพิ่มเติม..."
              rows={2}
              className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-400 focus:border-red-300 focus:outline-none resize-none bg-gray-50 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Buttons — Sticky at bottom */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 bg-white shrink-0 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !rejectReason.trim()}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default VendorRejectModal;
