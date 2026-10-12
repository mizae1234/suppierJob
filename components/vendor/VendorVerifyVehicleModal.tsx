'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, ScanLine, ShieldCheck, Trash2, X } from 'lucide-react';
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
  const canSubmit = value.trim().length >= 4 && !!photo && !isSubmitting;

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
        `✅ ยืนยันตัวรถสำเร็จ (${data.method === 'PLATE' ? 'เลขทะเบียน' : 'VIN'}) — เริ่มงานได้เลย`,
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
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: theme.primary }}
              >
                <ScanLine className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">ยืนยันตัวรถก่อนเริ่มงาน</h3>
                <p className="text-xs text-gray-500">ขั้นตอนที่ 1 จาก 2 — ตรวจให้แน่ใจว่าเป็นรถคันที่ถูกต้อง</p>
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

          {/* Job summary — intentionally without VIN / plate */}
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-bold text-gray-900">
                {target.vehicleModel || (isSlide ? 'รถสไลด์ขนส่ง' : 'รถยนต์')}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0f5238]">
                {target.serviceLabel}
              </span>
            </div>
            <p className="text-gray-500 truncate">
              {target.vehicleColor ? `${target.vehicleColor} • ` : ''}
              <span className="font-mono text-gray-400">#{target.jobNumber}</span>
              {' • '}{target.branchName}
            </p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Step A: identifier */}
          <div>
            <label htmlFor="verify-vehicle-input" className="text-xs font-bold text-gray-700 mb-1.5 block">
              🔍 VIN 6 ตัวท้าย หรือ เลขทะเบียน <span className="text-red-500">*</span>
            </label>
            <input
              id="verify-vehicle-input"
              type="text"
              value={value}
              onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(null); }}
              placeholder="เช่น 123456 หรือ 1กข 1234"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={40}
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-base font-mono font-bold tracking-wider text-gray-900 focus:outline-none focus:ring-2 transition-all"
              style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
            />
            <p className="text-[10px] text-gray-400 mt-1.5">
              อ่านจากตัวรถจริง (ป้าย VIN ที่กระจกหน้า/เสาประตู หรือป้ายทะเบียน) • รถป้ายแดงให้ใช้ VIN
            </p>
          </div>

          {/* Step B: photo */}
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">
              📸 รูปป้าย VIN หรือ ป้ายทะเบียน <span className="text-red-500">*</span>
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

            {photo ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="รูปยืนยันตัวรถ" className="w-full max-h-56 object-cover" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer"
                  title="ลบรูป"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openPicker(true)}
                  className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-700 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-bold">ถ่ายรูป</span>
                  <span className="text-[9px] text-emerald-600">เปิดกล้อง</span>
                </button>
                <button
                  type="button"
                  onClick={() => openPicker(false)}
                  className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-600 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-xs font-bold">เลือกจากอัลบั้ม</span>
                  <span className="text-[9px] text-gray-400">1 รูป</span>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="p-5 pt-0 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-95 active:scale-[0.98]"
            style={{ backgroundColor: canSubmit || isSubmitting ? theme.primary : '#9ca3af' }}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังตรวจสอบ...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>ยืนยันตัวรถ แล้วไปขั้นตอนส่งงาน</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VendorVerifyVehicleModal;
