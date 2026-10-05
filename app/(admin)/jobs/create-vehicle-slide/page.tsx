'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import TagSearch from '@/components/ui/TagSearch';
import BranchSelect from '@/components/ui/BranchSelect';
import { CompanyCode, Job } from '@/types';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
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
  Minus
} from 'lucide-react';

// Dynamic import to avoid SSR issues with Leaflet
const MapPickerModal = dynamic(() => import('@/components/jobs/MapPickerModal'), { ssr: false });

// Haversine formula: calculate distance between two GPS coordinates in kilometers
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateSlideCost(distanceKm: number): number {
  return Math.round(distanceKm * 50);
}

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
  } = useApp();
  const { user: authUser } = useAuth();

  // Slide suppliers
  const slideSuppliers = suppliers.filter(s => s.services.includes('VEHICLE_SLIDE'));

  // Branches filtered by selected company context
  const availableBranches = useMemo(() => {
    if (currentCompany === 'ALL') return branches;
    const companyObj = companies.find(c => c.code === currentCompany);
    if (!companyObj) return branches;
    return branches.filter(b => b.companyId === companyObj.id);
  }, [branches, companies, currentCompany]);

  // Branch selection — Admin/Master pick from available branches
  const [selectedOriginBranchId, setSelectedOriginBranchId] = useState<string>(currentBranchId || availableBranches[0]?.id || branches[0]?.id || '');
  const originBranchObj = branches.find(b => b.id === selectedOriginBranchId);

  // Auto-switch branch when company changes
  useEffect(() => {
    if (currentRole === 'BRANCH') return;
    if (availableBranches.length > 0 && !availableBranches.find(b => b.id === selectedOriginBranchId)) {
      setSelectedOriginBranchId(availableBranches[0].id);
      setSelectedVins([]);
    }
  }, [availableBranches, selectedOriginBranchId, currentRole]);

  // Vehicles at selected origin branch (busy cars are listed but locked — see activeJob)
  const branchStockVehicles = useMemo(() => {
    return vehicles.filter(v => v.currentBranchId === selectedOriginBranchId && v.status !== 'MAINTENANCE');
  }, [vehicles, selectedOriginBranchId]);

  // Auto-fill requester from logged-in user
  const autoName = authUser?.firstName && authUser?.lastName 
    ? `${authUser.firstName} ${authUser.lastName}` 
    : authUser?.displayName || 'เจ้าหน้าที่สาขาต้นทาง';

  // Form State
  const [selectedVins, setSelectedVins] = useState<string[]>([]);
  const [destBranchId, setDestBranchId] = useState<string>(
    availableBranches.find(b => b.id !== selectedOriginBranchId)?.id || branches.find(b => b.id !== selectedOriginBranchId)?.id || ''
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(slideSuppliers[0]?.id || '');
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
  const [estimatedCost, setEstimatedCost] = useState<number>(32 * 50);
  const [distance, setDistance] = useState<number>(32);

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

  // Effective pickup / drop-off coordinates (custom pin overrides branch location)
  const originPoint = useMemo(() => {
    if (originMode === 'custom' && customOrigin) {
      return { lat: customOrigin.lat, lng: customOrigin.lng, name: customOrigin.address.split(',')[0] || 'จุดรับรถ' };
    }
    if (originBranchObj?.latitude && originBranchObj?.longitude) {
      return { lat: originBranchObj.latitude, lng: originBranchObj.longitude, name: originBranchObj.name };
    }
    return null;
  }, [originMode, customOrigin, originBranchObj?.latitude, originBranchObj?.longitude, originBranchObj?.name]);

  const destPoint = useMemo(() => {
    if (destMode === 'custom') {
      return customDest ? { lat: customDest.lat, lng: customDest.lng, name: customDest.address.split(',')[0] || 'ปลายทาง' } : null;
    }
    if (destBranch?.latitude && destBranch?.longitude) {
      return { lat: destBranch.latitude, lng: destBranch.longitude, name: destBranch.name };
    }
    return null;
  }, [destMode, customDest, destBranch?.latitude, destBranch?.longitude, destBranch?.name]);

  // Auto-calculate real road distance and cost whenever pickup or drop-off point changes
  useEffect(() => {
    if (!originPoint || !destPoint) return;
    const straight = haversineDistance(originPoint.lat, originPoint.lng, destPoint.lat, destPoint.lng);
    const initialRoadDist = Math.round(straight * 1.25 * 10) / 10;
    setDistance(initialRoadDist);
    setEstimatedCost(calculateSlideCost(initialRoadDist));

    let cancelled = false;
    fetch(`/api/routes/driving?originLat=${originPoint.lat}&originLng=${originPoint.lng}&destLat=${destPoint.lat}&destLng=${destPoint.lng}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.success && data.distanceKm) {
          setDistance(data.distanceKm);
          setEstimatedCost(calculateSlideCost(data.distanceKm));
        }
      })
      .catch(err => {
        console.warn('Real driving distance fetch error:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [originPoint?.lat, originPoint?.lng, destPoint?.lat, destPoint?.lng]);

  const originLabel = originMode === 'custom' && customOrigin
    ? customOrigin.address.split(',').slice(0, 2).join(',')
    : originBranchObj?.name;

  const filteredVehicles = branchStockVehicles.filter(v => {
    if (searchTags.length === 0) return true;
    return searchTags.some(q => {
      const term = q.toLowerCase();
      return v.vin.toLowerCase().includes(term) || v.model.toLowerCase().includes(term) || (v.licensePlate && v.licensePlate.toLowerCase().includes(term));
    });
  });

  // Cars with unfinished work can't be picked (select-all skips them)
  const selectableVehicles = filteredVehicles.filter(v => !v.activeJob);

  // Select all filtered vehicles state and handlers
  const isAllFilteredSelected = selectableVehicles.length > 0 && selectableVehicles.every(v => selectedVins.includes(v.vin));
  const someFilteredSelected = filteredVehicles.some(v => selectedVins.includes(v.vin));

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredVinSet = new Set(filteredVehicles.map(v => v.vin));
      setSelectedVins(prev => prev.filter(vin => !filteredVinSet.has(vin)));
    } else {
      const newVins = new Set([...selectedVins, ...selectableVehicles.map(v => v.vin)]);
      setSelectedVins(Array.from(newVins));
    }
  };

  const handleToggleVehicle = (vin: string) => {
    if (!selectedVins.includes(vin)) {
      const busyJob = vehicles.find(v => v.vin === vin)?.activeJob;
      if (busyJob) {
        showToast(`รถคันนี้มีงานค้างอยู่ (ใบงาน ${busyJob.jobNumber}) — สั่งงานซ้ำได้เมื่องานเดิมเสร็จสิ้น`, 'warning');
        return;
      }
    }
    setSelectedVins(prev =>
      prev.includes(vin) ? prev.filter(v => v !== vin) : [...prev, vin]
    );
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

        <div className="p-3 rounded-2xl bg-[#eaf5ee] border border-emerald-950/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#0f5238] shadow-xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            {(currentRole === 'ADMIN' || currentRole === 'MASTER') ? (
              <>
                <select
                  value={selectedOriginBranchId}
                  onChange={(e) => setSelectedOriginBranchId(e.target.value)}
                  className="text-xs font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer pr-4"
                >
                  {availableBranches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-700">มีรถพร้อมสไลด์: {branchStockVehicles.length} คัน</p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-gray-900">ต้นทาง: {activeBranch?.name}</p>
                <p className="text-[11px] text-emerald-700">มีรถพร้อมสไลด์: {branchStockVehicles.length} คัน</p>
              </>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Choose Supplier & Select VIN */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Step 1: Choose Slide Supplier */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">1</span>
              <span>เลือก Supplier รถสไลด์</span>
            </h2>

            <div className="flex flex-col gap-2 mt-1">
              {slideSuppliers.map(sup => (
                <label
                  key={sup.id}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    selectedSupplierId === sup.id
                      ? 'border-[#0f5238] bg-[#f4f9f5] ring-2 ring-[#0f5238]/20'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="slideSupplier"
                      value={sup.id}
                      checked={selectedSupplierId === sup.id}
                      onChange={() => setSelectedSupplierId(sup.id)}
                      className="mt-0.5 text-[#0f5238] focus:ring-[#0f5238]"
                    />
                    <div>
                      <p className="font-bold text-gray-900">{sup.name}</p>
                      {sup.address && <p className="text-[11px] text-gray-500 mt-0.5">{sup.address}</p>}
                      <p className="text-[11px] font-mono text-[#0f5238] mt-0.5">{sup.phone}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Step 2: Select VIN from current branch */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">2</span>
                <span>เลือกรถที่ต้องการสไลด์ (VIN)</span>
              </h2>
              <span className="text-xs text-gray-500">เลือกแล้ว {selectedVins.length} คัน</span>
            </div>

            <TagSearch
              tags={searchTags}
              onTagsChange={setSearchTags}
              placeholder="ค้นหาตาม VIN / รุ่น / ทะเบียน... (กด Enter เพื่อเพิ่ม)"
              accentColor="#0f5238"
            />

            {/* Select All Bar */}
            {filteredVehicles.length > 0 && (
              <div className="flex items-center justify-between px-1 py-1 text-xs border-b border-gray-100">
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className="flex items-center gap-2 font-medium text-gray-700 hover:text-emerald-900 transition-colors select-none py-1 group"
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
                  ไม่มีรถสถานะพร้อมย้ายในสต็อกสาขานี้ หรือไม่ตรงกับการค้นหา
                </div>
              ) : (
                filteredVehicles.map(v => {
                  const isSelected = selectedVins.includes(v.vin);
                  const busyJob = v.activeJob;
                  return (
                    <div
                      key={v.vin}
                      onClick={() => handleToggleVehicle(v.vin)}
                      title={busyJob ? `มีงานค้าง: ${busyJob.jobNumber}` : undefined}
                      className={`p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-[#0f5238] bg-[#f4f9f5] font-semibold cursor-pointer'
                          : busyJob
                          ? 'border-gray-100 bg-gray-50/80 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#0f5238] border-[#0f5238] text-white' : busyJob ? 'border-gray-200 bg-gray-100' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-gray-900 truncate">{v.vin}</p>
                          <p className="text-[11px] text-gray-500 truncate">{v.model} • {v.color}</p>
                          {busyJob && (
                            <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
                              ⚠ มีงาน{busyJob.jobType === 'CAR_WASH' ? 'ล้างรถ' : 'รถสไลด์'}ค้าง · <span className="font-mono">{busyJob.jobNumber}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      {v.licensePlate && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] shrink-0 font-medium">
                          {v.licensePlate}
                        </span>
                      )}
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  สาขาต้นทาง (Origin Branch):
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentRole === 'ADMIN' ? (
                    <BranchSelect
                      branches={branches}
                      value={selectedOriginBranchId}
                      onChange={(id) => { setSelectedOriginBranchId(id); setSelectedVins([]); }}
                    />
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={originBranchObj?.name || ''}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600 font-medium"
                    />
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
                        {originBranchObj?.latitude && originBranchObj?.longitude
                          ? (
                              <>
                                <span className="text-gray-700 font-medium">{originBranchObj.address || 'ปักหมุดแล้ว'}</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-200">
                                  GPS: {originBranchObj.latitude.toFixed(5)}, {originBranchObj.longitude.toFixed(5)}
                                </span>
                              </>
                            )
                          : 'สาขานี้ยังไม่มีพิกัด GPS — Supplier จะนำทางได้ไม่แม่น'}
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
                    onClick={() => setDestMode('branch')}
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
                    onClick={() => setDestMode('custom')}
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
                    onChange={setDestBranchId}
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
                            ฿{calculateSlideCost(distance).toLocaleString()}
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
                      setEstimatedCost(Math.round(val * 50));
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
                    onClick={() => setEstimatedCost(calculateSlideCost(Number(distance || 0)))}
                    className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200/80 transition-colors cursor-pointer whitespace-nowrap"
                    title="คลิกเพื่อคำนวณใหม่ตามระยะทาง: กิโลเมตร × 50 บาท"
                  >
                    50 บ./กม.
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
                    }}
                    placeholder="เช่น 1600"
                    required
                    className="w-full h-10 pl-3 pr-14 rounded-xl border border-gray-200 text-xs font-bold text-[#0f5238] focus:ring-2 focus:ring-[#0f5238] outline-none bg-white transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    บาท
                  </div>
                </div>
                {selectedVins.length > 1 ? (
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                    ต่อคัน (รวม {selectedVins.length} คัน = ฿{(estimatedCost * selectedVins.length).toLocaleString()})
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 mt-1">
                    คำนวณอัตโนมัติ: {distance || 0} กม. × 50 บาท
                  </p>
                )}
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
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-gray-100">
            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center gap-2 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#0f5238] flex items-center justify-center shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  ยืนยันการมอบหมายงานรถสไลด์
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  กรุณาตรวจสอบข้อมูลก่อนส่งคำขอไปยัง Supplier
                </p>
              </div>
            </div>

            {/* Summary Information Card */}
            <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 text-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">จำนวนรถที่ขอสไลด์:</span>
                <span className="font-bold text-gray-900">{selectedVins.length} คัน</span>
              </div>
              <div className="flex flex-col gap-1 pb-2 border-b border-gray-200">
                <span className="text-gray-500">เลขตัวถัง (VIN):</span>
                {selectedVins.length === 1 ? (
                  <span className="font-mono font-bold text-gray-900">{selectedVins[0]}</span>
                ) : (
                  <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1 mt-0.5">
                    {selectedVins.map(vin => (
                      <span key={vin} className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-800">
                        {vin}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">เส้นทางขนส่ง:</span>
                <span className="font-medium text-gray-800 text-right max-w-[220px] truncate">
                  {originLabel} &rarr; {destMode === 'branch' ? destBranch?.name : customDest?.address}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">ระยะทางโดยประมาณ:</span>
                <span className="font-bold text-gray-900">{distance ? `${distance} กม.` : '-'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">Supplier ผู้รับงาน:</span>
                <span className="font-bold text-gray-900">{selectedSupplier?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">กำหนดรับรถ:</span>
                <span className="font-medium text-gray-800">{formatThaiDateTime(pickupDateTime)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-gray-600 font-medium">
                  {selectedVins.length > 1 ? `ประมาณการค่าบริการรวม (${selectedVins.length} คัน):` : 'ประมาณการค่าบริการ:'}
                </span>
                <span className="text-base font-bold text-[#0f5238]">
                  ฿{(estimatedCost * selectedVins.length).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmSlideJob}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md bg-[#0f5238] hover:bg-[#0a3d28] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ยืนยันมอบหมาย</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {createdJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  สร้างคำขอรถสไลด์เรียบร้อยแล้ว
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedVins.length > 1
                    ? `สร้างใบคำขอรถสไลด์จำนวน ${selectedVins.length} คันเรียบร้อยแล้ว ระบบได้แจ้งเตือน Supplier แล้ว`
                    : 'ระบบได้แจ้งเตือนไปยัง Supplier ผู้รับงานแล้ว'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 text-xs flex flex-col gap-2">
              <p>
                <strong>Job No.:</strong>{' '}
                <span className="font-mono font-bold text-gray-900">
                  {createdJob.jobNumber} {selectedVins.length > 1 ? `(และอีก ${selectedVins.length - 1} ใบคำขอ)` : ''}
                </span>
              </p>
              <p><strong>จำนวนรถ:</strong> {selectedVins.length} คัน</p>
              <p>
                <strong>เลขตัวถัง (VIN):</strong>{' '}
                <span className="font-mono">
                  {selectedVins.slice(0, 3).join(', ')}{selectedVins.length > 3 ? ` ... (รวม ${selectedVins.length} คัน)` : ''}
                </span>
              </p>
              <p><strong>เส้นทาง:</strong> {createdJob.originBranchName} &rarr; {createdJob.destBranchName || createdJob.customDestAddress || 'ปลายทางที่ระบุ'}</p>
              <p><strong>ระยะทาง:</strong> {distance ? `${distance} กม.` : '-'}</p>
              <p><strong>Supplier:</strong> {createdJob.supplierName}</p>
              <p><strong>เวลารับรถ:</strong> {formatThaiDateTime(createdJob.pickupDateTime)}</p>
              <p>
                <strong>ประมาณการค่าบริการรวม:</strong>{' '}
                <span className="font-bold text-[#0f5238]">
                  ฿{(estimatedCost * selectedVins.length).toLocaleString()}{' '}
                  {selectedVins.length > 1 ? `(คันละ ฿${estimatedCost.toLocaleString()})` : ''}
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => router.push('/jobs')}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28]"
              >
                กลับไปหน้ารวมงาน
              </button>
            </div>
          </div>
        </div>
      )}

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
          // Distance & cost are recalculated by the origin/dest effect
        }}
        {...(mapPickerMode === 'branch'
          ? {
              // Edit the branch's permanent location — start from current branch pin
              pointLabel: `ตำแหน่งสาขา ${originBranchObj?.name || ''}`.trim(),
              originLat: destPoint?.lat ?? originBranchObj?.latitude,
              originLng: destPoint?.lng ?? originBranchObj?.longitude,
              originName: destPoint?.name || originBranchObj?.name || 'สาขาต้นทาง',
              referenceCaption: destPoint ? 'ปลายทาง' : 'ตำแหน่งเดิม',
              initialLat: originBranchObj?.latitude,
              initialLng: originBranchObj?.longitude,
            }
          : mapPickerMode === 'origin'
          ? {
              // Reference = drop-off if known, otherwise the origin branch
              originLat: destPoint?.lat ?? originBranchObj?.latitude,
              originLng: destPoint?.lng ?? originBranchObj?.longitude,
              originName: destPoint?.name || originBranchObj?.name || 'สาขาต้นทาง',
              referenceCaption: destPoint ? 'ปลายทาง' : 'สาขาต้นทาง',
              // Start from the existing job pin, or from the branch location so the user just drags it
              initialLat: customOrigin?.lat ?? originBranchObj?.latitude,
              initialLng: customOrigin?.lng ?? originBranchObj?.longitude,
            }
          : {
              originLat: originPoint?.lat,
              originLng: originPoint?.lng,
              originName: originPoint?.name || originBranchObj?.name || 'สาขาต้นทาง',
              referenceCaption: originMode === 'custom' && customOrigin ? 'จุดรับรถ' : 'สาขาต้นทาง',
              initialLat: customDest?.lat,
              initialLng: customDest?.lng,
            })}
      />
    </div>
  );
}
