import type { ODataPage } from './types';

/**
 * D365 OData client
 * - ขอ Token แบบ client_credentials และ cache ไว้ในหน่วยความจำ
 * - ดึงข้อมูลแบบวนตาม @odata.nextLink จนครบทุกหน้า
 */

const REQUEST_TIMEOUT_MS = 60_000;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60_000; // ขอใหม่เมื่อเหลืออายุ < 5 นาที
const MAX_RETRIES = 2;
const MAX_PAGES = 500; // กัน loop ไม่รู้จบหาก nextLink ผิดปกติ

export class D365Error extends Error {
  constructor(message: string, public status?: number, public timedOut = false) {
    super(message);
    this.name = 'D365Error';
  }
}

interface D365Config {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export function getD365Config(): D365Config {
  const tenantId = process.env.D365_TENANT_ID?.trim();
  const clientId = process.env.D365_CLIENT_ID?.trim();
  const clientSecret = process.env.D365_CLIENT_SECRET?.trim();
  const baseUrl = process.env.D365_BASE_URL?.trim().replace(/\/+$/, '');

  const missing = [
    !tenantId && 'D365_TENANT_ID',
    !clientId && 'D365_CLIENT_ID',
    !clientSecret && 'D365_CLIENT_SECRET',
    !baseUrl && 'D365_BASE_URL',
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new D365Error(`ยังไม่ได้ตั้งค่า D365 ใน environment: ${missing.join(', ')}`);
  }

  return { tenantId: tenantId!, clientId: clientId!, clientSecret: clientSecret!, baseUrl: baseUrl! };
}

export function isD365Configured(): boolean {
  try {
    getD365Config();
    return true;
  } catch {
    return false;
  }
}

// ── Token cache ────────────────────────────────────────
let cachedToken: { value: string; expiresAt: number } | null = null;

export function clearD365TokenCache() {
  cachedToken = null;
}

export async function getD365Token(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
    return cachedToken.value;
  }

  const { tenantId, clientId, clientSecret, baseUrl } = getD365Config();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    resource: baseUrl,
  });

  const res = await fetchWithTimeout(`https://login.microsoftonline.com/${tenantId}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    const detail = json.error_description?.split('\r\n')[0] || json.error || `HTTP ${res.status}`;
    throw new D365Error(`ขอ Token จาก Microsoft ไม่สำเร็จ: ${detail}`, res.status);
  }

  const expiresInSec = Number(json.expires_in) || 3599;
  cachedToken = { value: json.access_token, expiresAt: Date.now() + expiresInSec * 1000 };
  return cachedToken.value;
}

// ── HTTP helpers ───────────────────────────────────────
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new D365Error(`D365 ไม่ตอบกลับภายใน ${timeoutMs / 1000} วินาที`, undefined, true);
    }
    throw new D365Error(`เชื่อมต่อ D365 ไม่ได้: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function d365GetJson<T>(url: string): Promise<T> {
  let tokenRefreshed = false;

  for (let attempt = 0; ; attempt++) {
    const token = await getD365Token();
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (res.ok) return (await res.json()) as T;

    // Token หมดอายุ/ถูกยกเลิก → ล้าง cache แล้วลองใหม่ 1 ครั้ง
    if (res.status === 401 && !tokenRefreshed) {
      clearD365TokenCache();
      tokenRefreshed = true;
      continue;
    }

    // Throttling หรือ Server error → retry แบบหน่วงเวลา
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * (attempt + 1));
      continue;
    }

    const text = await res.text().catch(() => '');
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.Message || parsed?.error?.message || text;
    } catch { /* keep raw text */ }

    if (res.status === 403) {
      throw new D365Error(`D365 ปฏิเสธสิทธิ์ (403): ${message} — ตรวจสอบการผูก Client ID ใน Microsoft Entra ID applications`, 403);
    }
    throw new D365Error(`D365 ตอบกลับ HTTP ${res.status}: ${message.slice(0, 300)}`, res.status);
  }
}

/**
 * ดึงข้อมูลทุกหน้าจาก OData entity
 * @param entity ชื่อ entity เช่น 'BPC_InventOnHand'
 * @param query  query string params เช่น { $filter, $select, 'cross-company': 'true' }
 */
export async function d365FetchAll<T>(entity: string, query: Record<string, string>): Promise<T[]> {
  const { baseUrl } = getD365Config();
  const params = new URLSearchParams(query);
  // URLSearchParams encode ช่องว่างเป็น '+' ซึ่ง OData ของ D365 ไม่รองรับ → ใช้ %20 แทน
  let url: string | undefined = `${baseUrl}/data/${entity}?${params.toString().replace(/\+/g, '%20')}`;

  const results: T[] = [];
  let pages = 0;

  while (url) {
    if (++pages > MAX_PAGES) {
      throw new D365Error(`ดึงข้อมูล ${entity} เกิน ${MAX_PAGES} หน้า — หยุดเพื่อความปลอดภัย`);
    }
    const page: ODataPage<T> = await d365GetJson<ODataPage<T>>(url);
    results.push(...(page.value || []));
    url = page['@odata.nextLink'];
  }

  return results;
}
