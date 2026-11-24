'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Database, Loader2, RefreshCw, Truck } from 'lucide-react';
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
  const [expandedPoJobId, setExpandedPoJobId] = useState<string | null>(null);
  const [expandedTransferJobId, setExpandedTransferJobId] = useState<string | null>(null);

  const isPoExpanded = expandedPoJobId === job.id;
  const isTransferExpanded = expandedTransferJobId === job.id;

  const isApprovedOrInvoiced = ['APPROVED', 'INVOICED'].includes(job.status);

  // D365 PO state
  const hasPo = Boolean(job.d365PoNumber);
  const isPoPending = !hasPo && job.d365PoStatus === 'PENDING';
  const isPoFailed = !hasPo && job.d365PoStatus === 'FAILED';
  const showPoCard = hasPo || isApprovedOrInvoiced || isPoFailed || isPoPending;
  const poMessage = hasPo
    ? `ระบบสร้างและยืนยัน PO เลขที่ ${job.d365PoNumber} ใน D365 เรียบร้อยแล้ว`
    : job.d365PoMessage || 'รอเปิดใบสั่งซื้อในระบบ Dynamics 365';

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

  const transferLines = job.d365TransferMessage
    ? job.d365TransferMessage
        .split(/\s*\|\s*/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const hasTransferMessage = transferLines.length > 0;

  return (
    <>
      {/* ─── D365 F&O PO Status Card ─── */}
      {showPoCard && (
        <div
          onClick={() => setExpandedPoJobId(isPoExpanded ? null : job.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpandedPoJobId(isPoExpanded ? null : job.id);
            }
          }}
          title={isPoExpanded ? 'คลิกเพื่อย่อรายละเอียด' : 'คลิกเพื่อดูรายละเอียดทั้งหมด'}
          className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 text-xs cursor-pointer transition-colors ${
            hasPo
              ? 'bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200'
              : isPoPending
                ? 'bg-sky-50/80 hover:bg-sky-50 border-sky-200'
                : isPoFailed
                  ? 'bg-amber-50/80 hover:bg-amber-50 border-amber-300'
                  : 'bg-gray-50 hover:bg-gray-100/70 border-gray-200'
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
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
            <div className="min-w-0 flex-1">
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
              <p
                className={`text-[11px] text-gray-500 mt-0.5 ${
                  isPoExpanded ? 'whitespace-pre-wrap break-words leading-relaxed' : 'truncate'
                }`}
              >
                {poMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Retry PO Button for MASTER / ADMIN */}
            {(currentRole === 'MASTER' || currentRole === 'ADMIN') &&
              !hasPo &&
              !isPoPending &&
              isApprovedOrInvoiced && (
                <button
                  type="button"
                  disabled={isRetryingPo}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetryPo();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetryingPo ? 'animate-spin' : ''}`} />
                  <span>{isRetryingPo ? 'กำลังส่ง...' : 'ลองส่ง PO อีกครั้ง'}</span>
                </button>
              )}
            <span className="p-1 text-gray-400">
              {isPoExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </div>
        </div>
      )}

      {/* ─── D365 Inventory Transfer Journal Status Card (Vehicle Slide) ─── */}
      {showTransferCard && (
        <div
          onClick={() => {
            if (!hasTransferMessage) return;
            setExpandedTransferJobId(isTransferExpanded ? null : job.id);
          }}
          role={hasTransferMessage ? 'button' : undefined}
          tabIndex={hasTransferMessage ? 0 : undefined}
          onKeyDown={(e) => {
            if (!hasTransferMessage) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpandedTransferJobId(isTransferExpanded ? null : job.id);
            }
          }}
          title={
            hasTransferMessage
              ? isTransferExpanded
                ? 'คลิกเพื่อย่อรายละเอียด'
                : 'คลิกเพื่อดูรายละเอียดการโอนคลังทั้งหมด'
              : undefined
          }
          className={`p-3 rounded-2xl border flex items-start justify-between gap-3 text-xs transition-colors ${
            hasTransferMessage ? 'cursor-pointer' : ''
          } ${
            isTransferSuccess
              ? 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200'
              : isTransferFailed
                ? 'bg-red-50/70 hover:bg-red-50 border-red-200'
                : isTransferPending
                  ? 'bg-sky-50/70 hover:bg-sky-50 border-sky-200'
                  : 'bg-gray-50 hover:bg-gray-100/70 border-gray-200'
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
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
            <div className="min-w-0 flex-1">
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
                {transferLines.length > 1 && (
                  <span className="text-[10px] font-semibold text-gray-500">
                    ({transferLines.length} รายการ)
                  </span>
                )}
              </div>

              {hasTransferMessage && (
                isTransferExpanded ? (
                  transferLines.length > 1 ? (
                    <ul className="mt-1.5 space-y-1 text-[11px] text-gray-700">
                      {transferLines.map((line, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 leading-relaxed break-words"
                        >
                          <span className="text-emerald-600 font-bold shrink-0">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-gray-700 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                      {job.d365TransferMessage}
                    </p>
                  )
                ) : (
                  <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                    {job.d365TransferMessage}
                  </p>
                )
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canRetryTransfer && (
              <button
                type="button"
                disabled={isRetryingTransfer}
                onClick={(e) => {
                  e.stopPropagation();
                  onRetryTransfer();
                }}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingTransfer ? 'animate-spin' : ''}`} />
                <span>{isRetryingTransfer ? 'กำลังส่ง...' : 'ส่งโอนคลังใหม่'}</span>
              </button>
            )}
            {hasTransferMessage && (
              <span className="p-1 text-gray-400">
                {isTransferExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
