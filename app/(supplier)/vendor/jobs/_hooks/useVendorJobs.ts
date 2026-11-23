'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getVehicleLabel, classifySupplierItem, classifySupplierSlide } from '@/lib/job-utils';
import { WorkModalTarget } from '@/components/vendor';
import { getFailedAttemptItemPrice, isFailedAttemptJob, SLIDE_FAILED_ATTEMPT_FEE } from '@/lib/slide-failed-attempt';
import { Job } from '@/types';
import { SupplierItemCard, TabCounts, TabKey, VALID_TABS, VendorJobCardActions } from '../_types';
import { itemCardToTarget, slideJobToTarget } from '../_utils';

interface TabBucket {
  items: SupplierItemCard[];
  slideItems: SupplierItemCard[];
  slides: Job[];
}

export function useVendorJobs() {
  const {
    jobs,
    vehicles,
    updateJobStatus,
    updateCarWashItemStatus,
    addJobEvidence,
    refreshJob,
    refreshJobs,
    activeSupplier,
    currentSupplierId,
    currentBranchId,
    activeBranch,
  } = useApp();
  const { user } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const isMaster = user?.role === 'MASTER';
  const isAdmin = user?.role === 'ADMIN';
  const isSupplierUser = user?.role === 'SUPPLIER';

  const isAll = !isSupplierUser && (isMaster || isAdmin) && (!activeSupplier || currentSupplierId === 'ALL');
  const supplierId = isSupplierUser ? user?.supplierId : (activeSupplier?.id || user?.supplierId);

  const rawTab = searchParams.get('tab');
  const initialTab: TabKey =
    rawTab === 'new' ? 'verify'
    : rawTab === 'rejected' ? 'returned' // backward-compatible link
    : VALID_TABS.includes(rawTab as TabKey) ? (rawTab as TabKey)
    : 'verify';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Modal states
  const [rejectingTarget, setRejectingTarget] = useState<WorkModalTarget | null>(null);
  const [photoModalTarget, setPhotoModalTarget] = useState<WorkModalTarget | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<WorkModalTarget | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [failedAttemptJob, setFailedAttemptJob] = useState<Job | null>(null);

  // ─── Filter jobs by supplier ──
  const myJobs = useMemo(() => {
    let list = isAll ? jobs : jobs.filter(j => j.supplierId === supplierId);
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list;
  }, [jobs, supplierId, isAll, currentBranchId]);

  // ─── Flatten CAR_WASH and VEHICLE_SLIDE jobs with items into item-level cards (1 card = 1 car) ──
  const { washItemCards, slideItemCards } = useMemo(() => {
    const washCards: SupplierItemCard[] = [];
    const slideCards: SupplierItemCard[] = [];

    myJobs.forEach(job => {
      if (job.carWashItems && job.carWashItems.length > 0 && (job.jobType === 'CAR_WASH' || job.jobType === 'VEHICLE_SLIDE')) {
        const completedCount = job.carWashItems.filter(i => i.status === 'COMPLETED' || i.status === 'APPROVED').length;
        const targetArr = job.jobType === 'CAR_WASH' ? washCards : slideCards;

        job.carWashItems.forEach(item => {
          const itemVehicle = (item as { vehicle?: { model?: string; color?: string; licensePlate?: string } }).vehicle;
          const vehicleObj = vehicles.find(v => v.vin === item.vin) || itemVehicle || job.vehicle;
          targetArr.push({
            itemId: item.id,
            vin: item.vin,
            vehicleModel: item.vehicleModel || vehicleObj?.model,
            vehicleColor: item.vehicleColor || vehicleObj?.color,
            licensePlate: item.licensePlate || vehicleObj?.licensePlate,
            washType: item.washType,
            unitPrice: job.jobType === 'VEHICLE_SLIDE' && isFailedAttemptJob(job)
              ? getFailedAttemptItemPrice(job.carWashItems!, item.id)
              : item.unitPrice,
            itemStatus: item.status,
            itemRemarks: item.remarks,
            actualWashDate: item.actualWashDate,
            verifiedAt: item.verifiedAt || job.verifiedAt,
            jobId: job.id,
            jobNumber: job.jobNumber,
            jobStatus: job.status,
            branchName: job.branchName,
            supplierName: job.supplierName,
            companyCode: job.companyCode,
            supplierId: job.supplierId,
            totalItemsInJob: job.carWashItems!.length,
            completedItemsInJob: completedCount,
            job,
          });
        });
      }
    });

    return { washItemCards: washCards, slideItemCards: slideCards };
  }, [myJobs, vehicles]);

  const allItemCards = useMemo(
    () => [...washItemCards, ...slideItemCards],
    [washItemCards, slideItemCards]
  );

  // ─── Legacy Vehicle Slide jobs without carWashItems ──
  const slideJobs = useMemo(
    () => myJobs.filter(j => j.jobType === 'VEHICLE_SLIDE' && (!j.carWashItems || j.carWashItems.length === 0)),
    [myJobs]
  );

  // ─── Tab Filtering Logic ──
  // Shared with the supplier dashboard (lib/job-utils) so counts always match.
  // Both Car Wash and Vehicle Slide are classified per car (item status + job status).
  const itemsByTab = useMemo(() => {
    const map = {} as Record<TabKey, TabBucket>;
    VALID_TABS.forEach(tabKey => {
      map[tabKey] = {
        items: washItemCards.filter(c => classifySupplierItem(c.itemStatus, c.jobStatus, c.verifiedAt) === tabKey),
        slideItems: slideItemCards.filter(c => classifySupplierItem(c.itemStatus, c.jobStatus, c.verifiedAt) === tabKey),
        slides: slideJobs.filter(j => classifySupplierSlide(j.status, j.verifiedAt) === tabKey),
      };
    });
    return map;
  }, [washItemCards, slideItemCards, slideJobs]);

  const tabCounts = useMemo(() => {
    const counts = {} as TabCounts;
    VALID_TABS.forEach(tabKey => {
      const data = itemsByTab[tabKey];
      counts[tabKey] = data.items.length + data.slideItems.length + data.slides.length;
    });
    return counts;
  }, [itemsByTab]);

  const currentTabData = itemsByTab[activeTab];
  const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();

  // Apply search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery) return currentTabData.items;
    const terms = searchQuery.split(/[,\s]+/).filter(t => t.length > 0);
    if (terms.length === 0) return currentTabData.items;

    return currentTabData.items.filter(card =>
      terms.some(q =>
        card.vin.toLowerCase().includes(q) ||
        card.jobNumber.toLowerCase().includes(q) ||
        (card.licensePlate && card.licensePlate.toLowerCase().includes(q)) ||
        (card.vehicleModel && card.vehicleModel.toLowerCase().includes(q)) ||
        card.branchName.toLowerCase().includes(q)
      )
    );
  }, [currentTabData.items, searchQuery]);

  const filteredSlideItems = useMemo(() => {
    if (!searchQuery) return currentTabData.slideItems;
    const terms = searchQuery.split(/[,\s]+/).filter(t => t.length > 0);
    if (terms.length === 0) return currentTabData.slideItems;

    return currentTabData.slideItems.filter(card =>
      terms.some(q =>
        card.vin.toLowerCase().includes(q) ||
        card.jobNumber.toLowerCase().includes(q) ||
        (card.licensePlate && card.licensePlate.toLowerCase().includes(q)) ||
        (card.vehicleModel && card.vehicleModel.toLowerCase().includes(q)) ||
        card.branchName.toLowerCase().includes(q)
      )
    );
  }, [currentTabData.slideItems, searchQuery]);

  const filteredSlides = useMemo(() => {
    if (!searchQuery) return currentTabData.slides;
    const terms = searchQuery.split(/[,\s]+/).filter(t => t.length > 0);
    if (terms.length === 0) return currentTabData.slides;

    return currentTabData.slides.filter(j =>
      terms.some(q =>
        j.jobNumber.toLowerCase().includes(q) ||
        (j.vin && j.vin.toLowerCase().includes(q)) ||
        (j.branchName && j.branchName.toLowerCase().includes(q))
      )
    );
  }, [currentTabData.slides, searchQuery]);

  const totalFilteredCount = filteredItems.length + filteredSlideItems.length + filteredSlides.length;

  // ─── Open photo modal handlers ──
  // ขั้นตอนแรกต้องยืนยันตัวรถ (VIN/ทะเบียน + รูป) ก่อน จึงจะไปหน้าส่งงานได้
  const handleOpenPhotoModalForWash = (card: SupplierItemCard) => {
    const target = itemCardToTarget(card);
    if (card.verifiedAt) setPhotoModalTarget(target);
    else setVerifyTarget(target);
  };

  const handleOpenPhotoModalForSlide = (job: Job) => {
    const target = slideJobToTarget(job, vehicles);
    if (job.verifiedAt) setPhotoModalTarget(target);
    else setVerifyTarget(target);
  };

  const handleVehicleVerified = async () => {
    const verifiedJobId = verifyTarget?.jobId;
    setVerifyTarget(null);
    if (verifiedJobId) {
      await refreshJob(verifiedJobId);
    } else {
      await refreshJobs();
    }
    setActiveTab('progress');
  };

  // ─── Open reject modal handlers ──
  const handleOpenRejectModalForWash = (card: SupplierItemCard) => {
    setRejectingTarget(itemCardToTarget(card));
  };

  const handleOpenRejectModalForSlide = (job: Job) => {
    setRejectingTarget(slideJobToTarget(job, vehicles));
  };

  // ─── Handle submit (Car Wash item or Vehicle Slide job) ──
  const handleSubmitPhotos = async (
    photos: { url: string; file: File }[],
    caption: string,
    onProgress?: (done: number, total: number) => void
  ) => {
    if (!photoModalTarget) return;

    const target = photoModalTarget;
    const currentId = target.type === 'CAR_WASH' ? target.itemId! : target.jobId;
    setSubmittingId(currentId);

    try {
      for (let i = 0; i < photos.length; i++) {
        onProgress?.(i, photos.length);
        const defaultCaption = target.type === 'CAR_WASH'
          ? `ล้างรถเสร็จเรียบร้อย — ${target.vin} (${i + 1}/${photos.length})`
          : `ส่งมอบรถสไลด์เรียบร้อย — ${target.vin} (${i + 1}/${photos.length})`;

        await addJobEvidence(target.jobId, {
          photoUrl: photos[i].url,
          caption: caption || defaultCaption,
          evidenceType: 'AFTER',
          vin: target.vin,
        });
      }

      if (target.itemId) {
        const progress = await updateCarWashItemStatus(target.jobId, target.itemId, 'COMPLETED');
        if (!progress) throw new Error('update item failed');
        if (progress.allCompleted) {
          showToast(`ส่งงานรถคัน ${getVehicleLabel(target.vin, target.licensePlate)} เรียบร้อยแล้ว — ใบงาน ${target.jobNumber} ครบทุกคัน อยู่ระหว่างรอสาขาตรวจรับ`, 'success');
        } else {
          showToast(`ส่งงานรถคัน ${getVehicleLabel(target.vin, target.licensePlate)} เรียบร้อยแล้ว (${progress.completed}/${progress.total} คัน)`, 'success');
        }
      } else {
        const result = await updateJobStatus(target.jobId, 'WAITING_APPROVAL');
        if (!result.success) {
          showToast(result.error || 'ไม่สามารถส่งงานได้', 'error');
          throw new Error(result.error);
        }
        showToast(`ส่งงานรถสไลด์ ${target.jobNumber} เรียบร้อยแล้ว อยู่ระหว่างรอสาขาตรวจรับ`, 'success');
      }
    } catch (e) {
      console.error(e);
      if (!(e instanceof Error && e.message && e.message !== 'update item failed')) {
        showToast('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง', 'error');
      }
      throw e;
    } finally {
      setSubmittingId(null);
    }
  };

  // ─── Handle failed attempt (เที่ยวเปล่า) submit ──
  const handleSubmitFailedAttempt = async (data: { note: string; photos: string[] }) => {
    if (!failedAttemptJob) return;
    const target = failedAttemptJob;
    setSubmittingId(target.id);
    try {
      const res = await fetch(`/api/jobs/${target.id}/failed-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(result.error || 'ไม่สามารถส่งงานเที่ยวเปล่าได้ กรุณาลองใหม่', 'error');
        throw new Error(result.error || 'failed-attempt error');
      }
      showToast(`ส่งงานเที่ยวเปล่า ${target.jobNumber} (฿${SLIDE_FAILED_ATTEMPT_FEE.toLocaleString()}) เรียบร้อยแล้ว — อยู่ระหว่างรอสาขาอนุมัติ`, 'success');
      await refreshJob(target.id);
      setActiveTab('waiting');
    } finally {
      setSubmittingId(null);
    }
  };

  // ─── Handle reject (per-item for item cards, or entire job for slide jobs) ──
  const handleConfirmReject = async (target: WorkModalTarget, reason: string) => {
    try {
      const trimmedReason = reason.trim() || 'Supplier ปฏิเสธรายการนี้';

      if (target.itemId) {
        await updateCarWashItemStatus(target.jobId, target.itemId, 'CANCELLED', trimmedReason);
        showToast(`ปฏิเสธรถคัน ${getVehicleLabel(target.vin, target.licensePlate)} เรียบร้อยแล้ว`, 'info');
      } else {
        await updateJobStatus(target.jobId, 'CANCELLED', { rejectReason: trimmedReason });
        showToast(`ปฏิเสธงานรถสไลด์ ${target.jobNumber} เรียบร้อยแล้ว`, 'info');
      }
    } catch (e) {
      console.error(e);
      showToast('ไม่สามารถปฏิเสธได้ กรุณาลองใหม่อีกครั้ง', 'error');
      throw e;
    }
  };

  const cardActions: VendorJobCardActions = {
    submittingId,
    onOpenPhotoForWash: handleOpenPhotoModalForWash,
    onOpenRejectForWash: handleOpenRejectModalForWash,
    onOpenPhotoForSlide: handleOpenPhotoModalForSlide,
    onOpenRejectForSlide: handleOpenRejectModalForSlide,
    onReportFailedAttempt: setFailedAttemptJob,
  };

  return {
    // Context / summary data
    isAll,
    vehicles,
    activeBranch,
    myJobsCount: myJobs.length,
    allItemCardsCount: allItemCards.length,

    // Tabs & filtered lists
    activeTab,
    setActiveTab,
    tabCounts,
    filteredItems,
    filteredSlideItems,
    filteredSlides,
    totalFilteredCount,

    // Card actions (grouped to avoid prop-drilling)
    cardActions,

    // Modal state & handlers (grouped)
    modals: {
      rejectingTarget,
      closeRejectModal: () => setRejectingTarget(null),
      onConfirmReject: handleConfirmReject,

      verifyTarget,
      closeVerifyModal: () => setVerifyTarget(null),
      onVehicleVerified: handleVehicleVerified,

      photoModalTarget,
      closePhotoModal: () => setPhotoModalTarget(null),
      onSubmitPhotos: handleSubmitPhotos,

      failedAttemptJob,
      closeFailedAttemptModal: () => setFailedAttemptJob(null),
      onSubmitFailedAttempt: handleSubmitFailedAttempt,
    },
  };
}
