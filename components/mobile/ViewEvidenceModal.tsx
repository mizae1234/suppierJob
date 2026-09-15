'use client';

import React, { useState } from 'react';
import { Job } from '@/types';
import { X, Image as ImageIcon, Sparkles, Truck, CheckCircle2 } from 'lucide-react';
import { formatThaiDateTime } from '@/lib/date-utils';

interface ViewEvidenceModalProps {
  job: Job;
  onClose: () => void;
}

export const ViewEvidenceModal: React.FC<ViewEvidenceModalProps> = ({
  job,
  onClose
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const evidences = job.evidences || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">รูปภาพหลักฐานการทำงาน</h3>
            <p className="text-[11px] text-gray-500 font-mono font-semibold">{job.jobNumber} • {job.branchName}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-slate-800">
          {evidences.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
              ยังไม่มีรูปภาพหลักฐานสำหรับงานนี้
            </div>
          ) : (
            <>
              {/* Main Expanded Image */}
              <div className="relative rounded-2xl overflow-hidden bg-black/5 aspect-4/3 flex items-center justify-center">
                <img 
                  src={evidences[selectedPhotoIndex]?.photoUrl} 
                  alt="Evidence" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                  {evidences[selectedPhotoIndex]?.evidenceType}
                </div>
              </div>

              {/* Caption & Timestamp */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                <p className="font-semibold text-gray-800">
                  {evidences[selectedPhotoIndex]?.caption || 'รูปภาพประกอบการทำงาน'}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  อัปโหลดเมื่อ: {formatThaiDateTime(evidences[selectedPhotoIndex]?.uploadedAt)}
                </p>
              </div>

              {/* Thumbnails */}
              {evidences.length > 1 && (
                <div>
                  <p className="text-[11px] font-bold text-gray-500 mb-1.5">ภาพทั้งหมด ({evidences.length} รูป):</p>
                  <div className="grid grid-cols-4 gap-2">
                    {evidences.map((evi, idx) => (
                      <button
                        key={evi.id || idx}
                        onClick={() => setSelectedPhotoIndex(idx)}
                        className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                          selectedPhotoIndex === idx ? 'border-[#0f5b44] ring-2 ring-emerald-500/20' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={evi.photoUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-gray-200 hover:bg-gray-300 text-slate-800 text-xs font-semibold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
