import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySessionToken, SESSION_COOKIE, type SessionUser } from '@/lib/session';

export type { SessionUser } from '@/lib/session';
export { createSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

// ─── DB-backed session validation (with short cache & in-flight deduplication) ─────────────
// ป้องกันกรณี user ถูกปิดใช้งาน / เปลี่ยนสิทธิ์ แต่ cookie เดิมยังใช้ได้
type DbState = { isActive: boolean; role: string; companyId: string | null; supplierId: string | null; branchId: string | null; mustChangePassword: boolean; sessionVersion: number };
const CACHE_TTL_MS = 60_000;
const STALE_IF_ERROR_TTL_MS = 5 * 60_000; // ใช้ค่า cache เดิมชั่วคราวหาก DB connection pool เต็มหรือเน็ตสะดุด
const userStateCache = new Map<string, { state: DbState | null; expires: number; staleUntil: number }>();
const inflightUserState = new Map<string, Promise<DbState | null>>();

async function getUserState(userId: string): Promise<DbState | null> {
  const now = Date.now();
  const cached = userStateCache.get(userId);
  if (cached && cached.expires > now) return cached.state;

  // รวมคำขอที่ยิงเข้ามาพร้อมกันของ user เดียวกันให้ใช้ DB query เดียว (ไม่เปลือง connection pool)
  const existingInflight = inflightUserState.get(userId);
  if (existingInflight) return existingInflight;

  const promise = (async () => {
    try {
      const state = (await prisma.user.findUnique({
        where: { id: userId },
        select: {
          isActive: true,
          role: true,
          companyId: true,
          supplierId: true,
          branchId: true,
          mustChangePassword: true,
          sessionVersion: true,
        },
      })) as DbState | null;
      const doneAt = Date.now();
      userStateCache.set(userId, {
        state,
        expires: doneAt + CACHE_TTL_MS,
        staleUntil: doneAt + STALE_IF_ERROR_TTL_MS,
      });
      if (userStateCache.size > 5000) userStateCache.clear();
      return state;
    } catch (err) {
      // หาก DB Connection Pool เต็มชั่วคราว (P2024) หรือเน็ตสะดุด แต่มีข้อมูลเดิมใน cache ที่ยังไม่เก่าเกินไป ให้ใช้ค่าเดิมไปก่อน
      if (cached && cached.staleUntil > Date.now()) {
        console.warn('[auth] Database busy/unreachable during session check, using cached user state');
        return cached.state;
      }
      throw err;
    } finally {
      inflightUserState.delete(userId);
    }
  })();

  inflightUserState.set(userId, promise);
  return promise;
}

/** Call after changing a user's status/role/password so the change applies immediately */
export function invalidateUserSession(userId: string) {
  userStateCache.delete(userId);
  inflightUserState.delete(userId);
}

/**
 * Extracts the session from cookies, verifies signature/expiry and
 * re-checks the user against the database (active, same role/scope).
 */
export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const cookie = request.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) return null;
  const user = await verifySessionToken(cookie.value);
  if (!user) return null;

  const state = await getUserState(user.id);
  if (
    !state ||
    !state.isActive ||
    // session ถูกเพิกถอน (เปลี่ยน/รีเซ็ตรหัสผ่าน) — token เก่าที่ไม่มี sessionVersion ถือเป็น 0
    (state.sessionVersion ?? 0) !== (user.sessionVersion ?? 0) ||
    state.role !== user.role ||
    state.supplierId !== user.supplierId ||
    state.branchId !== user.branchId ||
    // BRANCH users derive companyId from their branch, so only compare for other roles
    (user.role !== 'BRANCH' && state.companyId !== user.companyId)
  ) {
    return null;
  }
  return { ...user, mustChangePassword: user.role === 'SUPPLIER' ? false : state.mustChangePassword };
}

type AuthResult =
  | { user: SessionUser; response?: never }
  | { user?: never; response: NextResponse };

/**
 * Ensures user is authenticated and optionally checks role authorization.
 * Users flagged mustChangePassword are blocked until they change it (exempt for SUPPLIER).
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: Array<'MASTER' | 'ADMIN' | 'BRANCH' | 'SUPPLIER'>
): Promise<AuthResult> {
  let user: SessionUser | null;
  try {
    user = await getSessionUser(request);
  } catch (err) {
    console.error('[requireAuth] Failed to verify session against DB:', err);
    return {
      response: NextResponse.json(
        { error: 'ระบบฐานข้อมูลกำลังทำงานหนักหรือขาดการเชื่อมต่อชั่วคราว กรุณาลองใหม่อีกครั้ง', code: 'DB_UNAVAILABLE' },
        { status: 503 }
      ),
    };
  }
  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)' },
        { status: 401 }
      ),
    };
  }

  if (user.mustChangePassword && user.role !== 'SUPPLIER') {
    return {
      response: NextResponse.json(
        { error: 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน', code: 'MUST_CHANGE_PASSWORD' },
        { status: 403 }
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
