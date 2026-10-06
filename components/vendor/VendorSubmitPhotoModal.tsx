'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, Trash2, Send, X, AlertTriangle } from 'lucide-react';
import { WorkModalTarget } from './types';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';

const MAX_PHOTO_DIMENSION = 1600;
const PHOTO_JPEG_QUALITY = 0.8;
const MAX_RAW_FILE_SIZE = 20 * 1024 * 1024;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

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
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: theme.primary }}
              >
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {target.type === 'VEHICLE_SLIDE' ? 'ส่งงานรถสไลด์' : 'ส่งงานรถคันนี้'}
                </h3>
                <p className="text-xs text-gray-500">ถ่ายรูปหรือแนบรูปผลงานเพื่อส่งให้สาขาตรวจรับ</p>
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

          {/* Vehicle Info Summary */}
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
            <div className="min-w-0 flex-1 mr-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-bold text-gray-900 font-mono">{target.vin}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0f5238]">
                  {target.serviceLabel}
                </span>
              </div>
              <p className="text-gray-500 truncate">
                {target.vehicleModel || (target.type === 'VEHICLE_SLIDE' ? 'รถสไลด์ขนส่ง' : 'รถยนต์')}
                {target.vehicleColor ? ` • ${target.vehicleColor}` : ''}
                {target.licensePlate ? ` • ${target.licensePlate}` : ''}
                <span className="ml-1 font-mono text-gray-400">#{target.jobNumber}</span>
              </p>
              {target.routeText && (
                <p className="text-gray-500 truncate text-[11px] mt-0.5">
                  📍 {target.routeText}
                </p>
              )}
            </div>
            <span className="text-sm font-black text-[#0f5238] font-mono shrink-0">
              ฿{target.unitPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Photo Upload Area */}
        <div className="p-5 flex flex-col gap-4">
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
