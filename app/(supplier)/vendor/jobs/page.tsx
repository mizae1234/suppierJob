'use client';

import React, { useMemo, useState, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { Job, JobStatus, CarWashItem } from '@/types';
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
  AlertTriangle,
  X,
  ChevronRight,
  Car,
  Hash,
  Send,
  ImagePlus,
  Trash2,
} from 'lucide-react';

type TabKey = 'progress' | 'waiting' | 'approved' | 'rejected';

// ─── Item-level virtual card type for Supplier display ──
interface SupplierItemCard {
  // Item-level data
  itemId: string;
  vin: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  washType: string;
  unitPrice: number;
  itemStatus: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  itemRemarks?: string;
  actualWashDate: string;
  // Parent job reference
  jobId: string;
  jobNumber: string;
  jobStatus: JobStatus;
  branchName: string;
  supplierName: string;
  companyCode: string;
  supplierId: string;
  totalItemsInJob: number;
  completedItemsInJob: number;
  job: Job; // Full reference
}

function SupplierJobsPageContent() {
  const { jobs, updateJobStatus, updateCarWashItemStatus, addJobEvidence, activeSupplier, currentSupplierId, currentBranchId, activeBranch } = useApp();
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const searchParams = useSearchParams();

  const isMaster = user?.role === 'MASTER';
  const isAll = (!activeSupplier || currentSupplierId === 'ALL') && isMaster;
  const supplierId = activeSupplier?.id || user?.supplierId;

  const rawTab = searchParams.get('tab');
  const initialTab: TabKey = rawTab === 'new' ? 'progress' : (rawTab as TabKey) || 'progress';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Rejection modal state — per-item rejection
  const [rejectingCard, setRejectingCard] = useState<SupplierItemCard | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // Item submit state
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);

  // Photo upload modal state
  const [photoModalCard, setPhotoModalCard] = useState<SupplierItemCard | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; file: File }[]>([]);
  const [photoCaption, setPhotoCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presetReasons = [
    'คิวงานเต็ม / ช่างไม่พอ',
    'เกินเวลาทำการ',
    'อุปกรณ์ซ่อมบำรุง',
    'ไม่สามารถให้บริการประเภทนี้ได้',
    'รถไม่อยู่ในจุดนัดหมาย',
  ];

  // ─── Filter jobs by supplier ──
  const myJobs = useMemo(() => {
    let list = isAll ? jobs : jobs.filter(j => j.supplierId === supplierId);
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list;
  }, [jobs, supplierId, isAll, currentBranchId]);

  // ─── Flatten CAR_WASH jobs into item-level cards ──
  const allItemCards: SupplierItemCard[] = useMemo(() => {
    const cards: SupplierItemCard[] = [];

    myJobs.forEach(job => {
      if (job.jobType === 'CAR_WASH' && job.carWashItems && job.carWashItems.length > 0) {
        const completedCount = job.carWashItems.filter(i => i.status === 'COMPLETED').length;
        
        job.carWashItems.forEach(item => {
          cards.push({
            itemId: item.id,
            vin: item.vin,
            vehicleModel: item.vehicleModel,
            vehicleColor: item.vehicleColor,
            licensePlate: item.licensePlate,
            washType: item.washType,
            unitPrice: item.unitPrice,
            itemStatus: item.status as 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED',
            itemRemarks: item.remarks,
            actualWashDate: item.actualWashDate,
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

    return cards;
  }, [myJobs]);

  // ─── Keep Vehicle Slide jobs as-is ──
  const slideJobs = useMemo(() => myJobs.filter(j => j.jobType === 'VEHICLE_SLIDE'), [myJobs]);

  const tabConfig: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'progress', label: 'งานที่ต้องทำ', icon: Clock, color: '#f59e0b' },
    { key: 'waiting', label: 'รอตรวจรับ', icon: AlertCircle, color: '#ef4444' },
    { key: 'approved', label: 'ผ่านแล้ว', icon: CheckCircle2, color: theme.primary },
    { key: 'rejected', label: 'ปฏิเสธ/ตีกลับ', icon: XCircle, color: '#dc2626' },
  ];

  // ─── Tab Filtering Logic ──
  // For item cards: filter based on item-level status + job status
  // For slide jobs: filter based on job status (unchanged)
  const getTabItems = (tabKey: TabKey) => {
    let items: SupplierItemCard[] = [];
    let slides: Job[] = [];

    switch (tabKey) {
      case 'progress':
        // Items that are PENDING and belong to active jobs
        items = allItemCards.filter(c =>
          c.itemStatus === 'PENDING' &&
          ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(c.jobStatus)
        );
        slides = slideJobs.filter(j => ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(j.status));
        break;
      case 'waiting':
        // Items that are COMPLETED (submitted by supplier) — waiting branch approval
        items = allItemCards.filter(c =>
          c.itemStatus === 'COMPLETED' &&
          ['IN_PROGRESS', 'WAITING_APPROVAL'].includes(c.jobStatus)
        );
        slides = slideJobs.filter(j => j.status === 'WAITING_APPROVAL');
        break;
      case 'approved':
        // Items that are COMPLETED and parent job is APPROVED/INVOICED
        items = allItemCards.filter(c =>
          c.itemStatus === 'COMPLETED' &&
          ['APPROVED', 'INVOICED'].includes(c.jobStatus)
        );
        slides = slideJobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status));
        break;
      case 'rejected':
        // Items that are REJECTED, or belong to CANCELLED/REJECTED jobs
        items = allItemCards.filter(c =>
          c.itemStatus === 'REJECTED' ||
          ['CANCELLED', 'REJECTED'].includes(c.jobStatus)
        );
        slides = slideJobs.filter(j => ['CANCELLED', 'REJECTED'].includes(j.status));
        break;
    }

    return { items, slides };
  };

  const currentTabData = getTabItems(activeTab);

  // Tab counts
  const getTabCount = (tabKey: TabKey) => {
    const data = getTabItems(tabKey);
    return data.items.length + data.slides.length;
  };

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

  const totalFilteredCount = filteredItems.length + filteredSlides.length;

  // ─── Open photo modal for item submission ──
  const handleOpenPhotoModal = (card: SupplierItemCard) => {
    setPhotoModalCard(card);
    setUploadedPhotos([]);
    setPhotoCaption('');
  };

  // ─── Handle file selection (camera / gallery) ──
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        showToast('ไฟล์ขนาดเกิน 10MB กรุณาเลือกไฟล์ที่เล็กกว่า', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedPhotos(prev => {
          if (prev.length >= 5) {
            showToast('แนบได้สูงสุด 5 รูป', 'error');
            return prev;
          }
          return [...prev, { url: ev.target?.result as string, file }];
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [showToast]);

  // ─── Remove a photo ──
  const handleRemovePhoto = useCallback((index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ─── Handle item-level submit (mark COMPLETED) — requires photos ──
  const handleSubmitItem = async () => {
    if (!photoModalCard) return;
    if (uploadedPhotos.length === 0) {
      showToast('กรุณาถ่ายรูปหรือแนบรูปอย่างน้อย 1 รูป', 'error');
      return;
    }

    const card = photoModalCard;
    setSubmittingItemId(card.itemId);
    try {
      // Add each photo as evidence
      for (let i = 0; i < uploadedPhotos.length; i++) {
        await addJobEvidence(card.jobId, {
          photoUrl: uploadedPhotos[i].url,
          caption: photoCaption || `ล้างรถเสร็จเรียบร้อย — ${card.vin} (${i + 1}/${uploadedPhotos.length})`,
          evidenceType: 'AFTER',
          vin: card.vin,
        });
      }

      // Update item status to COMPLETED
      const progress = await updateCarWashItemStatus(card.jobId, card.itemId, 'COMPLETED');

      if (progress?.allCompleted) {
        showToast(`🎉 ส่งงานรถคัน ${card.vin.slice(-6)} เสร็จ — ใบงาน ${card.jobNumber} ครบทุกคันแล้ว! รอสาขาตรวจรับ`, 'success');
      } else if (progress) {
        showToast(`✅ ส่งงานรถคัน ${card.vin.slice(-6)} เสร็จ (${progress.completed}/${progress.total} คัน)`, 'success');
      }

      setPhotoModalCard(null);
      setUploadedPhotos([]);
      setPhotoCaption('');
    } catch (e) {
      showToast('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง', 'error');
    } finally {
      setSubmittingItemId(null);
    }
  };

  // ─── Handle reject item (per-item, NOT entire job) ──
  const handleConfirmReject = async () => {
    if (!rejectingCard) return;
    setIsSubmittingReject(true);
    try {
      const reason = rejectReason.trim() || 'Supplier ปฏิเสธรายการนี้';
      await updateCarWashItemStatus(rejectingCard.jobId, rejectingCard.itemId, 'CANCELLED', reason);
      showToast(`ปฏิเสธรถคัน ${rejectingCard.vin.slice(-6)} เรียบร้อยแล้ว`, 'info');
      setRejectingCard(null);
      setRejectReason('');
    } catch (e) {
      console.error(e);
      showToast('ไม่สามารถปฏิเสธได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // ─── Render item card ──
  const renderItemCard = (card: SupplierItemCard) => {
    const isSubmitting = submittingItemId === card.itemId;
    const isPending = card.itemStatus === 'PENDING' && ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(card.jobStatus);
    const isCompleted = card.itemStatus === 'COMPLETED';
    const isRejected = card.itemStatus === 'REJECTED';

    return (
      <div
        key={card.itemId}
        className={`p-4 rounded-2xl bg-white border shadow-xs transition-all ${
          isPending
            ? 'border-amber-200/80 hover:border-amber-300'
            : isCompleted
            ? 'border-emerald-200/60'
            : 'border-red-200/60'
        }`}
      >
        {/* Top Row: Vehicle + Price */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isPending
                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                : isCompleted
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              <Car className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-bold text-gray-900 font-mono">{card.vin.slice(-6)}</p>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  card.washType === 'DEEP_CLEAN'
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : card.washType === 'POLISH'
                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                    : 'bg-gray-50 text-gray-600 border border-gray-100'
                }`}>
                  {card.washType === 'STANDARD' ? 'ล้างปกติ' : card.washType === 'DEEP_CLEAN' ? 'ล้างเชิงลึก' : 'ขัดเคลือบ'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[200px]">
                {card.vehicleModel || 'รถยนต์'} {card.vehicleColor ? `• ${card.vehicleColor}` : ''}
                {card.licensePlate && ` • ${card.licensePlate}`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-sm font-mono ${card.itemStatus === 'CANCELLED' ? 'line-through text-gray-400 text-xs' : 'font-black'}`} style={card.itemStatus !== 'CANCELLED' ? { color: theme.primary } : undefined}>
              ฿{card.unitPrice.toLocaleString()}
            </span>
            {card.itemStatus === 'CANCELLED' && (
              <span className="block text-[9px] text-red-500 font-medium">ไม่คิดเงิน</span>
            )}
          </div>
        </div>

        {/* Job Reference Badge + Progress */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 min-w-0">
            <Hash className="w-3 h-3 shrink-0 text-gray-400" />
            <span className="font-mono font-semibold text-gray-700 shrink-0">{card.jobNumber}</span>
            <span>•</span>
            <span className="truncate">{card.branchName}</span>
            {isAll && (
              <span className="ml-0.5 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                🏢 {card.supplierName}
              </span>
            )}
          </div>
          {/* Mini progress bar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${card.totalItemsInJob > 0 ? (card.completedItemsInJob / card.totalItemsInJob) * 100 : 0}%`,
                  backgroundColor: theme.primary,
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-500">
              {card.completedItemsInJob}/{card.totalItemsInJob}
            </span>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {/* PENDING items: Show submit + reject */}
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => {
                  setRejectingCard(card);
                  setRejectReason('');
                }}
                className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span>ปฏิเสธ</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenPhotoModal(card)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer hover:opacity-90 active:scale-[0.99] shadow-sm disabled:opacity-50"
                style={{ backgroundColor: theme.primary }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ถ่ายรูป + ส่งงาน</span>
              </button>
            </>
          )}

          {/* COMPLETED items waiting approval */}
          {isCompleted && ['IN_PROGRESS', 'WAITING_APPROVAL'].includes(card.jobStatus) && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">
              <Clock className="w-4 h-4" />
              <span>ส่งงานคันนี้แล้ว • รอตรวจรับ</span>
            </div>
          )}

          {/* APPROVED items */}
          {isCompleted && ['APPROVED', 'INVOICED'].includes(card.jobStatus) && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold"
              style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ผ่านการตรวจรับเรียบร้อย ✅</span>
            </div>
          )}

          {/* REJECTED items */}
          {isRejected && (
            <div className="flex-1 flex items-center justify-between gap-2">
              <span className="text-xs text-red-700 font-medium truncate">
                ⚠️ สาขาขอให้แก้ไข: {card.itemRemarks || card.job.rejectReason || 'โปรดตรวจสอบ'}
              </span>
              <button
                type="button"
                onClick={() => handleOpenPhotoModal(card)}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 disabled:opacity-50"
              >
                แก้ไข + ส่งใหม่
              </button>
            </div>
          )}

          {/* CANCELLED jobs */}
          {['CANCELLED'].includes(card.jobStatus) && !isRejected && (
            <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-red-50/80 border border-red-100 text-xs">
              <div className="flex items-center gap-1.5 text-red-700 font-bold">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>ปฏิเสธงานนี้แล้ว</span>
              </div>
              {card.job.rejectReason && (
                <span className="text-[11px] text-red-600 truncate">
                  เหตุผล: {card.job.rejectReason}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Render slide job card (unchanged from original) ──
  const renderSlideJobCard = (job: Job) => {
    const cost = getJobTotalCost(job);
    const isActiveJob = job.status === 'IN_PROGRESS' || job.status === 'PENDING_SUPPLIER';

    return (
      <div key={job.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100">
              <Truck className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-gray-900 font-mono">{job.jobNumber}</p>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                รถสไลด์ • <span className="font-semibold text-gray-700">{job.companyCode}</span> • {job.branchName}
              </p>
            </div>
          </div>
          <span className="text-sm font-black font-mono" style={{ color: theme.primary }}>
            {formatCurrency(cost)}
          </span>
        </div>

        {job.vin && (
          <div className="mb-3">
            <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[11px] text-gray-700 font-mono">
              🚗 {job.vin}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {isActiveJob && (
            <>
              <button
                type="button"
                onClick={() => {
                  // Vehicle Slide: reject entire job (single vehicle)
                  updateJobStatus(job.id, 'CANCELLED', { rejectReason: 'Supplier ปฏิเสธงาน' });
                  showToast(`ปฏิเสธงาน ${job.jobNumber} เรียบร้อยแล้ว`, 'info');
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <XCircle className="w-4 h-4 text-red-500" />
                <span>ปฏิเสธงาน</span>
              </button>
              <Link
                href={`/vendor/submit/${job.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all cursor-pointer hover:opacity-90 active:scale-[0.99] shadow-sm"
                style={{ backgroundColor: theme.primary }}
              >
                <Camera className="w-4 h-4" />
                <span>ส่งงาน + แนบรูป</span>
              </Link>
            </>
          )}

          {job.status === 'CANCELLED' && (
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2.5 rounded-xl bg-red-50/80 border border-red-100 text-xs">
              <div className="flex items-center gap-1.5 text-red-700 font-bold">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>ปฏิเสธงานนี้แล้ว</span>
              </div>
              {job.rejectReason && (
                <span className="text-[11px] text-red-600 truncate max-w-xs">
                  เหตุผล: {job.rejectReason}
                </span>
              )}
            </div>
          )}

          {job.status === 'REJECTED' && (
            <div className="flex-1 flex items-center justify-between gap-2">
              <span className="text-xs text-red-700 font-medium truncate">
                ⚠️ สาขาขอให้แก้ไข: {job.rejectReason || 'โปรดตรวจสอบ'}
              </span>
              <Link
                href={`/vendor/submit/${job.id}`}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                แก้ไข + ส่งใหม่
              </Link>
            </div>
          )}

          {job.status === 'WAITING_APPROVAL' && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs sm:text-sm font-bold">
              <Clock className="w-4 h-4" />
              <span>ส่งงานแล้ว • รอสาขาตรวจรับ...</span>
            </div>
          )}

          {['APPROVED', 'INVOICED'].includes(job.status) && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold"
              style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ผ่านการตรวจรับเรียบร้อย ✅</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">รายการงานของฉัน</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            งานทั้งหมด {myJobs.length} ใบงาน • {allItemCards.length} รายการรถ {activeBranch ? `(${activeBranch.name})` : '(ทุกสาขา)'}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
          {totalFilteredCount} รายการในหมวดนี้
        </span>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-gray-200/60 backdrop-blur-sm rounded-2xl overflow-x-auto scrollbar-none shadow-inner">
        {tabConfig.map(tab => {
          const Icon = tab.icon;
          const count = getTabCount(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-white shadow-xs text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: isActive ? tab.color : undefined }} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold text-white"
                  style={{ backgroundColor: tab.color }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {totalFilteredCount === 0 ? (
        <div className="text-center py-16 px-4 bg-white/60 rounded-3xl border border-gray-100 shadow-2xs text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold text-gray-600">ไม่มีงานในหมวดนี้</p>
          <p className="text-xs text-gray-400 mt-1">งานจะปรากฏเมื่อมีการมอบหมายหรือเปลี่ยนสถานะ</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Section Header for Car Wash Items */}
          {filteredItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">ล้างรถ (รายคัน)</span>
                <span className="text-[10px] text-gray-400">{filteredItems.length} คัน</span>
              </div>
              {filteredItems.map(card => renderItemCard(card))}
            </>
          )}

          {/* Section Header for Vehicle Slide */}
          {filteredSlides.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 mt-2">
                <Truck className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">รถสไลด์</span>
                <span className="text-[10px] text-gray-400">{filteredSlides.length} งาน</span>
              </div>
              {filteredSlides.map(job => renderSlideJobCard(job))}
            </>
          )}
        </div>
      )}

      {/* Reject Item Confirmation Modal (PER-ITEM) */}
      {rejectingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-9 h-9 rounded-2xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">ปฏิเสธรถคันนี้</h3>
                  <p className="text-[11px] text-gray-500 font-mono">VIN: {rejectingCard.vin}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingCard(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Car info */}
            <div className="p-3 rounded-xl bg-red-50/50 border border-red-100 text-xs">
              <p className="font-semibold text-gray-800">
                {rejectingCard.vehicleModel} {rejectingCard.vehicleColor && `• สี ${rejectingCard.vehicleColor}`}
              </p>
              <p className="text-gray-500 mt-0.5">
                ใบงาน: <span className="font-mono font-bold">{rejectingCard.jobNumber}</span> • {rejectingCard.branchName}
              </p>
              <p className="text-red-600 font-medium mt-1">
                ⚠️ ปฏิเสธเฉพาะคันนี้เท่านั้น — คันอื่นในใบงานเดียวกันไม่ได้รับผลกระทบ
              </p>
            </div>

            {/* Quick Reason Chips */}
            <div>
              <p className="text-[11px] font-bold text-gray-700 mb-1.5">เลือกเหตุผลด่วน:</p>
              <div className="flex flex-wrap gap-1.5">
                {presetReasons.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRejectReason(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      rejectReason === r
                        ? 'bg-red-600 text-white font-bold shadow-2xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                หรือระบุเหตุผลเพิ่มเติม:
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผลในการปฏิเสธรถคันนี้..."
                rows={3}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRejectingCard(null)}
                disabled={isSubmittingReject}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{isSubmittingReject ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธคันนี้'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload + Submit Modal */}
      {photoModalCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
                  >
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">ส่งงานรถคันนี้</h3>
                    <p className="text-[11px] text-gray-500">ถ่ายรูปหลักฐานก่อนส่งงาน</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoModalCard(null);
                    setUploadedPhotos([]);
                    setPhotoCaption('');
                  }}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Car Info Card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Car className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900 font-mono">{photoModalCard.vin}</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {photoModalCard.washType === 'STANDARD' ? 'ล้างปกติ' : photoModalCard.washType === 'DEEP_CLEAN' ? 'ล้างเชิงลึก' : 'ขัดเคลือบ'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {photoModalCard.vehicleModel} {photoModalCard.vehicleColor && `• ${photoModalCard.vehicleColor}`}
                    <span className="ml-1 font-mono text-gray-400">#{photoModalCard.jobNumber}</span>
                  </p>
                </div>
                <span className="text-sm font-bold font-mono shrink-0" style={{ color: theme.primary }}>
                  ฿{photoModalCard.unitPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Photo Upload Area */}
            <div className="p-5 flex flex-col gap-4">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Upload buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-700">📸 รูปถ่ายหลักฐาน <span className="text-red-500">*</span></p>
                  <span className="text-[10px] text-gray-400">{uploadedPhotos.length}/5 รูป</span>
                </div>

                {/* Photo Grid */}
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {uploadedPhotos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={`ภาพที่ ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[9px] font-bold">
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Trigger Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                      }
                    }}
                    disabled={uploadedPhotos.length >= 5}
                    className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-700 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs font-bold">ถ่ายรูป</span>
                    <span className="text-[9px] text-emerald-600">เปิดกล้อง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                      }
                    }}
                    disabled={uploadedPhotos.length >= 5}
                    className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-600 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs font-bold">เลือกจากอัลบั้ม</span>
                    <span className="text-[9px] text-gray-400">JPG, PNG (max 10MB)</span>
                  </button>
                </div>

                {uploadedPhotos.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-2 text-center font-medium">
                    ⚠️ ต้องแนบรูปอย่างน้อย 1 รูป จึงจะส่งงานได้
                  </p>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  หมายเหตุ (ไม่บังคับ)
                </label>
                <textarea
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="เช่น ล้างรถเสร็จเรียบร้อย ทำความสะอาดภายใน..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 transition-all resize-none"
                  style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="p-5 pt-0 shrink-0">
              <button
                type="button"
                onClick={handleSubmitItem}
                disabled={uploadedPhotos.length === 0 || submittingItemId === photoModalCard.itemId}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-95 active:scale-[0.98]"
                style={{ backgroundColor: uploadedPhotos.length > 0 ? theme.primary : '#9ca3af' }}
              >
                {submittingItemId === photoModalCard.itemId ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังส่งงาน...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {uploadedPhotos.length > 0
                        ? `ส่งงาน (${uploadedPhotos.length} รูป)`
                        : 'กรุณาแนบรูปก่อน'
                      }
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupplierJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">กำลังโหลด...</div>}>
      <SupplierJobsPageContent />
    </Suspense>
  );
}
