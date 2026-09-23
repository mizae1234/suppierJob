import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Convert services string to array for frontend compatibility
    const formatted = suppliers.map(s => ({
      ...s,
      services: s.services.split(',').map(sv => sv.trim()),
    }));

    return NextResponse.json({ suppliers: formatted });
  } catch (error) {
    console.error('GET /api/suppliers error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูล Supplier ได้' },
      { status: 500 }
    );
  }
}
