import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, invalidateUserSession, SESSION_COOKIE } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  // เพิกถอน session ฝั่ง server โดยเพิ่ม sessionVersion และล้าง cache เพื่อกันการนำ cookie เดิมมาใช้ซ้ำ
  try {
    const user = await getSessionUser(request);
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { sessionVersion: { increment: 1 } },
      });
      invalidateUserSession(user.id);

      logAuditFromUser(user, {
        action: 'LOGOUT',
        entityType: 'User',
        entityId: user.id,
        description: `${user.displayName} (${user.role}) ออกจากระบบ`,
        request,
      });
    }
  } catch (error) {
    // แม้ DB มีปัญหาชั่วคราว ยังคงล้าง cookie ฝั่ง client ต่อไป
    console.error('POST /api/auth/logout revoke session error:', error);
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // expire immediately
  });

  return response;
}
