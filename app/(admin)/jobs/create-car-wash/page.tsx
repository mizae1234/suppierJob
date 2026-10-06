'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import TagSearch from '@/components/ui/TagSearch';
import { CompanyCode, Job } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { 
  Sparkles, 
  Car, 
  Store, 
  Calendar, 
  Check, 
  Minus,
  Trash2, 
  FileDown, 
  Printer, 
  CheckCircle2, 
  ArrowLeft,
  Search,
  Plus,
  Building,
  ChevronDown,
  AlertCircle,
  Loader2,
  Lock,
  Truck
} from 'lucide-react';

export default function CreateCarWashPage() {
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
    createCarWashJob 
  } = useApp();
  const { user: authUser } = useAuth();
  const theme = useTheme();

  // Wash Suppliers
  const washSuppliers = suppliers.filter(s => s.services.includes('CAR_WASH'));

  // Selected supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(washSuppliers[0]?.id || '');
  const selectedSupplier = washSuppliers.find(s => s.id === selectedSupplierId);

  // Auto-fill requester info from logged-in user
  const autoName = authUser?.firstName && authUser?.lastName 
    ? `${authUser.firstName} ${authUser.lastName}` 
    : authUser?.displayName || 'ผู้จัดการสาขา';
  const [requestedBy, setRequestedBy] = useState<string>(autoName);
  const [requesterPosition, setRequesterPosition] = useState<string>(authUser?.position || '');
  const [requesterPhone, setRequesterPhone] = useState<string>(authUser?.phone || '');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [openWashTypeVin, setOpenWashTypeVin] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const washTypeOptions = [
    { value: 'STANDARD', label: 'Standard (฿180)' },
    { value: 'DEEP_CLEAN', label: 'Deep Clean (฿350)' },
    { value: 'POLISH', label: 'ขัดเคลือบเงา (฿650)' },
  ];

  // Branches filtered by selected company context
  const availableBranches = useMemo(() => {
    if (currentCompany === 'ALL') return branches;
    const companyObj = companies.find(c => c.code === currentCompany);
    if (!companyObj) return branches;
    return branches.filter(b => b.companyId === companyObj.id);
  }, [branches, companies, currentCompany]);

  // Branch selection — Admin/Master pick from available branches, Branch role uses their own
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentBranchId || availableBranches[0]?.id || branches[0]?.id || '');
  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  // Auto-switch branch when company changes
  useEffect(() => {
    if (currentRole === 'BRANCH') return; // Branch users don't switch
    if (availableBranches.length > 0 && !availableBranches.find(b => b.id === selectedBranchId)) {
      setSelectedBranchId(availableBranches[0].id);
      setSelectedItems([]);
    }
  }, [availableBranches, selectedBranchId, currentRole]);

  // Branch vehicles (only vehicles currently in stock at selected branch)
  const branchStockVehicles = useMemo(() => {
    return vehicles.filter(v => v.currentBranchId === selectedBranchId);
  }, [vehicles, selectedBranchId]);

  // VIN search tags
  const [searchTags, setSearchTags] = useState<string[]>([]);

  // Selected vehicle items list
  interface SelectedWashItem {
    vin: string;
    model: string;
    color: string;
    licensePlate?: string;
    actualWashDate: string;
    washType: 'STANDARD' | 'DEEP_CLEAN' | 'POLISH';
    unitPrice: number;
    remarks: string;
  }

  const [selectedItems, setSelectedItems] = useState<SelectedWashItem[]>([]);

  // Created Job for PDF Modal
  const [createdJob, setCreatedJob] = useState<Job | null>(null);

  // Toggle vehicle selection
  const handleToggleVehicle = (vehicle: (typeof branchStockVehicles)[0]) => {
    const exists = selectedItems.some(it => it.vin === vehicle.vin);
    if (exists) {
      setSelectedItems(prev => prev.filter(it => it.vin !== vehicle.vin));
    } else if (vehicle.activeJob) {
      showToast(`รถคันนี้มีงานค้างอยู่ (ใบงาน ${vehicle.activeJob.jobNumber}) — สั่งงานซ้ำได้เมื่องานเดิมเสร็จสิ้น`, 'warning');
      return;
    } else {
      setSelectedItems(prev => [
        ...prev,
        {
          vin: vehicle.vin,
          model: vehicle.model,
          color: vehicle.color,
          licensePlate: vehicle.licensePlate,
          actualWashDate: new Date().toISOString().slice(0, 10),
          washType: 'STANDARD',
          unitPrice: 180,
          remarks: 'ล้างทำความสะอาดทั่วไป + ดูดฝุ่น',
        }
      ]);
    }
  };

  // Update item field
  const updateItemField = (vin: string, field: keyof SelectedWashItem, value: any) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.vin !== vin) return item;
      const updated = { ...item, [field]: value };
      if (field === 'washType') {
        if (value === 'STANDARD') updated.unitPrice = 180;
        if (value === 'DEEP_CLEAN') updated.unitPrice = 350;
        if (value === 'POLISH') updated.unitPrice = 650;
      }
      return updated;
    }));
  };

  // Filtered available vehicles by search tags
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
  const isAllFilteredSelected = selectableVehicles.length > 0 && selectableVehicles.every(v => selectedItems.some(it => it.vin === v.vin));
  const someFilteredSelected = filteredVehicles.some(v => selectedItems.some(it => it.vin === v.vin));

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered vehicles
      const filteredVins = new Set(filteredVehicles.map(v => v.vin));
      setSelectedItems(prev => prev.filter(it => !filteredVins.has(it.vin)));
    } else {
      // Add all missing filtered vehicles to selected items
      const existingVins = new Set(selectedItems.map(it => it.vin));
      const toAdd: SelectedWashItem[] = selectableVehicles
        .filter(v => !existingVins.has(v.vin))
        .map(v => ({
          vin: v.vin,
          model: v.model,
          color: v.color,
          licensePlate: v.licensePlate,
          actualWashDate: new Date().toISOString().slice(0, 10),
          washType: 'STANDARD',
          unitPrice: 180,
          remarks: 'ล้างทำความสะอาดทั่วไป + ดูดฝุ่น',
        }));
      setSelectedItems(prev => [...prev, ...toAdd]);
    }
  };

  const totalEstimatedCost = selectedItems.reduce((sum, it) => sum + it.unitPrice, 0);

  const { showToast } = useToast();

  // Form submit - opens alert confirmation modal
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('กรุณาเลือก Supplier ผู้ให้บริการ', 'warning');
      return;
    }
    if (selectedItems.length === 0) {
      showToast('กรุณาเลือก VIN อย่างน้อย 1 คัน', 'warning');
      return;
    }

    setShowConfirmModal(true);
  };

  // Confirm and save order
  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      const matchedCompany = companies.find(c => c.id === selectedBranch?.companyId);
      const companyCode: CompanyCode = (matchedCompany?.code as CompanyCode) || 'EV7';

      const newJob = await createCarWashJob({
        companyCode,
        branchId: selectedBranchId,
        supplierId: selectedSupplierId,
        items: selectedItems.map(it => ({
          vin: it.vin,
          actualWashDate: it.actualWashDate,
          washType: it.washType,
          unitPrice: it.unitPrice,
          remarks: it.remarks,
        })),
        requestedBy,
        requesterPosition,
        requesterPhone,
      });

      setShowConfirmModal(false);
      showToast('บันทึก Order และออกใบสั่งงานสำเร็จเรียบร้อย!', 'success');
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
      {/* Top Banner */}
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
              <Sparkles className="w-6 h-6" style={{ color: theme.primary }} />
              <span>สร้างคำสั่งสั่งล้างรถ (Car Wash Order)</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              เลือก Supplier และระบุรถ VIN จากสต็อกสาขาเพื่อออกใบสั่งงานหลายคันพร้อมกัน
            </p>
          </div>
        </div>

        {/* Current Branch Badge */}
        <div className="p-3 rounded-2xl border flex items-center gap-3 relative" style={{ backgroundColor: theme.bgFooter, borderColor: theme.borderSoft }}>
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs" style={{ color: theme.primary }}>
            <Car className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            {(currentRole === 'ADMIN' || currentRole === 'MASTER') ? (
              availableBranches.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                    onBlur={() => setTimeout(() => setIsBranchDropdownOpen(false), 200)}
                    className="flex items-center gap-2 text-xs font-bold cursor-pointer"
                    style={{ color: theme.primary }}
                  >
                    <span className="truncate">{availableBranches.find(b => b.id === selectedBranchId)?.name || 'เลือกสาขา'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isBranchDropdownOpen ? 'rotate-180' : ''}`} style={{ color: theme.textMuted }} />
                  </button>

                  {/* Custom Branch Dropdown */}
                  {isBranchDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 rounded-xl bg-white border border-gray-100 shadow-xl overflow-hidden z-50">
                      {availableBranches.map((branch) => {
                        const isSelected = selectedBranchId === branch.id;
                        return (
                          <button
                            type="button"
                            key={branch.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedBranchId(branch.id);
                              setSelectedItems([]);
                              setIsBranchDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-gray-50 text-gray-900 font-bold'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                            }`}
                          >
                            <Building className="w-3.5 h-3.5 shrink-0 opacity-50" />
                            <span className="flex-1 text-left truncate">{branch.name}</span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: theme.primary }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs font-bold text-gray-900">{availableBranches[0]?.name || 'EV7'}</p>
              )
            ) : (
              <p className="text-xs font-bold text-gray-900">{activeBranch?.name || 'EV7'}</p>
            )}
            <p className="text-[11px]" style={{ color: theme.textMuted }}>รถในสต็อก{currentCompany === 'EV7' ? '' : 'สาขานี้'}: {branchStockVehicles.length} คัน</p>
          </div>
        </div>
      </div>

      {/* Main Order Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Supplier & Available Stock Selector */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Step 1: Choose Supplier */}
          <div className="p-5 rounded-2xl bg-white border shadow-xs flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ backgroundColor: theme.primary }}>1</span>
              <span>เลือก Supplier คู่ค้า</span>
            </h2>

            <div className="flex flex-col gap-2 mt-1">
              {washSuppliers.map(sup => (
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
                      name="supplier"
                      checked={selectedSupplierId === sup.id}
                      onChange={() => setSelectedSupplierId(sup.id)}
                      className="mt-0.5 text-[#0f5238] focus:ring-[#0f5238]"
                    />
                    <div>
                      <p className="font-bold text-gray-900">{sup.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">โทร: {sup.phone}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>


          </div>

          {/* Step 2: Select VINs from Branch Stock */}
          <div className="p-5 rounded-2xl bg-white border shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ backgroundColor: theme.primary }}>2</span>
                <span>เลือกรถในสต็อกสาขา</span>
              </h2>
              <span className="text-xs text-gray-500">เลือกแล้ว {selectedItems.length} คัน</span>
            </div>

            {/* VIN search — Tag-based */}
            <TagSearch
              tags={searchTags}
              onTagsChange={setSearchTags}
              placeholder="ค้นหาตาม VIN / รุ่น / ทะเบียน... (กด Enter เพื่อเพิ่ม)"
              accentColor={theme.primary}
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

            {/* Vehicles List */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredVehicles.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  ไม่มีรถในสต็อกสาขานี้ หรือไม่ตรงกับการค้นหา
                </div>
              ) : (
                filteredVehicles.map(v => {
                  const isSelected = selectedItems.some(it => it.vin === v.vin);
                  const busyJob = v.activeJob;
                  const isWash = busyJob?.jobType === 'CAR_WASH';
                  return (
                    <div
                      key={v.vin}
                      onClick={() => handleToggleVehicle(v)}
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
                        {/* Top row: VIN + License plate */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono font-bold text-xs text-gray-900 tracking-tight truncate">
                            {v.vin}
                          </p>
                          {v.licensePlate && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 text-[10px] font-bold shadow-2xs shrink-0 whitespace-nowrap">
                              {v.licensePlate}
                            </span>
                          )}
                        </div>

                        {/* Model & Color */}
                        <p className="text-[11px] font-medium text-gray-600 truncate mt-0.5">
                          {v.model}
                          {v.color && <span className="text-gray-400"> · {v.color}</span>}
                        </p>

                        {/* Status tag */}
                        {busyJob ? (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/90 border border-amber-200/80 text-amber-800 text-[10px] font-medium flex-wrap">
                            {isWash ? (
                              <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                            ) : (
                              <Truck className="w-3 h-3 text-sky-600 shrink-0" />
                            )}
                            <span className="font-semibold">
                              ติดงาน{isWash ? 'ล้างรถ' : 'รถสไลด์'}
                            </span>
                            <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-900 text-[10px]">
                              {busyJob.jobNumber}
                            </span>
                            <span className="text-gray-400 text-[9px]">(รอดำเนินการ)</span>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>พร้อมส่งล้าง</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Per-VIN Operation Dates & Order Breakdown */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="p-6 rounded-2xl bg-white border shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ backgroundColor: theme.primary }}>3</span>
                  <span>รายการและกำหนดวันปฏิบัติงานจริงของแต่ละ VIN</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  ระบุวันที่ล้างจริง ประเภทบริการ และหมายเหตุเฉพาะคัน
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: theme.primary, backgroundColor: theme.bgSoft }}>
                รวม {selectedItems.length} คัน
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
                <Car className="w-12 h-12 text-gray-300" />
                <p className="text-xs font-medium">ยังไม่ได้เลือกรถจากสต็อกสาขา</p>
                <p className="text-[11px] text-gray-400">คลิกเลือกรถจากช่องด้านซ้ายเพื่อเพิ่มในรายการสั่งล้าง</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.vin}
                    className="p-4 rounded-xl border border-gray-200 bg-[#fbfdfc] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-gray-900 text-sm">{item.vin}</span>
                          {item.licensePlate && (
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold text-[10px]">
                              {item.licensePlate}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-[11px] mt-0.5">
                          {item.model} ({item.color})
                        </p>
                      </div>
                    </div>

                    {/* Form Controls for this VIN */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center w-full md:w-auto">
                      {/* Actual Wash Date */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                          วันปฏิบัติงานจริง:
                        </label>
                        <input
                          type="date"
                          value={item.actualWashDate}
                          onChange={(e) => updateItemField(item.vin, 'actualWashDate', e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-[#0f5238]"
                        />
                      </div>

                      {/* Wash Type */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                          ประเภทการล้าง:
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenWashTypeVin(openWashTypeVin === item.vin ? null : item.vin)}
                            onBlur={() => setTimeout(() => setOpenWashTypeVin(null), 200)}
                            className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs font-semibold text-left flex items-center justify-between gap-1 cursor-pointer hover:border-gray-300 transition-colors"
                            style={{ color: theme.primary }}
                          >
                            <span className="truncate">{washTypeOptions.find(o => o.value === item.washType)?.label || 'Standard (฿180)'}</span>
                            <ChevronDown className={`w-3 h-3 shrink-0 text-gray-400 transition-transform duration-200 ${openWashTypeVin === item.vin ? 'rotate-180' : ''}`} />
                          </button>
                          {openWashTypeVin === item.vin && (
                            <div className="absolute top-full left-0 mt-1 w-full rounded-xl bg-white border border-gray-100 shadow-xl overflow-hidden z-50">
                              {washTypeOptions.map((opt) => {
                                const isSelected = item.washType === opt.value;
                                return (
                                  <button
                                    type="button"
                                    key={opt.value}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updateItemField(item.vin, 'washType', opt.value);
                                      setOpenWashTypeVin(null);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-gray-50 text-gray-900 font-bold'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5" style={{ color: theme.primary }} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Remarks */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                          หมายเหตุ / จุดระวัง:
                        </label>
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) => updateItemField(item.vin, 'remarks', e.target.value)}
                          placeholder="เช่น ดูดฝุ่นเบาะหลัง"
                          className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-[#0f5238]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0">
                      <span className="font-bold text-[#0f5238] text-sm">
                        ฿{item.unitPrice}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleVehicle(branchStockVehicles.find(v => v.vin === item.vin)!)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Summary Bar */}
            {selectedItems.length > 0 && (
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2" style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSoft }}>
                <div>
                  <span className="text-xs text-gray-500">ยอดรวมค่าบริการโดยประมาณ:</span>
                  <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                    ฿{totalEstimatedCost.toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-xs font-bold shadow-md transition-all hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>บันทึก Order & ออกใบสั่งงาน</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Confirmation Alert Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-gray-100">
            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center gap-2 pt-1">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner"
                style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
              >
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  ยืนยันการบันทึก Order
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  กรุณาตรวจสอบข้อมูลก่อนออกใบสั่งงานล้างรถ
                </p>
              </div>
            </div>

            {/* Summary Information Card */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">สาขาผู้สั่งงาน:</span>
                <span className="font-bold text-gray-900">{selectedBranch?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">Supplier ผู้ให้บริการ:</span>
                <span className="font-bold text-gray-900">{selectedSupplier?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">ผู้สั่งงาน:</span>
                <span className="font-medium text-gray-800">{requestedBy}{requesterPosition ? ` (${requesterPosition})` : ''}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">จำนวนรถทั้งหมด:</span>
                <span className="font-bold text-gray-900">{selectedItems.length} คัน</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-gray-600 font-medium">ยอดรวมค่าบริการโดยประมาณ:</span>
                <span className="text-base font-bold" style={{ color: theme.primary }}>
                  ฿{totalEstimatedCost.toLocaleString()}
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
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: theme.primary }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ยืนยันสั่งงาน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export & Order Confirmation Modal */}
      {createdJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" style={{ color: theme.primary }} />
                <h3 className="text-base font-bold text-gray-900">
                  บันทึกคำสั่งล้างรถสำเร็จ (Car Wash Order Created)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-colors"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ / Export PDF</span>
                </button>
                <button
                  onClick={() => router.push('/jobs')}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
                >
                  ไปยังหน้ารวมงาน
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="print-work-order p-6 border border-gray-200 rounded-2xl bg-white text-gray-900 flex flex-col gap-4 print:border-none print:p-0">
              {/* Document Top */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#0f5238]">ใบสั่งงานล้างรถ (CAR WASH ORDER SLIP)</h2>
                  <p className="text-xs text-gray-600">บริษัท {createdJob.companyCode} • สังกัด: {createdJob.branchName}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-mono font-bold text-sm text-gray-900">{createdJob.jobNumber}</p>
                  <p className="text-gray-500">วันที่สั่งงาน: {formatThaiDate(createdJob.createdAt)}</p>
                </div>
              </div>

              {/* Parties Info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-xl text-xs">
                <div>
                  <p className="text-gray-500">สาขาผู้สั่งงาน:</p>
                  <p className="font-bold text-gray-900">{createdJob.branchName}</p>
                  <p className="text-gray-600 mt-0.5">ผู้สั่งงาน: {createdJob.requestedBy}</p>
                  {createdJob.requesterPosition && <p className="text-gray-600">ตำแหน่ง: {createdJob.requesterPosition}</p>}
                  {createdJob.requesterPhone && <p className="text-gray-600">โทร: {createdJob.requesterPhone}</p>}
                </div>
                <div>
                  <p className="text-gray-500">Supplier ผู้รับจ้าง:</p>
                  <p className="font-bold text-gray-900">{createdJob.supplierName}</p>
                  <p className="text-gray-600 mt-0.5">สถานะ: รอ Supplier ปฏิบัติงาน</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 font-bold text-gray-700">
                      <th className="py-2 px-2">ลำดับ</th>
                      <th className="py-2 px-2">เลขตัวถัง (VIN)</th>
                      <th className="py-2 px-2">รุ่น / สี</th>
                      <th className="py-2 px-2">ทะเบียน</th>
                      <th className="py-2 px-2">วันที่ล้างจริง</th>
                      <th className="py-2 px-2">ประเภท</th>
                      <th className="py-2 px-2 text-right">ราคา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {createdJob.carWashItems?.map((item, i) => (
                      <tr key={item.id}>
                        <td className="py-2 px-2">{i + 1}</td>
                        <td className="py-2 px-2 font-mono font-bold">{item.vin}</td>
                        <td className="py-2 px-2">{item.vehicleModel} ({item.vehicleColor})</td>
                        <td className="py-2 px-2">{item.licensePlate || '-'}</td>
                        <td className="py-2 px-2">{formatThaiDate(item.actualWashDate)}</td>
                        <td className="py-2 px-2">{item.washType}</td>
                        <td className="py-2 px-2 text-right font-bold">฿{item.unitPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 font-bold">
                      <td colSpan={6} className="py-2 px-2 text-right">ยอดรวมทั้งสิ้น (Estimated Total):</td>
                      <td className="py-2 px-2 text-right text-sm text-[#0f5238]">
                        ฿{createdJob.estimatedCost.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures Area */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-gray-200 text-xs text-center">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-48 border-b border-gray-400" />
                  <p>ลงชื่อ {createdJob.requestedBy || '...................................................'}<br />({createdJob.requesterPosition || '...................................................'})</p>
                </div>
                <div className="flex flex-col items-center gap-6">
                  <div className="w-48 border-b border-gray-400" />
                  <p>ลงชื่อ ...................................................<br />(...................................................)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
