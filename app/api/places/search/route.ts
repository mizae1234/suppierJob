import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/places/search?q=...&lat=..&lng=..
// ค้นหาสถานที่สำหรับ MapPicker
// - ถ้าตั้ง GOOGLE_MAPS_API_KEY → ใช้ Google Places API (New) Text Search (แม่นเหมือน Google Maps)
// - ถ้าไม่ได้ตั้ง หรือ Google error → fallback ไป OpenStreetMap (Nominatim)
// API key อยู่ฝั่ง server เท่านั้น ไม่หลุดไปที่ browser

export interface PlaceResult {
  lat: number;
  lng: number;
  name: string;
  detail: string;
}

async function searchGoogle(q: string, apiKey: string, lat?: number, lng?: number): Promise<PlaceResult[]> {
  const body: Record<string, unknown> = {
    textQuery: q,
    languageCode: 'th',
    regionCode: 'TH',
    maxResultCount: 5,
  };
  // Bias results toward the reference point (e.g. origin branch) — 50 km radius
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } };
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // Request only the fields we need (keeps billing on the lowest applicable SKU)
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Google Places ${res.status}: ${await res.text()}`);
  }

  const data: {
    places?: {
      displayName?: { text: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
    }[];
  } = await res.json();

  return (data.places || [])
    .filter(p => p.location)
    .map(p => ({
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      name: p.displayName?.text || p.formattedAddress || '',
      detail: p.formattedAddress || '',
    }));
}

async function searchOsm(q: string): Promise<PlaceResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=th&accept-language=th`,
    { headers: { 'User-Agent': 'SupplierJobApp/1.0' }, cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const results: { lat: string; lon: string; name?: string; display_name: string }[] = await res.json();
  return results.map(r => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    name: r.name || r.display_name.split(',')[0],
    detail: r.display_name,
  }));
}

async function searchGemini(q: string, apiKey: string, lat?: number, lng?: number): Promise<PlaceResult[]> {
  const prompt = `You are a Thai geocoding and location search AI.
User search query: "${q}"
${Number.isFinite(lat) && Number.isFinite(lng) ? `Near coordinates: ${lat}, ${lng}` : 'In Thailand'}

Identify up to 3 relevant matching locations in Thailand.
Respond in JSON only with this schema:
{
  "places": [
    {
      "name": "Place name in Thai",
      "detail": "Subdistrict, District, Province, Thailand",
      "lat": 13.xxxx,
      "lng": 100.xxxx
    }
  ]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      cache: 'no-store',
    }
  );

  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return [];

  const parsed = JSON.parse(text);
  return (parsed.places || [])
    .filter((p: { lat?: number; lng?: number }) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map((p: { lat: number; lng: number; name: string; detail: string }) => ({
      lat: Number(p.lat),
      lng: Number(p.lng),
      name: p.name || q,
      detail: p.detail || '',
    }));
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ provider: 'none', results: [] });
  if (q.length > 200) return NextResponse.json({ error: 'คำค้นยาวเกินไป' }, { status: 400 });

  const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined;
  const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Google Places (if configured)
  if (apiKey) {
    try {
      const results = await searchGoogle(q, apiKey, lat, lng);
      if (results.length > 0) {
        return NextResponse.json({ provider: 'google', results });
      }
    } catch (error) {
      console.error('Google Places search failed, falling back:', error);
    }
  }

  // 2. Gemini AI Search (if configured)
  if (geminiKey) {
    try {
      const results = await searchGemini(q, geminiKey, lat, lng);
      if (results.length > 0) {
        return NextResponse.json({ provider: 'gemini', results });
      }
    } catch (error) {
      console.error('Gemini place search failed, falling back:', error);
    }
  }

  // 3. OpenStreetMap Nominatim (Free default)
  try {
    const results = await searchOsm(q);
    return NextResponse.json({ provider: 'osm', results });
  } catch (error) {
    console.error('OSM search failed:', error);
    return NextResponse.json({ error: 'ค้นหาไม่สำเร็จ' }, { status: 502 });
  }
}
