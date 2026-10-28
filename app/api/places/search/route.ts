import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// GET /api/places/search?q=...&lat=..&lng=..
// ค้นหาสถานที่สำหรับ MapPicker:
// 1. ตรวจสอบพิกัดตรง (13.7597, 100.6437)
// 2. แกะพิกัดจากลิงก์ Google Maps (maps.app.goo.gl, goo.gl/maps, google.com/maps)
// 3. Google Places API (New) (ถ้ามี GOOGLE_MAPS_API_KEY)
// 4. OpenStreetMap Nominatim พร้อมระบบ Progressive Thai Address Relaxation (ตัดเลขที่บ้าน, ชั้น, หมู่, รหัสไปรษณีย์)
// 5. Google Gemini AI (gemini-3-flash-preview / gemini-flash-latest) เป็น AI Fallback เมื่อคำค้นหายากหรือไม่พบในฐานข้อมูลแผนที่ทั่วไป

export interface PlaceResult {
  lat: number;
  lng: number;
  name: string;
  detail: string;
  type?: 'map_link' | 'osm' | 'google' | 'gemini';
}

// ─── Cache ผลค้นหาในหน่วยความจำ (LRU + TTL) — ลดการยิง API ภายนอกซ้ำ ๆ ด้วยคำค้นเดิม ───
const SEARCH_CACHE_MAX = 200;
const SEARCH_CACHE_TTL_MS = 10 * 60_000;
type SearchPayload = { provider: string; results: PlaceResult[] };
const searchCache = new Map<string, { expiresAt: number; payload: SearchPayload }>();

function searchCacheKey(q: string, lat?: number, lng?: number): string {
  // ไม่แปลงตัวพิมพ์ — ลิงก์ย่อ Google Maps (เช่น maps.app.goo.gl/AbC) แยกตัวพิมพ์เล็ก/ใหญ่
  const norm = q.normalize('NFC').replace(/\s+/g, ' ').trim();
  // ผล Google/Gemini อิงพิกัดอ้างอิง → รวมพิกัด (ปัด ~1 กม.) ไว้ใน key
  const near = Number.isFinite(lat) && Number.isFinite(lng) ? `${lat!.toFixed(2)},${lng!.toFixed(2)}` : '';
  return `${norm}|${near}`;
}

function getCachedSearch(key: string): SearchPayload | null {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    searchCache.delete(key);
    return null;
  }
  // ย้ายไปท้าย Map = ใช้ล่าสุด (LRU)
  searchCache.delete(key);
  searchCache.set(key, hit);
  return hit.payload;
}

/** เก็บเฉพาะผลที่พบ (ไม่ cache ผลว่างที่อาจเกิดจาก timeout ชั่วคราว) แล้วคืน response */
function respondAndCache(key: string, payload: SearchPayload) {
  if (payload.results.length > 0) {
    searchCache.delete(key);
    searchCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, payload });
    while (searchCache.size > SEARCH_CACHE_MAX) {
      const oldest = searchCache.keys().next().value;
      if (oldest === undefined) break;
      searchCache.delete(oldest);
    }
  }
  return NextResponse.json(payload);
}

/**
 * โดเมนที่อนุญาตให้เซิร์ฟเวอร์ยิง request ไปได้ (กัน SSRF — ห้ามยิงไป IP ภายใน / metadata / โดเมนอื่น)
 * ตรวจทุกครั้งรวมถึงปลายทางของ redirect
 */
const ALLOWED_MAP_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'google.com',
  'www.google.com',
  'maps.google.com',
  'google.co.th',
  'www.google.co.th',
  'maps.google.co.th',
]);

function toAllowedMapUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password || url.port) return null;
    if (!ALLOWED_MAP_HOSTS.has(url.hostname.toLowerCase())) return null;
    url.protocol = 'https:'; // บังคับ HTTPS เสมอ
    return url;
  } catch {
    return null;
  }
}

/**
 * ติดตาม Redirect ของ Google Maps Short Link (maps.app.goo.gl / goo.gl/maps)
 * และดึงพิกัด lat, lng จาก URL ปลายทางหรือเนื้อหา HTML
 */
async function resolveGoogleMapsUrl(rawUrl: string): Promise<PlaceResult | null> {
  try {
    let currentUrl = rawUrl.trim();
    for (let i = 0; i < 4; i++) {
      const coordMatch =
        currentUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
        currentUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
        currentUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
        currentUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);

      if (coordMatch) {
        return {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2]),
          name: 'ตำแหน่งจาก Google Maps',
          detail: `พิกัด ${coordMatch[1]}, ${coordMatch[2]}`,
          type: 'map_link',
        };
      }

      if (!currentUrl.startsWith('http')) break;

      const safeUrl = toAllowedMapUrl(currentUrl);
      if (!safeUrl) break;

      const res = await fetch(safeUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(5000),
      });

      const location = res.headers.get('location');
      if (!location) {
        const text = await res.text();
        const bodyMatch =
          text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
          text.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
        if (bodyMatch) {
          return {
            lat: parseFloat(bodyMatch[1]),
            lng: parseFloat(bodyMatch[2]),
            name: 'ตำแหน่งจาก Google Maps',
            detail: `พิกัด ${bodyMatch[1]}, ${bodyMatch[2]}`,
            type: 'map_link',
          };
        }
        break;
      }
      currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).toString();
    }
  } catch (err) {
    console.warn('resolveGoogleMapsUrl error:', err);
  }
  return null;
}

/**
 * ตัด Noise ของที่อยู่ภาษาไทย เช่น เลขที่บ้าน, หมู่, ชั้น, ห้อง, รหัสไปรษณีย์
 * เพื่อให้ค้นหาบนแผนที่ OpenStreetMap / Nominatim ได้แม่นยำขึ้น
 */
function cleanThaiAddress(raw: string): string {
  return raw
    .replace(/(?:โทร|tel|contact)[\s.:]*\d[\d\- ]+/gi, ' ')
    .replace(/\b\d{5}\b/g, ' ') // postal code 5 digits
    .replace(/\b\d+[\/\-]\d+\b/g, ' ') // house number like 99/9, 52/1
    .replace(/(?:ชั้น|floor|fl\.)\s*\d+/gi, ' ') // floor
    .replace(/(?:ห้อง|room)\s*[\w\d\-]+/gi, ' ') // room
    .replace(/(?:หมู่ที่?|หมู่|ม\.)\s*\d+/gi, ' ') // moo
    .replace(/เลขที่\s*\d+/gi, ' ')
    .replace(/ประเทศไทย/gi, ' ')
    .replace(/[,\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchGoogle(q: string, apiKey: string, lat?: number, lng?: number): Promise<PlaceResult[]> {
  const body: Record<string, unknown> = {
    textQuery: q,
    languageCode: 'th',
    regionCode: 'TH',
    maxResultCount: 5,
  };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } };
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
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
      type: 'google',
    }));
}

async function fetchNominatim(q: string): Promise<PlaceResult[]> {
  const cleanQ = q.trim();
  if (!cleanQ || cleanQ.length < 2) return [];

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQ)}&format=json&limit=5&countrycodes=th&accept-language=th`,
    {
      headers: { 'User-Agent': 'GoldIntegrate-SupplierJobApp/2.0 (contact@goldintegrate.co.th)' },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    }
  );
  if (!res.ok) return [];
  const results: { lat: string; lon: string; name?: string; display_name: string }[] = await res.json();
  return results.map(r => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    name: r.name || r.display_name.split(',')[0],
    detail: r.display_name,
    type: 'osm',
  }));
}

/**
 * ค้นหาแบบหลายขั้นตอน (Progressive Relaxation):
 * 1) ข้อความเดิม
 * 2) ข้อความที่ตัด Noise (เลขที่บ้าน, ชั้น, หมู่, รหัสไปรษณีย์)
 * 3) แยกหา Landmark หรือชื่อถนน/เขต
 */
async function searchOsmProgressive(q: string): Promise<PlaceResult[]> {
  // Pass 1: Original query
  const res1 = await fetchNominatim(q);
  if (res1.length > 0) return res1;

  // Pass 2: Cleaned Thai address
  const cleaned = cleanThaiAddress(q);
  if (cleaned && cleaned !== q) {
    const res2 = await fetchNominatim(cleaned);
    if (res2.length > 0) return res2;
  }

  // Pass 3: Extract tokens (split by comma or spaces)
  const tokens = (cleaned || q)
    .split(/[,|\n]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3);

  // Try each token, starting from the first (often condo/building/landmark name)
  for (const token of tokens) {
    const resToken = await fetchNominatim(token);
    if (resToken.length > 0) return resToken;
  }

  return [];
}

/**
 * ค้นหาสถานที่ด้วย Google Gemini AI
 * ใช้เป็น AI Fallback เมื่อ OpenStreetMap ค้นหาไม่พบ หรือคำค้นเป็นภาษาพูด/ชื่อเล่นสถานที่
 */
async function searchGemini(q: string, apiKey: string, lat?: number, lng?: number): Promise<PlaceResult[]> {
  const prompt = `You are an expert Thai geocoding and location search AI.
User search query: "${q}"
${Number.isFinite(lat) && Number.isFinite(lng) ? `Near reference coordinates: ${lat}, ${lng}` : 'In Thailand'}

Identify the exact matching landmark, condo, building, road or subdistrict in Thailand.
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

  const modelsToTry = ['gemini-3-flash-preview', 'gemini-flash-latest'];
  for (const model of modelsToTry) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.places) && parsed.places.length > 0) {
        return parsed.places
          .filter((p: { lat?: number; lng?: number }) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
          .map((p: { lat: number; lng: number; name: string; detail: string }) => ({
            lat: Number(p.lat),
            lng: Number(p.lng),
            name: p.name || q,
            detail: `${p.detail || 'ระบุตำแหน่งโดย AI'} [Gemini AI]`,
            type: 'gemini' as const,
          }));
      }
    } catch (e) {
      console.warn(`Gemini search with ${model} failed, trying next:`, e);
    }
  }

  return [];
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ provider: 'none', results: [] });
  if (q.length > 300) return NextResponse.json({ error: 'คำค้นยาวเกินไป' }, { status: 400 });

  const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined;
  const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : undefined;

  // 1. ตรวจสอบพิกัดตัวเลขตรง ๆ (เช่น "13.7597, 100.6437")
  const directCoord = q.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if (directCoord) {
    return NextResponse.json({
      provider: 'coordinate',
      results: [
        {
          lat: parseFloat(directCoord[1]),
          lng: parseFloat(directCoord[2]),
          name: `พิกัด ${directCoord[1]}, ${directCoord[2]}`,
          detail: 'ระบุตำแหน่งตามพิกัด GPS โดยตรง',
          type: 'map_link',
        },
      ],
    });
  }

  const cacheKey = searchCacheKey(q, lat, lng);
  const cached = getCachedSearch(cacheKey);
  if (cached) return NextResponse.json(cached);

  // 2. ตรวจสอบลิงก์ Google Maps (เช่น maps.app.goo.gl, goo.gl/maps, google.com/maps)
  if (q.includes('maps.app.goo.gl') || q.includes('goo.gl/maps') || q.includes('google.com/maps') || q.includes('maps.google.com')) {
    const resolved = await resolveGoogleMapsUrl(q);
    if (resolved) {
      return respondAndCache(cacheKey, {
        provider: 'google_url',
        results: [resolved],
      });
    }
  }

  // 3. Google Places API (ถ้ามี API Key)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const results = await searchGoogle(q, apiKey, lat, lng);
      if (results.length > 0) {
        return respondAndCache(cacheKey, { provider: 'google', results });
      }
    } catch (error) {
      console.warn('Google Places search failed, falling back:', error);
    }
  }

  // 4. OpenStreetMap Nominatim แบบ Progressive Relaxation
  try {
    const osmResults = await searchOsmProgressive(q);
    if (osmResults.length > 0) {
      return respondAndCache(cacheKey, { provider: 'osm', results: osmResults });
    }
  } catch (error) {
    console.warn('OSM search failed, attempting Gemini AI fallback:', error);
  }

  // 5. Google Gemini AI Fallback (เมื่อ OpenStreetMap ไม่เจอ หรือข้อความเป็นภาษาพูด/คำอธิบาย)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const geminiResults = await searchGemini(q, geminiKey, lat, lng);
      if (geminiResults.length > 0) {
        return respondAndCache(cacheKey, { provider: 'gemini', results: geminiResults });
      }
    } catch (error) {
      console.warn('Gemini search failed:', error);
    }
  }

  return NextResponse.json({ provider: 'none', results: [] });
}
