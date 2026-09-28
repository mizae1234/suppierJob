'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Navigation, Search, RotateCcw } from 'lucide-react';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { lat: number; lng: number; address: string; distance: number }) => void;
  originLat?: number;
  originLng?: number;
  originName?: string;
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
  return Math.round(1500 + distanceKm * 15);
}

export default function MapPickerModal({
  isOpen,
  onClose,
  onConfirm,
  originLat = 13.7563,
  originLng = 100.5648,
  originName = 'สาขาต้นทาง',
}: MapPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const lineRef = useRef<unknown>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [distance, setDistance] = useState(0);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
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
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th`,
        { headers: { 'User-Agent': 'SupplierJobApp/1.0' } }
      );
      const data = await res.json();
      setAddress(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
    setIsLoadingAddress(false);
  }, []);

  // Search location
  const searchLocation = async () => {
    if (!searchQuery.trim() || !mapInstanceRef.current || !leafletRef.current) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=th&accept-language=th`,
        { headers: { 'User-Agent': 'SupplierJobApp/1.0' } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).setView([latNum, lngNum], 15);
        handlePlaceMarker(latNum, lngNum);
      }
    } catch (e) {
      console.error('Search error:', e);
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
            background:linear-gradient(135deg,#059669,#0f5238);
            border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:bold;font-size:12px;
          ">B</div>`,
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

      // Draw line from origin to destination
      if (lineRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lineRef.current as any).setLatLngs([
          [originLat, originLng],
          [lat, lng],
        ]);
      } else {
        lineRef.current = L.polyline(
          [
            [originLat, originLng],
            [lat, lng],
          ],
          { color: '#0f5238', weight: 3, dashArray: '8, 6', opacity: 0.7 }
        ).addTo(map);
      }

      const dist = haversineDistance(originLat, originLng, lat, lng);
      setSelectedPos({ lat, lng });
      setDistance(dist);
      reverseGeocode(lat, lng);
    },
    [originLat, originLng, reverseGeocode]
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
        ">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      L.marker([originLat, originLng], { icon: originIcon })
        .addTo(map)
        .bindPopup(`<b>${originName}</b><br/>สาขาต้นทาง`)
        .openPopup();

      // Click to place destination
      map.on('click', (e: L.LeafletMouseEvent) => {
        handlePlaceMarker(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      setMapReady(true);

      // Force invalidateSize after render
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 300);
    };

    initMap();

    return () => {
      cancelled = true;
    };
  }, [isOpen, originLat, originLng, originName, handlePlaceMarker]);

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
              <h3 className="text-sm font-bold text-gray-900">เลือกจุดปลายทางบนแผนที่</h3>
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
        <div className="px-5 py-2 border-b border-gray-50 flex gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
              placeholder="ค้นหาสถานที่ เช่น บ้านลูกค้า, อู่ซ่อม..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238] outline-none"
            />
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
                    <p className="text-[9px] text-gray-400 uppercase font-semibold">ระยะทาง</p>
                    <p className="text-sm font-bold text-[#0f5238]">{distance.toFixed(1)} กม.</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 uppercase font-semibold">ค่าบริการ</p>
                    <p className="text-sm font-bold text-[#0f5238]">฿{estimateSlideCost(distance).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
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
                  ยืนยันจุดปลายทาง
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center px-5 py-3">
              <p className="text-xs text-gray-500">
                คลิกบนแผนที่ หรือค้นหาสถานที่เพื่อกำหนดจุดปลายทาง
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
