import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, invalidateUserSession } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';
import { validatePasswordStrength, hashPassword } from '@/lib/password';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST: รีเซ็ตรหัสผ่านของผู้ใช้งาน (เฉพาะ MASTER)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['MASTER']);
    if (auth.response) return auth.response;
    const sessionUser = auth.user;

    const { id } = await context.params;
    const body = await request.json();
    const { newPassword } = body;

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, displayName: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      // รหัสผ่านที่ MASTER ตั้งให้เป็นรหัสชั่วคราว → ยกเว้น SUPPLIER ที่ไม่ต้องบังคับเปลี่ยน
      // sessionVersion + 1 → session เดิมของผู้ใช้นี้ทุกเครื่องใช้ไม่ได้ทันที
      data: {
        password: hashedPassword,
        mustChangePassword: existingUser.role === 'SUPPLIER' ? false : true,
        sessionVersion: { increment: 1 },
      },
    });
    invalidateUserSession(id);

    logAuditFromUser(sessionUser, {
      action: 'RESET_PASSWORD',
      entityType: 'User',
      entityId: existingUser.id,
      description: `รีเซ็ตรหัสผ่านสำหรับ: ${existingUser.displayName} (${existingUser.username})`,
      metadata: { username: existingUser.username, role: existingUser.role },
      request,
    });

    return NextResponse.json({
      message: `รีเซ็ตรหัสผ่านสำหรับ ${existingUser.displayName} เรียบร้อยแล้ว`,
    });
  } catch (error) {
    console.error('POST /api/users/[id]/reset-password error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' }, { status: 500 });
  }
}
