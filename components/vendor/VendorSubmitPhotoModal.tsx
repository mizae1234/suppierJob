'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, Trash2, Send, X, AlertTriangle, Truck, Navigation, MapPin, Sparkles } from 'lucide-react';
import { WorkModalTarget } from './types';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import { compressImage, MAX_RAW_FILE_SIZE } from './image-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';

export interface VendorSubmitPhotoModalProps {
  target: WorkModalTarget | null;
  onClose: () => void;
  onSubmit: (photos: { url: string; file: File }[], caption: string, onProgress?: (done: number, total: number) => void) => Promise<void>;
}

export function VendorSubmitPhotoModal({
  target,
  onClose,
  onSubmit,
}: VendorSubmitPhotoModalProps) {
  const theme = useTheme();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; file: File }[]>([]);
  const [photoCaption, setPhotoCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > MAX_RAW_FILE_SIZE) {
        showToast('ไฟล์ขนาดเกิน 20MB กรุณาเลือกไฟล์ที่เล็กกว่า', 'error');
        return;
      }

      compressImage(file)
        .then(url => setUploadedPhotos(prev => [...prev, { url, file }]))
        .catch(() => showToast(`อ่านไฟล์ ${file.name} ไม่สำเร็จ`, 'error'));
    });

    e.target.value = '';
  }, [showToast]);

  const handleRemovePhoto = useCallback((index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  if (!target) return null;

  const isSlide = target.type === 'VEHICLE_SLIDE';
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

  const handleSubmit = async () => {
    if (uploadedPhotos.length === 0) {
      showToast('กรุณาถ่ายรูปหรือแนบรูปอย่างน้อย 1 รูป', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(uploadedPhotos, photoCaption, (done, total) => {
        setUploadProgress({ done, total });
      });
      setUploadedPhotos([]);
      setPhotoCaption('');
      onClose();
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: theme.primary }}
              >
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {isSlide ? 'ส่งงานรถสไลด์' : 'ส่งงานรถคันนี้'}
                </h3>
                <p className="text-[11px] text-gray-500 truncate">ถ่ายรูปหรือแนบรูปผลงานเพื่อส่งให้สาขาตรวจรับ</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Vehicle Info Summary Card (Compact & Clean) */}
          {isSlide ? (
            <div className="rounded-xl border border-emerald-950/10 bg-[#fbfdfc] overflow-hidden shadow-2xs text-xs">
              {/* Top Row: Type Badge, Job Number, Price, Vehicle info */}
              <div className="p-2.5 bg-white border-b border-gray-100 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0f5238] text-white shrink-0">
                      <Truck className="w-3 h-3" />
                      <span>สไลด์ขนส่ง</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                      #{target.jobNumber}
                    </span>
                  </div>

                  <span className="text-sm font-black text-[#0f5238] font-mono shrink-0">
                    ฿{target.unitPrice.toLocaleString()}
                  </span>
                </div>

                {/* Vehicle specifications inline */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 flex-wrap">
                  <span className="font-bold text-gray-900">{target.vehicleModel || 'รถยนต์'}</span>
                  {target.vehicleColor && <span>· สี{target.vehicleColor}</span>}
                  <span className="text-gray-300">•</span>
                  <span className="font-mono text-gray-700">VIN: {target.vin}</span>
                  {target.licensePlate && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/70 text-[10px]">
                        {target.licensePlate}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom: Compact Route Flow */}
              <div className="px-2.5 py-2 bg-[#f8faf9] flex flex-col gap-1 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                  <span className="text-gray-400 shrink-0 font-medium text-[10px]">ต้นทาง:</span>
                  <span className="font-medium text-gray-800 leading-snug break-words">{originName}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 shrink-0" />
                  <span className="text-gray-400 shrink-0 font-medium text-[10px]">ปลายทาง:</span>
                  <span className="font-medium text-gray-800 leading-snug break-words">
                    {destName}
                    {distance ? (
                      <span className="ml-1.5 font-mono text-[10px] text-emerald-800 font-bold bg-emerald-100/70 px-1.5 py-0.2 rounded border border-emerald-200/70">
                        {distance} กม.
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>
          ) : (() => {
            const washMeta = getWashServiceDisplay(target.serviceType || 'WASH_NORMAL');
            return (
              /* CAR_WASH Clean & Compact Card */
              <div className="rounded-xl border border-gray-100 bg-[#fbfdfc] overflow-hidden shadow-2xs text-xs">
                <div className="p-2.5 bg-white border-b border-gray-100 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0f5238] text-white shrink-0 shadow-2xs">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>{washMeta.name}</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                        #{target.jobNumber}
                      </span>
                    </div>

                    <span className="text-sm font-black text-[#0f5238] font-mono shrink-0">
                      ฿{target.unitPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600 flex-wrap">
                    <span className="font-bold text-gray-900">{target.vehicleModel || 'รถยนต์'}</span>
                    {target.vehicleColor && <span>· สี{target.vehicleColor}</span>}
                    <span className="text-gray-300">•</span>
                    <span className="font-mono text-gray-700">VIN: {target.vin}</span>
                    {target.licensePlate && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/70 text-[10px]">
                          {target.licensePlate}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Service Details & Remarks */}
                <div className="p-2.5 bg-[#f8faf9] flex flex-col gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-600">
                      หมวดหมู่: <strong className="text-gray-800 font-semibold">{target.washServiceCategory || washMeta.categoryName}</strong>
                    </span>
                    {target.branchName && (
                      <span className="text-gray-500 text-[10px]">
                        สาขา: <strong className="text-gray-700">{target.branchName}</strong>
                      </span>
                    )}
                  </div>

                  {(target.washServiceDescription || washMeta.defaultRemarks) && (
                    <p className="text-gray-600 leading-tight">
                      <span className="text-gray-400">ขอบเขต:</span> {target.washServiceDescription || washMeta.defaultRemarks}
                    </p>
                  )}

                  {(target.remarks || target.itemRemarks) && (
                    <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-100/70 border border-amber-300/80 text-amber-950 font-medium text-[11px] leading-snug">
                      <span className="shrink-0 font-bold text-amber-800">📌 จุดที่ต้องเน้น:</span>
                      <span className="font-semibold">{target.remarks || target.itemRemarks}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Photo Upload Area */}
        <div className="p-3.5 sm:p-4 flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-700">📸 รูปถ่ายหลักฐาน <span className="text-red-500">*</span></p>
              <span className="text-[10px] text-gray-400">{uploadedPhotos.length > 0 ? `${uploadedPhotos.length} รูป` : 'ถ่ายได้ไม่จำกัด'}</span>
            </div>

            {/* Photo Grid */}
            {uploadedPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {uploadedPhotos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`ภาพที่ ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[9px] font-bold">
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Trigger Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
                className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-700 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs font-bold">ถ่ายรูป</span>
                <span className="text-[9px] text-emerald-600">เปิดกล้อง</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-600 transition-all cursor-pointer active:scale-[0.98]"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs font-bold">เลือกจากอัลบั้ม</span>
                <span className="text-[9px] text-gray-400">เลือกได้หลายรูปพร้อมกัน</span>
              </button>
            </div>

            {uploadedPhotos.length === 0 && (
              <p className="text-[10px] text-red-500 mt-2 text-center font-medium">
                ⚠️ ต้องแนบรูปอย่างน้อย 1 รูป จึงจะส่งงานได้
              </p>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
              หมายเหตุ (ไม่บังคับ)
            </label>
            <textarea
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder={
                target.type === 'VEHICLE_SLIDE'
                  ? 'เช่น ขนส่งและส่งมอบรถเรียบร้อย สภาพรถปกติ...'
                  : 'เช่น ล้างรถเสร็จเรียบร้อย ทำความสะอาดภายใน...'
              }
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 transition-all resize-none"
              style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-5 pt-0 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploadedPhotos.length === 0 || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-95 active:scale-[0.98]"
            style={{ backgroundColor: uploadedPhotos.length > 0 ? theme.primary : '#9ca3af' }}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>
                  {uploadProgress
                    ? `กำลังอัปโหลดรูป ${uploadProgress.done + 1}/${uploadProgress.total}...`
                    : 'กำลังส่งงาน...'}
                </span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {uploadedPhotos.length > 0
                    ? `ส่งงาน (${uploadedPhotos.length} รูป)`
                    : 'กรุณาแนบรูปก่อน'
                  }
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VendorSubmitPhotoModal;
