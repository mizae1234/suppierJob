'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Branch } from '@/types';
import { haversineDistance } from '@/lib/job-utils';
import { getRecommendedSlideSupplier, getBranchDefaultCoords } from '@/lib/vehicle-slide-rates';
import type {
  CustomDestPoint,
  CustomOriginPoint,
  MapPickerMode,
  RouteMode,
  RoutePoint,
} from '../_types';

interface UseSlideRouteParams {
  branches: Branch[];
  originBranchObj?: Branch;
  selectedOriginBranchId: string;
  refreshData: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useSlideRoute({
  branches,
  originBranchObj,
  selectedOriginBranchId,
  refreshData,
  showToast,
}: UseSlideRouteParams) {
  // ปลายทางเริ่มต้นว่าง — ให้ผู้สั่งงานเลือกเอง (ไม่เติมค่าให้ล่วงหน้า)
  const [destBranchId, setDestBranchId] = useState<string>('');
  const [fetchedDrivingDist, setFetchedDrivingDist] = useState<{ key: string; km: number } | null>(null);

  // ── Hybrid Destination Mode ──
  const [destMode, setDestMode] = useState<RouteMode>('branch');
  const [customDest, setCustomDest] = useState<CustomDestPoint | null>(null);

  // ── Hybrid Pickup (Origin) Mode ──
  // 'branch' = รับรถที่สาขาต้นทาง, 'custom' = ปักหมุดจุดรับรถเอง (เช่น รถจอดอยู่ลานนอกสาขา)
  const [originMode, setOriginMode] = useState<RouteMode>('branch');
  const [customOrigin, setCustomOrigin] = useState<CustomOriginPoint | null>(null);

  // Which point the map picker is currently editing (null = closed)
  // 'branch' = แก้พิกัดถาวรของสาขาต้นทาง (บันทึกลงฐานข้อมูลสาขา)
  const [mapPickerMode, setMapPickerMode] = useState<MapPickerMode>(null);
  const [isSavingBranchPin, setIsSavingBranchPin] = useState(false);

  const destBranch = useMemo(
    () => branches.find((b) => b.id === destBranchId),
    [branches, destBranchId]
  );

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
  const originPoint = useMemo<RoutePoint | null>(() => {
    if (originMode === 'custom' && customOrigin) {
      return {
        lat: customOrigin.lat,
        lng: customOrigin.lng,
        name: customOrigin.address.split(',')[0] || 'จุดรับรถ',
      };
    }
    if (originBranchObj?.latitude && originBranchObj?.longitude) {
      return {
        lat: originBranchObj.latitude,
        lng: originBranchObj.longitude,
        name: originBranchObj.name,
      };
    }
    const fallback = getBranchDefaultCoords(originBranchObj?.code || originBranchObj?.name || selectedOriginBranchId);
    if (fallback) {
      return {
        lat: fallback.lat,
        lng: fallback.lng,
        name: originBranchObj?.name || selectedOriginBranchId,
      };
    }
    return null;
  }, [originMode, customOrigin, originBranchObj, selectedOriginBranchId]);

  const destPoint = useMemo<RoutePoint | null>(() => {
    if (destMode === 'custom') {
      return customDest
        ? {
            lat: customDest.lat,
            lng: customDest.lng,
            name: customDest.address.split(',')[0] || 'ปลายทาง',
          }
        : null;
    }
    if (destBranch?.latitude && destBranch?.longitude) {
      return { lat: destBranch.latitude, lng: destBranch.longitude, name: destBranch.name };
    }
    const fallback = getBranchDefaultCoords(destBranch?.code || destBranch?.name || destBranchId);
    if (fallback) {
      return { lat: fallback.lat, lng: fallback.lng, name: destBranch?.name || destBranchId };
    }
    return null;
  }, [destMode, customDest, destBranch, destBranchId]);

  const routeCoordKey =
    originPoint && destPoint
      ? `${originPoint.lat},${originPoint.lng}->${destPoint.lat},${destPoint.lng}`
      : '';

  const fallbackRoadDist = useMemo(() => {
    if (!originPoint || !destPoint) return 0;
    const straight = haversineDistance(originPoint.lat, originPoint.lng, destPoint.lat, destPoint.lng);
    return Math.round(straight * 1.25 * 10) / 10;
  }, [originPoint, destPoint]);

  const autoDistance =
    routeCoordKey && fetchedDrivingDist?.key === routeCoordKey
      ? fetchedDrivingDist.km
      : fallbackRoadDist;

  // ระยะทางจากแผนที่: แสดงเฉพาะเมื่อมีทั้งจุดรับและจุดส่งแล้ว (ยังไม่เลือก = 0)
  const routeDistance = originPoint && destPoint ? autoDistance : 0;

  // Auto-calculate real road distance whenever pickup or drop-off point changes
  // (โหมดกรอกเองใช้ manualDistance แยก จึงไม่ถูกเขียนทับ)
  useEffect(() => {
    if (!originPoint || !destPoint || !routeCoordKey) return;

    let cancelled = false;
    fetch(
      `/api/routes/driving?originLat=${originPoint.lat}&originLng=${originPoint.lng}&destLat=${destPoint.lat}&destLng=${destPoint.lng}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.distanceKm) {
          setFetchedDrivingDist({ key: routeCoordKey, km: data.distanceKm });
        }
      })
      .catch((err) => {
        console.warn('Real driving distance fetch error:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [originPoint, destPoint, routeCoordKey]);

  const originLabel =
    originMode === 'custom' && customOrigin
      ? customOrigin.address.split(',').slice(0, 2).join(',')
      : originBranchObj?.name;

  // Save a permanent GPS pin for the origin branch (affects all future jobs)
  const handleSaveBranchPin = useCallback(
    async (data: { lat: number; lng: number; address: string }) => {
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
    },
    [originBranchObj, refreshData, showToast]
  );

  const handleMapPickerConfirm = useCallback(
    (data: CustomDestPoint) => {
      if (mapPickerMode === 'branch') {
        handleSaveBranchPin(data);
      } else if (mapPickerMode === 'origin') {
        setCustomOrigin({ lat: data.lat, lng: data.lng, address: data.address });
      } else {
        setCustomDest(data);
      }
      if (typeof data.distance === 'number' && data.distance > 0) {
        const nextOrig = mapPickerMode === 'origin' ? { lat: data.lat, lng: data.lng } : originPoint;
        const nextDest = mapPickerMode === 'dest' ? { lat: data.lat, lng: data.lng } : destPoint;
        if (nextOrig && nextDest) {
          setFetchedDrivingDist({
            key: `${nextOrig.lat},${nextOrig.lng}->${nextDest.lat},${nextDest.lng}`,
            km: data.distance,
          });
        }
      }
    },
    [mapPickerMode, handleSaveBranchPin, originPoint, destPoint]
  );

  const mapPickerProps = useMemo(() => {
    if (mapPickerMode === 'branch') {
      return {
        pointLabel: `ตำแหน่งสาขา ${originBranchObj?.name || ''}`.trim(),
        originLat: destPoint?.lat ?? originPoint?.lat,
        originLng: destPoint?.lng ?? originPoint?.lng,
        originName: destPoint?.name || originBranchObj?.name || 'สาขาต้นทาง',
        referenceCaption: destPoint ? 'ปลายทาง' : 'ตำแหน่งเดิม',
        initialLat: originBranchObj?.latitude ?? originPoint?.lat,
        initialLng: originBranchObj?.longitude ?? originPoint?.lng,
      };
    }
    if (mapPickerMode === 'origin') {
      return {
        originLat: destPoint?.lat ?? originPoint?.lat,
        originLng: destPoint?.lng ?? originPoint?.lng,
        originName: destPoint?.name || originBranchObj?.name || 'สาขาต้นทาง',
        referenceCaption: destPoint ? 'ปลายทาง' : 'สาขาต้นทาง',
        initialLat: customOrigin?.lat ?? originPoint?.lat,
        initialLng: customOrigin?.lng ?? originPoint?.lng,
      };
    }
    return {
      originLat: originPoint?.lat,
      originLng: originPoint?.lng,
      originName: originPoint?.name || originBranchObj?.name || 'สาขาต้นทาง',
      referenceCaption: originMode === 'custom' && customOrigin ? 'จุดรับรถ' : 'สาขาต้นทาง',
      initialLat: customDest?.lat ?? originPoint?.lat,
      initialLng: customDest?.lng ?? originPoint?.lng,
    };
  }, [mapPickerMode, originBranchObj, destPoint, originPoint, customOrigin, originMode, customDest]);

  return {
    originMode,
    setOriginMode,
    customOrigin,
    destMode,
    setDestMode,
    customDest,
    destBranchId,
    setDestBranchId,
    destBranch,
    originPoint,
    destPoint,
    routeDistance,
    originLabel,
    supplierRecommendation,
    mapPickerMode,
    setMapPickerMode,
    isSavingBranchPin,
    handleMapPickerConfirm,
    mapPickerProps,
  };
}
