'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, ImagePlus, Trash2, Send, X, AlertTriangle, Truck, Info } from 'lucide-react';
import { Job } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { compressImage, MAX_RAW_FILE_SIZE } from './image-utils';
import { getVehicleLabel } from '@/lib/job-utils';
import { SLIDE_FAILED_ATTEMPT_FEE, SLIDE_FAIL_NOTE_MIN_LENGTH, SLIDE_FAIL_NOTE_MAX_LENGTH } from '@/lib/slide-failed-attempt';

const MAX_PHOTOS = 5;

export interface VendorFailedAttemptModalProps {
  job: Job | null;
  onClose: () => void;
  onSubmit: (data: { note: string; photos: string[] }) => Promise<void>;
}

/**
 * Vendor แจ้ง "สไลด์ไม่สำเร็จ / เที่ยวเปล่า" — ทั้งใบงาน (คิดค่าบริการตายตัวต่อใบงาน)
 */
export function VendorFailedAttemptModal({ job, onClose, onSubmit }: VendorFailedAttemptModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > MAX_RAW_FILE_SIZE) {
        showToast('ไฟล์ขนาดเกิน 20MB กรุณาเลือกไฟล์ที่เล็กกว่า', 'error');
        return;
      }
      compressImage(file)
        .then(url =>
          setPhotos(prev => {
            if (prev.length >= MAX_PHOTOS) {
              showToast(`แนบรูปได้สูงสุด ${MAX_PHOTOS} รูป`, 'error');
              return prev;
            }
            return [...prev, url];
          })
        )
        .catch(() => showToast(`อ่านไฟล์ ${file.name} ไม่สำเร็จ`, 'error'));
    });

    e.target.value = '';
  }, [showToast]);

  if (!job) return null;

  const activeItems = (job.carWashItems || []).filter(i => i.status !== 'CANCELLED');
  const vehicleLabels = activeItems.length > 0
    ? activeItems.map(i => getVehicleLabel(i.vin, i.licensePlate))
    : [getVehicleLabel(job.vin, job.vehicle?.licensePlate)];
  const origin = job.customOriginAddress || job.originBranchName || job.branchName;
  const dest = job.customDestAddress || job.destBranchName || 'ปลายทาง';

  const noteTooShort = note.trim().length < SLIDE_FAIL_NOTE_MIN_LENGTH;
  const canSubmit = !noteTooShort && photos.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ note: note.trim(), photos });
      setNote('');
      setPhotos([]);
      onClose();
    } catch {
      // ข้อความ error แสดงผ่าน toast จากผู้เรียกแล้ว
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm bg-orange-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 tracking-tight leading-tight">สไลด์ไม่ได้</h3>
              <p className="text-xs text-gray-500 mt-0.5">แจ้งปัญหาหน้างานพร้อมรูปถ่าย เพื่อส่งให้สาขาอนุมัติ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 ml-2 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Job summary */}
          <div className="rounded-2xl border border-orange-200 bg-orange-50/60 overflow-hidden text-xs">
            <div className="p-3 border-b border-orange-200/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#0f5238] text-white shrink-0">
                  <Truck className="w-3 h-3" />
                  <span>สไลด์ขนส่ง</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                  #{job.jobNumber}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-[10px] text-orange-700 font-semibold">ค่าเที่ยวเปล่า</span>
                <span className="text-base font-black font-mono text-orange-700">
                  ฿{SLIDE_FAILED_ATTEMPT_FEE.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="p-3 flex flex-col gap-1.5 text-[11px] text-gray-700">
              <p>
                <span className="text-gray-400 mr-1">รถในใบงาน ({vehicleLabels.length} คัน):</span>
                <span className="font-semibold">{vehicleLabels.join(', ')}</span>
              </p>
              <p className="truncate" title={`${origin} → ${dest}`}>
                <span className="text-gray-400 mr-1">เส้นทาง:</span>
                <span className="font-medium">{origin} → {dest}</span>
              </p>
            </div>
          </div>

          {/* <div className="flex items-start gap-2 p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-900">
            <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
            <span>
              ใช้เมื่อมาถึงหน้างานแล้วแต่สไลด์รถไม่ได้ ระบบจะคิดค่าบริการ <strong>{SLIDE_FAILED_ATTEMPT_FEE} บาทต่อใบงาน</strong> (ไม่คูณจำนวนคัน)
              หลังสาขาอนุมัติ
            </span>
          </div> */}

          {/* Note (บังคับ — Vendor พิมพ์สาเหตุเอง) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="slide-fail-note" className="text-xs font-bold text-gray-700">
                หมายเหตุ / สาเหตุที่สไลด์ไม่ได้ <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400">{note.length}/{SLIDE_FAIL_NOTE_MAX_LENGTH}</span>
            </div>
            <textarea
              id="slide-fail-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, SLIDE_FAIL_NOTE_MAX_LENGTH))}
              placeholder="อธิบายปัญหาที่พบหน้างาน..."
              rows={4}
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all resize-none ${
                noteTooShort && note.length > 0 ? 'border-red-300' : 'border-gray-200'
              }`}
            />
            {noteTooShort && note.length > 0 && (
              <p className="text-[10px] text-red-500 mt-1">กรุณาระบุอย่างน้อย {SLIDE_FAIL_NOTE_MIN_LENGTH} ตัวอักษร</p>
            )}
          </div>

          {/* Photos */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-orange-600" />
                <span>รูปถ่ายหน้างาน / ปัญหาที่พบ</span>
                <span className="text-red-500">*</span>
              </p>
              <span className="text-[10px] text-gray-400">{photos.length}/{MAX_PHOTOS} รูป</span>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`รูปที่ ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < MAX_PHOTOS && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-100/70 text-orange-700 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-bold">ถ่ายรูป</span>
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
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="p-5 pt-0 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-orange-600 hover:bg-orange-700 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังส่งงาน...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>ส่งงาน ฿{SLIDE_FAILED_ATTEMPT_FEE.toLocaleString()}</span>
              </>
            )}
          </button>
          {!canSubmit && !isSubmitting && (
            <p className="text-[10px] text-gray-500 mt-2 text-center">
              {noteTooShort ? 'กรุณาพิมพ์หมายเหตุ / สาเหตุที่สไลด์ไม่ได้' : 'กรุณาแนบรูปอย่างน้อย 1 รูป'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorFailedAttemptModal;

