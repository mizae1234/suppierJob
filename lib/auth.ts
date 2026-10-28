import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySessionToken, SESSION_COOKIE, type SessionUser } from '@/lib/session';

export type { SessionUser } from '@/lib/session';
export { createSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

// ─── DB-backed session validation (with short cache) ─────────────
// ป้องกันกรณี user ถูกปิดใช้งาน / เปลี่ยนสิทธิ์ แต่ cookie เดิมยังใช้ได้
type DbState = { isActive: boolean; role: string; companyId: string | null; supplierId: string | null; branchId: string | null; mustChangePassword: boolean; sessionVersion: number };
const CACHE_TTL_MS = 30_000;
const userStateCache = new Map<string, { state: DbState | null; expires: number }>();

async function getUserState(userId: string): Promise<DbState | null> {
  const cached = userStateCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.state;

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
  userStateCache.set(userId, { state, expires: Date.now() + CACHE_TTL_MS });
  if (userStateCache.size > 5000) userStateCache.clear();
  return state;
}

/** Call after changing a user's status/role/password so the change applies immediately */
export function invalidateUserSession(userId: string) {
  userStateCache.delete(userId);
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
  const user = await getSessionUser(request);
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
