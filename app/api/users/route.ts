import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';
import bcrypt from 'bcryptjs';

// GET: ดึงรายการผู้ใช้งานทั้งหมด (เฉพาะ MASTER เท่านั้น)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['MASTER']);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const role = searchParams.get('role') || 'ALL';
    const companyId = searchParams.get('companyId') || 'ALL';
    const branchId = searchParams.get('branchId') || 'ALL';
    const supplierId = searchParams.get('supplierId') || 'ALL';
    const status = searchParams.get('status') || 'ALL';

    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { displayName: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { position: { contains: search } },
      ];
    }

    // Role filter
    if (role !== 'ALL') {
      where.role = role;
    }

    // Company filter
    if (companyId !== 'ALL') {
      where.companyId = companyId;
    }

    // Branch filter
    if (branchId !== 'ALL') {
      where.branchId = branchId;
    }

    // Supplier filter
    if (supplierId !== 'ALL') {
      where.supplierId = supplierId;
    }

    // Status filter
    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE') {
      where.isActive = false;
    }

    const users = await prisma.user.findMany({
      where,
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
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน' },
      { status: 500 }
    );
  }
}

// POST: สร้างผู้ใช้งานใหม่ (เฉพาะ MASTER เท่านั้น)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['MASTER']);
    if (auth.response) return auth.response;
    const sessionUser = auth.user;

    const body = await request.json();
    const {
      username,
      password,
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

    // 1. Validation
    if (!username || !username.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้ (Username)' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    if (!displayName || !displayName.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อที่แสดง (Display Name)' }, { status: 400 });
    }

    const validRoles = ['MASTER', 'ADMIN', 'BRANCH', 'SUPPLIER'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'บทบาท (Role) ไม่ถูกต้อง' }, { status: 400 });
    }

    // Role-specific validation
    if (role === 'BRANCH' && !branchId) {
      return NextResponse.json({ error: 'ผู้ใช้งานระดับสาขาจำเป็นต้องระบุสาขา' }, { status: 400 });
    }
    if (role === 'SUPPLIER' && !supplierId) {
      return NextResponse.json({ error: 'ผู้ใช้งานคู่ค้าจำเป็นต้องระบุ Supplier' }, { status: 400 });
    }

    // 2. Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUser) {
      return NextResponse.json({ error: `ชื่อผู้ใช้ "${cleanUsername}" มีอยู่ในระบบแล้ว` }, { status: 400 });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        password: hashedPassword,
        displayName: displayName.trim(),
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        position: position?.trim() || null,
        phone: phone?.trim() || null,
        role,
        companyId: companyId || null,
        branchId: branchId || null,
        supplierId: supplierId || null,
        isActive: true,
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

    // 5. Audit Log
    logAuditFromUser(sessionUser, {
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: newUser.id,
      description: `สร้างผู้ใช้งานใหม่: ${newUser.displayName} (${newUser.username}) สิทธิ์ ${newUser.role}`,
      metadata: {
        username: newUser.username,
        role: newUser.role,
        companyId: newUser.companyId,
        branchId: newUser.branchId,
        supplierId: newUser.supplierId,
      },
      request,
    });

    return NextResponse.json({
      message: 'สร้างผู้ใช้งานเรียบร้อยแล้ว',
      user: newUser,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน' },
      { status: 500 }
    );
  }
}
