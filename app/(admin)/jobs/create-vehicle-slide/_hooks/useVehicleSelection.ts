'use client';

import { useState, useMemo, useCallback } from 'react';
import { Building2 } from 'lucide-react';
import type { DropdownOption } from '@/components/ui/CustomDropdown';
import type { Branch, UserRole, Vehicle } from '@/types';
import { getBranchShortLabel } from '../_utils';

interface UseVehicleSelectionParams {
  vehicles: Vehicle[];
  branches: Branch[];
  currentRole: UserRole;
  activeBranchId?: string;
  currentBranchId?: string;
  authUserBranchId?: string | null;
  setSelectedOriginBranchId: (id: string) => void;
  setDestBranchId: (id: string) => void;
  updateJobStatus: (
    jobId: string,
    status: 'CANCELLED',
    extra?: { rejectReason?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  updateCarWashItemStatus: (
    jobId: string,
    itemId: string,
    status: 'CANCELLED',
    remarks?: string
  ) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useVehicleSelection({
  vehicles,
  branches,
  currentRole,
  activeBranchId,
  currentBranchId,
  authUserBranchId,
  setSelectedOriginBranchId,
  setDestBranchId,
  updateJobStatus,
  updateCarWashItemStatus,
  showToast,
}: UseVehicleSelectionParams) {
  // Branch filter for vehicle stock list (defaults to ALL to show cars from all branches)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [selectedVins, setSelectedVins] = useState<string[]>([]);

  // State for cancelling busy vehicle order (if not verified by supplier yet)
  const [vehicleToCancel, setVehicleToCancel] = useState<Vehicle | null>(null);
  const [isCancellingBusyJob, setIsCancellingBusyJob] = useState(false);

  // All vehicles available for slide (excluding maintenance / out of stock)
  const availableStockVehicles = useMemo(() => {
    return vehicles.filter((v) => v.status !== 'MAINTENANCE' && v.status !== 'OUT_OF_STOCK');
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

    const list: DropdownOption[] = branches.map((b) => {
      const count = availableStockVehicles.filter((v) => v.currentBranchId === b.id).length;
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

  const selectedVinSet = useMemo(() => new Set(selectedVins), [selectedVins]);

  const selectedVehicles = useMemo(() => {
    return vehicles.filter((v) => selectedVinSet.has(v.vin));
  }, [vehicles, selectedVinSet]);

  // ค้นหาสาขาที่เป็นเจ้าของรถต้นสังกัด (Original Vehicle Owner Branch ตาม d365SiteId)
  const getVehicleOwnerBranch = useCallback(
    (v?: Vehicle | null) => {
      if (!v) return undefined;
      const siteCode = (v.d365SiteId || v.ownerBranchCode || '').trim().toUpperCase();
      if (siteCode) {
        const byCode = branches.find((b) => b.code.trim().toUpperCase() === siteCode);
        if (byCode) return byCode;
      }
      if (v.ownerBranchId) {
        const byOwnerId = branches.find((b) => b.id === v.ownerBranchId);
        if (byOwnerId) return byOwnerId;
      }
      if (v.currentBranchId) {
        const byCurrentId = branches.find((b) => b.id === v.currentBranchId);
        if (byCurrentId) return byCurrentId;
      }
      return undefined;
    },
    [branches]
  );

  const filteredVehicles = useMemo(() => {
    return availableStockVehicles.filter((v) => {
      if (selectedBranchFilter !== 'ALL' && v.currentBranchId !== selectedBranchFilter) {
        return false;
      }
      if (searchTags.length === 0) return true;
      return searchTags.some((q) => {
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
  const selectableVehicles = useMemo(
    () => filteredVehicles.filter((v) => !v.activeJob),
    [filteredVehicles]
  );

  const isAllFilteredSelected = useMemo(
    () => selectableVehicles.length > 0 && selectableVehicles.every((v) => selectedVinSet.has(v.vin)),
    [selectableVehicles, selectedVinSet]
  );

  const someFilteredSelected = useMemo(
    () => filteredVehicles.some((v) => selectedVinSet.has(v.vin)),
    [filteredVehicles, selectedVinSet]
  );

  const handleToggleSelectAllFiltered = useCallback(() => {
    if (isAllFilteredSelected) {
      const filteredVinSet = new Set(filteredVehicles.map((v) => v.vin));
      setSelectedVins((prev) => {
        const next = prev.filter((vin) => !filteredVinSet.has(vin));
        if (next.length === 0 && currentRole === 'BRANCH') {
          const myBranchId = activeBranchId || currentBranchId || authUserBranchId;
          if (myBranchId) setSelectedOriginBranchId(myBranchId);
        }
        return next;
      });
    } else {
      const anchorVehicle =
        (selectedVins.length > 0 ? vehicles.find((v) => v.vin === selectedVins[0]) : undefined) ||
        selectableVehicles[0];
      if (!anchorVehicle) return;

      const targetBranchId = anchorVehicle.currentBranchId;
      const targetOwnerBranch = getVehicleOwnerBranch(anchorVehicle);
      const targetVehicles = selectableVehicles.filter((v) => {
        if (v.currentBranchId !== targetBranchId) return false;
        const vOwner = getVehicleOwnerBranch(v);
        if (targetOwnerBranch && vOwner && vOwner.id !== targetOwnerBranch.id) return false;
        return true;
      });

      if (targetBranchId) {
        setSelectedOriginBranchId(targetBranchId);
      }
      const newVins = new Set([...selectedVins, ...targetVehicles.map((v) => v.vin)]);
      setSelectedVins(Array.from(newVins));

      if (targetVehicles.length < selectableVehicles.length) {
        const targetBranch = branches.find((b) => b.id === targetBranchId);
        const targetBranchLabel = getBranchShortLabel(targetBranch?.code, targetBranch?.name);
        const ownerLabel = targetOwnerBranch
          ? getBranchShortLabel(targetOwnerBranch.code, targetOwnerBranch.name)
          : targetBranchLabel;
        showToast(
          `เลือกเฉพาะรถที่จอดอยู่ ${targetBranchLabel} และเป็นรถของสาขา ${ownerLabel} (${targetVehicles.length} คัน)`,
          'info'
        );
      }
    }
  }, [
    isAllFilteredSelected,
    filteredVehicles,
    currentRole,
    activeBranchId,
    currentBranchId,
    authUserBranchId,
    setSelectedOriginBranchId,
    selectedVins,
    vehicles,
    selectableVehicles,
    getVehicleOwnerBranch,
    branches,
    showToast,
  ]);

  const handleToggleVehicle = useCallback(
    (vin: string) => {
      const clickedVehicle = vehicles.find((v) => v.vin === vin);
      if (!clickedVehicle) return;

      if (!selectedVinSet.has(vin)) {
        const busyJob = clickedVehicle.activeJob;
        if (busyJob) {
          showToast(
            `รถคันนี้มีงานค้างอยู่ (ใบงาน ${busyJob.jobNumber}) — สั่งงานซ้ำได้เมื่องานเดิมเสร็จสิ้น`,
            'warning'
          );
          return;
        }

        // If other vehicles are already selected, ensure they are from the same origin branch and same owner branch (PO branch)
        if (selectedVins.length > 0) {
          const firstSelected = vehicles.find((v) => v.vin === selectedVins[0]);
          if (firstSelected && firstSelected.currentBranchId !== clickedVehicle.currentBranchId) {
            const firstBranch = branches.find((b) => b.id === firstSelected.currentBranchId);
            const clickedBranch = branches.find((b) => b.id === clickedVehicle.currentBranchId);
            const firstLabel = getBranchShortLabel(
              firstBranch?.code || firstSelected.currentBranchCode,
              firstBranch?.name
            );
            const clickedLabel = getBranchShortLabel(
              clickedBranch?.code || clickedVehicle.currentBranchCode,
              clickedBranch?.name
            );
            showToast(`เลือกได้เฉพาะรถสาขา ${firstLabel} (คันนี้อยู่ ${clickedLabel})`, 'warning');
            return;
          }
          const firstOwnerBranch = getVehicleOwnerBranch(firstSelected);
          const clickedOwnerBranch = getVehicleOwnerBranch(clickedVehicle);
          if (firstOwnerBranch && clickedOwnerBranch && firstOwnerBranch.id !== clickedOwnerBranch.id) {
            const firstOwnerLabel = getBranchShortLabel(firstOwnerBranch.code, firstOwnerBranch.name);
            const clickedOwnerLabel = getBranchShortLabel(clickedOwnerBranch.code, clickedOwnerBranch.name);
            showToast(
              `เลือกได้เฉพาะรถที่มีสาขาเจ้าของรถเดียวกัน (${firstOwnerLabel}) เพื่อเปิด PO ใน D365 (คันนี้เป็นรถของ ${clickedOwnerLabel})`,
              'warning'
            );
            return;
          }
        } else {
          // First vehicle selected: auto-sync Origin Branch to this vehicle's current location!
          if (clickedVehicle.currentBranchId) {
            setSelectedOriginBranchId(clickedVehicle.currentBranchId);
            // If branch user, and the car is from another branch, default destination to user's branch!
            const myBranchId = activeBranchId || currentBranchId || authUserBranchId;
            if (currentRole === 'BRANCH' && myBranchId && myBranchId !== clickedVehicle.currentBranchId) {
              setDestBranchId(myBranchId);
            }
          }
        }
      }

      setSelectedVins((prev) => {
        const next = prev.includes(vin) ? prev.filter((item) => item !== vin) : [...prev, vin];
        if (next.length === 0 && currentRole === 'BRANCH') {
          const myBranchId = activeBranchId || currentBranchId || authUserBranchId;
          if (myBranchId) setSelectedOriginBranchId(myBranchId);
        }
        return next;
      });
    },
    [
      vehicles,
      selectedVinSet,
      selectedVins,
      branches,
      getVehicleOwnerBranch,
      setSelectedOriginBranchId,
      activeBranchId,
      currentBranchId,
      authUserBranchId,
      currentRole,
      setDestBranchId,
      showToast,
    ]
  );

  const handleOpenCancelModal = useCallback(
    (e: React.MouseEvent, vehicle: Vehicle) => {
      e.stopPropagation();
      const busyJob = vehicle.activeJob;
      if (!busyJob) return;

      if (busyJob.verifiedAt) {
        showToast('ไม่สามารถยกเลิกได้ เนื่องจาก Supplier ได้ถ่ายรูปยืนยันตัวรถแล้ว', 'error');
        return;
      }

      setVehicleToCancel(vehicle);
    },
    [showToast]
  );

  const handleConfirmCancelBusyJob = useCallback(async () => {
    if (!vehicleToCancel) return;
    const busyJob = vehicleToCancel.activeJob;
    if (!busyJob) return;

    setIsCancellingBusyJob(true);
    try {
      if (busyJob.itemId) {
        const res = await updateCarWashItemStatus(
          busyJob.jobId,
          busyJob.itemId,
          'CANCELLED',
          'ยกเลิกโดยผู้ดูแลระบบ'
        );
        if (res) {
          showToast(
            `✓ ยกเลิกงานรถคัน ${vehicleToCancel.vin} สำเร็จ — ปลดล็อคพร้อมสั่งงานใหม่แล้ว`,
            'success'
          );
          setVehicleToCancel(null);
        } else {
          showToast('ไม่สามารถยกเลิกงานสำหรับรถคันนี้ได้', 'error');
        }
      } else {
        const res = await updateJobStatus(busyJob.jobId, 'CANCELLED', {
          rejectReason: 'ยกเลิกโดยผู้ดูแลระบบ',
        });
        if (res.success) {
          showToast(
            `✓ ยกเลิกงานรถคัน ${vehicleToCancel.vin} สำเร็จ — ปลดล็อคพร้อมสั่งงานใหม่แล้ว`,
            'success'
          );
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
  }, [vehicleToCancel, updateCarWashItemStatus, updateJobStatus, showToast]);

  return {
    availableStockVehicles,
    selectedBranchFilter,
    setSelectedBranchFilter,
    branchFilterOptions,
    searchTags,
    setSearchTags,
    selectedVins,
    setSelectedVins,
    selectedVinSet,
    selectedVehicles,
    getVehicleOwnerBranch,
    filteredVehicles,
    selectableVehicles,
    isAllFilteredSelected,
    someFilteredSelected,
    handleToggleSelectAllFiltered,
    handleToggleVehicle,
    vehicleToCancel,
    setVehicleToCancel,
    isCancellingBusyJob,
    handleOpenCancelModal,
    handleConfirmCancelBusyJob,
  };
}
