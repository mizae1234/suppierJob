import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Check if username exists and return display name (no password needed)
// Public endpoint → จำกัดจำนวนครั้งต่อ IP เพื่อกันการไล่เดา username
export async function POST(request: NextRequest) {
  const limit = rateLimit(`check-user:${getClientIp(request.headers)}`, 20, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `ตรวจสอบบ่อยเกินไป กรุณาลองใหม่ใน ${Math.ceil(limit.retryAfterSec / 60)} นาที` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'กรุณากรอก username' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        displayName: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' },
        { status: 404 }
      );
    }

    // ไม่คืน role/id เพื่อลดข้อมูลที่คนนอกไล่เดาได้ (คืนเฉพาะชื่อที่ใช้ทักทายในหน้า login)
    return NextResponse.json({ 
      success: true, 
      user: {
        displayName: user.displayName,
      }
    });
  } catch (error) {
    console.error('Check user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    );
  }
}
