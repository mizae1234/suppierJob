'use client';

import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface ApprovalRejectModalProps {
  jobId: string | null;
  itemId: string | null;
  onClose: () => void;
  onConfirmRejectJob: (jobId: string, reason: string) => Promise<void>;
  onConfirmRejectItem: (jobId: string, itemId: string, reason: string) => Promise<void>;
}

export function ApprovalRejectModal({
  jobId,
  itemId,
  onClose,
  onConfirmRejectJob,
  onConfirmRejectItem,
}: ApprovalRejectModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!jobId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    setSubmitting(true);
    try {
      if (itemId) {
        await onConfirmRejectItem(jobId, itemId, rejectReason);
      } else {
        await onConfirmRejectJob(jobId, rejectReason);
      }
      setRejectReason('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>
              {itemId
                ? 'ตีกลับรถคันนี้ (Reject Item)'
                : 'ระบุข้อเสนอแนะในการแก้ไข (Reject Job)'
              }
            </span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {itemId && (
          <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
            💡 ตีกลับเฉพาะรถคันนี้ — รถคันอื่นในใบงานไม่ได้รับผลกระทบ
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block text-xs font-semibold text-gray-700">
            {itemId
              ? 'ระบุจุดที่ต้องแก้ไขสำหรับรถคันนี้:'
              : 'รายละเอียดจุดที่ต้องล้างซ้ำ หรือแก้ไข:'
            }
          </label>
          <textarea
            rows={3}
            required
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="เช่น ขอบกระจังหน้ายังมีคราบฝังแน่น และมีคราบน้ำมันบริเวณบันไดข้าง..."
            className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-600 outline-none"
          />
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer text-center"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer text-center disabled:opacity-50"
            >
              {submitting ? 'กำลังบันทึก...' : (itemId ? 'ยืนยันตีกลับคันนี้' : 'ยืนยันการ Reject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApprovalRejectModal;
