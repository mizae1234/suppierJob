'use client';

import React, { useState } from 'react';
import { Job } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { Upload, X } from 'lucide-react';
import { SAMPLE_PHOTOS } from './constants';

interface CompleteJobModalProps {
  job: Job;
  theme: ThemeColors;
  onClose: () => void;
  onSubmit: (data: {
    photoUrl: string;
    caption: string;
    evidenceType: 'AFTER' | 'BEFORE' | 'DROPOFF';
  }) => void;
}

export const CompleteJobModal: React.FC<CompleteJobModalProps> = ({
  job,
  theme,
  onClose,
  onSubmit,
}) => {
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [evidenceType, setEvidenceType] = useState<'AFTER' | 'BEFORE' | 'DROPOFF'>('AFTER');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      photoUrl: photoUrl.trim() || SAMPLE_PHOTOS[0],
      caption: caption.trim() || 'งานเสร็จเรียบร้อย ตรวจสอบความสะอาดพร้อมส่งมอบ',
      evidenceType,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}>
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              แนบรูปหลักฐาน & ส่งงานเรียบร้อย
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-gray-600">
              รหัสงาน: <span className="font-bold text-gray-900">{job.jobNumber}</span>
            </p>
            <p className="text-xs text-gray-600">
              ประเภท: <span className="font-bold text-gray-900">{job.jobType}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              เลือกรูปตัวอย่าง หรือระบุ URL รูปถ่ายงาน:
            </label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://... หรือเลือกจากตัวอย่างด้านล่าง"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2"
              style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
            />
            <div className="flex gap-2 mt-2">
              {SAMPLE_PHOTOS.map((url, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setPhotoUrl(url)}
                  className="w-14 h-10 rounded-lg overflow-hidden border border-gray-200 relative shrink-0 focus:ring-2"
                  style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="sample" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ประเภทรูปถ่าย:</label>
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value as 'AFTER' | 'BEFORE' | 'DROPOFF')}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs outline-none font-medium focus:ring-2"
              style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
            >
              <option value="AFTER">รูปหลังทำความสะอาดเสร็จ (After Wash)</option>
              <option value="BEFORE">รูปก่อนเริ่มงาน (Before)</option>
              <option value="DROPOFF">รูปส่งมอบรถที่ปลายทาง (Delivery Dropoff)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">คำอธิบายเพิ่มเติม:</label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="เช่น ทำความสะอาดภายนอกและภายในเรียบร้อย พร้อมส่งมอบ"
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2"
              style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
              style={{ backgroundColor: theme.primary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryHover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary; }}
            >
              ส่งงานให้สาขาตรวจรับ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
