'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import TagSearch from '@/components/ui/TagSearch';
import { CompanyCode, Job } from '@/types';
import { WashConfirmModal, WashOrderPrintModal, SupplierSelector } from '@/components/jobs';
import { 
  getSupplierWashConfig, 
  getWashServiceDisplay, 
  calculateWashOrderFinancials,
  DEFAULT_WASH_CONFIG,
} from '@/lib/car-wash-rates';
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

  // Wash Suppliers (handles both array and comma-separated string)
  const washSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (Array.isArray(s.services)) {
        return s.services.includes('CAR_WASH');
      }
      return typeof s.services === 'string' && (s.services as string).includes('CAR_WASH');
    });
  }, [suppliers]);

  // Selected supplier (starts empty, user must choose)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const selectedSupplier = washSuppliers.find(s => s.id === selectedSupplierId);

  // Supplier wash config (Rates, Showrooms, VAT)
  const washConfig = useMemo(() => {
    if (!selectedSupplier) return DEFAULT_WASH_CONFIG;
    return getSupplierWashConfig(selectedSupplier.code, selectedSupplier.name, selectedSupplier);
  }, [selectedSupplier]);

  // Available service options for this supplier
  const supplierServices = useMemo(() => {
    return washConfig.services.map(s => {
      const meta = getWashServiceDisplay(s.serviceCode);
      return {
        code: s.serviceCode,
        name: meta.name,
        category: meta.category,
        categoryName: meta.categoryName,
        priceType: s.priceType,
        price: s.price,
        minPrice: s.minPrice,
        maxPrice: s.maxPrice,
        defaultRemarks: meta.defaultRemarks,
      };
    });
  }, [washConfig]);

  // Auto-fill requester info from logged-in user
  const autoName = authUser?.firstName && authUser?.lastName 
    ? `${authUser.firstName} ${authUser.lastName}` 
    : authUser?.displayName || 'ผู้จัดการสาขา';
  const [requestedBy, setRequestedBy] = useState<string>(autoName);
  const [requesterPosition, setRequesterPosition] = useState<string>(authUser?.position || '');
  const [requesterPhone, setRequesterPhone] = useState<string>(authUser?.phone || '');
  const [openWashTypeVin, setOpenWashTypeVin] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    washType: string;
    unitPrice: number;
    priceType?: 'FIXED' | 'RANGE';
    minPrice?: number;
    maxPrice?: number;
    remarks: string;
  }

  const [selectedItems, setSelectedItems] = useState<SelectedWashItem[]>([]);

  // Created Job for PDF Modal
  const [createdJob, setCreatedJob] = useState<Job | null>(null);

  // When supplier changes, adapt existing items to the new supplier's rates
  useEffect(() => {
    if (!selectedSupplierId || selectedItems.length === 0 || supplierServices.length === 0) return;
    const defaultSvc = supplierServices[0];

    setSelectedItems(prev => prev.map(item => {
      const matched = supplierServices.find(s => s.code === item.washType);
      if (matched) {
        return {
          ...item,
          unitPrice: matched.priceType === 'FIXED' ? matched.price : Math.max(matched.minPrice || 0, Math.min(item.unitPrice, matched.maxPrice || Infinity)),
          priceType: matched.priceType,
          minPrice: matched.minPrice,
          maxPrice: matched.maxPrice,
        };
      }
      return {
        ...item,
        washType: defaultSvc.code,
        unitPrice: defaultSvc.price,
        priceType: defaultSvc.priceType,
        minPrice: defaultSvc.minPrice,
        maxPrice: defaultSvc.maxPrice,
        remarks: item.remarks || defaultSvc.defaultRemarks || '',
      };
    }));
  }, [selectedSupplierId, supplierServices]);

  // Toggle vehicle selection
  const handleToggleVehicle = (vehicle: (typeof branchStockVehicles)[0]) => {
    const exists = selectedItems.some(it => it.vin === vehicle.vin);
    if (exists) {
      setSelectedItems(prev => prev.filter(it => it.vin !== vehicle.vin));
    } else if (vehicle.activeJob) {
      showToast(`รถคันนี้มีงานค้างอยู่ (ใบงาน ${vehicle.activeJob.jobNumber}) — สั่งงานซ้ำได้เมื่องานเดิมเสร็จสิ้น`, 'warning');
      return;
    } else {
      const defaultSvc = supplierServices[0] || {
        code: 'WASH_AND_COAT',
        price: 500,
        priceType: 'FIXED' as const,
        minPrice: undefined,
        maxPrice: undefined,
        defaultRemarks: 'ล้างทำความสะอาดทั่วไป',
      };
      setSelectedItems(prev => [
        ...prev,
        {
          vin: vehicle.vin,
          model: vehicle.model,
          color: vehicle.color,
          licensePlate: vehicle.licensePlate,
          actualWashDate: new Date().toISOString().slice(0, 10),
          washType: defaultSvc.code,
          unitPrice: defaultSvc.price,
          priceType: defaultSvc.priceType,
          minPrice: defaultSvc.minPrice,
          maxPrice: defaultSvc.maxPrice,
          remarks: defaultSvc.defaultRemarks || '',
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
        const matched = supplierServices.find(s => s.code === value);
        if (matched) {
          updated.unitPrice = matched.price;
          updated.priceType = matched.priceType;
          updated.minPrice = matched.minPrice;
          updated.maxPrice = matched.maxPrice;
          if (!updated.remarks || updated.remarks === 'ล้างทำความสะอาดทั่วไป') {
            updated.remarks = matched.defaultRemarks || '';
          }
        }
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
      const defaultSvc = supplierServices[0] || {
        code: 'WASH_AND_COAT',
        price: 500,
        priceType: 'FIXED' as const,
        minPrice: undefined,
        maxPrice: undefined,
        defaultRemarks: 'ล้างทำความสะอาดทั่วไป',
      };
      const toAdd: SelectedWashItem[] = selectableVehicles
        .filter(v => !existingVins.has(v.vin))
        .map(v => ({
          vin: v.vin,
          model: v.model,
          color: v.color,
          licensePlate: v.licensePlate,
          actualWashDate: new Date().toISOString().slice(0, 10),
          washType: defaultSvc.code,
          unitPrice: defaultSvc.price,
          priceType: defaultSvc.priceType,
          minPrice: defaultSvc.minPrice,
          maxPrice: defaultSvc.maxPrice,
          remarks: defaultSvc.defaultRemarks || '',
        }));
      setSelectedItems(prev => [...prev, ...toAdd]);
    }
  };

  // Financial calculation (Subtotal, VAT, Grand Total)
  const orderFinancials = useMemo(() => {
    return calculateWashOrderFinancials(selectedItems, washConfig.vatType);
  }, [selectedItems, washConfig.vatType]);

  const totalEstimatedCost = orderFinancials.grandTotal;

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
        estimatedCost: orderFinancials.grandTotal,
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
      </div>

      {/* Main Order Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Supplier & Available Stock Selector */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Step 1: Choose Supplier */}
          <SupplierSelector
            suppliers={washSuppliers}
            selectedSupplierId={selectedSupplierId}
            onSelect={setSelectedSupplierId}
            serviceType="CAR_WASH"
            stepNumber={1}
            title="เลือก Supplier คู่ค้า"
            themeColor={theme.primary}
            currentBranchCode={selectedBranch?.code}
            currentBranchName={selectedBranch?.name}
          />

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
              <div className="flex flex-col gap-4">
                {selectedItems.map((item, idx) => {
                  const selectedSvc = supplierServices.find(s => s.code === item.washType);
                  return (
                    <div
                      key={item.vin}
                      className="rounded-2xl border border-gray-200/90 bg-white shadow-xs hover:border-gray-300 transition-all duration-200"
                    >
                      {/* 1. Vehicle Header Bar */}
                      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-gray-50/90 via-slate-50/50 to-white rounded-t-2xl border-b border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0f5238] text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono font-bold text-gray-900 text-sm tracking-wide">
                              {item.vin}
                            </span>
                            {item.licensePlate && (
                              <span className="px-2.5 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 font-semibold text-xs shadow-2xs">
                                {item.licensePlate}
                              </span>
                            )}
                            <span className="text-gray-500 text-xs font-medium">
                              • {item.model} <span className="text-gray-400 font-normal">({item.color})</span>
                            </span>
                          </div>
                        </div>

                        {/* Subtotal & Delete Action */}
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block leading-none mb-0.5">
                              รวมคันนี้
                            </span>
                            <span className="text-base font-extrabold text-[#0f5238] leading-none">
                              ฿{(item.unitPrice || 0).toLocaleString()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleVehicle(branchStockVehicles.find(v => v.vin === item.vin)!)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 2. Controls Grid */}
                      <div className="p-4 sm:p-5 flex flex-col gap-4">
                        {/* Row 1: Service Selector, Unit Price, Actual Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                          {/* 1. Service Selector (col-span-12 md:col-span-6) */}
                          <div className="sm:col-span-12 md:col-span-6">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 leading-5">
                              ประเภทบริการล้างรถ
                            </label>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenWashTypeVin(openWashTypeVin === item.vin ? null : item.vin)}
                                className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs font-semibold text-left flex items-center justify-between gap-2 cursor-pointer hover:border-gray-300 transition-colors bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238]"
                                style={{ color: theme.primary }}
                              >
                                <span className="truncate pr-2">
                                  {selectedSvc?.name || item.washType}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs font-mono font-bold text-[#0f5238]">
                                    {selectedSvc?.priceType === 'RANGE'
                                      ? `฿${selectedSvc.minPrice}-${selectedSvc.maxPrice}`
                                      : `฿${selectedSvc?.price}`}
                                  </span>
                                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${openWashTypeVin === item.vin ? 'rotate-180' : ''}`} />
                                </div>
                              </button>

                              {openWashTypeVin === item.vin && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setOpenWashTypeVin(null)}
                                  />
                                  <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden z-50 py-1 max-h-72 overflow-y-auto">
                                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                      <span>บริการของ {selectedSupplier?.name || 'ซัพพลายเออร์'}</span>
                                      <span className="text-[10px] text-gray-400 font-normal">({supplierServices.length} บริการ)</span>
                                    </div>
                                    {supplierServices.map((svc) => {
                                      const isSelected = item.washType === svc.code;
                                      return (
                                        <button
                                          type="button"
                                          key={svc.code}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            updateItemField(item.vin, 'washType', svc.code);
                                            setOpenWashTypeVin(null);
                                          }}
                                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors cursor-pointer text-left ${
                                            isSelected
                                              ? 'bg-emerald-50 text-emerald-950 font-bold border-l-2 border-l-[#0f5238]'
                                              : 'text-gray-700 hover:bg-gray-50'
                                          }`}
                                        >
                                          <div className="min-w-0 pr-3">
                                            <p className="truncate font-semibold">{svc.name}</p>
                                            <span className="text-[10px] text-gray-400 block mt-0.5">{svc.categoryName}</span>
                                          </div>
                                          <div className="shrink-0 text-right">
                                            <span className="text-xs font-mono font-bold text-[#0f5238] px-2 py-0.5 rounded bg-emerald-50/70 border border-emerald-100">
                                              {svc.priceType === 'RANGE' ? `฿${svc.minPrice} - ฿${svc.maxPrice}` : `฿${svc.price}`}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 2. Unit Price (col-span-12 sm:col-span-6 md:col-span-3) */}
                          <div className="sm:col-span-6 md:col-span-3">
                            <div className="h-5 flex items-center justify-between mb-1.5">
                              <label className="text-xs font-semibold text-gray-700 leading-5">
                                ราคาต่อคัน (บาท)
                              </label>
                              {item.priceType === 'RANGE' && (
                                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80 leading-none">
                                  ช่วงราคา
                                </span>
                              )}
                            </div>

                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">฿</span>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => updateItemField(item.vin, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full h-10 pl-7 pr-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white transition-all"
                              />
                            </div>

                            {item.priceType === 'RANGE' && item.minPrice !== undefined && item.maxPrice !== undefined && (
                              <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1 truncate">
                                <span>💡 ช่วงแนะนำ:</span>
                                <span className="font-mono font-bold">฿{item.minPrice} - ฿{item.maxPrice}</span>
                              </p>
                            )}
                          </div>

                          {/* 3. Actual Wash Date (col-span-12 sm:col-span-6 md:col-span-3) */}
                          <div className="sm:col-span-6 md:col-span-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 leading-5">
                              วันปฏิบัติงานจริง
                            </label>

                            <input
                              type="date"
                              value={item.actualWashDate}
                              onChange={(e) => updateItemField(item.vin, 'actualWashDate', e.target.value)}
                              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white transition-all"
                            />
                          </div>
                        </div>

                        {/* Row 2: Remarks (Full width) */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                            <span>หมายเหตุ / จุดระวังเฉพาะคัน</span>
                            <span className="text-[11px] font-normal text-gray-400">ไม่บังคับ</span>
                          </label>
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => updateItemField(item.vin, 'remarks', e.target.value)}
                            placeholder={item.washType === 'POLISH_STAINS' ? 'ระบุตำแหน่งรอย เช่น รอยขูดขีดกันชนหน้า, คราบยางมะตอย...' : 'ระบุรายละเอียดเพิ่มเติม หรือจุดที่ต้องการให้เน้นเป็นพิเศษ (ถ้ามี)...'}
                            className="w-full h-10 px-3.5 rounded-xl border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Summary Bar */}
            {selectedItems.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl border border-emerald-900/10 bg-gradient-to-r from-emerald-50/40 via-white to-emerald-50/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <span className="text-xs text-gray-500 font-medium">ยอดรวมค่าบริการ (Subtotal):</span>
                    <div className="text-lg font-bold text-gray-800">
                      ฿{orderFinancials.subtotal.toLocaleString()}
                    </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200 hidden sm:block" />

                  <div>
                    <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                      <span>ภาษีมูลค่าเพิ่ม:</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                        washConfig.vatType === 'VAT_7' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {washConfig.vatType === 'VAT_7' ? 'VAT 7%' : 'No VAT'}
                      </span>
                    </span>
                    <div className="text-sm font-semibold text-gray-700 mt-0.5">
                      {washConfig.vatType === 'VAT_7' ? `+฿${orderFinancials.vatAmount.toLocaleString()}` : 'ไม่มี VAT (บุคคลธรรมดา)'}
                    </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200 hidden sm:block" />

                  <div>
                    <span className="text-xs text-gray-500 font-medium">ยอดสุทธิรวมทั้งสิ้น:</span>
                    <div className="text-2xl font-black" style={{ color: theme.primary }}>
                      ฿{orderFinancials.grandTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:opacity-90 active:scale-98 cursor-pointer w-full md:w-auto"
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
      <WashConfirmModal
        isOpen={showConfirmModal}
        isSubmitting={isSubmitting}
        branchName={selectedBranch?.name || ''}
        supplierName={selectedSupplier?.name || ''}
        requestedBy={requestedBy}
        requesterPosition={requesterPosition}
        totalItems={selectedItems.length}
        totalEstimatedCost={totalEstimatedCost}
        subtotal={orderFinancials.subtotal}
        vatType={washConfig.vatType}
        vatAmount={orderFinancials.vatAmount}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmOrder}
      />

      {/* PDF Export & Order Confirmation Modal */}
      <WashOrderPrintModal
        createdJob={createdJob}
        onClose={() => setCreatedJob(null)}
      />
    </div>
  );
}
