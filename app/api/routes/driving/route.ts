import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Haversine fallback distance formula (km)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const originLat = parseFloat(searchParams.get('originLat') || '');
  const originLng = parseFloat(searchParams.get('originLng') || '');
  const destLat = parseFloat(searchParams.get('destLat') || '');
  const destLng = parseFloat(searchParams.get('destLng') || '');

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    return NextResponse.json(
      { error: 'พิกัดต้นทางหรือปลายทางไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  // 1. Try free OSRM Driving Route API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SupplierJobApp/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMin = Math.round(route.duration / 60);
        // OSRM GeoJSON geometry coordinates are [lng, lat] -> convert to Leaflet [lat, lng]
        const coordinates: [number, number][] = (route.geometry?.coordinates || []).map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        return NextResponse.json({
          success: true,
          provider: 'osrm',
          distanceKm,
          durationMin,
          coordinates,
        });
      }
    }
  } catch (err) {
    console.warn('OSRM routing failed or timed out, falling back to haversine:', err);
  }

  // 2. Fallback to Haversine * 1.25 road multiplier
  const straightDist = haversine(originLat, originLng, destLat, destLng);
  const roadDist = Math.round(straightDist * 1.25 * 10) / 10;
  const estimatedMin = Math.round((roadDist / 60) * 60); // assume 60 km/h average speed

  return NextResponse.json({
    success: true,
    provider: 'fallback',
    distanceKm: roadDist,
    durationMin: estimatedMin,
    coordinates: [
      [originLat, originLng],
      [destLat, destLng],
    ],
  });
}
