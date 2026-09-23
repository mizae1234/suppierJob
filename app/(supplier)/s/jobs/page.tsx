'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { Job, JobStatus } from '@/types';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Truck,
  Camera,
  XCircle,
  ArrowRight,
} from 'lucide-react';

type TabKey = 'new' | 'progress' | 'waiting' | 'approved' | 'rejected';

export default function SupplierJobsPage() {
  const { jobs, updateJobStatus, addJobEvidence, activeSupplier } = useApp();
  const { user } = useAuth();
  const theme = useTheme();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get('tab') as TabKey) || 'new';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const supplierId = activeSupplier?.id || user?.supplierId;

  const myJobs = useMemo(() => {
    return jobs.filter(j => j.supplierId === supplierId);
  }, [jobs, supplierId]);

  const tabConfig: { key: TabKey; label: string; status: JobStatus[]; icon: React.ElementType; color: string }[] = [
    { key: 'new', label: 'งานใหม่', status: ['PENDING_SUPPLIER'], icon: ClipboardList, color: '#3b82f6' },
    { key: 'progress', label: 'กำลังทำ', status: ['IN_PROGRESS'], icon: Clock, color: '#f59e0b' },
    { key: 'waiting', label: 'รอตรวจรับ', status: ['WAITING_APPROVAL'], icon: AlertCircle, color: '#ef4444' },
    { key: 'approved', label: 'ผ่านแล้ว', status: ['APPROVED', 'INVOICED'], icon: CheckCircle2, color: theme.primary },
    { key: 'rejected', label: 'ตีกลับ', status: ['REJECTED'], icon: XCircle, color: '#dc2626' },
  ];

  const filteredJobs = useMemo(() => {
    const config = tabConfig.find(t => t.key === activeTab);
    if (!config) return [];
    return myJobs.filter(j => config.status.includes(j.status));
  }, [myJobs, activeTab]);

  const handleAcceptJob = async (jobId: string) => {
    await updateJobStatus(jobId, 'IN_PROGRESS');
  };

  const handleQuickSubmit = async (job: Job) => {
    // Add a placeholder evidence and submit
    await addJobEvidence(job.id, {
      photoUrl: '/placeholder-evidence.jpg',
      caption: 'งานเสร็จเรียบร้อย',
      evidenceType: 'COMPLETION',
      vin: job.vin || job.carWashItems?.[0]?.vin,
    });
    await updateJobStatus(job.id, 'WAITING_APPROVAL');
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">รายการงานของฉัน</h1>
        <p className="text-sm text-gray-500">งานทั้งหมด {myJobs.length} รายการ</p>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
        {tabConfig.map(tab => {
          const Icon = tab.icon;
          const count = myJobs.filter(j => tab.status.includes(j.status)).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: isActive ? tab.color : undefined }} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: tab.color }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Job Cards */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">ไม่มีงานในหมวดนี้</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredJobs.map(job => {
            const cost = getJobTotalCost(job);
            return (
              <div
                key={job.id}
                className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs"
              >
                {/* Job Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                      {job.jobType === 'CAR_WASH'
                        ? <Sparkles className="w-4.5 h-4.5 text-blue-500" />
                        : <Truck className="w-4.5 h-4.5 text-purple-500" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 font-mono">{job.jobNumber}</p>
                      <p className="text-[11px] text-gray-500">
                        {job.jobType === 'CAR_WASH' ? 'ล้างรถ' : 'รถสไลด์'} •{' '}
                        <span className="font-medium">{job.companyCode}</span> • {job.branchName}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold font-mono" style={{ color: theme.primary }}>
                    {formatCurrency(cost)}
                  </span>
                </div>

                {/* Job Details */}
                {job.jobType === 'CAR_WASH' && job.carWashItems && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {job.carWashItems.map((item, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-gray-50 text-[11px] text-gray-700 font-mono">
                        🚗 {item.vin.slice(-6)}
                      </span>
                    ))}
                  </div>
                )}

                {job.jobType === 'VEHICLE_SLIDE' && job.vin && (
                  <div className="mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-gray-50 text-[11px] text-gray-700 font-mono">
                      🚗 {job.vin}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                  {/* PENDING_SUPPLIER: Accept */}
                  {job.status === 'PENDING_SUPPLIER' && (
                    <>
                      <button
                        onClick={() => handleAcceptJob(job.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        รับงาน
                      </button>
                    </>
                  )}

                  {/* IN_PROGRESS: Submit Evidence */}
                  {job.status === 'IN_PROGRESS' && (
                    <Link
                      href={`/s/submit/${job.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
                      style={{ backgroundColor: '#f59e0b' }}
                    >
                      <Camera className="w-4 h-4" />
                      ส่งงาน + แนบรูป
                    </Link>
                  )}

                  {/* REJECTED: Re-submit */}
                  {job.status === 'REJECTED' && (
                    <Link
                      href={`/s/submit/${job.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      แก้ไขงาน + ส่งใหม่
                    </Link>
                  )}

                  {/* WAITING_APPROVAL: Info only */}
                  {job.status === 'WAITING_APPROVAL' && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold">
                      <Clock className="w-4 h-4" />
                      รอสาขาตรวจรับ...
                    </div>
                  )}

                  {/* APPROVED: Ready for invoice */}
                  {job.status === 'APPROVED' && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      ผ่านการตรวจรับ ✅
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
