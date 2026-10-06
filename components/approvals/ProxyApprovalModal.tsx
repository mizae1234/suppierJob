'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Job } from '@/types';

export interface ProxyApprovalModalProps {
  job: Job | null;
  onClose: () => void;
  onConfirm: (job: Job) => Promise<void>;
}

export function ProxyApprovalModal({ job, onClose, onConfirm }: ProxyApprovalModalProps) {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-sky-600 shrink-0" />
            <span>ยืนยันอนุมัติแทนสาขาปลายทาง</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2 text-xs text-gray-600">
          <p>
            งานรถสไลด์นี้มีปลายทางที่ <b className="text-gray-900">{job.destBranchName || 'สาขาปลายทาง'}</b>
          </p>
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-900 flex flex-col gap-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500 font-sans">เลขที่ใบงาน:</span>
              <span className="font-bold">{job.jobNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-sans">รถ:</span>
              <span className="font-bold font-sans">{job.vehicle?.model || job.vin || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-sans">สาขาต้นทาง:</span>
              <span className="font-bold font-sans">{job.originBranchName || job.branchName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-sans">สาขาปลายทาง:</span>
              <span className="font-bold font-sans text-emerald-700">{job.destBranchName}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
            ⚠️ คุณกำลังดำเนินการอนุมัติและตรวจรับรถแทนสาขาปลายทาง ระบบจะบันทึกสาขาต้นทางและชื่อของคุณลงในประวัติการตรวจรับ
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onConfirm(job)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            ยืนยันอนุมัติแทนปลายทาง
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProxyApprovalModal;
