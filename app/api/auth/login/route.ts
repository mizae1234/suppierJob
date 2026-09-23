import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { username, password, companyCode } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอก username และ password' },
        { status: 400 }
      );
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        company: true,
        branch: {
          include: { company: true },
        },
        supplier: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Check company match for non-admin users
    if (companyCode && user.role !== 'ADMIN') {
      const userCompanyCode = user.company?.code || user.branch?.company?.code;
      if (userCompanyCode && userCompanyCode !== companyCode) {
        return NextResponse.json(
          { error: `ผู้ใช้นี้ไม่ได้อยู่ในบริษัท ${companyCode} กรุณาเลือกบริษัทให้ถูกต้อง` },
          { status: 403 }
        );
      }
    }

    // Build session data (exclude password)
    const sessionData = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      companyId: user.companyId || user.branch?.companyId || null,
      companyCode: user.company?.code || user.branch?.company?.code || null,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      branchCode: user.branch?.code || null,
      supplierId: user.supplierId,
      supplierName: user.supplier?.name || null,
    };

    // Set session cookie (base64 encoded JSON)
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const response = NextResponse.json({
      success: true,
      user: sessionData,
    });

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    );
  }
}
