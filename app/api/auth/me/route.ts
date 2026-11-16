import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      const res = NextResponse.json(
        { error: 'ไม่ได้เข้าสู่ระบบ หรือ Session ไม่ถูกต้อง' },
        { status: 401 }
      );
      if (request.cookies.get(SESSION_COOKIE)) {
        res.cookies.delete(SESSION_COOKIE);
      }
      return res;
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error('[GET /api/auth/me] Error checking session:', err);
    // กรณีฐานข้อมูลสะดุดชั่วคราว แต่ JWT cookie ยังถูกต้อง ให้คืนข้อมูลจาก token ก่อนเพื่อไม่ให้เด้งหลุด/เกิด redirect loop
    const cookie = request.cookies.get(SESSION_COOKIE);
    const tokenUser = cookie?.value ? await verifySessionToken(cookie.value) : null;
    if (tokenUser) {
      return NextResponse.json({ user: tokenUser });
    }
    return NextResponse.json(
      { error: 'ไม่สามารถตรวจสอบสถานะการเข้าสู่ระบบได้ชั่วคราว' },
      { status: 503 }
    );
  }
}

