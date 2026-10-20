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
        <div className="p-4 sm:p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ backgroundColor: theme.primary }}
              >
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 tracking-tight leading-tight">
                  {isSlide ? 'ส่งงานรถสไลด์' : 'ส่งงานรถคันนี้'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">แนบรูปถ่ายผลงานเพื่อส่งให้สาขาตรวจรับ</p>
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
          {/* Vehicle Info Summary Card */}
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
