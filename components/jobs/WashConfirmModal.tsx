'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface WashConfirmModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  branchName: string;
  supplierName: string;
  requestedBy: string;
  requesterPosition?: string;
  totalItems: number;
  totalEstimatedCost: number;
  subtotal?: number;
  vatType?: 'VAT_7' | 'NO_VAT';
  vatAmount?: number;
  carCategory?: 'NEW_CAR' | 'SERVICE';
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function WashConfirmModal({
  isOpen,
  isSubmitting,
  branchName,
  supplierName,
  requestedBy,
  requesterPosition,
  totalItems,
  totalEstimatedCost,
  subtotal,
  vatType = 'NO_VAT',
  vatAmount = 0,
  carCategory = 'NEW_CAR',
  onClose,
  onConfirm,
}: WashConfirmModalProps) {
  const theme = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-gray-100">
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner"
            style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
          >
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              ยืนยันการบันทึก Order
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              กรุณาตรวจสอบข้อมูลก่อนออกใบสั่งงานล้างรถ
            </p>
          </div>
        </div>

        {/* Summary Information Card */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">สาขาผู้สั่งงาน:</span>
            <span className="font-bold text-gray-900">{branchName || '-'}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">Supplier ผู้ให้บริการ:</span>
            <span className="font-bold text-gray-900">{supplierName || '-'}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">ประเภทรถ:</span>
            <span className="font-bold text-gray-900 flex items-center gap-1.5">
              <span>{carCategory === 'SERVICE' ? '🔧 รถ Service (ศูนย์บริการ)' : '🚗 รถใหม่ (Stock / PDI)'}</span>
            </span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">ผู้สั่งงาน:</span>
            <span className="font-medium text-gray-800">{requestedBy}{requesterPosition ? ` (${requesterPosition})` : ''}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-gray-500">จำนวนรถทั้งหมด:</span>
            <span className="font-bold text-gray-900">{totalItems} คัน</span>
          </div>

          {subtotal !== undefined && vatType === 'VAT_7' && (
            <>
              <div className="flex items-center justify-between pb-1 text-gray-600">
                <span>ยอดรวมค่าบริการ (ก่อนภาษี):</span>
                <span className="font-semibold text-gray-800">฿{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 text-gray-600">
                <span className="flex items-center gap-1">
                  <span>ภาษีมูลค่าเพิ่ม:</span>
                  <span className="text-[10px] px-1 rounded bg-purple-100 text-purple-700 font-semibold">VAT 7%</span>
                </span>
                <span className="font-semibold text-purple-700">+฿{vatAmount.toLocaleString()}</span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-gray-600 font-bold">ยอดสุทธิรวมทั้งสิ้น:</span>
            <span className="text-base font-bold" style={{ color: theme.primary }}>
              ฿{totalEstimatedCost.toLocaleString()}
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
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: theme.primary }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันสั่งงาน</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WashConfirmModal;
