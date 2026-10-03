import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: ดึงข้อมูลผู้ใช้รายคน (เฉพาะ MASTER)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['MASTER']);
    if (auth.response) return auth.response;

    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        firstName: true,
        lastName: true,
        position: true,
        phone: true,
        role: true,
        companyId: true,
        branchId: true,
        supplierId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        company: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, code: true, name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/users/[id] error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน' }, { status: 500 });
  }
}

// PUT: แก้ไขข้อมูลผู้ใช้งาน (เฉพาะ MASTER)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['MASTER']);
    if (auth.response) return auth.response;
    const sessionUser = auth.user;

    const { id } = await context.params;
    const body = await request.json();
    const {
      displayName,
      firstName,
      lastName,
      position,
      phone,
      role,
      companyId,
      branchId,
      supplierId,
    } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    if (!displayName || !displayName.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อที่แสดง (Display Name)' }, { status: 400 });
    }

    const validRoles = ['MASTER', 'ADMIN', 'BRANCH', 'SUPPLIER'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'บทบาท (Role) ไม่ถูกต้อง' }, { status: 400 });
    }

    // Role-specific validation
    const targetRole = role || existingUser.role;
    if (targetRole === 'BRANCH' && !branchId && !existingUser.branchId) {
      return NextResponse.json({ error: 'ผู้ใช้งานระดับสาขาจำเป็นต้องระบุสาขา' }, { status: 400 });
    }
    if (targetRole === 'SUPPLIER' && !supplierId && !existingUser.supplierId) {
      return NextResponse.json({ error: 'ผู้ใช้งานคู่ค้าจำเป็นต้องระบุ Supplier' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        displayName: displayName.trim(),
        firstName: firstName !== undefined ? (firstName?.trim() || null) : existingUser.firstName,
        lastName: lastName !== undefined ? (lastName?.trim() || null) : existingUser.lastName,
        position: position !== undefined ? (position?.trim() || null) : existingUser.position,
        phone: phone !== undefined ? (phone?.trim() || null) : existingUser.phone,
        role: targetRole,
        companyId: targetRole === 'MASTER' ? null : (companyId !== undefined ? (companyId || null) : existingUser.companyId),
        branchId: targetRole === 'BRANCH' ? (branchId || null) : null,
        supplierId: targetRole === 'SUPPLIER' ? (supplierId || null) : null,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        firstName: true,
        lastName: true,
        position: true,
        phone: true,
        role: true,
        companyId: true,
        branchId: true,
        supplierId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        company: { select: { id: true, code: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, code: true, name: true } },
      },
    });

    logAuditFromUser(sessionUser, {
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: updatedUser.id,
      description: `แก้ไขข้อมูลผู้ใช้: ${updatedUser.displayName} (${updatedUser.username}) บทบาท ${updatedUser.role}`,
      metadata: {
        changes: {
          role: updatedUser.role,
          displayName: updatedUser.displayName,
          companyId: updatedUser.companyId,
          branchId: updatedUser.branchId,
          supplierId: updatedUser.supplierId,
        },
      },
      request,
    });

    return NextResponse.json({
      message: 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
      user: updatedUser,
    });
  } catch (error) {
    console.error('PUT /api/users/[id] error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้งาน' }, { status: 500 });
  }
}

// DELETE: ลบผู้ใช้งาน (เฉพาะ MASTER)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ['MASTER']);
    if (auth.response) return auth.response;
    const sessionUser = auth.user;

    const { id } = await context.params;

    if (id === sessionUser.id) {
      return NextResponse.json({ error: 'คุณไม่สามารถลบบัญชีตนเองที่กำลังใช้งานอยู่ได้' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    logAuditFromUser(sessionUser, {
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      description: `ลบผู้ใช้งาน: ${existingUser.displayName} (${existingUser.username})`,
      metadata: { username: existingUser.username, role: existingUser.role },
      request,
    });

    return NextResponse.json({ message: 'ลบผู้ใช้งานเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('DELETE /api/users/[id] error:', error);
    // If foreign key constraint
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'ไม่สามารถลบผู้ใช้นี้ได้เนื่องจากมีข้อมูลความสัมพันธ์ในระบบ กรุณาเลือกปิดการใช้งาน (Deactivate) แทน' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน' }, { status: 500 });
  }
}
