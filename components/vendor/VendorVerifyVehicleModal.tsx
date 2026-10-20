'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, ScanLine, ShieldCheck, Trash2, X, Truck, Sparkles, Info } from 'lucide-react';
import { WorkModalTarget } from './types';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import { compressImage, MAX_RAW_FILE_SIZE } from './image-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';

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

  const originName = target.originName
    || target.job?.customOriginAddress 
    || target.job?.originBranchName 
    || target.job?.branchName 
    || target.branchName 
    || 'จุดรับรถต้นทาง';

  const destName = target.destName
    || target.job?.customDestAddress 
    || target.job?.destBranchName 
    || 'จุดส่งมอบปลายทาง';

  const distance = target.distance ?? target.job?.distance;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: theme.primary }}
              >
                <ScanLine className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 tracking-tight leading-tight">
                  ยืนยันตัวรถก่อนเริ่มงาน
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">ถ่ายภาพตัวรถหรือป้ายทะเบียนเพื่อยืนยันเริ่มงาน</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Summary Box */}
          {isSlide ? (
            <div className="rounded-2xl border border-gray-200/80 bg-white overflow-hidden shadow-2xs text-xs">
              {/* Header Row: Type Badge, Job Number, Price */}
              <div className="p-3 bg-gradient-to-r from-gray-50/80 to-white border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#0f5238] text-white shrink-0 shadow-2xs">
                    <Truck className="w-3 h-3" />
                    <span>สไลด์ขนส่ง</span>
                  </span>
                  <span className="font-mono text-[11px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                    #{target.jobNumber}
                  </span>
                </div>

                <span className="text-base font-black font-mono shrink-0" style={{ color: theme.primary }}>
                  ฿{target.unitPrice.toLocaleString()}
                </span>
              </div>

              {/* Vehicle specifications */}
              <div className="p-3 flex flex-col gap-2.5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 leading-snug">
                      {target.vehicleModel || 'รถยนต์'}
                    </p>
                    {target.vehicleColor && (
                      <span className="text-xs text-gray-500 font-medium">
                        สี {target.vehicleColor}
                      </span>
                    )}
                    {target.licensePlate && target.licensePlate !== '-' && !target.licensePlate.includes('ป้ายแดง') && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                        {target.licensePlate}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                    VIN: <span className="font-semibold text-gray-700">{target.vin}</span>
                  </p>
                </div>

                {/* Route Flow */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex flex-col gap-1.5 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1 leading-snug">
                      <span className="text-gray-400 font-medium text-[10px] mr-1">ต้นทาง:</span>
                      <span className="font-medium text-gray-800 break-words">{originName}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1 leading-snug">
                      <span className="text-gray-400 font-medium text-[10px] mr-1">ปลายทาง:</span>
                      <span className="font-medium text-gray-800 break-words">{destName}</span>
                      {distance ? (
                        <span className="ml-1.5 font-mono text-[10px] text-emerald-800 font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200/70">
                          {distance} กม.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (() => {
            const washMeta = getWashServiceDisplay(target.serviceType || 'WASH_NORMAL');
            const badgeClass =
              target.serviceType === 'POLISH_STAINS' || target.serviceType === 'DEEP_CLEAN'
                ? 'bg-amber-100/90 text-amber-900 border-amber-300'
                : target.serviceType === 'WASH_AND_COAT' || target.serviceType === 'POLISH'
                ? 'bg-purple-100/90 text-purple-900 border-purple-300'
                : target.serviceType === 'COATING'
                ? 'bg-indigo-100/90 text-indigo-900 border-indigo-300'
                : target.serviceType === 'BIG_SIZE_M8'
                ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                : target.serviceType === 'WASH_INSPECTION'
                ? 'bg-sky-100/90 text-sky-900 border-sky-300'
                : target.serviceType === 'VACUUM_CUSTOMER' || target.serviceType === 'VACUUM_CENTER'
                ? 'bg-teal-100/90 text-teal-900 border-teal-300'
                : 'bg-emerald-800 text-white border-emerald-900';

            const isRedPlate = !target.licensePlate || target.licensePlate === '-' || target.licensePlate.includes('ป้ายแดง');

            return (
              <div className="rounded-2xl border border-gray-200/80 bg-white overflow-hidden shadow-2xs text-xs">
                {/* Header Row: Service Badge, Job#, Price */}
                <div className="p-3 bg-gradient-to-r from-gray-50/80 to-white border-b border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border shadow-2xs ${badgeClass}`}>
                      <Sparkles className="w-3 h-3" />
                      <span>{washMeta.name}</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                      #{target.jobNumber}
                    </span>
                  </div>

                  <span className="text-base font-black font-mono shrink-0" style={{ color: theme.primary }}>
                    ฿{target.unitPrice.toLocaleString()}
                  </span>
                </div>

                {/* Vehicle specifications */}
                <div className="p-3 flex flex-col gap-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 leading-snug">
                        {target.vehicleModel || 'รถยนต์'}
                      </p>
                      {target.vehicleColor && (
                        <span className="text-xs text-gray-500 font-medium">
                          สี {target.vehicleColor}
                        </span>
                      )}
                      {!isRedPlate && target.licensePlate && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                          {target.licensePlate}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                      VIN: <span className="font-semibold text-gray-700">{target.vin}</span>
                    </p>
                  </div>

                  {/* Branch & Category info */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-[11px] text-gray-600 flex-wrap">
                    <span className="truncate">
                      🏢 <strong className="font-medium text-gray-800">{target.branchName || 'ไม่ระบุสาขา'}</strong>
                    </span>
                    <span className="text-gray-500 shrink-0">
                      หมวดหมู่: <strong className="font-medium text-gray-700">{target.washServiceCategory || washMeta.categoryName}</strong>
                    </span>
                  </div>

                  {/* Scope of work */}
                  {(target.washServiceDescription || washMeta.defaultRemarks) && (
                    <div className="text-[11px] text-gray-600 leading-relaxed bg-slate-50/70 p-2 rounded-lg border border-slate-200/50">
                      <span className="text-gray-400 font-medium">ขอบเขตงาน: </span>
                      <span className="text-gray-700">{target.washServiceDescription || washMeta.defaultRemarks}</span>
                    </div>
                  )}

                  {/* Highlights / Special instructions */}
                  {(target.remarks || target.itemRemarks) && (
                    <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-1.5">
                      <span className="shrink-0 font-bold text-amber-800">📌 จุดที่ต้องเน้นพิเศษ:</span>
                      <span className="font-semibold leading-relaxed">{target.remarks || target.itemRemarks}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Photo Capture Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>รูปถ่ายตัวรถ / ป้ายทะเบียน</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">1 รูปเพื่อเป็นหลักฐาน</span>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

            {photo ? (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-200/80 shadow-sm group bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="รูปยืนยันตัวรถ" className="w-full max-h-60 object-cover" />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>รูปถ่ายพร้อมยืนยัน</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-red-600/90 hover:bg-red-700 text-white shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title="ลบรูปและถ่ายใหม่"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => openPicker(true)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-50/80 to-emerald-100/40 hover:from-emerald-100/90 hover:to-emerald-100 text-emerald-950 transition-all cursor-pointer active:scale-[0.98] shadow-xs group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold leading-tight">ถ่ายรูป</p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">เปิดกล้องทันที</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openPicker(false)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50/80 text-gray-800 transition-all cursor-pointer active:scale-[0.98] shadow-2xs group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <ImagePlus className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold leading-tight">เลือกรูป</p>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">จากคลังภาพ</p>
                  </div>
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200/70 text-[11px] text-gray-500">
              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>ถ่ายหน้ารถหรือป้าย VIN เพื่อยืนยันว่าอยู่หน้าคันที่ถูกต้อง</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2 animate-in fade-in">
              <span className="shrink-0 text-sm">⚠️</span>
              <span className="leading-snug">{error}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="p-4 sm:p-5 pt-0 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              canSubmit
                ? 'text-white hover:opacity-95 active:scale-[0.98] shadow-md'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none'
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
                <Camera className="w-4 h-4 text-gray-400" />
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
