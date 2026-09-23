import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');

    // Build filter
    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.currentBranchId = branchId;
    if (status) where.status = status;

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        company: { select: { code: true, name: true } },
        currentBranch: { select: { code: true, name: true } },
      },
      orderBy: { model: 'asc' },
    });

    // Format for frontend compatibility
    const formatted = vehicles.map(v => ({
      vin: v.vin,
      model: v.model,
      color: v.color,
      companyId: v.companyId,
      companyCode: v.company.code,
      currentBranchId: v.currentBranchId,
      currentBranchCode: v.currentBranch.code,
      currentBranchName: v.currentBranch.name,
      vehicleType: v.vehicleType,
      licensePlate: v.licensePlate,
      mileage: v.mileage,
      status: v.status || 'AVAILABLE',
    }));

    return NextResponse.json({ vehicles: formatted });
  } catch (error) {
    console.error('GET /api/vehicles error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลรถยนต์ได้' },
      { status: 500 }
    );
  }
}
