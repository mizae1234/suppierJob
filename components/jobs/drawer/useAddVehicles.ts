'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Job } from '@/types';
import { haversineDistance } from '@/lib/job-utils';
import { getSupplierWashConfig } from '@/lib/car-wash-rates';
import { calculateSlideJobCost, getBranchDefaultCoords } from '@/lib/vehicle-slide-rates';

interface UseAddVehiclesParams {
  contextJob: Job | null;
  activeJob: Job | null;
  detailJobId: string | undefined;
  canModifyBeforeSupplierStarts: boolean;
}

export function useAddVehicles({
  contextJob,
  activeJob,
  detailJobId,
  canModifyBeforeSupplierStarts,
}: UseAddVehiclesParams) {
  const { branches, vehicles, suppliers, addVehiclesToJob } = useApp();
  const { showToast } = useToast();

  // Add Vehicle panel state (แนวทางที่ 1: เพิ่มรถได้ก่อนที่ Supplier จะกดยืนยันรถคันแรก)
  const [isAddingVehicles, setIsAddingVehicles] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [selectedAddVins, setSelectedAddVins] = useState<string[]>([]);
  const [addWashType, setAddWashType] = useState<string>('WASH_NORMAL');
  const [addRemarks, setAddRemarks] = useState<string>('');
  const [showAllBranchesForAdd, setShowAllBranchesForAdd] = useState(false);
  const [isSubmittingAddVehicles, setIsSubmittingAddVehicles] = useState(false);

  const [prevDetailJobId, setPrevDetailJobId] = useState<string | undefined>(detailJobId);
  if (prevDetailJobId !== detailJobId) {
    setPrevDetailJobId(detailJobId);
    setIsAddingVehicles(false);
    setSelectedAddVins([]);
    setAddSearchQuery('');
  }

  // Memoize vehicle filtering & lookup maps
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const activeItemsInJob = useMemo(
    () => (contextJob?.carWashItems || []).filter((i) => i.status !== 'CANCELLED'),
    [contextJob?.carWashItems]
  );

  const activeVinSet = useMemo(
    () => new Set(activeItemsInJob.map((i) => i.vin.toUpperCase())),
    [activeItemsInJob]
  );

  const targetOriginBranchId = contextJob
    ? contextJob.jobType === 'VEHICLE_SLIDE'
      ? contextJob.pickupBranchId || contextJob.branchId
      : contextJob.branchId
    : undefined;

  const baseAvailableForAdd = useMemo(() => {
    if (!isAddingVehicles || !contextJob) return [];
    return vehicles.filter(
      (v) => v.status === 'AVAILABLE' && !activeVinSet.has(v.vin.toUpperCase())
    );
  }, [isAddingVehicles, contextJob, vehicles, activeVinSet]);

  const originAvailableCount = useMemo(() => {
    if (!targetOriginBranchId) return baseAvailableForAdd.length;
    return baseAvailableForAdd.filter((v) => v.currentBranchId === targetOriginBranchId).length;
  }, [baseAvailableForAdd, targetOriginBranchId]);

  const allAvailableCount = baseAvailableForAdd.length;

  const selectableVehiclesForAdd = useMemo(() => {
    const q = addSearchQuery.trim().toLowerCase();
    return baseAvailableForAdd.filter((v) => {
      if (
        !showAllBranchesForAdd &&
        targetOriginBranchId &&
        v.currentBranchId !== targetOriginBranchId
      ) {
        return false;
      }
      if (q) {
        const vBranch = branchMap.get(v.currentBranchId);
        const matchVin = v.vin.toLowerCase().includes(q);
        const matchModel = (v.model || '').toLowerCase().includes(q);
        const matchPlate = (v.licensePlate || '').toLowerCase().includes(q);
        const matchBranch =
          (vBranch?.code || '').toLowerCase().includes(q) ||
          (vBranch?.name || '').toLowerCase().includes(q);
        if (!matchVin && !matchModel && !matchPlate && !matchBranch) return false;
      }
      return true;
    });
  }, [baseAvailableForAdd, showAllBranchesForAdd, targetOriginBranchId, addSearchQuery, branchMap]);

  const jobSupplierObj = activeJob
    ? suppliers.find((s) => s.id === activeJob.supplierId)
    : undefined;
  const washConfig = getSupplierWashConfig(
    jobSupplierObj?.code,
    activeJob?.supplierName,
    jobSupplierObj
  );
  const originBranchForAdd = branches.find((b) => b.id === targetOriginBranchId);
  const destBranchForAdd = activeJob?.destBranchId
    ? branches.find((b) => b.id === activeJob.destBranchId)
    : undefined;

  // เรทราคาตามสัญญาของ Supplier เจ้านั้นๆ (ล็อกไม่ให้แก้ไข)
  const originCoordsForAdd = activeJob
    ? activeJob.customOriginLat != null && activeJob.customOriginLng != null
      ? { lat: activeJob.customOriginLat, lng: activeJob.customOriginLng }
      : activeJob.pickupBranchLat != null && activeJob.pickupBranchLng != null
        ? { lat: activeJob.pickupBranchLat, lng: activeJob.pickupBranchLng }
        : originBranchForAdd?.latitude != null && originBranchForAdd?.longitude != null
          ? { lat: originBranchForAdd.latitude, lng: originBranchForAdd.longitude }
          : getBranchDefaultCoords(
              originBranchForAdd?.code || activeJob.pickupBranchName || activeJob.branchName
            )
    : undefined;

  const destCoordsForAdd = activeJob
    ? activeJob.customDestLat != null && activeJob.customDestLng != null
      ? { lat: activeJob.customDestLat, lng: activeJob.customDestLng }
      : activeJob.destBranchLat != null && activeJob.destBranchLng != null
        ? { lat: activeJob.destBranchLat, lng: activeJob.destBranchLng }
        : destBranchForAdd?.latitude != null && destBranchForAdd?.longitude != null
          ? { lat: destBranchForAdd.latitude, lng: destBranchForAdd.longitude }
          : getBranchDefaultCoords(destBranchForAdd?.code || activeJob.destBranchName)
    : undefined;

  const estimatedDistanceKmForAdd = activeJob
    ? activeJob.distance ||
      (originCoordsForAdd && destCoordsForAdd
        ? Math.round(
            haversineDistance(
              originCoordsForAdd.lat,
              originCoordsForAdd.lng,
              destCoordsForAdd.lat,
              destCoordsForAdd.lng
            ) *
              1.25 *
              10
          ) / 10
        : 32)
    : 32;

  const slidePricingForAdd =
    activeJob && activeJob.jobType === 'VEHICLE_SLIDE'
      ? calculateSlideJobCost({
          supplierCodeOrId: jobSupplierObj?.code || activeJob.supplierId,
          supplierName: activeJob.supplierName,
          distanceKm: estimatedDistanceKmForAdd,
          originMode: activeJob.customOriginAddress ? 'custom' : 'branch',
          destMode: activeJob.customDestAddress || !activeJob.destBranchId ? 'custom' : 'branch',
          originBranchCode: originBranchForAdd?.code,
          originBranchName:
            activeJob.pickupBranchName || originBranchForAdd?.name || activeJob.branchName,
          destBranchCode: destBranchForAdd?.code,
          destBranchName: activeJob.destBranchName || destBranchForAdd?.name,
          carCount: 1,
        })
      : null;

  const existingPositiveUnitPrice =
    activeItemsInJob.find((i) => i.unitPrice > 0)?.unitPrice ??
    activeJob?.carWashItems?.find((i) => i.unitPrice > 0)?.unitPrice;

  const effectiveWashTypeForAdd =
    activeJob?.jobType === 'VEHICLE_SLIDE'
      ? 'VEHICLE_SLIDE'
      : addWashType ||
        activeItemsInJob[0]?.washType ||
        washConfig.services[0]?.serviceCode ||
        'WASH_NORMAL';

  const lockedUnitPriceForAdd =
    activeJob?.jobType === 'VEHICLE_SLIDE'
      ? existingPositiveUnitPrice || slidePricingForAdd?.costPerCar || 1500
      : (washConfig.services.find((s) => s.serviceCode === effectiveWashTypeForAdd)?.price ??
        existingPositiveUnitPrice ??
        washConfig.services[0]?.price ??
        150);

  const handleOpenAddVehicles = () => {
    if (!activeJob) return;
    if (!canModifyBeforeSupplierStarts) {
      showToast('ไม่สามารถเพิ่มรถได้ เนื่องจาก Supplier ได้ยืนยันตัวรถและเริ่มงานแล้ว', 'error');
      return;
    }
    const initialWashType =
      activeJob.jobType === 'VEHICLE_SLIDE'
        ? 'VEHICLE_SLIDE'
        : activeItemsInJob[0]?.washType || washConfig.services[0]?.serviceCode || 'WASH_NORMAL';
    setAddWashType(initialWashType);
    setAddRemarks('');
    setSelectedAddVins([]);
    setAddSearchQuery('');
    setShowAllBranchesForAdd(false);
    setIsAddingVehicles((prev) => !prev);
  };

  const handleToggleAddVin = (vin: string) => {
    setSelectedAddVins((prev) =>
      prev.includes(vin) ? prev.filter((v) => v !== vin) : [...prev, vin]
    );
  };

  const handleConfirmAddVehicles = async () => {
    if (!activeJob) return;
    if (selectedAddVins.length === 0) {
      showToast('กรุณาเลือกรถที่ต้องการเพิ่มอย่างน้อย 1 คัน', 'error');
      return;
    }
    setIsSubmittingAddVehicles(true);
    try {
      const payloadItems = selectedAddVins.map((vin) => {
        const vObj = vehicles.find((v) => v.vin === vin);
        return {
          vin,
          washType: effectiveWashTypeForAdd,
          unitPrice: lockedUnitPriceForAdd,
          remarks: addRemarks.trim() || undefined,
          model: vObj?.model,
          color: vObj?.color,
          licensePlate: vObj?.licensePlate,
        };
      });
      const res = await addVehiclesToJob(activeJob.id, payloadItems);
      if (res.success) {
        showToast(
          `เพิ่มรถเข้าใบงาน ${activeJob.jobNumber} เรียบร้อยแล้ว (${selectedAddVins.length} คัน)`,
          'success'
        );
        setIsAddingVehicles(false);
        setSelectedAddVins([]);
        setAddSearchQuery('');
      } else {
        showToast(res.error || 'ไม่สามารถเพิ่มรถเข้าใบงานได้', 'error');
      }
    } finally {
      setIsSubmittingAddVehicles(false);
    }
  };

  return {
    isAddingVehicles,
    setIsAddingVehicles,
    addSearchQuery,
    setAddSearchQuery,
    selectedAddVins,
    setSelectedAddVins,
    setAddWashType,
    showAllBranchesForAdd,
    setShowAllBranchesForAdd,
    isSubmittingAddVehicles,
    branchMap,
    originBranchForAdd,
    destBranchForAdd,
    originAvailableCount,
    allAvailableCount,
    selectableVehiclesForAdd,
    washConfig,
    slidePricingForAdd,
    effectiveWashTypeForAdd,
    lockedUnitPriceForAdd,
    handleOpenAddVehicles,
    handleToggleAddVin,
    handleConfirmAddVehicles,
  };
}

export type UseAddVehiclesReturn = ReturnType<typeof useAddVehicles>;
