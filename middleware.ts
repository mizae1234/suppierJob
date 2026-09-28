import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and auth endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/auth/check-user') ||
    pathname.startsWith('/public') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session');
  const user = sessionCookie ? await verifySessionToken(sessionCookie.value) : null;

  // 2. Handling Login Page
  if (pathname === '/login') {
    if (user) {
      if (user.role === 'SUPPLIER') {
        return NextResponse.redirect(new URL('/vendor', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 3. Protected API Routes
  if (pathname.startsWith('/api/')) {
    if (!user) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 4. Protected Page Routes
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Role-based Route Protection
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
