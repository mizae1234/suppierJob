import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from './lib/session';

const PUBLIC_API = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/check-user',
  '/api/openapi.json',
  '/api/swagger.json',
  '/api/docs',
];
const STATIC_FILE = /\.(png|jpe?g|svg|webp|gif|ico)$/i;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // 1. Public endpoints & static assets (static-extension bypass ไม่ใช้กับ /api)
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    PUBLIC_API.includes(pathname) ||
    (pathname === '/api/suppliers' && request.method === 'GET') ||
    (!isApi && STATIC_FILE.test(pathname))
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  const user = sessionCookie ? await verifySessionToken(sessionCookie.value) : null;

  // 2. Login page
  if (pathname === '/login') {
    if (user) {
      if (user.mustChangePassword && user.role !== 'SUPPLIER') return NextResponse.redirect(new URL('/change-password', request.url));
      return NextResponse.redirect(new URL(user.role === 'SUPPLIER' ? '/vendor' : '/', request.url));
    }
    return NextResponse.next();
  }

  // 3. Protected API routes (route handlers also re-check auth + DB state)
  if (isApi) {
    if (!user) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 4. Protected pages
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Forced password change (exempt for SUPPLIER)
  if (pathname === '/change-password') return NextResponse.next();
  if (user.mustChangePassword && user.role !== 'SUPPLIER') {
    return NextResponse.redirect(new URL('/change-password', request.url));
  }

  // 6. Role-based route protection
  const isSupplierRoute = pathname.startsWith('/vendor');
  if (user.role === 'SUPPLIER' && !isSupplierRoute) {
    return NextResponse.redirect(new URL('/vendor', request.url));
  }
  if (user.role !== 'SUPPLIER' && user.role !== 'MASTER' && isSupplierRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
