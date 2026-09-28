import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');

    // Build filter
    const where: Prisma.VehicleWhereInput = {};

    // Enforce Tenant Isolation
    if (user.role === 'BRANCH') {
      if (user.companyId) where.companyId = user.companyId;
      if (user.branchId) where.currentBranchId = user.branchId;
    } else if (user.role === 'ADMIN') {
      if (user.companyId) {
        where.companyId = user.companyId;
      } else if (companyId) {
        where.companyId = companyId;
      }
      if (branchId) where.currentBranchId = branchId;
    } else if (user.role === 'MASTER') {
      if (companyId) where.companyId = companyId;
      if (branchId) where.currentBranchId = branchId;
    } else if (user.role === 'SUPPLIER') {
      // Supplier only needs vehicles assigned to their active jobs
      if (companyId) where.companyId = companyId;
    }

    if (status) where.status = status;

    const limit = limitParam ? Math.min(200, Math.max(1, parseInt(limitParam, 10))) : 200;

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        company: { select: { code: true, name: true } },
        currentBranch: { select: { code: true, name: true } },
      },
      orderBy: { model: 'asc' },
      take: limit,
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
