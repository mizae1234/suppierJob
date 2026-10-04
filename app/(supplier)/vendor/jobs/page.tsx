'use client';

import React, { useMemo, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
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
  AlertTriangle,
  X,
  Car,
  Hash,
  Send,
  ImagePlus,
  Trash2,
  Navigation,
  Flag,
  Route,
  ExternalLink,
} from 'lucide-react';

type TabKey = 'progress' | 'waiting' | 'approved' | 'rejected';

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

// ─── Evidence photo compression ──
// Photos are stored as base64 in the DB, so shrink them on-device before upload.
// A 4–8 MB phone photo becomes ~200–400 KB while staying clear enough as evidence.
const MAX_PHOTO_DIMENSION = 1600;
const PHOTO_JPEG_QUALITY = 0.8;
const MAX_RAW_FILE_SIZE = 20 * 1024 * 1024;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl); // Unsupported format (e.g. HEIC on desktop) — keep original
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
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

// ─── Unified Modal Target for submission & rejection ──
interface WorkModalTarget {
  type: 'CAR_WASH' | 'VEHICLE_SLIDE';
  jobId: string;
  jobNumber: string;
  itemId?: string; // Car Wash only
  vin: string;
  vehicleModel?: string;
  vehicleColor?: string;
  licensePlate?: string;
  serviceType: string;
  serviceLabel: string;
  unitPrice: number;
  branchName: string;
  routeText?: string;
  rejectReason?: string;
  job: Job;
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
  const initialTab: TabKey = rawTab === 'new' ? 'progress' : (rawTab as TabKey) || 'progress';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Rejection modal state
  const [rejectingTarget, setRejectingTarget] = useState<WorkModalTarget | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // Submit progress state (itemId for car wash, jobId for vehicle slide)
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Photo upload modal state
  const [photoModalTarget, setPhotoModalTarget] = useState<WorkModalTarget | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; file: File }[]>([]);
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presetReasons = rejectingTarget?.type === 'VEHICLE_SLIDE'
    ? [
        'คิวงานเต็ม / คนขับไม่พอ',
        'เกินเวลาทำการ',
        'รถสไลด์ซ่อมบำรุง / ไม่พร้อม',
        'ระยะทางเกินพื้นที่ให้บริการ',
        'รถไม่อยู่ในจุดนัดหมาย',
      ]
    : [
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

  // ─── Flatten CAR_WASH jobs with items into item-level cards ──
  const allItemCards: SupplierItemCard[] = useMemo(() => {
    const cards: SupplierItemCard[] = [];

    myJobs.forEach(job => {
      // ONLY CAR_WASH jobs should be flattened into car wash item cards
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

  // ─── Vehicle Slide jobs (ALL slide jobs, whether single or multi-car) ──
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
    setUploadedPhotos([]);
    setPhotoCaption('');
  };

  const handleOpenPhotoModalForSlide = (job: Job) => {
    setPhotoModalTarget(slideJobToTarget(job));
    setUploadedPhotos([]);
    setPhotoCaption('');
  };

  // ─── Open reject modal handlers ──
  const handleOpenRejectModalForWash = (card: SupplierItemCard) => {
    setRejectingTarget(itemCardToTarget(card));
    setRejectReason('');
  };

  const handleOpenRejectModalForSlide = (job: Job) => {
    setRejectingTarget(slideJobToTarget(job));
    setRejectReason('');
  };

  // ─── Handle file selection (camera / gallery) — no limit on photo count ──
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > MAX_RAW_FILE_SIZE) {
        showToast('ไฟล์ขนาดเกิน 20MB กรุณาเลือกไฟล์ที่เล็กกว่า', 'error');
        return;
      }

      compressImage(file)
        .then(url => setUploadedPhotos(prev => [...prev, { url, file }]))
        .catch(() => showToast(`อ่านไฟล์ ${file.name} ไม่สำเร็จ`, 'error'));
    });

    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [showToast]);

  // ─── Remove a photo ──
  const handleRemovePhoto = useCallback((index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ─── Handle submit (Car Wash item or Vehicle Slide job) — requires photos ──
  const handleSubmitWork = async () => {
    if (!photoModalTarget) return;
    if (uploadedPhotos.length === 0) {
      showToast('กรุณาถ่ายรูปหรือแนบรูปอย่างน้อย 1 รูป', 'error');
      return;
    }

    const target = photoModalTarget;
    const currentId = target.type === 'CAR_WASH' ? target.itemId! : target.jobId;
    setSubmittingId(currentId);

    try {
      // Add each photo as evidence (sequential, with progress for large batches)
      for (let i = 0; i < uploadedPhotos.length; i++) {
        setUploadProgress({ done: i, total: uploadedPhotos.length });
        const defaultCaption = target.type === 'CAR_WASH'
          ? `ล้างรถเสร็จเรียบร้อย — ${target.vin} (${i + 1}/${uploadedPhotos.length})`
          : `ส่งมอบรถสไลด์เรียบร้อย — ${target.vin} (${i + 1}/${uploadedPhotos.length})`;

        await addJobEvidence(target.jobId, {
          photoUrl: uploadedPhotos[i].url,
          caption: photoCaption || defaultCaption,
          evidenceType: 'AFTER',
          vin: target.vin,
        });
      }
      setUploadProgress(null);

      // Update status depending on whether target has itemId (per-item) or is whole job
      if (target.itemId) {
        const progress = await updateCarWashItemStatus(target.jobId, target.itemId, 'COMPLETED');

        if (progress?.allCompleted) {
          showToast(`🎉 ส่งงานรถคัน ${target.vin.slice(-6)} เสร็จ — ใบงาน ${target.jobNumber} ครบทุกคันแล้ว! รอสาขาตรวจรับ`, 'success');
        } else if (progress) {
          showToast(`✅ ส่งงานรถคัน ${target.vin.slice(-6)} เสร็จ (${progress.completed}/${progress.total} คัน)`, 'success');
        }
      } else {
        // Single vehicle slide without items: update job status to WAITING_APPROVAL
        await updateJobStatus(target.jobId, 'WAITING_APPROVAL');
        showToast(`🎉 ส่งงานรถสไลด์ ${target.jobNumber} เสร็จเรียบร้อย! รอสาขาตรวจรับ`, 'success');
      }

      setPhotoModalTarget(null);
      setUploadedPhotos([]);
      setPhotoCaption('');
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง', 'error');
    } finally {
      setSubmittingId(null);
      setUploadProgress(null);
    }
  };

  // ─── Handle reject (per-item for item cards, or entire job for slide jobs) ──
  const handleConfirmReject = async () => {
    if (!rejectingTarget) return;
    setIsSubmittingReject(true);
    try {
      const reason = rejectReason.trim() || 'Supplier ปฏิเสธรายการนี้';

      if (rejectingTarget.itemId) {
        await updateCarWashItemStatus(rejectingTarget.jobId, rejectingTarget.itemId, 'CANCELLED', reason);
        showToast(`ปฏิเสธรถคัน ${rejectingTarget.vin.slice(-6)} เรียบร้อยแล้ว`, 'info');
      } else {
        await updateJobStatus(rejectingTarget.jobId, 'CANCELLED', { rejectReason: reason });
        showToast(`ปฏิเสธงานรถสไลด์ ${rejectingTarget.jobNumber} เรียบร้อยแล้ว`, 'info');
      }

      setRejectingTarget(null);
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
    const isSubmitting = submittingId === card.itemId;
    const isPending = card.itemStatus === 'PENDING' && ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(card.jobStatus);
    const isCompleted = card.itemStatus === 'COMPLETED';
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
                <p className="text-sm font-bold text-gray-900 font-mono">{card.vin.slice(-6)}</p>
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
                onClick={() => handleOpenPhotoModalForWash(card)}
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
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[10px] font-mono font-medium text-gray-700 shrink-0"
                    >
                      {it.vin.slice(-6)}
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

      {/* Reject Modal (Car Wash Item or Vehicle Slide Job) */}
      {rejectingTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header — Clean Red Banner (fixed at top) */}
            <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-red-50 to-white shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {rejectingTarget.type === 'VEHICLE_SLIDE' ? 'ปฏิเสธงานรถสไลด์' : 'ปฏิเสธรถคันนี้'}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {rejectingTarget.type === 'VEHICLE_SLIDE'
                        ? 'ระบบจะแจ้งเตือนสาขาผู้สั่งงาน'
                        : 'คันอื่นในใบงานเดียวกันไม่ได้รับผลกระทบ'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectingTarget(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Compact Vehicle Info */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs text-xs">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  rejectingTarget.type === 'VEHICLE_SLIDE' ? 'bg-purple-50 text-purple-500' : 'bg-sky-50 text-sky-500'
                }`}>
                  {rejectingTarget.type === 'VEHICLE_SLIDE' ? <Truck className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 truncate">
                    {rejectingTarget.vehicleModel || 'รถยนต์'}
                    {rejectingTarget.licensePlate && <span className="text-gray-500 font-normal"> • {rejectingTarget.licensePlate}</span>}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">{rejectingTarget.jobNumber}</p>
                </div>
                <span className="text-xs font-bold text-gray-900 font-mono shrink-0">฿{rejectingTarget.unitPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Scrollable Body — Reason Selection */}
            <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
              {/* Quick Reasons as Compact List */}
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">เลือกเหตุผล</p>
                <div className="flex flex-col gap-1.5">
                  {presetReasons.map(r => {
                    const isSelected = rejectReason === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRejectReason(isSelected ? '' : r)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-50 border-red-300 text-red-700 font-bold border'
                            : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-700 border'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Reason */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  หรือระบุเหตุผลเอง
                </label>
                <textarea
                  value={presetReasons.includes(rejectReason) ? '' : rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="พิมพ์เหตุผลเพิ่มเติม..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-red-400 focus:border-red-300 focus:outline-none resize-none bg-gray-50 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Buttons — Sticky at bottom */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 bg-white shrink-0 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingTarget(null)}
                disabled={isSubmittingReject}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject || !rejectReason.trim()}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {isSubmittingReject ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>{isSubmittingReject ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload + Submit Modal */}
      {photoModalTarget && (
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
                    {photoModalTarget.type === 'VEHICLE_SLIDE' ? (
                      <Truck className="w-5 h-5" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {photoModalTarget.type === 'VEHICLE_SLIDE' ? 'ส่งงานรถสไลด์' : 'ส่งงานรถคันนี้'}
                    </h3>
                    <p className="text-[11px] text-gray-500">ถ่ายรูปหลักฐานก่อนส่งงาน</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoModalTarget(null);
                    setUploadedPhotos([]);
                    setPhotoCaption('');
                  }}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Vehicle Info Card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  photoModalTarget.type === 'VEHICLE_SLIDE'
                    ? 'bg-purple-50 text-purple-600'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {photoModalTarget.type === 'VEHICLE_SLIDE' ? (
                    <Truck className="w-4 h-4" />
                  ) : (
                    <Car className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 font-mono">{photoModalTarget.vin}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                      photoModalTarget.type === 'VEHICLE_SLIDE'
                        ? 'bg-purple-50 text-purple-700 border border-purple-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {photoModalTarget.serviceLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {photoModalTarget.vehicleModel || (photoModalTarget.type === 'VEHICLE_SLIDE' ? 'รถสไลด์ขนส่ง' : 'รถยนต์')}
                    {photoModalTarget.vehicleColor ? ` • ${photoModalTarget.vehicleColor}` : ''}
                    {photoModalTarget.licensePlate ? ` • ${photoModalTarget.licensePlate}` : ''}
                    <span className="ml-1 font-mono text-gray-400">#{photoModalTarget.jobNumber}</span>
                  </p>
                  {photoModalTarget.routeText && (
                    <p className="text-[10px] text-gray-600 mt-0.5 truncate">
                      📍 {photoModalTarget.routeText}
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold font-mono shrink-0" style={{ color: theme.primary }}>
                  ฿{photoModalTarget.unitPrice.toLocaleString()}
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
                  <span className="text-[10px] text-gray-400">{uploadedPhotos.length > 0 ? `${uploadedPhotos.length} รูป` : 'ถ่ายได้ไม่จำกัด'}</span>
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
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100"
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
                    className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-700 transition-all cursor-pointer active:scale-[0.98]"
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
                    className="flex-1 flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-600 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs font-bold">เลือกจากอัลบั้ม</span>
                    <span className="text-[9px] text-gray-400">เลือกได้หลายรูปพร้อมกัน</span>
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
                  placeholder={
                    photoModalTarget.type === 'VEHICLE_SLIDE'
                      ? 'เช่น ขนส่งและส่งมอบรถเรียบร้อย สภาพรถปกติ...'
                      : 'เช่น ล้างรถเสร็จเรียบร้อย ทำความสะอาดภายใน...'
                  }
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
                onClick={handleSubmitWork}
                disabled={
                  uploadedPhotos.length === 0 ||
                  submittingId === (photoModalTarget.type === 'CAR_WASH' ? photoModalTarget.itemId : photoModalTarget.jobId)
                }
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-95 active:scale-[0.98]"
                style={{ backgroundColor: uploadedPhotos.length > 0 ? theme.primary : '#9ca3af' }}
              >
                {submittingId === (photoModalTarget.type === 'CAR_WASH' ? photoModalTarget.itemId : photoModalTarget.jobId) ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {uploadProgress
                        ? `กำลังอัปโหลดรูป ${uploadProgress.done + 1}/${uploadProgress.total}...`
                        : 'กำลังส่งงาน...'}
                    </span>
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
