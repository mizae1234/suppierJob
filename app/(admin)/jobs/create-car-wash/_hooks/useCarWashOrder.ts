'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { CompanyCode, Job, Vehicle } from '@/types';
import { getSupplierVendorCode } from '@/lib/job-utils';
import {
  getSupplierWashConfig,
  calculateWashOrderFinancials,
  DEFAULT_WASH_CONFIG,
} from '@/lib/car-wash-rates';
import {
  CarCategory,
  CustomServiceVehicleInput,
  SelectedWashItem,
} from '../_types';
import {
  createWashItemFromVehicle,
  generateCustomServiceVin,
  getDefaultWashService,
  getWashReasonItem,
  mapSupplierServices,
} from '../_utils';

export function useCarWashOrder() {
  const {
    currentRole,
    currentCompany,
    currentBranchId,
    branches,
    companies,
    suppliers,
    vehicles,
    createCarWashJob,
    updateJobStatus,
    updateCarWashItemStatus,
  } = useApp();
  const { user: authUser } = useAuth();
  const { showToast } = useToast();

  // Car category state: 'NEW_CAR' (รถใหม่) vs 'SERVICE' (รถที่มา service)
  const [carCategory, setCarCategory] = useState<CarCategory>('NEW_CAR');

  // Batch wash reason state
  const [batchReason, setBatchReason] = useState<string>('ก่อนส่งมอบให้ลูกค้า');

  // Selected supplier (starts empty, user must choose)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // Selected vehicle items list
  const [selectedItems, setSelectedItems] = useState<SelectedWashItem[]>([]);

  // Auto-fill requester info from logged-in user
  const autoName = authUser?.firstName && authUser?.lastName
    ? `${authUser.firstName} ${authUser.lastName}`
    : authUser?.displayName || 'ผู้จัดการสาขา';
  const [requestedBy] = useState<string>(autoName);
  const [requesterPosition] = useState<string>(authUser?.position || '');
  const [requesterPhone] = useState<string>(authUser?.phone || '');

  // Order confirmation & print modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<Job | null>(null);

  // State for cancelling busy vehicle order (if not verified by supplier yet)
  const [vehicleToCancel, setVehicleToCancel] = useState<Vehicle | null>(null);
  const [isCancellingBusyJob, setIsCancellingBusyJob] = useState(false);

  // Wash Suppliers (handles both array and comma-separated string)
  const washSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (Array.isArray(s.services)) {
        return s.services.includes('CAR_WASH');
      }
      return typeof s.services === 'string' && (s.services as string).includes('CAR_WASH');
    });
  }, [suppliers]);

  const selectedSupplier = washSuppliers.find(s => s.id === selectedSupplierId);

  // Supplier wash config (Rates, Showrooms, VAT)
  const washConfig = useMemo(() => {
    if (!selectedSupplier) return DEFAULT_WASH_CONFIG;
    return getSupplierWashConfig(selectedSupplier.code, selectedSupplier.name, selectedSupplier);
  }, [selectedSupplier]);

  // Available service options for this supplier
  const supplierServices = useMemo(() => {
    return mapSupplierServices(washConfig);
  }, [washConfig]);

  // Available service options filtered by selected car category
  const categoryServices = useMemo(() => {
    const filtered = supplierServices.filter(s => s.category === carCategory);
    return filtered.length > 0 ? filtered : supplierServices;
  }, [supplierServices, carCategory]);

  // Branches filtered by selected company context
  const availableBranches = useMemo(() => {
    if (currentCompany === 'ALL') return branches;
    const companyObj = companies.find(c => c.code === currentCompany);
    if (!companyObj) return branches;
    const filtered = branches.filter(
      b => b.companyId === companyObj.id || (currentCompany === 'EV7' && (b.code === 'GI06' || b.code?.startsWith('EV7')))
    );
    return filtered.length > 0 ? filtered : branches;
  }, [branches, companies, currentCompany]);

  // Branch selection — Admin/Master pick from available branches, Branch role uses their own
  const authUserBranchId = authUser?.branchId;
  const selectedBranchId = useMemo(() => {
    if (branches.length === 0) return currentBranchId || '';
    if (currentRole === 'BRANCH') {
      return (
        (currentBranchId && branches.find(b => b.id === currentBranchId)?.id) ||
        (authUserBranchId && branches.find(b => b.id === authUserBranchId)?.id) ||
        availableBranches[0]?.id ||
        branches[0]?.id ||
        ''
      );
    }
    if (currentBranchId && branches.find(b => b.id === currentBranchId)) {
      return currentBranchId;
    }
    return availableBranches[0]?.id || branches[0]?.id || '';
  }, [branches, availableBranches, currentRole, currentBranchId, authUserBranchId]);

  // Clear selected items when active branch changes (non-BRANCH roles)
  const [prevBranchId, setPrevBranchId] = useState<string>(selectedBranchId);
  if (prevBranchId !== selectedBranchId) {
    setPrevBranchId(selectedBranchId);
    if (currentRole !== 'BRANCH' && selectedItems.length > 0) {
      setSelectedItems([]);
    }
  }

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const hasVendorCode = Boolean(
    selectedSupplier &&
      (selectedBranch
        ? getSupplierVendorCode(selectedSupplier, selectedBranch)
        : selectedSupplier.vendorCodes && selectedSupplier.vendorCodes.length > 0)
  );
  const isLockedBySupplier = !selectedSupplier || !hasVendorCode;

  // Financial calculation (Subtotal, VAT, Grand Total)
  const orderFinancials = useMemo(() => {
    return calculateWashOrderFinancials(selectedItems, washConfig.vatType);
  }, [selectedItems, washConfig.vatType]);

  const totalEstimatedCost = orderFinancials.grandTotal;

  // Select supplier and adapt existing items to the new supplier's rates
  const handleSelectSupplier = (newSupplierId: string) => {
    setSelectedSupplierId(newSupplierId);
    if (!newSupplierId) return;

    const nextSupplier = washSuppliers.find(s => s.id === newSupplierId);
    const nextConfig = nextSupplier
      ? getSupplierWashConfig(nextSupplier.code, nextSupplier.name, nextSupplier)
      : DEFAULT_WASH_CONFIG;
    const nextServices = mapSupplierServices(nextConfig);
    if (nextServices.length === 0) return;

    const defaultSvc = nextServices[0];
    setSelectedItems(prev => {
      if (prev.length === 0) return prev;
      return prev.map(item => {
        const matched = nextServices.find(s => s.code === item.washType);
        if (matched) {
          return {
            ...item,
            unitPrice:
              matched.priceType === 'FIXED'
                ? matched.price
                : Math.max(matched.minPrice || 0, Math.min(item.unitPrice, matched.maxPrice || Infinity)),
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
      });
    });
  };

  // Switch car category (รถใหม่ vs รถที่มา service) & adapt default service/reasons
  const handleCarCategoryChange = (newCategory: CarCategory) => {
    setCarCategory(newCategory);
    const targetReason = newCategory === 'NEW_CAR' ? 'ก่อนส่งมอบให้ลูกค้า' : 'หลังการซ่อมบำรุง';
    setBatchReason(targetReason);

    const targetServices = supplierServices.filter(s => s.category === newCategory);
    const defaultSvc = targetServices[0] || supplierServices[0];

    if (selectedItems.length > 0 && defaultSvc) {
      setSelectedItems(prev => prev.map(item => ({
        ...item,
        washType: defaultSvc.code,
        unitPrice: defaultSvc.price,
        priceType: defaultSvc.priceType,
        minPrice: defaultSvc.minPrice,
        maxPrice: defaultSvc.maxPrice,
        washReason: targetReason,
      })));
    }
  };

  const handleApplyReasonToAll = (customReasonValue?: string) => {
    if (selectedItems.length === 0) return;
    const valueToUse = customReasonValue !== undefined
      ? customReasonValue
      : batchReason;

    const normalized = getWashReasonItem(valueToUse).value;

    setSelectedItems(prev => prev.map(item => ({
      ...item,
      washReason: normalized,
    })));

    const matchedReason = getWashReasonItem(normalized);
    showToast(`✓ Apply เหตุผล "${matchedReason.icon} ${matchedReason.label}" ให้กับรถทั้ง ${selectedItems.length} คันเรียบร้อยแล้ว`, 'success');
  };

  // Toggle vehicle selection from list
  const handleToggleVehicle = (vehicle: Vehicle) => {
    const exists = selectedItems.some(it => it.vin === vehicle.vin);
    if (exists) {
      setSelectedItems(prev => prev.filter(it => it.vin !== vehicle.vin));
    } else if (vehicle.activeJob) {
      showToast(`รถคันนี้มีงานค้างอยู่ (ใบงาน ${vehicle.activeJob.jobNumber}) — สั่งงานซ้ำได้เมื่องานเดิมเสร็จสิ้น`, 'warning');
      return;
    } else {
      const newItem = createWashItemFromVehicle(vehicle, categoryServices, supplierServices, carCategory);
      setSelectedItems(prev => [...prev, newItem]);
    }
  };

  // Remove selected item by VIN (supports both stock and custom vehicles safely)
  const handleRemoveSelectedItem = (vin: string) => {
    setSelectedItems(prev => prev.filter(it => it.vin !== vin));
  };

  // Add custom service vehicle (not in stock - Approach 3)
  const handleAddCustomServiceVehicle = (data: CustomServiceVehicleInput) => {
    const cleanPlate = data.licensePlate.trim();
    const cleanModel = (data.model || '').trim() || 'รถลูกค้า Service';
    const cleanPlateCore = cleanPlate.replace(/[^0-9A-Za-z\u0E00-\u0E7F]/g, '');
    const generatedVin = generateCustomServiceVin(cleanPlateCore, data.vin);

    const exists = selectedItems.some(it =>
      it.vin === generatedVin ||
      (it.licensePlate && cleanPlate && it.licensePlate.replace(/\s+/g, '') === cleanPlate.replace(/\s+/g, ''))
    );
    if (exists) {
      showToast(`รถทะเบียน "${cleanPlate || generatedVin}" อยู่ในรายการสั่งล้างแล้ว`, 'warning');
      return;
    }

    const defaultSvc = getDefaultWashService(categoryServices, supplierServices, carCategory, 'CUSTOM_SERVICE');

    const newItem: SelectedWashItem = {
      vin: generatedVin,
      model: cleanModel,
      color: data.color || 'ไม่ระบุสี',
      licensePlate: cleanPlate || undefined,
      actualWashDate: new Date().toISOString().slice(0, 10),
      washType: defaultSvc.code,
      unitPrice: defaultSvc.price,
      priceType: defaultSvc.priceType,
      minPrice: defaultSvc.minPrice,
      maxPrice: defaultSvc.maxPrice,
      washReason: 'หลังการซ่อมบำรุง',
      remarks: data.roNumber ? `RO: ${data.roNumber}` : '',
      isCustomServiceVehicle: true,
      roNumber: data.roNumber,
    };

    setSelectedItems(prev => [newItem, ...prev]);
    showToast(`✓ เพิ่มรถ Service (${cleanPlate || cleanModel}) ลงในรายการเรียบร้อยแล้ว`, 'success');
  };

  // Update item field
  const updateItemField = <K extends keyof SelectedWashItem>(
    vin: string,
    field: K,
    value: SelectedWashItem[K]
  ) => {
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
        }
      }
      return updated;
    }));
  };

  // Handler for cancelling busy vehicle order (if not verified by supplier yet)
  const handleOpenCancelModal = (e: React.MouseEvent, vehicle: Vehicle) => {
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

  // Form submit - opens alert confirmation modal
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('กรุณาเลือก Supplier ผู้ให้บริการ', 'warning');
      return;
    }
    if (!hasVendorCode) {
      showToast('ไม่สามารถสั่งงานได้ — ต้องเลือก Supplier ที่มีรหัส Vendor D365 ของสาขานี้เท่านั้น', 'error');
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
        items: selectedItems.map(it => {
          const reasonPart = it.washReason?.trim() || '';
          const roPart = it.roNumber ? `RO: ${it.roNumber.trim()}` : '';
          const remarkPart = it.remarks?.trim() || '';
          const parts = [reasonPart, roPart, remarkPart].filter(Boolean);
          const combinedRemarks = parts.join(' • ');

          return {
            vin: it.vin,
            model: it.model,
            color: it.color,
            licensePlate: it.licensePlate,
            actualWashDate: it.actualWashDate,
            washType: it.washType,
            unitPrice: it.unitPrice,
            remarks: combinedRemarks,
            isCustomServiceVehicle: it.isCustomServiceVehicle,
          };
        }),
        requestedBy,
        requesterPosition,
        requesterPhone,
        estimatedCost: orderFinancials.grandTotal,
        carCategory,
        transferReason: carCategory === 'NEW_CAR' ? 'รถใหม่ (Stock / PDI)' : 'รถ Service (ศูนย์บริการ)',
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

  return {
    currentRole,
    vehicles,
    // Branch & Supplier
    selectedBranchId,
    selectedBranch,
    washSuppliers,
    selectedSupplierId,
    selectedSupplier,
    handleSelectSupplier,
    isLockedBySupplier,
    washConfig,
    supplierServices,
    categoryServices,
    // Category & Batch Reason
    carCategory,
    handleCarCategoryChange,
    batchReason,
    setBatchReason,
    handleApplyReasonToAll,
    // Selected Items & Pricing
    selectedItems,
    setSelectedItems,
    handleToggleVehicle,
    handleRemoveSelectedItem,
    handleAddCustomServiceVehicle,
    updateItemField,
    orderFinancials,
    totalEstimatedCost,
    // Requester Info
    requestedBy,
    requesterPosition,
    // Modals & Submission
    showConfirmModal,
    setShowConfirmModal,
    isSubmitting,
    createdJob,
    setCreatedJob,
    handleSubmit,
    handleConfirmOrder,
    // Busy Vehicle Cancellation
    vehicleToCancel,
    setVehicleToCancel,
    isCancellingBusyJob,
    handleOpenCancelModal,
    handleConfirmCancelBusyJob,
  };
}
