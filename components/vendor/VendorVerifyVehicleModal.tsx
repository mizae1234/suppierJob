'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, ScanLine, ShieldCheck, Trash2, X, Car, Hash } from 'lucide-react';
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
 * ขั้นตอนแรกก่อนเริ่มงาน — Supplier ต้องยืนยันว่าอยู่หน้ารถคันที่ถูกต้อง
 * 1) กรอก VIN 6 ตัวท้าย หรือ เลขทะเบียน (ตรวจฝั่ง server เท่านั้น)
 * 2) ถ่ายรูปป้าย VIN / ป้ายทะเบียน เก็บเป็นหลักฐาน (evidenceType = VERIFY)
 * Modal นี้จงใจไม่แสดง VIN / ทะเบียน เพื่อให้ต้องอ่านจากตัวรถจริง
 */
export function VendorVerifyVehicleModal({ target, onClose, onVerified }: VendorVerifyVehicleModalProps) {
  const theme = useTheme();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState('');
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
  const cleanValue = value.replace(/[^0-9A-Za-z]/g, '');
  const hasValue = cleanValue.length >= 6;
  const hasPhoto = !!photo;
  const canSubmit = hasValue && hasPhoto && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${target.jobId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: target.itemId, value: value.trim(), photoUrl: photo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'ยืนยันตัวรถไม่สำเร็จ กรุณาลองใหม่');
        return;
      }
      showToast(
        '✅ ยืนยันตัวรถสำเร็จ (VIN) — เริ่มงานได้เลย',
        'success'
      );
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
                    ขั้นตอน 1/2
                  </span>
                </div>
                <p className="text-xs text-gray-500">ตรวจสอบความถูกต้องของรถก่อนเริ่มทำงาน</p>
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

          {/* Vehicle Info Summary Box — Clean & balanced */}
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center shrink-0 text-emerald-800">
                <Car className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="text-sm font-bold text-gray-900 truncate">
                    {target.vehicleModel || (isSlide ? 'รถสไลด์ขนส่ง' : 'รถยนต์')}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-[#0f5238] shrink-0">
                    {target.serviceLabel}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate">
                  {target.vehicleColor ? `${target.vehicleColor} • ` : ''}
                  <span className="font-mono text-gray-600 font-semibold">#{target.jobNumber}</span>
                  {target.branchName ? ` • ${target.branchName}` : ''}
                </p>
              </div>
            </div>
            <span className="text-sm font-black text-[#0f5238] font-mono shrink-0">
              ฿{target.unitPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Step 1: Identifier Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="verify-vehicle-input" className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span>VIN 6 ตัวท้าย</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400">6 หลักสุดท้ายของเลขตัวถัง</span>
            </div>

            <div className="relative">
              <input
                id="verify-vehicle-input"
                type="text"
                value={value}
                onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(null); }}
                placeholder="เช่น 123456"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={17}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold tracking-wide text-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-2xs font-mono"
                style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
              />
              {value && (
                <button
                  type="button"
                  onClick={() => setValue('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1 leading-normal">
              <span>💡 ดูจากป้าย VIN บริเวณกระจกหน้า หรือเสาประตูด้านคนขับ</span>
            </p>
          </div>

          {/* Step 2: Photo Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-gray-400" />
                <span>รูปถ่ายป้าย VIN</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400">1 รูปเพื่อเป็นหลักฐาน</span>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

            {photo ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xs group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="รูปยืนยันตัวรถ" className="w-full max-h-48 object-cover" />
                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                  <span>✓ แนบรูปเรียบร้อย</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer shadow-sm"
                  title="ลบรูปและถ่ายใหม่"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openPicker(true)}
                  className="flex items-center justify-center gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 transition-all cursor-pointer active:scale-[0.98] shadow-2xs"
                >
                  <Camera className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight">ถ่ายรูป</p>
                    <p className="text-[10px] text-emerald-600/80">เปิดกล้อง</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openPicker(false)}
                  className="flex items-center justify-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-100 text-gray-700 transition-all cursor-pointer active:scale-[0.98] shadow-2xs"
                >
                  <ImagePlus className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight">เลือกรูป</p>
                    <p className="text-[10px] text-gray-400">จากอัลบั้ม</p>
                  </div>
                </button>
              </div>
            )}
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
                <span>กำลังตรวจสอบข้อมูล...</span>
              </>
            ) : !hasValue ? (
              <>
                <Hash className="w-4 h-4" />
                <span>กรุณากรอก VIN 6 ตัวท้าย</span>
              </>
            ) : !hasPhoto ? (
              <>
                <Camera className="w-4 h-4" />
                <span>กรุณาถ่ายรูปหรือแนบรูปป้าย</span>
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
