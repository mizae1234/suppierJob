'use client';

import React from 'react';
import { Car, ImageIcon, ZoomIn } from 'lucide-react';
import { Job, JobEvidence } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { formatThaiDateTime } from '@/lib/date-utils';

interface EvidenceGalleryProps {
  job: Job;
  theme: ThemeColors;
  onPreviewPhoto: (url: string) => void;
}

function getEvidenceLabel(evidenceType: JobEvidence['evidenceType'], includeBeforeAfter: boolean) {
  if (includeBeforeAfter) {
    if (evidenceType === 'AFTER') return 'หลังทำเสร็จ';
    if (evidenceType === 'BEFORE') return 'ก่อนเริ่มงาน';
  }
  if (evidenceType === 'VERIFY') return 'ยืนยันตัวรถ';
  if (evidenceType === 'ISSUE') return 'รูปปัญหาหน้างาน';
  return evidenceType;
}

export function EvidenceGallery({ job, theme, onPreviewPhoto }: EvidenceGalleryProps) {
  const unassignedEvidences =
    job.carWashItems && job.carWashItems.length > 0
      ? job.evidences.filter((e) => !job.carWashItems!.some((it) => it.vin === e.vin))
      : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-gray-600" />
          <span>รูปถ่ายหลักฐาน ({job.evidenceCount ?? job.evidences.length} รูป)</span>
        </h4>
      </div>

      {job.evidences.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic">ยังไม่มีรูปหลักฐาน</p>
      ) : job.carWashItems && job.carWashItems.length > 0 ? (
        /* Grouped Per Vehicle (Option 1) */
        <div className="flex flex-col gap-4">
          {job.carWashItems.map((item) => {
            const itemEvidences = job.evidences.filter((e) => e.vin === item.vin);
            if (itemEvidences.length === 0) return null;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      <Car className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {item.vehicleModel || 'รถยนต์'}{' '}
                        {item.licensePlate && `(${item.licensePlate})`}
                      </p>
                      <span className="font-mono text-[10px] text-gray-400">VIN: {item.vin}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                    {itemEvidences.length} รูป
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {itemEvidences.map((evi) => (
                    <div
                      key={evi.id}
                      onClick={() => onPreviewPhoto(evi.photoUrl)}
                      className="group relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xs cursor-pointer transition-all"
                    >
                      <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={evi.photoUrl}
                          alt={evi.caption}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-black/60 text-white">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </div>
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold uppercase backdrop-blur-xs">
                          {getEvidenceLabel(evi.evidenceType, true)}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                          {evi.caption}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatThaiDateTime(evi.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Any unassigned photos in drawer */}
          {unassignedEvidences.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-gray-700">
                รูปภาพอื่นๆ ({unassignedEvidences.length} รูป)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {unassignedEvidences.map((evi) => (
                  <div
                    key={evi.id}
                    onClick={() => onPreviewPhoto(evi.photoUrl)}
                    className="group relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xs cursor-pointer transition-all"
                  >
                    <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={evi.photoUrl}
                        alt={evi.caption}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-black/60 text-white">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </div>
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold uppercase backdrop-blur-xs">
                        {getEvidenceLabel(evi.evidenceType, false)}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                        {evi.caption}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatThaiDateTime(evi.uploadedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Single Vehicle (e.g. Slide single car) */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {job.evidences.map((evi) => (
            <div
              key={evi.id}
              onClick={() => onPreviewPhoto(evi.photoUrl)}
              className="group relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-2xs cursor-pointer transition-all"
              style={{ '--hover-border': theme.badgeBg } as React.CSSProperties}
            >
              <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={evi.photoUrl}
                  alt={evi.caption}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-black/60 text-white">
                    <ZoomIn className="w-4 h-4" />
                  </div>
                </div>
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold uppercase backdrop-blur-xs">
                  {getEvidenceLabel(evi.evidenceType, true)}
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-gray-800 line-clamp-1">{evi.caption}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {formatThaiDateTime(evi.uploadedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
