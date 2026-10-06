'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost, getVehicleLabel, classifySupplierItem, classifySupplierSlide } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import { Job, JobStatus, CarWashItemStatus } from '@/types';
import { VendorRejectModal, VendorSubmitPhotoModal, WorkModalTarget } from '@/components/vendor';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Truck,
  Camera,
  XCircle,
  Car,
  Hash,
  Navigation,
  Flag,
  Route,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

// returned = สาขาตรวจรับไม่ผ่าน ตีกลับให้แก้ไข | declined = Supplier ปฏิเสธรับงานเอง
type TabKey = 'progress' | 'waiting' | 'approved' | 'returned' | 'declined';
const VALID_TABS: TabKey[] = ['progress', 'waiting', 'approved', 'returned', 'declined'];

// ─── Google Maps navigation helpers (deep links — no API key needed) ──
// Prefer exact GPS coordinates; fall back to address / name text search.
function toMapsQuery(lat?: number, lng?: number, ...texts: (string | undefined)[]): string | null {
  if (typeof lat === 'number' && typeof lng === 'number') return `${lat},${lng}`;
  const text = texts.find(t => t && t.trim());
  return text ? text.trim() : null;
}

function getSlideLocations(job: Job) {
  const pickup = toMapsQuery(
    job.customOriginLat ?? job.originBranchLat,
    job.customOriginLng ?? job.originBranchLng,
    job.customOriginAddress,
    job.originBranchAddress,
    job.originBranchName,
  );
  const dropoff = toMapsQuery(
    job.customDestLat ?? job.destBranchLat,
    job.customDestLng ?? job.destBranchLng,
    job.customDestAddress,
    job.destBranchAddress,
    job.destBranchName,
  );
  const pickupLabel = job.customOriginAddress?.split(',')[0] || job.originBranchName || job.branchName;
  const dropoffLabel = job.customDestAddress?.split(',')[0] || job.destBranchName || 'ปลายทาง';
  return { pickup, dropoff, pickupLabel, dropoffLabel };
}

function mapsDirUrl(destination: string, origin?: string | null): string {
  const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving' });
  if (origin) params.set('origin', origin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

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
  itemStatus: CarWashItemStatus;
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
  const { jobs, vehicles, updateJobStatus, updateCarWashItemStatus, addJobEvidence, activeSupplier, currentSupplierId, currentBranchId, activeBranch } = useApp();
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const searchParams = useSearchParams();

  const isMaster = user?.role === 'MASTER';
  const isAll = (!activeSupplier || currentSupplierId === 'ALL') && isMaster;
  const supplierId = activeSupplier?.id || user?.supplierId;

  const rawTab = searchParams.get('tab');
  const initialTab: TabKey =
    rawTab === 'new' ? 'progress'
    : rawTab === 'rejected' ? 'returned' // backward-compatible link
    : VALID_TABS.includes(rawTab as TabKey) ? (rawTab as TabKey)
    : 'progress';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Modal states
  const [rejectingTarget, setRejectingTarget] = useState<WorkModalTarget | null>(null);
  const [photoModalTarget, setPhotoModalTarget] = useState<WorkModalTarget | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // ─── Filter jobs by supplier ──
  const myJobs = useMemo(() => {
    let list = isAll ? jobs : jobs.filter(j => j.supplierId === supplierId);
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list;
  }, [jobs, supplierId, isAll, currentBranchId]);

  // ─── Flatten CAR_WASH jobs with items into item-level cards ──
  const allItemCards: SupplierItemCard[] = useMemo(() => {
    const cards: SupplierItemCard[] = [];

    myJobs.forEach(job => {
      // ONLY CAR_WASH jobs should be flattened into car wash item cards
      if (job.jobType === 'CAR_WASH' && job.carWashItems && job.carWashItems.length > 0) {
        const completedCount = job.carWashItems.filter(i => i.status === 'COMPLETED' || i.status === 'APPROVED').length;
        
        job.carWashItems.forEach(item => {
          cards.push({
            itemId: item.id,
            vin: item.vin,
            vehicleModel: item.vehicleModel,
            vehicleColor: item.vehicleColor,
            licensePlate: item.licensePlate,
            washType: item.washType,
            unitPrice: item.unitPrice,
            itemStatus: item.status,
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

  // ─── Vehicle Slide jobs (ALL slide jobs, whether single or multi-car) ──
  const slideJobs = useMemo(() => myJobs.filter(j => j.jobType === 'VEHICLE_SLIDE'), [myJobs]);

  const tabConfig: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'progress', label: 'งานที่ต้องทำ', icon: Clock, color: '#f59e0b' },
    { key: 'waiting', label: 'รอตรวจรับ', icon: AlertCircle, color: '#ef4444' },
    { key: 'approved', label: 'ผ่านแล้ว', icon: CheckCircle2, color: theme.primary },
    { key: 'returned', label: 'ตีกลับ', icon: RotateCcw, color: '#ea580c' },
    { key: 'declined', label: 'ปฏิเสธ', icon: XCircle, color: '#dc2626' },
  ];

  // ─── Tab Filtering Logic ──
  // Shared with the supplier dashboard (lib/job-utils) so counts always match.
  // Car wash = per car (item status + job status), slide = per job.
  const getTabItems = (tabKey: TabKey) => {
    const items = allItemCards.filter(c => classifySupplierItem(c.itemStatus, c.jobStatus) === tabKey);
    const slides = slideJobs.filter(j => classifySupplierSlide(j.status) === tabKey);
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

  // ─── Modal Target Conversion Helpers ──
  const itemCardToTarget = (card: SupplierItemCard): WorkModalTarget => {
    const isSlide = card.job.jobType === 'VEHICLE_SLIDE';
    const origin = card.job.originBranchName || card.job.branchName;
    const dest = card.job.destBranchName || card.job.customDestAddress || 'ปลายทาง';
    const routeText = isSlide ? `${origin} → ${dest}${card.job.distance ? ` (${card.job.distance} กม.)` : ''}` : undefined;

    return {
      type: isSlide ? 'VEHICLE_SLIDE' : 'CAR_WASH',
      jobId: card.jobId,
      jobNumber: card.jobNumber,
      itemId: card.itemId,
      vin: card.vin,
      vehicleModel: card.vehicleModel,
      vehicleColor: card.vehicleColor,
      licensePlate: card.licensePlate,
      serviceType: card.washType,
      serviceLabel: isSlide ? 'รถสไลด์ขนส่ง' : card.washType === 'STANDARD' ? 'ล้างปกติ' : card.washType === 'DEEP_CLEAN' ? 'ล้างเชิงลึก' : 'ขัดเคลือบ',
      unitPrice: card.unitPrice,
      branchName: card.branchName,
      routeText,
      rejectReason: card.itemRemarks || card.job.rejectReason,
      job: card.job,
    };
  };

  const slideJobToTarget = (job: Job): WorkModalTarget => {
    const vehicleObj = vehicles.find(v => v.vin === job.vin) || job.vehicle;
    const cost = getJobTotalCost(job);
    const origin = job.originBranchName || job.branchName;
    const dest = job.destBranchName || job.customDestAddress || 'ปลายทาง';
    const routeText = `${origin} → ${dest}${job.distance ? ` (${job.distance} กม.)` : ''}`;

    return {
      type: 'VEHICLE_SLIDE',
      jobId: job.id,
      jobNumber: job.jobNumber,
      vin: job.vin || 'ไม่ระบุ VIN',
      vehicleModel: vehicleObj?.model,
      vehicleColor: vehicleObj?.color,
      licensePlate: vehicleObj?.licensePlate,
      serviceType: 'VEHICLE_SLIDE',
      serviceLabel: 'รถสไลด์ขนส่ง',
      unitPrice: cost,
      branchName: job.branchName,
      routeText,
      rejectReason: job.rejectReason,
      job,
    };
  };

  // ─── Open photo modal handlers ──
  const handleOpenPhotoModalForWash = (card: SupplierItemCard) => {
    setPhotoModalTarget(itemCardToTarget(card));
  };

  const handleOpenPhotoModalForSlide = (job: Job) => {
    setPhotoModalTarget(slideJobToTarget(job));
  };

  // ─── Open reject modal handlers ──
  const handleOpenRejectModalForWash = (card: SupplierItemCard) => {
    setRejectingTarget(itemCardToTarget(card));
  };

  const handleOpenRejectModalForSlide = (job: Job) => {
    setRejectingTarget(slideJobToTarget(job));
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
        if (progress?.allCompleted) {
          showToast(`🎉 ส่งงานรถคัน ${getVehicleLabel(target.vin, target.licensePlate)} เสร็จ — ใบงาน ${target.jobNumber} ครบทุกคันแล้ว! รอสาขาตรวจรับ`, 'success');
        } else if (progress) {
          showToast(`✅ ส่งงานรถคัน ${getVehicleLabel(target.vin, target.licensePlate)} เสร็จ (${progress.completed}/${progress.total} คัน)`, 'success');
        }
      } else {
        await updateJobStatus(target.jobId, 'WAITING_APPROVAL');
        showToast(`🎉 ส่งงานรถสไลด์ ${target.jobNumber} เสร็จเรียบร้อย! รอสาขาตรวจรับ`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง', 'error');
      throw e;
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

  // ─── Render item card ──
  const renderItemCard = (card: SupplierItemCard) => {
    const isSubmitting = submittingId === card.itemId;
    const isPending = card.itemStatus === 'PENDING' && ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(card.jobStatus);
    const isCompleted = card.itemStatus === 'COMPLETED' || card.itemStatus === 'APPROVED';
    const isApproved = card.itemStatus === 'APPROVED' ||
      (card.itemStatus === 'COMPLETED' && ['APPROVED', 'INVOICED'].includes(card.jobStatus));
    const isRejected = card.itemStatus === 'REJECTED';

    return (
      <div
        key={card.itemId}
        className={`p-4 rounded-2xl bg-white border shadow-xs transition-all overflow-hidden ${
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
                <p className="text-sm font-bold text-gray-900">{getVehicleLabel(card.vin, card.licensePlate)}</p>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  card.washType === 'DEEP_CLEAN'
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : card.washType === 'POLISH'
                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                    : 'bg-gray-50 text-gray-600 border border-gray-100'
                }`}>
                  {card.washType === 'STANDARD' ? 'ล้างปกติ' : card.washType === 'DEEP_CLEAN' ? 'ล้างเชิงลึก' : card.washType === 'POLISH' ? 'ขัดเคลือบ' : 'ล้างรถ'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[200px]">
                {card.vehicleModel || 'รถยนต์'} {card.vehicleColor ? `• ${card.vehicleColor}` : ''}
                <span className="font-mono"> • VIN ...{card.vin.slice(-6)}</span>
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
        <div className="flex items-center justify-between mb-3 gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 min-w-0 overflow-hidden">
            <Hash className="w-3 h-3 shrink-0 text-gray-400" />
            <span className="font-mono font-semibold text-gray-700 shrink-0">{card.jobNumber}</span>
            <span>•</span>
            {isAll && (
              <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded-full font-medium truncate max-w-[140px]" title={card.supplierName}>
                🏢 {card.supplierName}
              </span>
            )}
            {!isAll && (
              <span className="truncate">{card.branchName}</span>
            )}
          </div>
          {/* Job breakdown — status of every car in this job (only non-zero shown) */}
          {card.totalItemsInJob > 1 && (() => {
            const counts: Record<string, number> = {};
            (card.job.carWashItems || []).forEach(it => {
              const tab = classifySupplierItem(it.status, card.jobStatus);
              if (tab) counts[tab] = (counts[tab] || 0) + 1;
            });
            const chips = [
              { key: 'approved', label: 'ตรวจแล้ว', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { key: 'waiting', label: 'รอตรวจ', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
              { key: 'progress', label: 'รอทำ', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
              { key: 'returned', label: 'ตีกลับ', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
              { key: 'declined', label: 'ปฏิเสธ', cls: 'bg-red-50 text-red-700 border-red-200' },
            ].filter(c => counts[c.key]);
            return (
              <div className="flex items-center gap-1 shrink-0" title={`ใบงานนี้มีทั้งหมด ${card.totalItemsInJob} คัน`}>
                {chips.map(c => (
                  <span key={c.key} className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap ${c.cls}`}>
                    {c.label} {counts[c.key]}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {/* PENDING items: Show submit + reject */}
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => handleOpenRejectModalForWash(card)}
                className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span>ปฏิเสธ</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenPhotoModalForWash(card)}
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
          {card.itemStatus === 'COMPLETED' && ['IN_PROGRESS', 'WAITING_APPROVAL'].includes(card.jobStatus) && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">
              <Clock className="w-4 h-4" />
              <span>ส่งงานคันนี้แล้ว • รอตรวจรับ</span>
            </div>
          )}

          {/* APPROVED items (approved per-car, or whole job approved) */}
          {isApproved && (
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
                onClick={() => handleOpenPhotoModalForWash(card)}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 disabled:opacity-50"
              >
                แก้ไข + ส่งใหม่
              </button>
            </div>
          )}

          {/* CANCELLED jobs */}
          {(card.itemStatus === 'CANCELLED' || card.jobStatus === 'CANCELLED') && !isRejected && (
            <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-red-50/80 border border-red-100 text-xs">
              <div className="flex items-center gap-1.5 text-red-700 font-bold">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>ปฏิเสธงานนี้แล้ว</span>
              </div>
              {(card.itemRemarks || card.job.rejectReason) && (
                <span className="text-[11px] text-red-600 truncate">
                  เหตุผล: {card.itemRemarks || card.job.rejectReason}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Render slide job card ──
  const renderSlideJobCard = (job: Job) => {
    const cost = getJobTotalCost(job);
    const isActiveJob = job.status === 'IN_PROGRESS' || job.status === 'PENDING_SUPPLIER';
    const isSubmitting = submittingId === job.id;

    const isPending = isActiveJob;
    const isCompleted = ['WAITING_APPROVAL', 'APPROVED', 'INVOICED'].includes(job.status);
    const isRejected = job.status === 'REJECTED';
    const isCancelled = job.status === 'CANCELLED';

    const singleItem = job.carWashItems && job.carWashItems.length === 1 ? job.carWashItems[0] : null;
    const vehicleCount = job.carWashItems && job.carWashItems.length > 0 ? job.carWashItems.length : (job.vin ? 1 : 0);
    const isMultiCar = vehicleCount > 1;

    // Vehicle info for single vehicle
    const primaryVin = singleItem?.vin || job.vin || '';
    const primaryVehicleObj = vehicles.find(v => v.vin === primaryVin) || (singleItem as any)?.vehicle || job.vehicle;
    const primaryModel = primaryVehicleObj?.model || singleItem?.vehicleModel || '';
    const primaryColor = primaryVehicleObj?.color || singleItem?.vehicleColor || '';
    const primaryPlate = primaryVehicleObj?.licensePlate || singleItem?.licensePlate || '';

    // Navigation targets (Google Maps deep links)
    const loc = getSlideLocations(job);
    const routeText = `${loc.pickupLabel} → ${loc.dropoffLabel}`;
    const showNav = !isCancelled && !['APPROVED', 'INVOICED'].includes(job.status) && (loc.pickup || loc.dropoff);

    return (
      <div
        key={job.id}
        className={`p-4 sm:p-5 rounded-3xl bg-white border transition-all duration-200 shadow-2xs hover:shadow-md overflow-hidden flex flex-col gap-3.5 ${
          isPending
            ? 'border-gray-200/90 hover:border-emerald-300'
            : isCompleted
            ? 'border-emerald-200/70 bg-[#fafdfb]'
            : 'border-red-200/70 bg-[#fdfafb]'
        }`}
      >
        {/* ── Top Row: Job Number Badge, Type & Price ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center gap-1.5 shrink-0">
              <Truck className="w-3.5 h-3.5" />
              <span>{isMultiCar ? `รถสไลด์ (${vehicleCount} คัน)` : 'รถสไลด์'}</span>
            </span>
            <span className="font-mono text-xs text-gray-500 font-semibold truncate">
              #{job.jobNumber}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="text-base font-black font-mono tracking-tight text-[#0f5238]">
              {formatCurrency(cost)}
            </span>
          </div>
        </div>

        {/* ── Vehicle Info Box (Hero content for driver) ── */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8faf9] border border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center shrink-0 text-emerald-800">
            <Car className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            {isMultiCar ? (
              <>
                <p className="text-xs font-bold text-gray-900 truncate">
                  ขนย้ายรถยนต์ทั้งหมด {vehicleCount} คัน
                </p>
                <div className="flex items-center gap-1.5 mt-1 overflow-x-auto scrollbar-none">
                  {job.carWashItems?.map((it, idx) => (
                    <span
                      key={it.id || idx}
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[10px] font-medium text-gray-700 shrink-0"
                    >
                      {getVehicleLabel(it.vin, it.licensePlate)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {primaryModel || 'รถยนต์'}
                  </p>
                  {primaryPlate && (
                    <span className="px-1.5 py-0.2 rounded bg-white text-gray-800 font-bold text-[10px] border border-gray-200 shadow-2xs font-mono">
                      {primaryPlate}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  {primaryColor ? `${primaryColor} • ` : ''}
                  <span className="font-mono">VIN: ...{primaryVin ? primaryVin.slice(-6) : '-'}</span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Route & Navigation Box (Unified Timeline Card) ── */}
        <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-gray-700 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-gray-400" />
              <span>เส้นทางขนส่ง</span>
            </span>
            {job.distance ? (
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200/60">
                ~{job.distance} กม.
              </span>
            ) : null}
          </div>

          {/* Timeline: Origin & Destination */}
          <div className="flex flex-col gap-1.5">
            {/* Origin (Pickup) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ring-4 ring-amber-50" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate" title={loc.pickupLabel}>
                    <span className="text-[10px] text-gray-400 font-normal mr-1">รับ:</span>
                    {loc.pickupLabel}
                  </p>
                </div>
              </div>
              {showNav && loc.pickup && (
                <a
                  href={mapsDirUrl(loc.pickup)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`นำทางไปจุดรับรถ: ${loc.pickupLabel}`}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Navigation className="w-3 h-3 text-amber-600" />
                  <span>นำทาง</span>
                </a>
              )}
            </div>

            {/* Connecting visual line */}
            <div className="w-0.5 h-2 bg-gray-200 ml-1 -my-0.5" />

            {/* Destination (Dropoff) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 ring-4 ring-emerald-50" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate" title={loc.dropoffLabel}>
                    <span className="text-[10px] text-gray-400 font-normal mr-1">ส่ง:</span>
                    {loc.dropoffLabel}
                  </p>
                </div>
              </div>
              {showNav && loc.dropoff && (
                <a
                  href={mapsDirUrl(loc.dropoff)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`นำทางไปจุดส่งรถ: ${loc.dropoffLabel}`}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Flag className="w-3 h-3 text-emerald-600" />
                  <span>นำทาง</span>
                </a>
              )}
            </div>
          </div>

          {/* Full route link */}
          {showNav && loc.pickup && loc.dropoff && (
            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <a
                href={mapsDirUrl(loc.dropoff, loc.pickup)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 transition-colors"
              >
                <span>ดูเส้นทางเต็มบน Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* ── Action Row: Bottom buttons ── */}
        <div className="flex items-center gap-2 pt-1">
          {isActiveJob && (
            <>
              <button
                type="button"
                onClick={() => handleOpenRejectModalForSlide(job)}
                className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span>ปฏิเสธ</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenPhotoModalForSlide(job)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer hover:opacity-90 active:scale-[0.99] shadow-sm disabled:opacity-50"
                style={{ backgroundColor: theme.primary }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ถ่ายรูป + ส่งงาน</span>
              </button>
            </>
          )}

          {isCancelled && (
            <div className="flex-1 flex flex-col gap-1 p-2.5 rounded-xl bg-red-50/80 border border-red-100 text-xs">
              <div className="flex items-center gap-1.5 text-red-700 font-bold">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>ปฏิเสธงานนี้แล้ว</span>
              </div>
              {job.rejectReason && (
                <span className="text-[11px] text-red-600 truncate">
                  เหตุผล: {job.rejectReason}
                </span>
              )}
            </div>
          )}

          {isRejected && (
            <div className="flex-1 flex items-center justify-between gap-2 p-2 rounded-xl bg-red-50 border border-red-200 text-xs">
              <span className="text-red-700 font-medium truncate">
                ⚠️ สาขาขอให้แก้ไข: {job.rejectReason || 'โปรดตรวจสอบ'}
              </span>
              <button
                type="button"
                onClick={() => handleOpenPhotoModalForSlide(job)}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                แก้ไข + ส่งใหม่
              </button>
            </div>
          )}

          {job.status === 'WAITING_APPROVAL' && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60">
              <Clock className="w-4 h-4" />
              <span>ส่งงานแล้ว • รอสาขาตรวจรับ...</span>
            </div>
          )}

          {['APPROVED', 'INVOICED'].includes(job.status) && (
            <div
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border"
              style={{ backgroundColor: theme.badgeBg, color: theme.textPrimary, borderColor: theme.borderSoft }}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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

      {/* Reject Modal */}
      <VendorRejectModal
        target={rejectingTarget}
        onClose={() => setRejectingTarget(null)}
        onConfirm={handleConfirmReject}
      />

      {/* Photo Upload Modal */}
      <VendorSubmitPhotoModal
        target={photoModalTarget}
        onClose={() => setPhotoModalTarget(null)}
        onSubmit={handleSubmitPhotos}
      />
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
