import { NextRequest, NextResponse } from 'next/server';

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: 'MASTER' | 'ADMIN' | 'BRANCH' | 'SUPPLIER';
  companyId: string | null;
  companyCode: string | null;
  branchId: string | null;
  branchName: string | null;
  branchCode: string | null;
  supplierId: string | null;
  supplierName: string | null;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'supplier-job-mgmt-secret-salt-key-2026-production';
const encoder = new TextEncoder();

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufferToBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToBase64Url(str: string): string {
  return bufferToBase64Url(encoder.encode(str));
}

function base64UrlToString(base64url: string): string {
  const bytes = base64UrlToBuffer(base64url);
  return new TextDecoder().decode(bytes);
}

/**
 * Creates a cryptographically signed session token: payload.signature
 * Compatible with Edge Runtime and Node.js via standard Web Crypto API
 */
export async function createSessionToken(data: SessionUser): Promise<string> {
  const payloadStr = JSON.stringify(data);
  const payload = stringToBase64Url(payloadStr);
  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signature = bufferToBase64Url(signatureBuffer);
  return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token using Web Crypto API
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  try {
    const key = await getHmacKey();
    const signatureBytes = base64UrlToBuffer(signature);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as any,
      encoder.encode(payload)
    );

    if (!isValid) return null;

    const jsonStr = base64UrlToString(payload);
    return JSON.parse(jsonStr) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the session from NextRequest cookies
 */
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const cookie = request.cookies.get('session');
  if (!cookie?.value) return null;
  return verifySessionToken(cookie.value);
}

type AuthResult = 
  | { user: SessionUser; response?: never }
  | { user?: never; response: NextResponse };

/**
 * Ensures user is authenticated and optionally checks role authorization
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: Array<'MASTER' | 'ADMIN' | 'BRANCH' | 'SUPPLIER'>
): Promise<AuthResult> {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)' },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // MASTER has all permissions
    if (user.role !== 'MASTER' && !allowedRoles.includes(user.role)) {
      return {
        response: NextResponse.json(
          { error: 'คุณไม่มีสิทธิ์ในการทำรายการนี้ (Forbidden)' },
          { status: 403 }
        ),
      };
    }
  }

  return { user };
}
