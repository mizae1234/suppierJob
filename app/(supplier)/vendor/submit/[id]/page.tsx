'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import {
  ArrowLeft,
  Camera,
  Send,
  CheckCircle2,
  ImagePlus,
  Sparkles,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

export default function SupplierSubmitPage() {
  const { jobs, addJobEvidence, updateJobStatus } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const job = useMemo(() => jobs.find(j => j.id === jobId), [jobs, jobId]);

  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ไม่พบงานที่ระบุ</p>
        <Link href="/s/jobs" className="text-sm font-semibold mt-2 inline-block" style={{ color: theme.primary }}>
          ← กลับไปรายการงาน
        </Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Add evidence
      await addJobEvidence(job.id, {
        photoUrl: '/evidence/completion-photo.jpg',
        caption: caption || 'งานเสร็จเรียบร้อย',
        evidenceType: 'COMPLETION',
        vin: job.vin || job.carWashItems?.[0]?.vin,
      });

      // Update status to WAITING_APPROVAL
      await updateJobStatus(job.id, 'WAITING_APPROVAL');
      setSubmitted(true);
    } catch (error) {
      alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: theme.badgeBg }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: theme.primary }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">ส่งงานเรียบร้อย! 🎉</h2>
        <p className="text-sm text-gray-500 mb-6">
          รอสาขาตรวจรับ — คุณจะได้รับแจ้งเตือนเมื่อมีการอนุมัติ
        </p>
        <Link
          href="/s/jobs"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold"
          style={{ backgroundColor: theme.primary }}
        >
          กลับไปรายการงาน
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto">
      {/* Back Link */}
      <Link
        href="/s/jobs?tab=progress"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        กลับไปรายการงาน
      </Link>

      {/* Job Info Card */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
            {job.jobType === 'CAR_WASH'
              ? <Sparkles className="w-5 h-5 text-blue-500" />
              : <Truck className="w-5 h-5 text-purple-500" />
            }
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 font-mono">{job.jobNumber}</p>
            <p className="text-xs text-gray-500">
              {job.jobType === 'CAR_WASH' ? 'ล้างรถ' : 'รถสไลด์'} • {job.companyCode} • {job.branchName}
            </p>
          </div>
        </div>

        {/* VIN List */}
        {job.carWashItems && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">รถที่ต้องล้าง:</p>
            <div className="flex flex-col gap-1.5">
              {job.carWashItems.map((item, idx) => (
                <div key={idx} className="px-3 py-2 rounded-lg bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-900">{item.vin}</span>
                  <span className="text-[10px] text-gray-500">{item.washType}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {job.vin && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">VIN:</p>
            <div className="px-3 py-2 rounded-lg bg-gray-50">
              <span className="text-xs font-mono text-gray-900">{job.vin}</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Evidence Section */}
      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Camera className="w-4 h-4 text-gray-500" />
          แนบหลักฐานการทำงาน
        </h3>

        {/* Photo Upload Placeholder */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-gray-400 transition-colors cursor-pointer mb-4">
          <ImagePlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500">กดเพื่อถ่ายรูป หรือเลือกจากอัลบั้ม</p>
          <p className="text-[10px] text-gray-400 mt-1">รองรับ JPG, PNG สูงสุด 10MB</p>
        </div>

        {/* Caption */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
            หมายเหตุ / รายละเอียดงาน (ไม่บังคับ)
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="เช่น ล้างรถเสร็จเรียบร้อย ทำความสะอาดภายในด้วย..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-all"
            style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50"
          style={{ backgroundColor: theme.primary }}
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              กำลังส่ง...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              ส่งงานเพื่อตรวจรับ
            </>
          )}
        </button>
      </div>
    </div>
  );
}
