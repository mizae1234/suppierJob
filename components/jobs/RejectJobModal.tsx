'use client';

import React, { useState } from 'react';
import { Job } from '@/types';
import { AlertCircle, X } from 'lucide-react';

interface RejectJobModalProps {
  job: Job;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const RejectJobModal: React.FC<RejectJobModalProps> = ({
  job,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason || 'งานไม่ผ่านเกณฑ์ ขอให้ช่างแก้ไขงานซ้ำ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              ไม่อนุมัติ / ขอให้แก้ไขงาน (Reject)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-xs text-gray-600">
            Job No.: <span className="font-bold text-gray-900">{job.jobNumber}</span>
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              ระบุเหตุผลที่ต้องการให้ Supplier แก้ไข:
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น พบคราบน้ำมันที่ขอบประตู หรือมีรอยเปื้อนบริเวณเบาะหลัง..."
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-600 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">
              ยกเลิก
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-xs">
              ยืนยันการ Reject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
