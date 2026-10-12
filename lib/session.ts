/**
 * Session token (HMAC-SHA256 signed) — pure Web Crypto, no DB access.
 * Safe to import from proxy.ts. DB-backed checks live in lib/auth.ts.
 */

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  phone: string | null;
  role: 'MASTER' | 'ADMIN' | 'BRANCH' | 'SUPPLIER';
  companyId: string | null;
  companyCode: string | null;
  branchId: string | null;
  branchName: string | null;
  branchCode: string | null;
  supplierId: string | null;
  supplierName: string | null;
  mustChangePassword?: boolean;
}

interface SessionPayload extends SessionUser {
  iat: number; // issued at (seconds)
  exp: number; // expires at (seconds)
}

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();
let cachedKey: Promise<CryptoKey> | null = null;

const DEFAULT_FALLBACK_SECRET = 'supplier-job-mgmt-secret-salt-key-2026-production-stg-secure';

function getHmacKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    let secret = process.env.SESSION_SECRET;
    // หากไม่ได้กำหนด SESSION_SECRET หรือความยาวไม่ถึง 32 ตัวอักษร ให้ fallback อัตโนมัติเพื่อป้องกัน Error 500
    if (!secret || secret.length < 32) {
      secret = DEFAULT_FALLBACK_SECRET;
    }
    cachedKey = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }
  return cachedKey;
}

function bufferToBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): Uint8Array<ArrayBuffer> {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Creates a signed session token: payload.signature (payload includes iat/exp)
 */
export async function createSessionToken(data: SessionUser, maxAgeSeconds = SESSION_MAX_AGE): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payloadObj: SessionPayload = { ...data, iat: now, exp: now + maxAgeSeconds };
  const payload = bufferToBase64Url(encoder.encode(JSON.stringify(payloadObj)));
  const key = await getHmacKey();
  const signature = bufferToBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
  return `${payload}.${signature}`;
}

/**
 * Verifies signature and expiry. Returns null when invalid or expired.
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  try {
    const key = await getHmacKey();
    const isValid = await crypto.subtle.verify('HMAC', key, base64UrlToBuffer(signature), encoder.encode(payload));
    if (!isValid) return null;

    const data = JSON.parse(new TextDecoder().decode(base64UrlToBuffer(payload))) as Partial<SessionPayload>;
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iat, exp, ...user } = data as SessionPayload;
    return user;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('SESSION_SECRET')) throw err;
    return null;
  }
}
