import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Check if username exists and return display name (no password needed)
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'กรุณากรอก username' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        displayName: true,
        role: true,
        username: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        displayName: user.displayName,
        role: user.role,
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
