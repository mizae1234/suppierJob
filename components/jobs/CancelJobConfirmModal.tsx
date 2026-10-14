'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Loader2, X, ShieldAlert, Car } from 'lucide-react';

export interface CancelJobConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  jobNumber?: string;
  vin?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  details?: { label: string; value: React.ReactNode }[];
  warningMessage?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export function CancelJobConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  title = 'ยืนยันการยกเลิกคำสั่งงาน',
  subtitle = 'กรุณาตรวจสอบข้อมูลก่อนดำเนินการยกเลิกงาน',
  jobNumber,
  vin,
  vehicleModel,
  vehicleColor,
  licensePlate,
  details,
  warningMessage = 'เมื่อยกเลิกแล้ว รถจะถูกปลดล็อคให้สั่งงานใหม่ได้ทันที',
  confirmButtonText = 'ยืนยันยกเลิกคำสั่งงาน',
  cancelButtonText = 'ย้อนกลับ',
}: CancelJobConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-gray-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center gap-2 pt-1 relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute -top-2 -right-2 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-50 text-red-600 shadow-inner border border-red-100">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Details Card */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs flex flex-col gap-2.5">
          {jobNumber && (
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500 font-medium">หมายเลขคำสั่งงาน:</span>
              <span className="font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                {jobNumber}
              </span>
            </div>
          )}

          {vin && (
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500 font-medium">หมายเลขตัวถัง (VIN):</span>
              <span className="font-mono font-bold text-gray-900 text-[11px]">
                {vin}
              </span>
            </div>
          )}

          {(vehicleModel || vehicleColor) && (
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500 font-medium">รุ่นรถยนต์ / สี:</span>
              <span className="font-medium text-gray-800 text-right truncate max-w-[220px]">
                {vehicleModel || '-'} {vehicleColor ? `(${vehicleColor})` : ''}
              </span>
            </div>
          )}

          {licensePlate && (
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500 font-medium">ทะเบียนรถ:</span>
              <span className="font-medium text-gray-900">
                {licensePlate}
              </span>
            </div>
          )}

          {details && details.map((d, idx) => (
            <div 
              key={idx} 
              className={`flex items-center justify-between ${idx !== details.length - 1 ? 'pb-2 border-b border-gray-200' : ''}`}
            >
              <span className="text-gray-500 font-medium">{d.label}:</span>
              <span className="font-medium text-gray-900">{d.value}</span>
            </div>
          ))}
        </div>

        {/* Warning Callout */}
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold text-amber-950">คำชี้แจง:</p>
            <p className="mt-0.5 text-amber-800 font-medium">
              {warningMessage}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer text-center"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังดำเนินการ...</span>
              </>
            ) : (
              <span>{confirmButtonText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
