import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH: สลับสถานะเปิด/ปิดการใช้งาน (Active / Inactive) (เฉพาะ MASTER)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['MASTER']);
    if (auth.response) return auth.response;
    const sessionUser = auth.user;

    const { id } = await context.params;

    if (id === sessionUser.id) {
      return NextResponse.json(
        { error: 'คุณไม่สามารถระงับบัญชีของตนเองที่กำลังเข้าสู่ระบบอยู่ได้' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const newStatus = typeof body.isActive === 'boolean' ? body.isActive : !existingUser.isActive;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: newStatus },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
      },
    });

    logAuditFromUser(sessionUser, {
      action: 'TOGGLE_USER_STATUS',
      entityType: 'User',
      entityId: updatedUser.id,
      description: `${newStatus ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} บัญชี: ${updatedUser.displayName} (${updatedUser.username})`,
      metadata: { username: updatedUser.username, role: updatedUser.role, isActive: newStatus },
      request,
    });

    return NextResponse.json({
      message: `${newStatus ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} บัญชีเรียบร้อยแล้ว`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('PATCH /api/users/[id]/status error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ใช้งาน' }, { status: 500 });
  }
}
