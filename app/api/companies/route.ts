import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        branches: {
          orderBy: { code: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('GET /api/companies error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลบริษัทได้' },
      { status: 500 }
    );
  }
}
