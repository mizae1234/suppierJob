'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Branch, Supplier } from '@/types';
import { calculateSlideJobCost, SlideCalculationResult } from '@/lib/vehicle-slide-rates';
import {
  SlidePricingMode,
  SLIDE_PRICING_AUTO,
  SLIDE_PRICING_MANUAL,
  getManualPriceDiff,
} from '@/lib/slide-pricing';
import type { RouteMode } from '../_types';

interface UseSlidePricingParams {
  selectedSupplier?: Supplier;
  selectedSupplierId: string;
  routeDistance: number;
  originMode: RouteMode;
  destMode: RouteMode;
  originBranchObj?: Branch;
  destBranch?: Branch;
  selectedCount: number;
}

export function useSlidePricing({
  selectedSupplier,
  selectedSupplierId,
  routeDistance,
  originMode,
  destMode,
  originBranchObj,
  destBranch,
  selectedCount,
}: UseSlidePricingParams) {
  // ── วิธีคิดค่าบริการ: AUTO = ระบบคำนวณ (ค่าเริ่มต้น), MANUAL = พนักงานกรอกระยะทาง/ราคาต่อคันเอง ──
  const [pricingMode, setPricingMode] = useState<SlidePricingMode>(SLIDE_PRICING_AUTO);
  const [manualDistance, setManualDistance] = useState<number>(0);
  const [manualCost, setManualCost] = useState<number>(0);
  const [manualPriceNote, setManualPriceNote] = useState<string>('');
  const isManualPricing = pricingMode === SLIDE_PRICING_MANUAL;

  const distance = isManualPricing ? manualDistance : routeDistance;

  // Dynamic slide pricing recalculation based on contract matrices
  const pricingCalculation = useMemo<SlideCalculationResult | null>(() => {
    if (!selectedSupplierId) return null;
    return calculateSlideJobCost({
      supplierCodeOrId: selectedSupplier?.code || selectedSupplierId,
      supplierName: selectedSupplier?.name,
      distanceKm: distance,
      originMode,
      destMode,
      originBranchCode: originBranchObj?.code,
      originBranchName: originBranchObj?.name,
      destBranchCode: destMode === 'branch' ? destBranch?.code : null,
      destBranchName: destMode === 'branch' ? destBranch?.name : null,
      carCount: selectedCount || 1,
    });
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
    selectedCount,
  ]);

  const contractCostPerCar = pricingCalculation?.costPerCar ?? 0;
  const estimatedCost = isManualPricing ? manualCost : contractCostPerCar;
  const manualPriceDiff = isManualPricing ? getManualPriceDiff(manualCost, contractCostPerCar) : null;

  const handleChangePricingMode = useCallback(
    (mode: SlidePricingMode) => {
      if (mode === pricingMode) return;
      if (mode === SLIDE_PRICING_MANUAL) {
        // ตั้งต้นจากค่าที่ระบบคำนวณ ให้พนักงานแก้ต่อได้ทันที
        setManualDistance(routeDistance);
        setManualCost(contractCostPerCar);
      }
      setPricingMode(mode);
    },
    [pricingMode, routeDistance, contractCostPerCar]
  );

  const handleResetManualToAuto = useCallback(() => {
    setManualDistance(routeDistance);
    setManualCost(contractCostPerCar);
  }, [routeDistance, contractCostPerCar]);

  return {
    pricingMode,
    isManualPricing,
    manualDistance,
    setManualDistance,
    manualCost,
    setManualCost,
    manualPriceNote,
    setManualPriceNote,
    distance,
    pricingCalculation,
    contractCostPerCar,
    estimatedCost,
    manualPriceDiff,
    handleChangePricingMode,
    handleResetManualToAuto,
  };
}
