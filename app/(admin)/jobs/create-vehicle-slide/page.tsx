'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import TagSearch from '@/components/ui/TagSearch';
import BranchSelect from '@/components/ui/BranchSelect';
import { CustomDropdown, DropdownOption } from '@/components/ui/CustomDropdown';
import { CompanyCode, Job } from '@/types';
import { haversineDistance } from '@/lib/job-utils';
import {
  calculateSlideJobCost,
  getRecommendedSlideSupplier,
  getBranchDefaultCoords,
  SlideCalculationResult,
} from '@/lib/vehicle-slide-rates';
import { SlideConfirmModal, SlideSuccessModal, CancelJobConfirmModal, SupplierSelector, D365VendorWarning } from '@/components/jobs';
import dynamic from 'next/dynamic';
import { 
  Truck, 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  Search,
  Printer,
  Map,
  Building2,
  ToggleLeft,
  ToggleRight,
  Navigation,
  AlertCircle,
  Loader2,
  Check,
  Minus,
  Lock,
  Sparkles,
  X
} from 'lucide-react';

// Dynamic import to avoid SSR issues with Leaflet
const MapPickerModal = dynamic(() => import('@/components/jobs/MapPickerModal'), { ssr: false });

const getBranchShortLabel = (code?: string, name?: string) => {
  if (code) {
    if (code === 'GI06' || code.startsWith('EV7')) return 'EV7';
    return code;
  }
  return name || 'ต่างสาขา';
};

export default function CreateVehicleSlidePage() {
  const router = useRouter();
  const { 
    currentRole,
    currentCompany,
    currentBranchId, 
    activeBranch, 
    branches, 
    companies,
    suppliers, 
    vehicles, 
    createVehicleSlideJob,
    refreshData,
    updateJobStatus,
    updateCarWashItemStatus,
  } = useApp();
  const { user: authUser } = useAuth();

  // Slide suppliers (handles both array and comma-separated string)
  const slideSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (Array.isArray(s.services)) {
        return s.services.includes('VEHICLE_SLIDE');
      }
      return typeof s.services === 'string' && (s.services as string).includes('VEHICLE_SLIDE');
    });
  }, [suppliers]);

  // Branches filtered by selected company context
  const availableBranches = useMemo(() => {
    if (currentCompany === 'ALL') return branches;
    const companyObj = companies.find(c => c.code === currentCompany);
    if (!companyObj) return branches;
    return branches.filter(b => b.companyId === companyObj.id);
  }, [branches, companies, currentCompany]);

  // Branch selection for Origin
  const [selectedOriginBranchId, setSelectedOriginBranchId] = useState<string>(currentBranchId || availableBranches[0]?.id || branches[0]?.id || '');
  const originBranchObj = branches.find(b => b.id === selectedOriginBranchId);

  // Branch filter for vehicle stock list (defaults to ALL to show cars from all branches)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');

  // All vehicles available for slide (excluding maintenance / out of stock)
  const availableStockVehicles = useMemo(() => {
    return vehicles.filter(v => v.status !== 'MAINTENANCE' && v.status !== 'OUT_OF_STOCK');
  }, [vehicles]);

  // Dropdown options for branch filter
  const branchFilterOptions: DropdownOption[] = useMemo(() => {
    const totalCount = availableStockVehicles.length;
    const allOption: DropdownOption = {
      value: 'ALL',
      label: 'ทุกสาขา (All Branches)',
      badge: `${totalCount} คัน`,
      badgeClass: 'bg-emerald-100 text-emerald-800 font-bold',
      icon: Building2,
    };

    const list: DropdownOption[] = branches
      .map(b => {
        const count = availableStockVehicles.filter(v => v.currentBranchId === b.id).length;
        return {
          value: b.id,
          label: b.name,
          sublabel: b.code ? `รหัส: ${b.code}` : undefined,
          badge: `${count} คัน`,
          badgeClass: count > 0 ? 'bg-gray-100 text-gray-800 font-semibold' : 'bg-gray-50 text-gray-400',
          dot: b.code.startsWith('EV7') || b.code === 'GI06' ? '#0f5238' : '#3b82f6',
        };
      });

    return [allOption, ...list];
  }, [branches, availableStockVehicles]);

  // Auto-switch branch when company changes
  useEffect(() => {
    if (currentRole === 'BRANCH') return;
    if (availableBranches.length > 0 && !availableBranches.find(b => b.id === selectedOriginBranchId)) {
      setSelectedOriginBranchId(availableBranches[0].id);
      setSelectedVins([]);
      setSelectedSupplierId('');
    }
  }, [availableBranches, selectedOriginBranchId, currentRole]);

  // State & Handler for cancelling busy vehicle order (if not verified by supplier yet)
  const [vehicleToCancel, setVehicleToCancel] = useState<(typeof vehicles)[0] | null>(null);
  const [isCancellingBusyJob, setIsCancellingBusyJob] = useState(false);

  const handleOpenCancelModal = (e: React.MouseEvent, vehicle: (typeof vehicles)[0]) => {
    e.stopPropagation();
    const busyJob = vehicle.activeJob;
    if (!busyJob) return;

    if (busyJob.verifiedAt) {
      showToast('ไม่สามารถยกเลิกได้ เนื่องจาก Supplier ได้ถ่ายรูปยืนยันตัวรถแล้ว', 'error');
      return;
    }

    setVehicleToCancel(vehicle);
  };

  const handleConfirmCancelBusyJob = async () => {
    if (!vehicleToCancel) return;
    const busyJob = vehicleToCancel.activeJob;
    if (!busyJob) return;

    setIsCancellingBusyJob(true);
    try {
      if (busyJob.itemId) {
        const res = await updateCarWashItemStatus(busyJob.jobId, busyJob.itemId, 'CANCELLED', 'ยกเลิกโดยผู้ดูแลระบบ');
        if (res) {
          showToast(`✓ ยกเลิกงานรถคัน ${vehicleToCancel.vin} สำเร็จ — ปลดล็อคพร้อมสั่งงานใหม่แล้ว`, 'success');
          setVehicleToCancel(null);
        } else {
          showToast('ไม่สามารถยกเลิกงานสำหรับรถคันนี้ได้', 'error');
        }
      } else {
        const res = await updateJobStatus(busyJob.jobId, 'CANCELLED', { rejectReason: 'ยกเลิกโดยผู้ดูแลระบบ' });
        if (res.success) {
          showToast(`✓ ยกเลิกงานรถคัน ${vehicleToCancel.vin} สำเร็จ — ปลดล็อคพร้อมสั่งงานใหม่แล้ว`, 'success');
          setVehicleToCancel(null);
        } else {
          showToast(res.error || 'ไม่สามารถยกเลิกงานสำหรับรถคันนี้ได้', 'error');
        }
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsCancellingBusyJob(false);
    }
  };



  // Auto-fill requester from logged-in user
  const autoName = authUser?.firstName && authUser?.lastName 
    ? `${authUser.firstName} ${authUser.lastName}` 
    : authUser?.displayName || 'เจ้าหน้าที่สาขาต้นทาง';

  // Form State
  const [selectedVins, setSelectedVins] = useState<string[]>([]);
  const [destBranchId, setDestBranchId] = useState<string>(
    availableBranches.find(b => b.id !== selectedOriginBranchId)?.id || branches.find(b => b.id !== selectedOriginBranchId)?.id || ''
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [pickupDateTime, setPickupDateTime] = useState<string>(
    new Date(Date.now() + 3600 * 1000 * 2).toISOString().slice(0, 16)
  );
  const [deliveryDateTime, setDeliveryDateTime] = useState<string>(
    new Date(Date.now() + 3600 * 1000 * 6).toISOString().slice(0, 16)
  );
  const [contactPerson, setContactPerson] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [requestedBy, setRequestedBy] = useState<string>(autoName);
  const [requesterPosition, setRequesterPosition] = useState<string>(authUser?.position || '');
  const [requesterPhone, setRequesterPhone] = useState<string>(authUser?.phone || '');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [distance, setDistance] = useState<number>(32);
  const [pricingCalculation, setPricingCalculation] = useState<SlideCalculationResult | null>(null);
  const [isCustomPrice, setIsCustomPrice] = useState(false);

  // ── Hybrid Destination Mode ──
  const [destMode, setDestMode] = useState<'branch' | 'custom'>('branch');
  const [customDest, setCustomDest] = useState<{
    lat: number;
    lng: number;
    address: string;
    distance: number;
  } | null>(null);

  // ── Hybrid Pickup (Origin) Mode ──
  // 'branch' = รับรถที่สาขาต้นทาง, 'custom' = ปักหมุดจุดรับรถเอง (เช่น รถจอดอยู่ลานนอกสาขา)
  const [originMode, setOriginMode] = useState<'branch' | 'custom'>('branch');
  const [customOrigin, setCustomOrigin] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);

  // Which point the map picker is currently editing (null = closed)
  // 'branch' = แก้พิกัดถาวรของสาขาต้นทาง (บันทึกลงฐานข้อมูลสาขา)
  const [mapPickerMode, setMapPickerMode] = useState<'origin' | 'dest' | 'branch' | null>(null);
  const [isSavingBranchPin, setIsSavingBranchPin] = useState(false);
  const canEditBranchPin = currentRole === 'ADMIN' || currentRole === 'MASTER';

  // Search in branch vehicles
  const [searchTags, setSearchTags] = useState<string[]>([]);

  // Created job modal
  const [createdJob, setCreatedJob] = useState<Job | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedVehicles = useMemo(() => {
    return vehicles.filter(v => selectedVins.includes(v.vin));
  }, [vehicles, selectedVins]);

  const selectedSupplier = slideSuppliers.find(s => s.id === selectedSupplierId);
  const destBranch = branches.find(b => b.id === destBranchId);

  // Smart route supplier recommendation (used as recommendation hints, not auto-selected)
  const supplierRecommendation = useMemo(() => {
    return getRecommendedSlideSupplier(
      originBranchObj?.code,
      originBranchObj?.name,
      destMode === 'branch' ? destBranch?.code : null,
      destMode === 'branch' ? destBranch?.name : null
    );
  }, [originBranchObj?.code, originBranchObj?.name, destBranch?.code, destBranch?.name, destMode]);

  // Effective pickup / drop-off coordinates (custom pin overrides branch location)
  const originPoint = useMemo(() => {
    if (originMode === 'custom' && customOrigin) {
      return { lat: customOrigin.lat, lng: customOrigin.lng, name: customOrigin.address.split(',')[0] || 'จุดรับรถ' };
    }
    if (originBranchObj?.latitude && originBranchObj?.longitude) {
      return { lat: originBranchObj.latitude, lng: originBranchObj.longitude, name: originBranchObj.name };
    }
    const fallback = getBranchDefaultCoords(originBranchObj?.code || originBranchObj?.name || selectedOriginBranchId);
    if (fallback) {
      return { lat: fallback.lat, lng: fallback.lng, name: originBranchObj?.name || selectedOriginBranchId };
    }
    return null;
  }, [originMode, customOrigin, originBranchObj?.latitude, originBranchObj?.longitude, originBranchObj?.name, originBranchObj?.code, selectedOriginBranchId]);

  const destPoint = useMemo(() => {
    if (destMode === 'custom') {
      return customDest ? { lat: customDest.lat, lng: customDest.lng, name: customDest.address.split(',')[0] || 'ปลายทาง' } : null;
    }
    if (destBranch?.latitude && destBranch?.longitude) {
      return { lat: destBranch.latitude, lng: destBranch.longitude, name: destBranch.name };
    }
    const fallback = getBranchDefaultCoords(destBranch?.code || destBranch?.name || destBranchId);
    if (fallback) {
      return { lat: fallback.lat, lng: fallback.lng, name: destBranch?.name || destBranchId };
    }
    return null;
  }, [destMode, customDest, destBranch?.latitude, destBranch?.longitude, destBranch?.name, destBranch?.code, destBranchId]);

  // Auto-calculate real road distance whenever pickup or drop-off point changes
  useEffect(() => {
    if (!originPoint || !destPoint) return;
    const straight = haversineDistance(originPoint.lat, originPoint.lng, destPoint.lat, destPoint.lng);
    const initialRoadDist = Math.round(straight * 1.25 * 10) / 10;
    setDistance(initialRoadDist);

    let cancelled = false;
    fetch(`/api/routes/driving?originLat=${originPoint.lat}&originLng=${originPoint.lng}&destLat=${destPoint.lat}&destLng=${destPoint.lng}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.success && data.distanceKm) {
          setDistance(data.distanceKm);
        }
      })
      .catch(err => {
        console.warn('Real driving distance fetch error:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [originPoint?.lat, originPoint?.lng, destPoint?.lat, destPoint?.lng]);

  // Dynamic slide pricing recalculation based on contract matrices
  useEffect(() => {
    if (!selectedSupplierId) {
      setPricingCalculation(null);
      if (!isCustomPrice) {
        setEstimatedCost(0);
      }
      return;
    }

    const result = calculateSlideJobCost({
      supplierCodeOrId: selectedSupplier?.code || selectedSupplierId,
      supplierName: selectedSupplier?.name,
      distanceKm: distance,
      originMode,
      destMode,
      originBranchCode: originBranchObj?.code,
      originBranchName: originBranchObj?.name,
      destBranchCode: destMode === 'branch' ? destBranch?.code : null,
      destBranchName: destMode === 'branch' ? destBranch?.name : null,
      carCount: selectedVins.length || 1,
    });

    setPricingCalculation(result);
    if (!isCustomPrice) {
      setEstimatedCost(result.costPerCar);
    }
  }, [
    selectedSupplier?.code,
    selectedSupplier?.name,
    selectedSupplierId,
    distance,
    originMode,
    destMode,
    originBranchObj?.code,
    originBranchObj?.name,
    destBranch?.code,
    destBranch?.name,
    selectedVins.length,
    isCustomPrice,
  ]);

  const originLabel = originMode === 'custom' && customOrigin
    ? customOrigin.address.split(',').slice(0, 2).join(',')
    : originBranchObj?.name;

  const filteredVehicles = useMemo(() => {
    return availableStockVehicles.filter(v => {
      if (selectedBranchFilter !== 'ALL' && v.currentBranchId !== selectedBranchFilter) {
        return false;
      }
      if (searchTags.length === 0) return true;
      return searchTags.some(q => {
        const term = q.toLowerCase();
        return (
          v.vin.toLowerCase().includes(term) ||
          v.model.toLowerCase().includes(term) ||
          (v.licensePlate && v.licensePlate.toLowerCase().includes(term)) ||
          (v.color && v.color.toLowerCase().includes(term)) ||
          (v.currentBranchName && v.currentBranchName.toLowerCase().includes(term)) ||
          (v.currentBranchCode && v.currentBranchCode.toLowerCase().includes(term))
        );
      });
    });
  }, [availableStockVehicles, selectedBranchFilter, searchTags]);

  // Cars with unfinished work can't be picked (select-all skips them)
  const selectableVehicles = filteredVehicles.filter(v => !v.activeJob);

  // Select all filtered vehicles state and handlers
  const isAllFilteredSelected = selectableVehicles.length > 0 && selectableVehicles.every(v => selectedVins.includes(v.vin));
  const someFilteredSelected = filteredVehicles.some(v => selectedVins.includes(v.vin));

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredVinSet = new Set(filteredVehicles.map(v => v.vin));
      setSelectedVins(prev => {
        const next = prev.filter(vin => !filteredVinSet.has(vin));
        if (next.length === 0 && currentRole === 'BRANCH') {
          const myBranchId = activeBranch?.id || currentBranchId || authUser?.branchId;
          if (myBranchId) setSelectedOriginBranchId(myBranchId);
        }
        return next;
      });
    } else {
      // Check if selectable vehicles come from multiple branches
      const branchIds = Array.from(new Set(selectableVehicles.map(v => v.currentBranchId).filter(Boolean)));
      if (branchIds.length > 1) {
        // Target branch: already selected branch or first branch in list
        const targetBranchId = selectedVins.length > 0
          ? (vehicles.find(v => v.vin === selectedVins[0])?.currentBranchId || branchIds[0])
          : branchIds[0];
        const targetVehicles = selectableVehicles.filter(v => v.currentBranchId === targetBranchId);
        const targetBranchName = branches.find(b => b.id === targetBranchId)?.name || 'สาขาต้นทาง';
        const newVins = new Set([...selectedVins, ...targetVehicles.map(v => v.vin)]);
        setSelectedVins(Array.from(newVins));
        setSelectedOriginBranchId(targetBranchId);
        showToast(`เลือกเฉพาะรถของ ${targetBranchName} (${targetVehicles.length} คัน) เนื่องจากรถสไลด์ 1 เที่ยวต้องรับจากสาขาต้นทางเดียวกัน`, 'info');
      } else if (branchIds.length === 1) {
        setSelectedOriginBranchId(branchIds[0]);
        const newVins = new Set([...selectedVins, ...selectableVehicles.map(v => v.vin)]);
        setSelectedVins(Array.from(newVins));
      }
    }
  };

  const handleToggleVehicle = (vin: string) => {
    const clickedVehicle = vehicles.find(v => v.vin === vin);
    if (!clickedVehicle) return;

    if (!selectedVins.includes(vin)) {
      const busyJob = clickedVehicle.activeJob;
      if (busyJob) {
        showToast(`รถคันนี้มีงานค้างอยู่ (ใบงาน ${busyJob.jobNumber}) — สั่งงานซ้ำได้เมื่องานเดิมเสร็จสิ้น`, 'warning');
        return;
      }

      // If other vehicles are already selected, ensure they are from the same origin branch
      if (selectedVins.length > 0) {
        const firstSelected = vehicles.find(v => v.vin === selectedVins[0]);
        if (firstSelected && firstSelected.currentBranchId !== clickedVehicle.currentBranchId) {
          const firstBranch = branches.find(b => b.id === firstSelected.currentBranchId);
          const clickedBranch = branches.find(b => b.id === clickedVehicle.currentBranchId);
          showToast(
            `รถคันนี้อยู่ที่ ${clickedBranch?.name || clickedVehicle.currentBranchCode || 'สาขาอื่น'} แต่รถที่เลือกไว้ก่อนหน้าอยู่ที่ ${firstBranch?.name || firstSelected.currentBranchCode || 'สาขาต้นทาง'} — รถสไลด์ 1 เที่ยวต้องรับจากสาขาต้นทางเดียวกัน`,
            'warning'
          );
          return;
        }
      } else {
        // First vehicle selected: auto-sync Origin Branch to this vehicle's current location!
        if (clickedVehicle.currentBranchId) {
          setSelectedOriginBranchId(clickedVehicle.currentBranchId);
          // If branch user, and the car is from another branch, default destination to user's branch!
          const myBranchId = activeBranch?.id || currentBranchId || authUser?.branchId;
          if (currentRole === 'BRANCH' && myBranchId && myBranchId !== clickedVehicle.currentBranchId) {
            setDestBranchId(myBranchId);
          }
        }
      }
    }

    setSelectedVins(prev => {
      const next = prev.includes(vin) ? prev.filter(v => v !== vin) : [...prev, vin];
      if (next.length === 0 && currentRole === 'BRANCH') {
        const myBranchId = activeBranch?.id || currentBranchId || authUser?.branchId;
        if (myBranchId) setSelectedOriginBranchId(myBranchId);
      }
      return next;
    });
  };

  const { showToast } = useToast();

  // Save a permanent GPS pin for the origin branch (affects all future jobs)
  const handleSaveBranchPin = async (data: { lat: number; lng: number; address: string }) => {
    if (!originBranchObj) return;
    setIsSavingBranchPin(true);
    try {
      const res = await fetch(`/api/branches/${originBranchObj.id}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: data.lat, longitude: data.lng, address: data.address }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        showToast(result.error || 'บันทึกพิกัดสาขาไม่สำเร็จ', 'error');
        return;
      }
      await refreshData();
      showToast(`บันทึกพิกัดสาขา ${originBranchObj.name} เรียบร้อยแล้ว`, 'success');
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSavingBranchPin(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVins.length === 0) {
      showToast('กรุณาเลือกรถ (VIN) อย่างน้อย 1 คันที่ต้องการสไลด์', 'warning');
      return;
    }
    if (originMode === 'custom' && !customOrigin) {
      showToast('กรุณาปักหมุดจุดรับรถบนแผนที่', 'warning');
      return;
    }
    if (destMode === 'branch') {
      if (!destBranchId) {
        showToast('กรุณาเลือกสาขาปลายทาง', 'warning');
        return;
      }
      if (destBranchId === selectedOriginBranchId && originMode === 'branch') {
        showToast('สาขาปลายทางต้องไม่ซ้ำกับสาขาต้นทาง', 'error');
        return;
      }
    } else {
      if (!customDest) {
        showToast('กรุณาเลือกจุดปลายทางบนแผนที่', 'warning');
        return;
      }
    }
    if (!selectedSupplierId) {
      showToast('กรุณาเลือก Supplier รถสไลด์', 'warning');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSlideJob = async () => {
    setIsSubmitting(true);
    try {
      const matchedCompany = companies.find(c => c.id === originBranchObj?.companyId);
      const companyCode: CompanyCode = (matchedCompany?.code as CompanyCode) || 'EV7';

      const newJob = await createVehicleSlideJob({
        companyCode,
        originBranchId: selectedOriginBranchId,
        destBranchId: destMode === 'branch' ? destBranchId : '',
        supplierId: selectedSupplierId,
        vin: selectedVins[0],
        vins: selectedVins,
        pickupDateTime,
        deliveryDateTime,
        contactPerson,
        contactPhone,
        transferReason,
        requestedBy,
        requesterPosition,
        requesterPhone,
        estimatedCost,
        distance,
        ...(destMode === 'custom' && customDest ? {
          customDestAddress: customDest.address,
          customDestLat: customDest.lat,
          customDestLng: customDest.lng,
        } : {}),
        ...(originMode === 'custom' && customOrigin ? {
          customOriginAddress: customOrigin.address,
          customOriginLat: customOrigin.lat,
          customOriginLng: customOrigin.lng,
        } : {}),
      } as Parameters<typeof createVehicleSlideJob>[0]);

      setShowConfirmModal(false);
      showToast(`บันทึกและสร้างคำขอรถสไลด์เรียบร้อยแล้ว (${selectedVins.length} คัน)!`, 'success');
      if (newJob) setCreatedJob(newJob);
    } catch (err) {
      console.error(err);
      setShowConfirmModal(false);
      showToast(err instanceof Error && err.message ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-600" />
              <span>ขอรถสไลด์ขนส่งรถยนต์ (Vehicle Slide Request)</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              เลือกรถจากสต็อกสาขา กำหนดเส้นทาง เวลา และมอบหมายงานให้ Supplier รถสไลด์
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Choose Supplier & Select VIN */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Step 1: Choose Slide Supplier */}
          <SupplierSelector
            suppliers={slideSuppliers}
            selectedSupplierId={selectedSupplierId}
            onSelect={(id) => {
              setSelectedSupplierId(id);
              setIsCustomPrice(false);
            }}
            serviceType="VEHICLE_SLIDE"
            stepNumber={1}
            title="เลือก Supplier รถสไลด์"
            themeColor="#0f5238"
            recommendedSupplierCode={supplierRecommendation?.recommendedCode}
            recommendationReason={supplierRecommendation?.reason}
          />
          {/* ใบงานสไลด์ผูกกับสาขาต้นทาง → PO เปิดในบริษัทของสาขาต้นทาง */}
          <D365VendorWarning
            supplier={selectedSupplier}
            branch={branches.find(b => b.id === selectedOriginBranchId)}
          />

          {/* Step 2: Select VIN from any branch */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">2</span>
                <span>เลือกรถที่ต้องการสไลด์ (VIN)</span>
              </h2>
              <span className="text-xs text-gray-500">เลือกแล้ว {selectedVins.length} คัน</span>
            </div>

            {/* Filter by Branch */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>สาขาที่รถจอดอยู่:</span>
                </span>
                {selectedBranchFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedBranchFilter('ALL')}
                    className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    ดูรถทุกสาขา ({availableStockVehicles.length} คัน)
                  </button>
                )}
              </label>
              <CustomDropdown
                options={branchFilterOptions}
                value={selectedBranchFilter}
                onChange={(val) => setSelectedBranchFilter(val)}
                placeholder="เลือกสาขาที่รถจอดอยู่"
                className="w-full text-xs"
              />
            </div>

            <TagSearch
              tags={searchTags}
              onTagsChange={setSearchTags}
              placeholder="ค้นหาตาม VIN / รุ่น / ทะเบียน / สาขา... (กด Enter เพื่อเพิ่ม)"
              accentColor="#0f5238"
            />

            {/* Select All Bar */}
            {filteredVehicles.length > 0 && (
              <div className="flex items-center justify-between px-1 py-1 text-xs border-b border-gray-100">
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className="flex items-center gap-2 font-medium text-gray-700 hover:text-emerald-900 transition-colors select-none py-1 group cursor-pointer"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    isAllFilteredSelected
                      ? 'bg-[#0f5238] border-[#0f5238] text-white'
                      : someFilteredSelected
                        ? 'bg-emerald-100 border-[#0f5238] text-[#0f5238]'
                        : 'border-gray-300 group-hover:border-gray-400 bg-white'
                  }`}>
                    {isAllFilteredSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    {!isAllFilteredSelected && someFilteredSelected && <Minus className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="font-semibold text-xs text-gray-800 group-hover:text-emerald-900">
                    {isAllFilteredSelected
                      ? 'ยกเลิกการเลือกทั้งหมด'
                      : `เลือกทั้งหมด (${selectableVehicles.length} คัน)`}
                  </span>
                </button>

                {searchTags.length > 0 && (
                  <span className="text-[11px] text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    ผลการค้นหา {filteredVehicles.length} คัน
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {filteredVehicles.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  {selectedBranchFilter === 'ALL'
                    ? 'ไม่มีรถสถานะพร้อมย้ายในสต็อก หรือไม่ตรงกับการค้นหา'
                    : 'ไม่มีรถสถานะพร้อมย้ายในสาขานี้ หรือไม่ตรงกับการค้นหา'}
                </div>
              ) : (
                filteredVehicles.map(v => {
                  const isSelected = selectedVins.includes(v.vin);
                  const busyJob = v.activeJob;
                  const isWash = busyJob?.jobType === 'CAR_WASH';
                  const myBranchId = activeBranch?.id || currentBranchId || authUser?.branchId;
                  const isMyBranch = myBranchId && v.currentBranchId === myBranchId;
                  const branchDisplay = v.currentBranchName || branches.find(b => b.id === v.currentBranchId)?.name || v.currentBranchCode || 'ไม่ระบุสาขา';

                  return (
                    <div
                      key={v.vin}
                      onClick={() => handleToggleVehicle(v.vin)}
                      title={busyJob ? `รถคันนี้มีงานค้างอยู่: ${busyJob.jobNumber} (${isWash ? 'งานล้างรถ' : 'งานรถสไลด์'})` : undefined}
                      className={`p-3 rounded-xl border transition-all flex items-start gap-3 select-none ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/20 cursor-pointer'
                          : busyJob
                          ? 'border-gray-200/80 bg-gray-50/90 hover:bg-gray-100/60 cursor-not-allowed'
                          : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/20 hover:shadow-2xs cursor-pointer'
                      }`}
                    >
                      {/* Left icon / checkbox */}
                      <div className="pt-0.5 shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : busyJob ? (
                          <div className="w-5 h-5 rounded-lg bg-amber-100/90 text-amber-700 border border-amber-300/70 flex items-center justify-center shadow-2xs">
                            <Lock className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-lg border-2 border-gray-300 hover:border-emerald-500 bg-white transition-colors" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Top row: Primary Identifier (Plate / VIN) & Branch Badge */}
                        <div className="flex items-center justify-between gap-1.5 min-w-0">
                          {v.licensePlate ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-gray-300 text-gray-900 text-xs font-bold shadow-2xs shrink-0 tracking-tight">
                              {v.licensePlate}
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-gray-900 truncate">
                              {v.vin}
                            </span>
                          )}

                          {/* Branch badge */}
                          {(() => {
                            const branchCode = getBranchShortLabel(v.currentBranchCode, v.currentBranchName);
                            const isEv7 = (v as any).companyCode === 'EV7' || branchCode === 'EV7';
                            return (
                              <span 
                                className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 border ${
                                  isEv7
                                    ? 'bg-emerald-50 text-[#0f5238] border-emerald-300'
                                    : 'bg-blue-50 text-blue-700 border-blue-200/80'
                                }`}
                                title={branchDisplay}
                              >
                                {branchCode}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Secondary row: VIN (only shown if license plate exists above) */}
                        {v.licensePlate && (
                          <div className="flex items-center gap-1.5 mt-1 min-w-0">
                            <span className="text-[10px] font-medium text-gray-400 shrink-0">VIN:</span>
                            <span className="font-mono text-[11px] font-semibold text-gray-600 truncate">
                              {v.vin}
                            </span>
                          </div>
                        )}

                        {/* Model & Color */}
                        <div className="flex items-center justify-between gap-1.5 mt-0.5">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {v.model}
                            {v.color && <span className="text-gray-400 font-normal"> · {v.color}</span>}
                          </p>
                        </div>

                        {/* Status tag */}
                        {busyJob ? (
                          <div className="mt-2 flex items-center justify-between gap-2 p-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-50/90 via-amber-50/70 to-orange-50/50 border border-amber-200/80 shadow-2xs">
                            {/* Left: Icon & Details */}
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                                isWash 
                                  ? 'bg-amber-100/90 text-amber-700 border border-amber-200/80' 
                                  : 'bg-sky-100/90 text-sky-700 border border-sky-200/80'
                              }`}>
                                {isWash ? (
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                  <Truck className="w-3.5 h-3.5 text-sky-600" />
                                )}
                              </div>

                              <div className="min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-[11px] text-amber-950 tracking-tight leading-none">
                                    ติดงาน{isWash ? 'ล้างรถ' : 'รถสไลด์'}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold text-amber-900 bg-white/90 px-1.5 py-0.5 rounded-md border border-amber-200/70 leading-none shadow-2xs">
                                    {busyJob.jobNumber}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-800/80 leading-none">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    busyJob.verifiedAt ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                                  }`} />
                                  <span className="font-medium">
                                    {busyJob.verifiedAt ? 'ยืนยันตัวรถแล้ว' : 'รอดำเนินการ'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Cancel Action / Verified badge */}
                            <div className="shrink-0 flex items-center">
                              {currentRole !== 'SUPPLIER' && (
                                busyJob.canCancel !== false && !busyJob.verifiedAt ? (
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenCancelModal(e, v)}
                                    disabled={isCancellingBusyJob && vehicleToCancel?.vin === v.vin}
                                    className="w-7 h-7 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 border border-amber-200/80 hover:border-red-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 group"
                                    title="ยกเลิกคำสั่งงานสำหรับรถคันนี้"
                                    aria-label="ยกเลิกคำสั่งงานสำหรับรถคันนี้"
                                  >
                                    {isCancellingBusyJob && vehicleToCancel?.vin === v.vin ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                    ) : (
                                      <X className="w-3.5 h-3.5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[9px] text-gray-400 italic px-1.5 py-0.5 rounded bg-white/70 border border-amber-200/60" title="Supplier ถ่ายรูปยืนยันตัวรถแล้ว ไม่สามารถยกเลิกได้">
                                    เริ่มงานแล้ว
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>พร้อมย้าย</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Vehicle Card Preview */}
          {selectedVehicles.length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0f5238] to-[#1b4332] text-white shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                  {selectedVehicles.length === 1 ? 'คันที่เลือกจะขนย้าย' : `รถที่เลือกขนย้าย (${selectedVehicles.length} คัน)`}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                  {selectedVehicles.length === 1 ? selectedVehicles[0].vehicleType : `รวม ${selectedVehicles.length} คัน`}
                </span>
              </div>
              {selectedVehicles.length === 1 ? (
                <>
                  <div>
                    <h3 className="text-lg font-bold">{selectedVehicles[0].model}</h3>
                    <p className="font-mono text-xs text-emerald-200 mt-0.5">{selectedVehicles[0].vin}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-emerald-300">สีตัวถัง:</span>
                      <p className="font-semibold">{selectedVehicles[0].color}</p>
                    </div>
                    <div>
                      <span className="text-emerald-300">ทะเบียน:</span>
                      <p className="font-semibold">{selectedVehicles[0].licensePlate || 'ป้ายแดง/ไม่มีทะเบียน'}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedVehicles.map((sv, idx) => (
                    <div key={sv.vin} className="flex items-center justify-between text-xs py-1 border-b border-white/10 last:border-none">
                      <div className="min-w-0 pr-2">
                        <p className="font-mono font-bold truncate">{idx + 1}. {sv.vin}</p>
                        <p className="text-[11px] text-emerald-200 truncate">{sv.model} • {sv.color}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] shrink-0 font-medium">
                        {sv.licensePlate || 'ป้ายแดง'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column 2: Route, Schedule, Cost & Submit */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Step 3: Route & Schedule */}
          <div className="p-6 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">3</span>
              <span>ระบุเส้นทางและกำหนดการเดินทาง</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Origin Branch + Pickup Point */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>สาขาต้นทาง (Origin Branch):</span>
                  {selectedVins.length > 0 && originBranchObj && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ตามตำแหน่งรถที่เลือก ({originBranchObj.code ? originBranchObj.code : originBranchObj.name})
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentRole === 'ADMIN' || selectedVins.length === 0 ? (
                    <BranchSelect
                      branches={branches}
                      value={selectedOriginBranchId}
                      onChange={(id) => { setSelectedOriginBranchId(id); setSelectedVins([]); setSelectedSupplierId(''); setIsCustomPrice(false); }}
                    />
                  ) : (
                    <div
                      className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-emerald-50/70 flex items-center gap-2 text-xs font-bold text-emerald-950 min-w-0"
                      title={originBranchObj?.name ? `${originBranchObj.name} (${originBranchObj.code})` : ''}
                    >
                      <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="truncate flex-1">
                        {originBranchObj?.name ? `${originBranchObj.name} (${originBranchObj.code})` : 'ไม่พบข้อมูลสาขา'}
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                        ตำแหน่งรถ
                      </span>
                    </div>
                  )}

                  {/* Pickup Mode Toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 h-10">
                    <button
                      type="button"
                      onClick={() => setOriginMode('branch')}
                      className={`flex-1 h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        originMode === 'branch'
                          ? 'bg-white text-[#0f5238] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>รับที่สาขา</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOriginMode('custom');
                        // First time: open the map right away, pre-pinned at the branch location
                        if (!customOrigin) setMapPickerMode('origin');
                      }}
                      className={`flex-1 h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        originMode === 'custom'
                          ? 'bg-white text-amber-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>ปักหมุดจุดรับรถ</span>
                    </button>
                  </div>
                </div>

                {/* Branch pickup: show branch address / coordinate status + edit branch pin */}
                {originMode === 'branch' && (
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className={`min-w-0 text-[11px] flex items-center gap-1.5 flex-wrap ${
                      originBranchObj?.latitude && originBranchObj?.longitude ? 'text-gray-600' : 'text-amber-600'
                    }`}>
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${originBranchObj?.latitude && originBranchObj?.longitude ? 'text-emerald-600' : 'text-amber-500'}`} />
                      <span className="truncate flex items-center gap-1.5 flex-wrap">
                        {originBranchObj?.latitude && originBranchObj?.longitude ? (
                          <>
                            <span className="text-gray-700 font-medium">{originBranchObj.address || 'ปักหมุดแล้ว'}</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-200">
                              GPS: {originBranchObj.latitude.toFixed(5)}, {originBranchObj.longitude.toFixed(5)}
                            </span>
                          </>
                        ) : (() => {
                          const fb = getBranchDefaultCoords(originBranchObj?.code || originBranchObj?.name || selectedOriginBranchId);
                          if (fb) {
                            return (
                              <>
                                <span className="text-gray-700 font-medium">{fb.address}</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-200">
                                  GPS: {fb.lat.toFixed(4)}, {fb.lng.toFixed(4)}
                                </span>
                              </>
                            );
                          }
                          return 'สาขานี้ยังไม่มีพิกัด GPS — Supplier จะนำทางได้ไม่แม่น';
                        })()}
                      </span>
                    </div>
                    {canEditBranchPin && originBranchObj && (
                      <button
                        type="button"
                        onClick={() => setMapPickerMode('branch')}
                        disabled={isSavingBranchPin}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
                          originBranchObj.latitude && originBranchObj.longitude
                            ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                        title="แก้พิกัดสาขาถาวร (มีผลกับทุกงานที่ใช้สาขานี้)"
                      >
                        {isSavingBranchPin ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                        <span>{originBranchObj.latitude && originBranchObj.longitude ? 'แก้หมุดสาขา' : 'ปักหมุดสาขา'}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Custom pickup pin */}
                {originMode === 'custom' && (
                  <button
                    type="button"
                    onClick={() => setMapPickerMode('origin')}
                    className={`mt-3 w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all overflow-hidden ${
                      customOrigin
                        ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
                        : 'border-gray-300 bg-gray-50 hover:bg-white hover:border-amber-500'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      customOrigin ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      {customOrigin ? (
                        <>
                          <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-relaxed break-words" title={customOrigin.address}>
                            {customOrigin.address}
                          </p>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {customOrigin.lat.toFixed(5)}, {customOrigin.lng.toFixed(5)}
                          </span>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-semibold text-gray-700">คลิกเพื่อปักหมุดจุดรับรถ</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">ใช้เมื่อรถไม่ได้จอดที่สาขา เช่น ลานจอดสำรอง, บ้านลูกค้า</p>
                        </>
                      )}
                    </div>
                    <Navigation className={`w-4 h-4 flex-shrink-0 ${customOrigin ? 'text-amber-600' : 'text-gray-400'}`} />
                  </button>
                )}
              </div>

              {/* Destination Mode Toggle + Picker */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  ปลายทาง (Destination): *
                </label>

                {/* Mode Toggle */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 mb-3">
                  <button
                    type="button"
                    onClick={() => { setDestMode('branch'); setSelectedSupplierId(''); setIsCustomPrice(false); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      destMode === 'branch'
                        ? 'bg-white text-[#0f5238] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>เลือกสาขา</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDestMode('custom'); setSelectedSupplierId(''); setIsCustomPrice(false); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      destMode === 'custom'
                        ? 'bg-white text-[#0f5238] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>ปักหมุดบนแผนที่</span>
                  </button>
                </div>

                {/* Branch Mode */}
                {destMode === 'branch' && (
                  <BranchSelect
                    branches={branches}
                    value={destBranchId}
                    onChange={(id) => { setDestBranchId(id); setSelectedSupplierId(''); setIsCustomPrice(false); }}
                    disabledIds={selectedOriginBranchId ? { [selectedOriginBranchId]: 'ต้นทาง' } : {}}
                    placeholder="เลือกสาขาปลายทาง"
                  />
                )}

                {/* Custom Map Mode */}
                {destMode === 'custom' && (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setMapPickerMode('dest')}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all overflow-hidden ${
                        customDest
                          ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50'
                          : 'border-gray-300 bg-gray-50 hover:bg-white hover:border-[#0f5238]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        customDest ? 'bg-emerald-100 text-[#0f5238]' : 'bg-gray-200 text-gray-500'
                      }`}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        {customDest ? (
                          <>
                            <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-relaxed break-words" title={customDest.address}>
                              {customDest.address}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-gray-500 font-mono">
                                {customDest.lat.toFixed(4)}, {customDest.lng.toFixed(4)}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700">
                                ~{distance.toFixed(1)} กม.
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-gray-700">คลิกเพื่อเปิดแผนที่</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">เลือกจุดปลายทาง เช่น บ้านลูกค้า, อู่ซ่อม ฯลฯ</p>
                          </>
                        )}
                      </div>
                      <Navigation className={`w-4 h-4 flex-shrink-0 ${
                        customDest ? 'text-emerald-600' : 'text-gray-400'
                      }`} />
                    </button>

                    {/* Distance & Cost Preview */}
                    {customDest && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-[#f4f9f5] border border-emerald-950/10">
                          <p className="text-[10px] text-gray-500 font-semibold">ระยะทาง</p>
                          <p className="text-sm font-bold text-[#0f5238]">{distance.toFixed(1)} กม.</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#f4f9f5] border border-emerald-950/10">
                          <p className="text-[10px] text-gray-500 font-semibold">ค่าบริการ (ประมาณ)</p>
                          <p className="text-sm font-bold text-[#0f5238]">
                            {selectedSupplierId ? `฿${(pricingCalculation?.costPerCar ?? estimatedCost).toLocaleString()}` : 'รอเลือก Supplier'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Distance & Cost */}
              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label className="block text-xs font-semibold text-gray-700 whitespace-nowrap">
                    ระยะทาง (Distance): <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">คำนวณตามเส้นทาง</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={distance === 0 ? '' : distance}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setDistance(val);
                    }}
                    placeholder="เช่น 35"
                    required
                    className="w-full h-10 pl-3 pr-12 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#0f5238] outline-none bg-white transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-semibold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                    กม.
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label className="block text-xs font-semibold text-gray-700 whitespace-nowrap">
                    ค่าใช้จ่าย (Cost): <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPrice(false);
                      if (pricingCalculation) {
                        setEstimatedCost(pricingCalculation.costPerCar);
                      }
                    }}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap max-w-[210px] truncate ${
                      isCustomPrice
                        ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                        : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200/80'
                    }`}
                    title={isCustomPrice ? 'คลิกเพื่อรีเซ็ตกลับเป็นราคาตามสัญญา' : 'ราคาคำนวณตามสัญญาของ Supplier นี้'}
                  >
                    {isCustomPrice ? '↺ คืนค่าสัญญา' : (pricingCalculation?.formulaBadge || (selectedSupplierId ? 'คำนวณตามสัญญา' : 'กรุณาเลือก Supplier'))}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={estimatedCost === 0 ? '' : estimatedCost}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setEstimatedCost(val);
                      setIsCustomPrice(true);
                    }}
                    placeholder="เช่น 1600"
                    required
                    className="w-full h-10 pl-3 pr-14 rounded-xl border border-gray-200 text-xs font-bold text-[#0f5238] focus:ring-2 focus:ring-[#0f5238] outline-none bg-white transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    บาท
                  </div>
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                  {selectedVins.length > 1 && (
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      ต่อคัน (รวม {selectedVins.length} คัน = ฿{(estimatedCost * selectedVins.length).toLocaleString()})
                    </p>
                  )}
                  {!selectedSupplierId ? (
                    <p className="text-[10px] text-amber-600 font-medium">
                      ⚠️ กรุณาเลือก Supplier รถสไลด์ในขั้นตอนที่ 1 เพื่อคำนวณอัตราค่าบริการตามสัญญา
                    </p>
                  ) : pricingCalculation ? (
                    <p className="text-[10px] text-gray-500 leading-tight">
                      💡 {pricingCalculation.formulaDetail}
                    </p>
                  ) : null}
                  {pricingCalculation?.isSpecialQuote && (
                    <div className="mt-1 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>ระยะทางเกิน 1,000 กม. กรุณาติดต่อขอราคาพิเศษ</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pickup Time */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  วันและเวลารับรถ (Pickup Date/Time): *
                </label>
                <input
                  type="datetime-local"
                  value={pickupDateTime}
                  onChange={(e) => setPickupDateTime(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  กำหนดเวลาส่งมอบ (Estimated Delivery): *
                </label>
                <input
                  type="datetime-local"
                  value={deliveryDateTime}
                  onChange={(e) => setDeliveryDateTime(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ชื่อผู้ติดต่อปลายทาง: *
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                  placeholder="เช่น คุณสมชาย (ผู้จัดการสาขา)"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  เบอร์โทรผู้ติดต่อ: *
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  placeholder="เช่น 08x-xxx-xxxx"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>

              {/* Reason */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  เหตุผลการย้ายรถ: *
                </label>
                <textarea
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                  placeholder="เช่น ย้ายสต็อกตามใบจองลูกค้า, รถทดลองขับสาขา, ส่งซ่อมด่วน..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100 mt-2">
              <div>
                <p className="text-xs text-gray-600">
                  <span className="text-gray-500">Supplier:</span>{' '}
                  <span className="font-bold text-gray-900">{selectedSupplier?.name || '-'}</span>
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  <span className="text-gray-500">เส้นทาง:</span>{' '}
                  <span className="font-semibold text-gray-800">
                    {originLabel} &rarr;{' '}
                    {destMode === 'branch'
                      ? destBranch?.name
                      : customDest
                        ? customDest.address.split(',').slice(0, 2).join(',')
                        : 'ยังไม่ได้เลือกจุดปลายทาง'}
                  </span>
                  {distance > 0 && <span className="text-gray-400 ml-1 font-normal">({distance} กม.)</span>}
                </p>
                {selectedVins.length > 0 && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    เลือก {selectedVins.length} คัน &bull; ฿{estimatedCost.toLocaleString()}/คัน{' '}
                    {selectedVins.length > 1 && (
                      <span className="font-bold">(รวม ฿{(estimatedCost * selectedVins.length).toLocaleString()})</span>
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#0f5238] text-white text-xs font-bold hover:bg-[#0a3d28] shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกและส่งมอบหมายงานรถสไลด์</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Alert Modal */}
      <SlideConfirmModal
        isOpen={showConfirmModal}
        isSubmitting={isSubmitting}
        selectedVins={selectedVins}
        originLabel={originLabel || ''}
        destLabel={destMode === 'branch' ? (destBranch?.name || '') : (customDest?.address || '')}
        distance={distance}
        supplierName={selectedSupplier?.name || ''}
        pickupDateTime={pickupDateTime}
        estimatedCost={estimatedCost}
        formulaBadge={pricingCalculation?.formulaBadge}
        formulaDetail={pricingCalculation?.formulaDetail}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSlideJob}
      />

      {/* Confirmation Modal */}
      <SlideSuccessModal
        createdJob={createdJob}
        selectedVins={selectedVins}
        distance={distance}
        estimatedCost={estimatedCost}
        formulaBadge={pricingCalculation?.formulaBadge}
        onClose={() => setCreatedJob(null)}
      />

      {/* Map Picker Modal — shared for pickup pin, destination pin and branch pin */}
      <MapPickerModal
        isOpen={mapPickerMode !== null}
        onClose={() => setMapPickerMode(null)}
        mode={mapPickerMode === 'dest' ? 'dest' : 'origin'}
        onConfirm={(data) => {
          if (mapPickerMode === 'branch') {
            handleSaveBranchPin(data);
          } else if (mapPickerMode === 'origin') {
            setCustomOrigin({ lat: data.lat, lng: data.lng, address: data.address });
          } else {
            setCustomDest(data);
          }
          if (typeof data.distance === 'number' && data.distance > 0) {
            setDistance(data.distance);
          }
        }}
        {...(mapPickerMode === 'branch'
          ? {
              // Edit the branch's permanent location — start from current branch pin
              pointLabel: `ตำแหน่งสาขา ${originBranchObj?.name || ''}`.trim(),
              originLat: destPoint?.lat ?? originPoint?.lat,
              originLng: destPoint?.lng ?? originPoint?.lng,
              originName: destPoint?.name || originBranchObj?.name || 'สาขาต้นทาง',
              referenceCaption: destPoint ? 'ปลายทาง' : 'ตำแหน่งเดิม',
              initialLat: originBranchObj?.latitude ?? originPoint?.lat,
              initialLng: originBranchObj?.longitude ?? originPoint?.lng,
            }
          : mapPickerMode === 'origin'
          ? {
              // Reference = drop-off if known, otherwise the origin branch
              originLat: destPoint?.lat ?? originPoint?.lat,
              originLng: destPoint?.lng ?? originPoint?.lng,
              originName: destPoint?.name || originBranchObj?.name || 'สาขาต้นทาง',
              referenceCaption: destPoint ? 'ปลายทาง' : 'สาขาต้นทาง',
              // Start from the existing job pin, or from the branch location so the user just drags it
              initialLat: customOrigin?.lat ?? originPoint?.lat,
              initialLng: customOrigin?.lng ?? originPoint?.lng,
            }
          : {
              originLat: originPoint?.lat,
              originLng: originPoint?.lng,
              originName: originPoint?.name || originBranchObj?.name || 'สาขาต้นทาง',
              referenceCaption: originMode === 'custom' && customOrigin ? 'จุดรับรถ' : 'สาขาต้นทาง',
              initialLat: customDest?.lat ?? originPoint?.lat,
              initialLng: customDest?.lng ?? originPoint?.lng,
            })}
      />

      {/* Cancel Busy Vehicle Modal */}
      <CancelJobConfirmModal
        isOpen={Boolean(vehicleToCancel)}
        onClose={() => setVehicleToCancel(null)}
        onConfirm={handleConfirmCancelBusyJob}
        isLoading={isCancellingBusyJob}
        jobNumber={vehicleToCancel?.activeJob?.jobNumber}
        vin={vehicleToCancel?.vin}
        vehicleModel={vehicleToCancel?.model}
        vehicleColor={vehicleToCancel?.color}
        licensePlate={vehicleToCancel?.licensePlate}
        warningMessage="เมื่อยกเลิกแล้ว รถจะถูกปลดล็อคให้สั่งงานใหม่ได้ทันที"
      />
    </div>
  );
}
