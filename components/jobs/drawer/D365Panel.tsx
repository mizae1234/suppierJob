'use client';

import React from 'react';
import { Database, Loader2, RefreshCw, Truck } from 'lucide-react';
import { Job, UserRole } from '@/types';
import { isFailedAttemptJob } from '@/lib/slide-failed-attempt';

interface D365PanelProps {
  job: Job;
  currentRole: UserRole;
  isRetryingPo: boolean;
  isRetryingTransfer: boolean;
  onRetryPo: () => void;
  onRetryTransfer: () => void;
}

export function D365Panel({
  job,
  currentRole,
  isRetryingPo,
  isRetryingTransfer,
  onRetryPo,
  onRetryTransfer,
}: D365PanelProps) {
  const isApprovedOrInvoiced = ['APPROVED', 'INVOICED'].includes(job.status);

  // D365 PO state
  const hasPo = Boolean(job.d365PoNumber);
  const isPoPending = !hasPo && job.d365PoStatus === 'PENDING';
  const isPoFailed = !hasPo && job.d365PoStatus === 'FAILED';
  const showPoCard = hasPo || isApprovedOrInvoiced || isPoFailed || isPoPending;

  // D365 Transfer Journal state (Vehicle Slide only)
  const transferStatus = job.d365TransferStatus;
  const isSlideTransferEligible =
    job.jobType === 'VEHICLE_SLIDE' &&
    isApprovedOrInvoiced &&
    !isFailedAttemptJob(job) &&
    Boolean(job.destBranchId);
  const showTransferCard =
    job.jobType === 'VEHICLE_SLIDE' && (Boolean(transferStatus) || isSlideTransferEligible);

  const isTransferSuccess = transferStatus === 'SUCCESS';
  const isTransferFailed = transferStatus === 'FAILED';
  const isTransferPending = transferStatus === 'PENDING';
  const isTransferSkipped = transferStatus === 'SKIPPED';
  const canRetryTransfer =
    (currentRole === 'MASTER' || currentRole === 'ADMIN') &&
    isSlideTransferEligible &&
    (isTransferFailed || !transferStatus);

  return (
    <>
      {/* ─── D365 F&O PO Status Card ─── */}
      {showPoCard && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
            hasPo
              ? 'bg-emerald-50/70 border-emerald-200'
              : isPoPending
                ? 'bg-sky-50/80 border-sky-200'
                : isPoFailed
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                hasPo
                  ? 'bg-emerald-600 text-white'
                  : isPoPending
                    ? 'bg-sky-600 text-white'
                    : isPoFailed
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-200 text-gray-700'
              }`}
            >
              {isPoPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-xs">
                  {hasPo
                    ? 'สร้างใบสั่งซื้อ (D365 PO) สำเร็จ'
                    : isPoPending
                      ? 'กำลังเปิดใบสั่งซื้อใน D365...'
                      : isPoFailed
                        ? 'เปิดใบสั่งซื้อใน D365 ไม่สำเร็จ'
                        : 'สถานะใบสั่งซื้อ D365'}
                </span>
                {hasPo && (
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-100 text-[#0f5238] border border-emerald-300">
                    {job.d365PoNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                {hasPo
                  ? `ระบบสร้างและยืนยัน PO เลขที่ ${job.d365PoNumber} ใน D365 เรียบร้อยแล้ว`
                  : job.d365PoMessage || 'รอเปิดใบสั่งซื้อในระบบ Dynamics 365'}
              </p>
            </div>
          </div>

          {/* Retry PO Button for MASTER / ADMIN */}
          {(currentRole === 'MASTER' || currentRole === 'ADMIN') &&
            !hasPo &&
            !isPoPending &&
            isApprovedOrInvoiced && (
              <button
                type="button"
                disabled={isRetryingPo}
                onClick={onRetryPo}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingPo ? 'animate-spin' : ''}`} />
                <span>{isRetryingPo ? 'กำลังส่ง...' : 'ลองส่ง PO อีกครั้ง'}</span>
              </button>
            )}
        </div>
      )}

      {/* ─── D365 Inventory Transfer Journal Status Card (Vehicle Slide) ─── */}
      {showTransferCard && (
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
            isTransferSuccess
              ? 'bg-emerald-50/50 border-emerald-200'
              : isTransferFailed
                ? 'bg-red-50/70 border-red-200'
                : isTransferPending
                  ? 'bg-sky-50/70 border-sky-200'
                  : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isTransferSuccess
                  ? 'bg-emerald-600 text-white'
                  : isTransferFailed
                    ? 'bg-red-600 text-white'
                    : isTransferPending
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-200 text-gray-600'
              }`}
            >
              {isTransferPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Truck className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-xs">
                  โอนย้ายคลัง D365 (Transfer Journal)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isTransferSuccess
                      ? 'bg-emerald-100 text-emerald-800'
                      : isTransferFailed
                        ? 'bg-red-100 text-red-800'
                        : isTransferPending
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {isTransferSuccess
                    ? 'โอนคลังสำเร็จ'
                    : isTransferFailed
                      ? 'โอนคลังไม่สำเร็จ'
                      : isTransferPending
                        ? 'กำลังโอนคลัง...'
                        : isTransferSkipped
                          ? 'ไม่ต้องโอนคลัง'
                          : 'ยังไม่ส่งโอนคลัง'}
                </span>
              </div>
              {job.d365TransferMessage && (
                <p
                  className="text-[11px] text-gray-600 mt-0.5 truncate"
                  title={job.d365TransferMessage}
                >
                  {job.d365TransferMessage}
                </p>
              )}
            </div>
          </div>

          {canRetryTransfer && (
            <button
              type="button"
              disabled={isRetryingTransfer}
              onClick={onRetryTransfer}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetryingTransfer ? 'animate-spin' : ''}`} />
              <span>{isRetryingTransfer ? 'กำลังส่ง...' : 'ส่งโอนคลังใหม่'}</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
