'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, ScanLine, ShieldCheck, Trash2, X, Car } from 'lucide-react';
import { WorkModalTarget } from './types';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import { compressImage, MAX_RAW_FILE_SIZE } from './image-utils';

export interface VendorVerifyVehicleModalProps {
  target: WorkModalTarget | null;
  onClose: () => void;
  /** เรียกเมื่อยืนยันสำเร็จ (หลัง server ตรวจผ่านแล้ว) */
  onVerified: (target: WorkModalTarget) => void | Promise<void>;
}

/**
 * ขั้นตอนแรกก่อนเริ่มงาน — Supplier ต้องถ่ายรูปยืนยันว่าอยู่หน้ารถคันที่ถูกต้อง
 * ถ่ายรูปตัวรถ / ป้าย VIN / ป้ายทะเบียน เก็บเป็นหลักฐาน (evidenceType = VERIFY)
 */
export function VendorVerifyVehicleModal({ target, onClose, onVerified }: VendorVerifyVehicleModalProps) {
  const theme = useTheme();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state resets per vehicle because the parent remounts this modal with a `key`.

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_RAW_FILE_SIZE) {
      showToast('ไฟล์ขนาดเกิน 20MB กรุณาเลือกไฟล์ที่เล็กกว่า', 'error');
      return;
    }
    compressImage(file)
      .then(setPhoto)
      .catch(() => showToast('อ่านไฟล์รูปไม่สำเร็จ', 'error'));
  }, [showToast]);

  const openPicker = (useCamera: boolean) => {
    const input = fileInputRef.current;
    if (!input) return;
    if (useCamera) input.setAttribute('capture', 'environment');
    else input.removeAttribute('capture');
    input.click();
  };

  if (!target) return null;

  const isSlide = target.type === 'VEHICLE_SLIDE';
  const hasPhoto = Boolean(photo);
  const canSubmit = hasPhoto && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${target.jobId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: target.itemId, photoUrl: photo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'ยืนยันตัวรถไม่สำเร็จ กรุณาลองใหม่');
        return;
      }
      showToast('✅ ยืนยันตัวรถสำเร็จ — เริ่มงานได้เลย', 'success');
      await onVerified(target);
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: theme.primary }}
              >
                <ScanLine className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">ยืนยันตัวรถก่อนเริ่มงาน</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    ถ่ายรูปยืนยัน
                  </span>
                </div>
                <p className="text-xs text-gray-500">ถ่ายรูปตัวรถเพื่อยืนยันและเริ่มงาน</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Vehicle Info Summary Box */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center shrink-0 text-emerald-800">
                <Car className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-sm font-bold text-gray-900 truncate">
                    {target.vehicleModel || (isSlide ? 'รถสไลด์ขนส่ง' : 'รถยนต์')}
                  </span>
                  {target.vehicleColor && (
                    <span className="text-xs text-gray-500 font-medium">· {target.vehicleColor}</span>
                  )}
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-[#0f5238] shrink-0">
                    {target.serviceLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono flex-wrap">
                  <span className="text-gray-900 font-bold">VIN: {target.vin}</span>
                  {target.licensePlate && (
                    <span className="px-1.5 py-0.5 bg-white rounded border border-gray-200 text-gray-800 font-bold text-[10px]">
                      {target.licensePlate}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1 truncate">
                  <span className="font-semibold text-gray-600">#{target.jobNumber}</span>
                  {target.branchName ? ` • ${target.branchName}` : ''}
                </p>
              </div>
            </div>
            <span className="text-sm font-black text-[#0f5238] font-mono shrink-0">
              ฿{target.unitPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Form Body - Only Photo Upload */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-gray-400" />
                <span>ถ่ายรูปตัวรถ / ป้ายทะเบียน</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400">1 รูปเพื่อเป็นหลักฐาน</span>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

            {photo ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xs group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="รูปยืนยันตัวรถ" className="w-full max-h-56 object-cover" />
                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>รูปพร้อมส่ง</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
                  title="ลบรูปและถ่ายใหม่"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => openPicker(true)}
                  className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 transition-all cursor-pointer active:scale-[0.98] shadow-2xs"
                >
                  <Camera className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-bold leading-tight">ถ่ายรูป</p>
                    <p className="text-[11px] text-emerald-600/80">เปิดกล้อง</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openPicker(false)}
                  className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-100 text-gray-700 transition-all cursor-pointer active:scale-[0.98] shadow-2xs"
                >
                  <ImagePlus className="w-5 h-5 text-gray-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-bold leading-tight">เลือกรูป</p>
                    <p className="text-[11px] text-gray-400">จากอัลบั้ม</p>
                  </div>
                </button>
              </div>
            )}

            <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1 leading-normal">
              <span>💡 ถ่ายรูปตัวรถ หรือป้ายทะเบียน/ป้าย VIN เพื่อยืนยันว่าอยู่หน้ารถคันที่ถูกต้อง</span>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-1.5 animate-in fade-in">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="p-4 sm:p-5 pt-0 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              canSubmit
                ? 'text-white hover:opacity-95 active:scale-[0.98] shadow-md'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-2xs'
            }`}
            style={canSubmit ? { backgroundColor: theme.primary } : undefined}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : !hasPhoto ? (
              <>
                <Camera className="w-4 h-4" />
                <span>กรุณาถ่ายรูปเพื่อยืนยันตัวรถ</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>ยืนยันตัวรถ (เริ่มงาน)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VendorVerifyVehicleModal;
