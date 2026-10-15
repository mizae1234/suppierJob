import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, type SessionUser } from '@/lib/session';
import { logAudit } from '@/lib/audit-log';
import { rateLimit, resetRateLimit, getClientIp } from '@/lib/rate-limit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_USER = 5;   // ผิด 5 ครั้ง / 15 นาที ต่อ username+IP
const MAX_ATTEMPTS_PER_IP = 30; // กันการไล่เดา username จำนวนมากจาก IP เดียว

function tooMany(retryAfterSec: number) {
  return NextResponse.json(
    { error: `พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ใน ${Math.ceil(retryAfterSec / 60)} นาที` },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, companyCode } = await request.json();

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'กรุณากรอก username และ password' },
        { status: 400 }
      );
    }

    const ip = getClientIp(request.headers);
    const ipLimit = rateLimit(`login-ip:${ip}`, MAX_ATTEMPTS_PER_IP, WINDOW_MS);
    if (!ipLimit.allowed) return tooMany(ipLimit.retryAfterSec);

    const failKey = `login-fail:${username.toLowerCase()}:${ip}`;
    // นับทุกครั้งที่พยายาม และล้างเมื่อ login สำเร็จ → ผิดเกิน 5 ครั้งจะถูกบล็อกก่อนตรวจรหัสผ่าน
    const failState = rateLimit(failKey, MAX_FAILS_PER_USER, WINDOW_MS);
    if (!failState.allowed) return tooMany(failState.retryAfterSec);

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

    // สำเร็จ → ล้างตัวนับความผิดพลาด
    resetRateLimit(failKey);

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
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      position: user.position || null,
      phone: user.phone || null,
      role: user.role as SessionUser['role'],
      companyId: user.companyId || user.branch?.companyId || null,
      companyCode: user.company?.code || user.branch?.company?.code || null,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      branchCode: user.branch?.code || null,
      supplierId: user.supplierId,
      supplierName: user.supplier?.name || null,
      mustChangePassword: user.role === 'SUPPLIER' ? false : user.mustChangePassword,
    };

    // Set cryptographically signed session cookie
    const sessionToken = await createSessionToken(sessionData);

    const response = NextResponse.json({
      success: true,
      user: sessionData,
    });

    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    // Audit Log: LOGIN
    logAudit({
      userId: user.id,
      userName: user.displayName,
      userRole: user.role,
      supplierId: user.supplierId,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      description: `${user.displayName} (${user.role}) เข้าสู่ระบบ`,
      metadata: { username: user.username, companyCode: sessionData.companyCode },
      request,
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
