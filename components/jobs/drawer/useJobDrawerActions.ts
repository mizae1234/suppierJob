'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { CarWashItem, Job } from '@/types';

export interface CancelModalState {
  isOpen: boolean;
  type: 'JOB' | 'ITEM';
  item?: CarWashItem;
}

interface UseJobDrawerActionsParams {
  job: Job | null;
  onClose: () => void;
  onPrevJob?: () => void;
  onNextJob?: () => void;
  hasPrevJob: boolean;
  hasNextJob: boolean;
}

export function useJobDrawerActions({
  job,
  onClose,
  onPrevJob,
  onNextJob,
  hasPrevJob,
  hasNextJob,
}: UseJobDrawerActionsParams) {
  const {
    currentRole,
    jobs,
    updateJobStatus,
    updateCarWashItemStatus,
    refreshJob,
    refreshJobsAndVehicles,
  } = useApp();
  const { showToast } = useToast();

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCancellingJob, setIsCancellingJob] = useState(false);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);
  const [isRetryingPo, setIsRetryingPo] = useState(false);
  const [isRetryingTransfer, setIsRetryingTransfer] = useState(false);
  const [cancelModalState, setCancelModalState] = useState<CancelModalState>({
    isOpen: false,
    type: 'JOB',
  });
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [detailJob, setDetailJob] = useState<Job | null>(null);

  // คีย์ลัดปิด Drawer และเลื่อนดูงานก่อนหน้า / ถัดไป
  useEffect(() => {
    if (!job) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevJob && onPrevJob) {
        onPrevJob();
      } else if (e.key === 'ArrowRight' && hasNextJob && onNextJob) {
        onNextJob();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [job, hasPrevJob, hasNextJob, onPrevJob, onNextJob, onClose]);

  // ─── Fetch full job detail (list payload โหมด ?view=list ไม่มีรูปทั้งหมดและ activities) ───
  const contextJob = job ? (jobs.find((j) => j.id === job.id) || job) : null;
  const detailJobId = contextJob?.id;
  // Re-fetch whenever the job changes in a way that may add new evidences/activities
  const detailRefreshKey = contextJob
    ? [
        contextJob.status,
        contextJob.updatedAt,
        contextJob.d365PoStatus || '',
        contextJob.d365TransferStatus || '',
        contextJob.evidenceCount ?? contextJob.evidences?.length ?? 0,
        (contextJob.carWashItems || [])
          .map((i) => `${i.id}:${i.status}:${i.verifiedAt || ''}`)
          .join(','),
      ].join('|')
    : '';

  useEffect(() => {
    if (!detailJobId) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${detailJobId}?include=activities`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) return; // keep fallback on 404/other errors
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (data?.job) {
          setDetailJob(data.job as Job);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch job detail:', err);
      }
    })();
    return () => controller.abort();
  }, [detailJobId, detailRefreshKey]);

  const matchedDetail = detailJob && contextJob && detailJob.id === contextJob.id ? detailJob : null;
  const activeJob: Job | null = contextJob
    ? matchedDetail
      ? {
          ...contextJob,
          evidences: matchedDetail.evidences,
          evidenceCount: matchedDetail.evidenceCount ?? matchedDetail.evidences.length,
          activities: matchedDetail.activities,
          vehicle: matchedDetail.vehicle ?? contextJob.vehicle,
          ...(matchedDetail.updatedAt > contextJob.updatedAt ? matchedDetail : {}),
        }
      : contextJob
    : null;

  // ─── แนวทางที่ 1: แก้ไข/เพิ่มรถ/ยกเลิกใบงานได้โดยสาขา (Branch) / Admin / Master ก่อนที่ Supplier จะกดยืนยันตัวรถคันแรก ───
  const canUserCancelOrModifyJob = currentRole !== 'SUPPLIER';
  const hasSupplierStarted = Boolean(
    activeJob?.verifiedAt ||
      activeJob?.carWashItems?.some(
        (i) => i.verifiedAt || i.status === 'COMPLETED' || i.status === 'APPROVED'
      )
  );
  const canModifyBeforeSupplierStarts = Boolean(
    activeJob &&
      canUserCancelOrModifyJob &&
      ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(activeJob.status) &&
      !hasSupplierStarted
  );

  const handleCopyText = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1800);
    }
  };

  const handleRetryPo = async () => {
    if (!activeJob) return;
    setIsRetryingPo(true);
    try {
      const res = await fetch(`/api/jobs/${activeJob.id}/d365-po`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          `สร้างใบสั่งซื้อ (PO) เลขที่ ${data.purchId} ในระบบ D365 เรียบร้อยแล้ว`,
          'success'
        );
        const refreshed = await refreshJob(activeJob.id);
        if (refreshed) setDetailJob(refreshed);
      } else {
        showToast(data.message || data.error || 'ไม่สามารถสร้าง PO ได้', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsRetryingPo(false);
    }
  };

  const handleRetryTransfer = async () => {
    if (!activeJob) return;
    setIsRetryingTransfer(true);
    try {
      const res = await fetch(`/api/jobs/${activeJob.id}/d365-transfer`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'ส่งโอนย้ายคลังในระบบ D365 เรียบร้อยแล้ว', 'success');
        const refreshed = await refreshJob(activeJob.id);
        if (refreshed) setDetailJob(refreshed);
        void refreshJobsAndVehicles();
      } else {
        showToast(data.error || data.message || 'ไม่สามารถส่งโอนย้ายคลังได้', 'error');
        const refreshed = await refreshJob(activeJob.id);
        if (refreshed) setDetailJob(refreshed);
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsRetryingTransfer(false);
    }
  };

  // Handlers for Admin / Branch cancelling job or single vehicle item
  const handleOpenCancelEntireJob = () => {
    if (!activeJob) return;

    if (activeJob.verifiedAt || activeJob.carWashItems?.some((i) => i.verifiedAt)) {
      showToast('ไม่สามารถยกเลิกใบงานได้ เนื่องจาก Supplier ได้ถ่ายรูปยืนยันตัวรถแล้ว', 'error');
      return;
    }

    setCancelModalState({ isOpen: true, type: 'JOB' });
  };

  const handleOpenCancelSingleItem = (item: CarWashItem) => {
    if (!activeJob) return;

    if (item.verifiedAt) {
      showToast('ไม่สามารถยกเลิกได้ เนื่องจาก Supplier ได้ถ่ายรูปยืนยันตัวรถแล้ว', 'error');
      return;
    }

    setCancelModalState({ isOpen: true, type: 'ITEM', item });
  };

  const handleConfirmCancel = async () => {
    if (!activeJob) return;

    if (cancelModalState.type === 'JOB') {
      setIsCancellingJob(true);
      try {
        const res = await updateJobStatus(activeJob.id, 'CANCELLED', {
          rejectReason: 'ยกเลิกโดยผู้ดูแลระบบ',
        });
        if (res.success) {
          showToast(
            `ยกเลิกใบงาน ${activeJob.jobNumber} เรียบร้อยแล้ว — ปลดล็อคสถานะรถทั้งหมดแล้ว`,
            'success'
          );
          setCancelModalState({ isOpen: false, type: 'JOB' });
          onClose();
        } else {
          showToast(res.error || 'ไม่สามารถยกเลิกใบงานได้', 'error');
        }
      } catch {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
      } finally {
        setIsCancellingJob(false);
      }
    } else if (cancelModalState.type === 'ITEM' && cancelModalState.item) {
      const item = cancelModalState.item;
      setCancellingItemId(item.id);
      try {
        const res = await updateCarWashItemStatus(
          activeJob.id,
          item.id,
          'CANCELLED',
          'ยกเลิกโดยผู้ดูแลระบบ'
        );
        if (res && !res.error) {
          showToast(
            `ยกเลิกงานรถคัน ${item.vin} เรียบร้อยแล้ว — ปลดล็อคสถานะรถพร้อมสั่งงานใหม่แล้ว`,
            'success'
          );
          setCancelModalState({ isOpen: false, type: 'ITEM' });
        } else {
          showToast(res?.error || 'ไม่สามารถยกเลิกงานสำหรับรถคันนี้ได้', 'error');
        }
      } catch {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
      } finally {
        setCancellingItemId(null);
      }
    }
  };

  return {
    contextJob,
    activeJob,
    detailJobId,
    copiedText,
    handleCopyText,
    isRetryingPo,
    handleRetryPo,
    isRetryingTransfer,
    handleRetryTransfer,
    isCancellingJob,
    cancellingItemId,
    cancelModalState,
    setCancelModalState,
    handleOpenCancelEntireJob,
    handleOpenCancelSingleItem,
    handleConfirmCancel,
    showSubstituteModal,
    setShowSubstituteModal,
    permissions: {
      canUserCancelOrModifyJob,
      hasSupplierStarted,
      canModifyBeforeSupplierStarts,
    },
  };
}
