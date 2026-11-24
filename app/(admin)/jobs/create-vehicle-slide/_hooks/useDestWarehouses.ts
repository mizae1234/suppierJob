'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DropdownOption } from '@/components/ui/CustomDropdown';
import type { Branch, Vehicle } from '@/types';
import {
  D365_SHOWROOM_WAREHOUSE_TO_BRANCH,
  D365WarehouseOption,
  getD365WarehouseForBranch,
  getD365WarehouseName,
  getFallbackWarehouseOptionsForBranch,
} from '@/lib/d365/warehouses';
import type { OriginWarehouseGroup } from '../_types';

interface UseDestWarehousesParams {
  destBranch?: Branch;
  destBranchId: string;
  originBranchObj?: Branch;
  vehicles: Vehicle[];
  selectedVehicles: Vehicle[];
}

export function useDestWarehouses({
  destBranch,
  destBranchId,
  originBranchObj,
  vehicles,
  selectedVehicles,
}: UseDestWarehousesParams) {
  // ── รหัสคลัง D365 ปลายทาง (สไลด์ระหว่างสาขา) — ตั้งต้นเป็นคลังหลักของสาขาปลายทาง แก้ไขได้ ──
  const [destWarehouseInput, setDestWarehouseInput] = useState<{ branchId: string; value: string } | null>(null);
  const [d365WarehousesByCompany, setD365WarehousesByCompany] = useState<Record<string, D365WarehouseOption[]>>({});
  const defaultDestWarehouse = getD365WarehouseForBranch(destBranch?.code) || '';

  // ดึงรายการคลัง D365 ของสาขาปลายทางจาก API เส้น /api/integrations/d365/warehouses
  useEffect(() => {
    const code = destBranch?.code?.trim().toUpperCase();
    if (!code || d365WarehousesByCompany[code]) return;
    let cancelled = false;
    fetch(`/api/integrations/d365/warehouses?company=${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.warehouses)) return;
        setD365WarehousesByCompany((prev) => ({
          ...prev,
          [code]: data.warehouses as D365WarehouseOption[],
        }));
      })
      .catch(() => {
        /* fallback ใช้ค่าตั้งต้นใน lib/d365/warehouses.ts */
      });
    return () => {
      cancelled = true;
    };
  }, [destBranch?.code, d365WarehousesByCompany]);

  const d365WarehouseCatalog = useMemo(() => {
    const code = destBranch?.code?.trim().toUpperCase();
    if (!code) return [] as D365WarehouseOption[];
    const base = d365WarehousesByCompany[code] ?? getFallbackWarehouseOptionsForBranch(code);
    const seen = new Set(base.map((w) => w.warehouseId));
    const extra: D365WarehouseOption[] = [];
    for (const v of vehicles) {
      const wh = v.d365WarehouseId?.trim();
      const mappedBranch = wh ? D365_SHOWROOM_WAREHOUSE_TO_BRANCH[wh] : undefined;
      if (wh && v.currentBranchId === destBranchId && !seen.has(wh) && (!mappedBranch || mappedBranch === code)) {
        seen.add(wh);
        extra.push({
          warehouseId: wh,
          warehouseName: getD365WarehouseName(wh) || wh,
          dataAreaId: code,
        });
      }
    }
    return [...base, ...extra];
  }, [destBranch?.code, destBranchId, d365WarehousesByCompany, vehicles]);

  // เลือกได้เฉพาะคลังที่อยู่ในรายการ (dropdown) — ค่าเริ่มต้นว่าง ให้ผู้สั่งงานเลือกเอง
  const destWarehouseId = useMemo(() => {
    const ids = d365WarehouseCatalog.map((w) => w.warehouseId);
    const picked = destWarehouseInput && destWarehouseInput.branchId === destBranchId ? destWarehouseInput.value : '';
    if (picked && ids.includes(picked)) return picked;
    return '';
  }, [d365WarehouseCatalog, destWarehouseInput, destBranchId]);

  const handleSelectDestWarehouse = useCallback(
    (wh: string) => {
      setDestWarehouseInput({ branchId: destBranchId, value: wh });
    },
    [destBranchId]
  );

  const destWarehouseDropdownOptions: DropdownOption[] = useMemo(
    () =>
      d365WarehouseCatalog.map((w) => ({
        value: w.warehouseId,
        label: `${w.warehouseId} · ${w.warehouseName}`,
        ...(w.warehouseId === defaultDestWarehouse
          ? { badge: 'คลังหลัก', badgeClass: 'bg-emerald-50 text-emerald-700' }
          : {}),
      })),
    [d365WarehouseCatalog, defaultDestWarehouse]
  );

  const selectedDestWarehouseName = useMemo(() => {
    if (!destWarehouseId) return null;
    const found = d365WarehouseCatalog.find((w) => w.warehouseId === destWarehouseId.trim());
    return found?.warehouseName || getD365WarehouseName(destWarehouseId);
  }, [destWarehouseId, d365WarehouseCatalog]);

  const originWarehouseSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of selectedVehicles) {
      const wh = v.d365WarehouseId?.trim() || 'ไม่ระบุ';
      counts[wh] = (counts[wh] || 0) + 1;
    }
    return Object.entries(counts);
  }, [selectedVehicles]);

  // คลังต้นทาง (ที่รถจอดอยู่ตาม D365) แยกตามคลัง พร้อมรายการรถในแต่ละคลัง
  const originBranchMainWarehouse = getD365WarehouseForBranch(originBranchObj?.code) || '';

  const originWarehouseGroups = useMemo<OriginWarehouseGroup[]>(() => {
    const groups: Record<string, string[]> = {};
    for (const v of selectedVehicles) {
      const wh = v.d365WarehouseId?.trim() || '';
      (groups[wh] ||= []).push(v.licensePlate || v.vin);
    }
    return Object.entries(groups).map(([warehouseId, labels]) => ({
      warehouseId,
      warehouseName: warehouseId ? getD365WarehouseName(warehouseId) : null,
      labels,
    }));
  }, [selectedVehicles]);

  return {
    defaultDestWarehouse,
    destWarehouseId,
    handleSelectDestWarehouse,
    destWarehouseDropdownOptions,
    selectedDestWarehouseName,
    originWarehouseSummary,
    originBranchMainWarehouse,
    originWarehouseGroups,
  };
}
