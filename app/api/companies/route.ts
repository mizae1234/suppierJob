import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

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
