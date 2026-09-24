'use client';

import React, { useState } from 'react';
import { Job, JobEvidence } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { 
  X, 
  Camera, 
  UploadCloud, 
  Check, 
  Trash2, 
  Sparkles, 
  Truck,
  Image as ImageIcon
} from 'lucide-react';

interface SubmitEvidenceModalProps {
  job: Job;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_SAMPLE_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80',
    title: 'ตัวถังรถสะอาดเรียบร้อย (Car Clean Body)',
    type: 'AFTER' as const
  },
  {
    url: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=600&q=80',
    title: 'ล้อแม็กและยางเคลือบเงา (Wheels & Tire Polish)',
    type: 'AFTER' as const
  },
  {
    url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80',
    title: 'รถยนต์ขึ้นแท่นสไลด์ปลอดภัย (Secured on Slide Bed)',
    type: 'PICKUP' as const
  },
  {
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
    title: 'ส่งมอบถึงสาขาปลายทาง (Delivered at Destination)',
    type: 'DROPOFF' as const
  }
];

export const SubmitEvidenceModal: React.FC<SubmitEvidenceModalProps> = ({
  job,
  onClose,
  onSuccess
}) => {
  const { addJobEvidence, updateJobStatus } = useApp();

  const [selectedPhotos, setSelectedPhotos] = useState<Array<{
    url: string;
    caption: string;
    evidenceType: 'BEFORE' | 'AFTER' | 'PICKUP' | 'DROPOFF' | 'GENERAL';
  }>>([]);

  const [currentCaption, setCurrentCaption] = useState('');
  const [currentType, setCurrentType] = useState<'BEFORE' | 'AFTER' | 'PICKUP' | 'DROPOFF' | 'GENERAL'>('AFTER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add photo from preset or custom URL
  const handleAddPreset = (preset: typeof PRESET_SAMPLE_PHOTOS[0]) => {
    setSelectedPhotos(prev => [
      ...prev,
      {
        url: preset.url,
        caption: preset.title,
        evidenceType: preset.type
      }
    ]);
  };

  // Handle local file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedPhotos(prev => [
            ...prev,
            {
              url: event.target!.result as string,
              caption: currentCaption || file.name,
              evidenceType: currentType
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPhotos.length === 0) {
      showToast('กรุณาแนบรูปภาพหลักฐานอย่างน้อย 1 ภาพ', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Add all evidences
      for (const photo of selectedPhotos) {
        await addJobEvidence(job.id, {
          photoUrl: photo.url,
          caption: photo.caption,
          evidenceType: photo.evidenceType,
          vin: job.vin || (job.carWashItems && job.carWashItems[0]?.vin)
        });
      }

      // 2. Transition job to WAITING_APPROVAL
      await updateJobStatus(job.id, 'WAITING_APPROVAL');

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0f5b44] flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">ถ่ายรูปส่งงาน / แนบหลักฐาน</h3>
              <p className="text-[11px] text-gray-500 font-mono font-semibold">{job.jobNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-800">
          {/* Target Info Pill */}
          <div className="p-3 bg-[#f2faf5] rounded-2xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#0f5b44] shadow-xs">
                {job.jobType === 'CAR_WASH' ? <Sparkles className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {job.jobType === 'CAR_WASH' ? 'งานสั่งล้างรถ (Car Wash)' : 'งานขนย้ายรถสไลด์'}
                </p>
                <p className="text-[10px] text-gray-500 font-mono font-bold">
                  {job.vin || (job.carWashItems && `${job.carWashItems.length} คัน`)}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {job.branchName}
            </span>
          </div>

          {/* Quick Preset Buttons (Easy 1-tap testing) */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5 flex items-center justify-between">
              <span>เลือกรูปตัวอย่างด่วน (หรือถ่ายภาพจริง):</span>
              <span className="text-[10px] text-emerald-700 font-normal">แตะเพื่อเพิ่ม</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_SAMPLE_PHOTOS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleAddPreset(preset)}
                  className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-left transition-all group"
                >
                  <img 
                    src={preset.url} 
                    alt={preset.title}
                    className="w-9 h-9 rounded-lg object-cover shrink-0" 
                  />
                  <span className="text-[10px] font-medium text-gray-700 leading-tight group-hover:text-emerald-900">
                    {preset.title.split('(')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Take/Upload Real Photo */}
          <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-4 text-center bg-white hover:bg-emerald-50/30 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              multiple
              id="mobile-evidence-upload"
              onChange={handleFileChange}
              className="hidden" 
            />
            <label 
              htmlFor="mobile-evidence-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              <div className="w-10 h-10 rounded-full bg-[#e8f5ed] text-[#0f5b44] flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#0f5b44]">
                แตะเพื่อเปิดกล้อง หรือเลือกไฟล์จากเครื่อง
              </span>
              <span className="text-[10px] text-gray-400">
                รองรับไฟล์รูปภาพ JPG, PNG
              </span>
            </label>
          </div>

          {/* Selected Photos List */}
          {selectedPhotos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800">
                  รูปภาพที่จะแนบ ({selectedPhotos.length} รูป)
                </span>
                <button 
                  type="button"
                  onClick={() => setSelectedPhotos([])}
                  className="text-[10px] text-rose-500 hover:underline"
                >
                  ลบทั้งหมด
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {selectedPhotos.map((photo, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 group bg-gray-50">
                    <img 
                      src={photo.url} 
                      alt={`Photo ${i + 1}`} 
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-[#0f5b44]">
                        {photo.evidenceType}
                      </span>
                      <p className="text-[10px] text-gray-600 truncate mt-0.5">{photo.caption}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedPhotos.length === 0}
            className={`flex-[2] py-3 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-md ${
              selectedPhotos.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[#0f5b44] hover:bg-[#00422f] active:scale-98 shadow-emerald-900/20'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>ส่งมอบงานตรวจรับ ({selectedPhotos.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
