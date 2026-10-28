import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSessionUser, invalidateUserSession } from '@/lib/auth';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';
import { rateLimit } from '@/lib/rate-limit';
import { logAuditFromUser } from '@/lib/audit-log';
import { validatePasswordStrength, hashPassword } from '@/lib/password';

// POST: ผู้ใช้เปลี่ยนรหัสผ่านของตัวเอง (ใช้ได้แม้อยู่ในสถานะ mustChangePassword)
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)' }, { status: 401 });
  }

  const limit = rateLimit(`change-pw:${user.id}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'ลองหลายครั้งเกินไป กรุณารอสักครู่' }, { status: 429 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' }, { status: 400 });
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
    if (!dbUser || !(await bcrypt.compare(currentPassword, dbUser.password))) {
      return NextResponse.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 });
    }
    if (await bcrypt.compare(newPassword, dbUser.password)) {
      return NextResponse.json({ error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' }, { status: 400 });
    }

    // sessionVersion + 1 → session บนเครื่องอื่นทั้งหมดใช้ไม่ได้ทันที แล้วออก cookie ใหม่ให้เครื่องนี้
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(newPassword),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
      select: { sessionVersion: true },
    });
    invalidateUserSession(user.id);

    logAuditFromUser(user, {
      action: 'RESET_PASSWORD',
      entityType: 'User',
      entityId: user.id,
      description: `${user.displayName} เปลี่ยนรหัสผ่านของตนเอง`,
      request,
    });

    const sessionUser = { ...user, mustChangePassword: false, sessionVersion: updated.sessionVersion };
    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(sessionUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 });
  }
}
