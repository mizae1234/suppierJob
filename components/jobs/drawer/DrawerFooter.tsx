'use client';

import React from 'react';
import { Check, Loader2, Printer, Upload, XCircle } from 'lucide-react';
import { Job, UserRole } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { getFailedAttemptFee, isFailedAttemptJob } from '@/lib/slide-failed-attempt';

interface DrawerFooterProps {
  job: Job;
  theme: ThemeColors;
  currentRole: UserRole;
  myBranchId: string | undefined;
  activeBranchName: string | undefined;
  canUserCancelOrModifyJob: boolean;
  isCancellingJob: boolean;
  failedAttemptFee?: number | null;
  onCancelJob: () => void;
  onAcceptJob: (jobId: string) => Promise<void>;
  onCompleteJob: (job: Job) => void;
  onApprove: (jobId: string, customApprovedBy?: string, failedAttemptFee?: number) => Promise<void>;
  onReject: (job: Job) => void;
  onOpenSubstituteModal: () => void;
  onClose: () => void;
}

export function DrawerFooter({
  job,
  theme,
  currentRole,
  myBranchId,
  activeBranchName,
  canUserCancelOrModifyJob,
  isCancellingJob,
  failedAttemptFee,
  onCancelJob,
  onAcceptJob,
  onCompleteJob,
  onApprove,
  onReject,
  onOpenSubstituteModal,
  onClose,
}: DrawerFooterProps) {
  const canCancelEntireJob =
    canUserCancelOrModifyJob &&
    !['APPROVED', 'INVOICED', 'CANCELLED'].includes(job.status) &&
    !isFailedAttemptJob(job) &&
    !job.verifiedAt &&
    !(job.carWashItems && job.carWashItems.some((i) => i.verifiedAt));

  return (
    <div className="px-6 py-4 border-t border-gray-100 bg-white/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center justify-between shrink-0 shadow-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <Printer className="w-4 h-4 text-gray-500" />
          <span>พิมพ์ใบสั่งงาน</span>
        </button>

        {/* Requester / Admin / Master cancel entire job button if unverified */}
        {canCancelEntireJob && (
          <button
            type="button"
            onClick={onCancelJob}
            disabled={isCancellingJob}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-colors cursor-pointer disabled:opacity-50"
            title="ยกเลิกคำสั่งงานทั้งหมด (เนื่องจาก Supplier ยังไม่ได้ยืนยันตัวรถ)"
          >
            {isCancellingJob ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>ยกเลิกใบงาน</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Contextual actions */}
        {currentRole === 'SUPPLIER' && job.status === 'PENDING_SUPPLIER' && (
          <button
            type="button"
            onClick={() => onAcceptJob(job.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            รับงานนี้
          </button>
        )}

        {currentRole === 'SUPPLIER' && job.status === 'IN_PROGRESS' && (
          <button
            type="button"
            onClick={() => onCompleteJob(job)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>ส่งมอบงาน & แนบรูป</span>
          </button>
        )}

        {(currentRole === 'BRANCH' || currentRole === 'ADMIN' || currentRole === 'MASTER') &&
          job.status === 'WAITING_APPROVAL' &&
          (() => {
            if (job.d365PoStatus === 'PENDING') {
              return (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังเปิด PO ใน D365...</span>
                </span>
              );
            }
            const isSlide = job.jobType === 'VEHICLE_SLIDE';
            const isFailed = isFailedAttemptJob(job);
            const resolvedFailedFee =
              failedAttemptFee !== undefined ? failedAttemptFee : getFailedAttemptFee(job);
            const isDest =
              !isFailed && Boolean(isSlide && job.destBranchId && job.destBranchId === myBranchId);
            const isOrigin =
              !isFailed &&
              Boolean(
                isSlide &&
                  job.destBranchId &&
                  (job.pickupBranchId === myBranchId || job.branchId === myBranchId)
              );

            return (
              <>
                {isFailed ? (
                  <button
                    type="button"
                    disabled={resolvedFailedFee === null}
                    onClick={() => {
                      if (resolvedFailedFee === null) return;
                      onApprove(
                        job.id,
                        `อนุมัติค่าเที่ยวเปล่าโดย ${activeBranchName || job.pickupBranchName || job.branchName || 'สาขา'}`,
                        resolvedFailedFee
                      );
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="อนุมัติค่าเที่ยวเปล่า — รถไม่ถูกย้ายสาขา"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {resolvedFailedFee !== null
                        ? 'อนุมัติค่าเที่ยวเปล่า'
                        : 'กรุณาระบุค่าเที่ยวเปล่า'}
                    </span>
                  </button>
                ) : isDest ? (
                  <button
                    type="button"
                    onClick={() => onApprove(job.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition-colors"
                    title="ยืนยันตรวจรับรถเข้าสาขา"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>ยืนยันรับรถเข้าสาขา</span>
                  </button>
                ) : isOrigin ? (
                  <button
                    type="button"
                    onClick={onOpenSubstituteModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 shadow-xs transition-colors"
                    title="อนุมัติแทนสาขาปลายทาง"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>อนุมัติแทนปลายทาง</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onApprove(job.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors"
                    style={{ backgroundColor: theme.primary }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = theme.primaryHover;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary;
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>อนุมัติงาน</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onReject(job)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  ขอแก้ไข
                </button>
              </>
            );
          })()}

        <button
          type="button"
          onClick={() => onClose()}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  );
}
