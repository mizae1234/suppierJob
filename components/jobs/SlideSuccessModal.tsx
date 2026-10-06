'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Job } from '@/types';
import { formatThaiDateTime } from '@/lib/date-utils';

export interface SlideSuccessModalProps {
  createdJob: Job | null;
  selectedVins: string[];
  distance: number | null;
  estimatedCost: number;
  onClose?: () => void;
}

export function SlideSuccessModal({
  createdJob,
  selectedVins,
  distance,
  estimatedCost,
  onClose,
}: SlideSuccessModalProps) {
  const router = useRouter();

  if (!createdJob) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              สร้างคำขอรถสไลด์เรียบร้อยแล้ว
            </h3>
            <p className="text-xs text-gray-500">
              {selectedVins.length > 1
                ? `สร้างใบคำขอรถสไลด์จำนวน ${selectedVins.length} คันเรียบร้อยแล้ว ระบบได้แจ้งเตือน Supplier แล้ว`
                : 'ระบบได้แจ้งเตือนไปยัง Supplier ผู้รับงานแล้ว'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 text-xs flex flex-col gap-2">
          <p>
            <strong>Job No.:</strong>{' '}
            <span className="font-mono font-bold text-gray-900">
              {createdJob.jobNumber} {selectedVins.length > 1 ? `(และอีก ${selectedVins.length - 1} ใบคำขอ)` : ''}
            </span>
          </p>
          <p><strong>จำนวนรถ:</strong> {selectedVins.length} คัน</p>
          <p>
            <strong>เลขตัวถัง (VIN):</strong>{' '}
            <span className="font-mono">
              {selectedVins.slice(0, 3).join(', ')}{selectedVins.length > 3 ? ` ... (รวม ${selectedVins.length} คัน)` : ''}
            </span>
          </p>
          <p><strong>เส้นทาง:</strong> {createdJob.originBranchName} &rarr; {createdJob.destBranchName || createdJob.customDestAddress || 'ปลายทางที่ระบุ'}</p>
          <p><strong>ระยะทาง:</strong> {distance ? `${distance} กม.` : '-'}</p>
          <p><strong>Supplier:</strong> {createdJob.supplierName}</p>
          <p><strong>เวลารับรถ:</strong> {formatThaiDateTime(createdJob.pickupDateTime)}</p>
          <p>
            <strong>ประมาณการค่าบริการรวม:</strong>{' '}
            <span className="font-bold text-[#0f5238]">
              ฿{(estimatedCost * selectedVins.length).toLocaleString()}{' '}
              {selectedVins.length > 1 ? `(คันละ ฿${estimatedCost.toLocaleString()})` : ''}
            </span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => {
              if (onClose) onClose();
              router.push('/jobs');
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28]"
          >
            กลับไปหน้ารวมงาน
          </button>
        </div>
      </div>
    </div>
  );
}

export default SlideSuccessModal;
