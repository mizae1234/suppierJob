import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');

  if (!sessionCookie?.value) {
    return NextResponse.json(
      { error: 'ไม่ได้เข้าสู่ระบบ' },
      { status: 401 }
    );
  }

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );

    return NextResponse.json({ user: sessionData });
  } catch {
    return NextResponse.json(
      { error: 'Session ไม่ถูกต้อง' },
      { status: 401 }
    );
  }
}
