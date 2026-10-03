import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';
import bcrypt from 'bcryptjs';

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

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, displayName: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

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
