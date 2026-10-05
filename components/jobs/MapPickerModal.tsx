'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Navigation, Search, RotateCcw } from 'lucide-react';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { lat: number; lng: number; address: string; distance: number }) => void;
  /** Reference point (shown as a fixed marker; distance is measured from it) */
  originLat?: number | null;
  originLng?: number | null;
  originName?: string;
  /** 'dest' = pick destination (default), 'origin' = pick pickup point */
  mode?: 'dest' | 'origin';
  /** Pre-fill an existing pin when re-opening the picker */
  initialLat?: number | null;
  initialLng?: number | null;
  /** Caption under the reference marker popup (defaults by mode) */
  referenceCaption?: string;
  /** Override the noun used in title/buttons, e.g. 'ตำแหน่งสาขา' */
  pointLabel?: string;
}

// Haversine formula: calculates distance between two GPS points in kilometers
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

function estimateSlideCost(distanceKm: number): number {
  return Math.round(distanceKm * 50);
}

export default function MapPickerModal({
  isOpen,
  onClose,
  onConfirm,
  originLat: originLatProp,
  originLng: originLngProp,
  originName = 'สาขาต้นทาง',
  mode = 'dest',
  initialLat,
  initialLng,
  referenceCaption,
  pointLabel,
}: MapPickerModalProps) {
  const originLat = originLatProp ?? 13.7563;
  const originLng = originLngProp ?? 100.5648;
  const isOriginMode = mode === 'origin';
  const pinLabel = isOriginMode ? 'A' : 'B';
  const pinGradient = isOriginMode ? '#f59e0b,#d97706' : '#059669,#0f5238';
  const refLabel = isOriginMode ? 'B' : 'A';
  const refCaption = referenceCaption || (isOriginMode ? 'ปลายทาง' : 'สาขาต้นทาง');
  const pointNoun = pointLabel || (isOriginMode ? 'จุดรับรถ' : 'จุดปลายทาง');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const lineRef = useRef<unknown>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeType, setRouteType] = useState<'road' | 'straight'>('straight');
  const routeAbortRef = useRef<AbortController | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ lat: number; lng: number; name: string; detail: string }[]>([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [mapReady, setMapReady] = useState(false);

  // Inject Leaflet CSS into document head
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const LEAFLET_CSS_ID = 'leaflet-css-link';
    if (document.getElementById(LEAFLET_CSS_ID)) return;

    const link = document.createElement('link');
    link.id = LEAFLET_CSS_ID;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.crossOrigin = '';
    document.head.appendChild(link);
  }, []);

  // Reverse geocode
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th`
      );
      const data = await res.json();
      setAddress(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
    setIsLoadingAddress(false);
  }, []);

  // Jump the map to a point and drop the pin there
  const goTo = (lat: number, lng: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mapInstanceRef.current as any).setView([lat, lng], 16);
    handlePlaceMarker(lat, lng);
    setSearchResults([]);
    setSearchMessage('');
  };

  // Search location — supports "lat, lng", Google Maps links, or a place name
  const searchLocation = async () => {
    const q = searchQuery.trim();
    if (!q || !mapInstanceRef.current || !leafletRef.current) return;
    setSearchResults([]);
    setSearchMessage('');

    // 1) Coordinates or Google Maps URL (…@13.75,100.56… / ?q=13.75,100.56 / !3d13.75!4d100.56)
    const coordMatch =
      q.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
      q.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ||
      q.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/) ||
      q.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      goTo(parseFloat(coordMatch[1]), parseFloat(coordMatch[2]));
      return;
    }

    // 2) Place-name search (server picks Google Places if configured, otherwise OSM)
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/places/search?q=${encodeURIComponent(q)}&lat=${originLat}&lng=${originLng}`
      );
      const data: { provider?: string; results?: { lat: number; lng: number; name: string; detail: string }[]; error?: string } = await res.json();
      const results = data.results || [];
      if (!res.ok) {
        setSearchMessage(data.error || 'ค้นหาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      } else if (results.length === 1) {
        goTo(results[0].lat, results[0].lng);
      } else if (results.length > 1) {
        setSearchResults(results);
      } else {
        setSearchMessage(
          data.provider === 'google'
            ? 'ไม่พบสถานที่นี้ — ลองพิมพ์ชื่อให้สั้นลง หรือวางพิกัด / ลิงก์ Google Maps'
            : 'ไม่พบสถานที่นี้ใน OpenStreetMap — ลองค้นด้วยชื่อถนน/เขต หรือวางพิกัด / ลิงก์ Google Maps แทน'
        );
      }
    } catch (e) {
      console.error('Search error:', e);
      setSearchMessage('ค้นหาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
    setIsSearching(false);
  };

  // Place or move marker + draw route line
  const handlePlaceMarker = useCallback(
    (lat: number, lng: number) => {
      const L = leafletRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapInstanceRef.current as any;
      if (!map || !L) return;

      // Update or create marker
      if (markerRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (markerRef.current as any).setLatLng([lat, lng]);
      } else {
        const destIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:32px;height:32px;border-radius:50%;
            background:linear-gradient(135deg,${pinGradient});
            border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:bold;font-size:12px;
          ">${pinLabel}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        const marker = L.marker([lat, lng], {
          icon: destIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          handlePlaceMarker(pos.lat, pos.lng);
        });

        markerRef.current = marker;
      }

      // 1. Initial responsive feedback: draw straight line & approximate distance immediately
      const straightDist = haversineDistance(originLat, originLng, lat, lng);
      const approxRoadDist = Math.round(straightDist * 1.25 * 10) / 10;
      setSelectedPos({ lat, lng });
      setDistance(approxRoadDist);
      setRouteType('straight');
      reverseGeocode(lat, lng);

      if (lineRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lineRef.current as any).setLatLngs([
          [originLat, originLng],
          [lat, lng],
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lineRef.current as any).setStyle({
          color: '#0f5238',
          weight: 3,
          dashArray: '6, 6',
          opacity: 0.6,
        });
      } else {
        lineRef.current = L.polyline(
          [
            [originLat, originLng],
            [lat, lng],
          ],
          { color: '#0f5238', weight: 3, dashArray: '6, 6', opacity: 0.6 }
        ).addTo(map);
      }

      // 2. Fetch real driving road route from OSRM / backend API
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
      }
      const controller = new AbortController();
      routeAbortRef.current = controller;
      setIsRouting(true);

      fetch(
        `/api/routes/driving?originLat=${originLat}&originLng=${originLng}&destLat=${lat}&destLng=${lng}`,
        { signal: controller.signal }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.coordinates && data.coordinates.length > 1) {
            setDistance(data.distanceKm);
            if (data.durationMin) setDuration(data.durationMin);
            const isRoad = data.provider === 'osrm';
            setRouteType(isRoad ? 'road' : 'straight');

            if (lineRef.current) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (lineRef.current as any).setLatLngs(data.coordinates);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (lineRef.current as any).setStyle({
                color: '#0f5238',
                weight: isRoad ? 4 : 3,
                dashArray: isRoad ? null : '6, 6',
                opacity: isRoad ? 0.85 : 0.6,
              });
            }
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('Real driving route fetch error:', err);
          }
        })
        .finally(() => {
          setIsRouting(false);
        });
    },
    [originLat, originLng, reverseGeocode, pinGradient, pinLabel]
  );

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const initMap = async () => {
      // Wait for container to be in DOM
      await new Promise((r) => setTimeout(r, 100));
      if (cancelled || !mapContainerRef.current) return;

      // Already initialized
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).invalidateSize();
        return;
      }

      // Dynamic import of Leaflet
      const L = await import('leaflet');
      if (cancelled) return;
      leafletRef.current = L;

      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Wait for CSS to load
      await new Promise((r) => setTimeout(r, 200));
      if (cancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [originLat, originLng],
        zoom: 11,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Origin marker
      const originIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background:linear-gradient(135deg,#3b82f6,#1d4ed8);
          border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:bold;font-size:10px;
        ">${refLabel}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      L.marker([originLat, originLng], { icon: originIcon })
        .addTo(map)
        .bindPopup(`<b>${originName}</b><br/>${refCaption}`)
        .openPopup();

      // Click to place destination
      map.on('click', (e: L.LeafletMouseEvent) => {
        handlePlaceMarker(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      setMapReady(true);

      // Re-open with an existing pin
      if (typeof initialLat === 'number' && typeof initialLng === 'number') {
        map.setView([initialLat, initialLng], 14);
        handlePlaceMarker(initialLat, initialLng);
      }

      // Force invalidateSize after render
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 300);
    };

    initMap();

    return () => {
      cancelled = true;
    };
  }, [isOpen, originLat, originLng, originName, handlePlaceMarker, refLabel, refCaption, initialLat, initialLng]);

  // Cleanup when closing
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        lineRef.current = null;
      }
      setSelectedPos(null);
      setAddress('');
      setDistance(0);
      setSearchQuery('');
      setSearchResults([]);
      setSearchMessage('');
      setMapReady(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl w-full shadow-2xl flex flex-col"
        style={{ maxWidth: '900px', height: 'min(85vh, 720px)' }}
      >
        {/* Header — compact */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">เลือก{pointNoun}บนแผนที่</h3>
              <p className="text-[10px] text-gray-500">คลิกบนแผนที่ หรือค้นหาสถานที่</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar — compact */}
        <div className="px-5 py-2 border-b border-gray-50 flex gap-2 flex-shrink-0 relative z-[1001]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchMessage(''); }}
              onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
              placeholder={isOriginMode ? 'ค้นหาสถานที่ / วางพิกัด 13.75, 100.56 / ลิงก์ Google Maps' : 'ค้นหาสถานที่ / วางพิกัด / ลิงก์ Google Maps'}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238] outline-none"
            />

            {/* Multiple results — let the user pick */}
            {searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => goTo(r.lat, r.lng)}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-start gap-2 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#0f5238] mt-0.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-gray-800 truncate">{r.name}</span>
                        <span className="block text-[10px] text-gray-500 truncate">{r.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Not found / error */}
            {searchMessage && (
              <p className="absolute left-0 right-0 top-full mt-1 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 shadow-sm">
                {searchMessage}
              </p>
            )}
          </div>
          <button
            onClick={searchLocation}
            disabled={isSearching}
            className="px-3 h-9 rounded-lg bg-[#0f5238] text-white text-xs font-semibold hover:bg-[#0a3d28] transition-colors disabled:opacity-50"
          >
            {isSearching ? '...' : 'ค้นหา'}
          </button>
        </div>

        {/* Map Container — fills remaining space */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={mapContainerRef}
            style={{ width: '100%', height: '100%' }}
          />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-[#0f5238] rounded-full animate-spin" />
                <span className="text-xs">กำลังโหลดแผนที่...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer — always visible at bottom */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/80">
          {selectedPos ? (
            <div className="px-5 py-3 flex flex-col gap-2.5">
              {/* Location + Stats in one row */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#0f5238] flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-700 font-medium truncate">
                    {isLoadingAddress ? 'กำลังหาที่อยู่...' : address}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {selectedPos.lat.toFixed(5)}, {selectedPos.lng.toFixed(5)}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 mb-0.5">
                      <p className="text-[9px] text-gray-400 uppercase font-semibold">
                        {isOriginMode ? `ห่างจาก${refCaption}` : 'ระยะทาง'}
                      </p>
                      {isRouting ? (
                        <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-full animate-pulse font-medium">
                          คำนวณทาง...
                        </span>
                      ) : routeType === 'road' ? (
                        <span className="text-[9px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-full font-bold">
                          🛣️ ถนนจริง
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-bold text-[#0f5238]">
                      {distance.toFixed(1)} กม.
                      {duration ? (
                        <span className="text-[11px] font-medium text-gray-500 ml-1">
                          (~{duration} น.)
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {!isOriginMode && (
                    <>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-right">
                        <p className="text-[9px] text-gray-400 uppercase font-semibold">ค่าบริการ</p>
                        <p className="text-sm font-bold text-[#0f5238]">฿{estimateSlideCost(distance).toLocaleString()}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (routeAbortRef.current) routeAbortRef.current.abort();
                    if (markerRef.current && mapInstanceRef.current) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (markerRef.current as any).remove();
                      markerRef.current = null;
                      if (lineRef.current) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (lineRef.current as any).remove();
                        lineRef.current = null;
                      }
                      setSelectedPos(null);
                      setAddress('');
                      setDistance(0);
                      setDuration(null);
                      setRouteType('straight');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  รีเซ็ตจุด
                </button>
                <button
                  onClick={() => {
                    onConfirm({
                      lat: selectedPos.lat,
                      lng: selectedPos.lng,
                      address,
                      distance,
                    });
                    onClose();
                  }}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0f5238] text-white text-xs font-bold hover:bg-[#0a3d28] shadow-md transition-all"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  ยืนยัน{pointNoun}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center px-5 py-3">
              <p className="text-xs text-gray-500">
                คลิกบนแผนที่ หรือค้นหาสถานที่เพื่อกำหนด{pointNoun}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
