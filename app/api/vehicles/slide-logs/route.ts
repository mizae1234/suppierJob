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
    const vin = searchParams.get('vin');
    const jobId = searchParams.get('jobId');
    const jobNumber = searchParams.get('jobNumber');
    const branchId = searchParams.get('branchId');
    const companyId = searchParams.get('companyId');
    const q = searchParams.get('q');
    const limitParam = searchParams.get('limit');

    const where: Prisma.VehicleSlideLogWhereInput = {};

    // ─── Tenant & Role Isolation ─────────────────
    if (user.role === 'SUPPLIER') {
      where.supplierId = user.supplierId || 'none';
    } else if (user.role === 'BRANCH') {
      if (user.branchId) {
        where.OR = [
          { originBranchId: user.branchId },
          { destBranchId: user.branchId },
          { vehicle: { currentBranchId: user.branchId } },
        ];
      }
    } else if (user.role === 'ADMIN') {
      const targetCompanyId = user.companyId || companyId;
      if (targetCompanyId) {
        where.job = { companyId: targetCompanyId };
      }
    } else if (user.role === 'MASTER') {
      if (companyId) {
        where.job = { companyId };
      }
    }

    if (vin) {
      where.vin = vin;
    }
    if (jobId) {
      where.jobId = jobId;
    }
    if (jobNumber) {
      where.jobNumber = jobNumber;
    }
    if (branchId && user.role !== 'BRANCH') {
      where.OR = [
        { originBranchId: branchId },
        { destBranchId: branchId },
      ];
    }

    // Search query across VIN, Job Number, Origin, Destination, Vehicle
    if (q) {
      const term = q.trim();
      const searchConditions: Prisma.VehicleSlideLogWhereInput[] = [
        { vin: { contains: term } },
        { jobNumber: { contains: term } },
        { originName: { contains: term } },
        { destName: { contains: term } },
        { originAddress: { contains: term } },
        { destAddress: { contains: term } },
        { supplierName: { contains: term } },
        { vehicle: { licensePlate: { contains: term } } },
        { vehicle: { model: { contains: term } } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const limit = limitParam ? Math.min(200, Math.max(1, parseInt(limitParam, 10))) : 100;

    const logs = await prisma.vehicleSlideLog.findMany({
      where,
      include: {
        vehicle: {
          select: {
            model: true,
            color: true,
            licensePlate: true,
            currentBranch: { select: { code: true, name: true } },
          },
        },
        job: {
          select: {
            status: true,
            pickupDateTime: true,
            deliveryDateTime: true,
            company: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formatted = logs.map(l => ({
      id: l.id,
      vin: l.vin,
      jobId: l.jobId,
      jobNumber: l.jobNumber,
      action: l.action,
      originBranchId: l.originBranchId,
      originName: l.originName,
      originAddress: l.originAddress,
      originLat: l.originLat,
      originLng: l.originLng,
      destBranchId: l.destBranchId,
      destName: l.destName,
      destAddress: l.destAddress,
      destLat: l.destLat,
      destLng: l.destLng,
      distance: l.distance,
      supplierId: l.supplierId,
      supplierName: l.supplierName,
      actorId: l.actorId,
      actorName: l.actorName,
      actorRole: l.actorRole,
      remarks: l.remarks,
      createdAt: l.createdAt.toISOString(),
      vehicle: l.vehicle ? {
        model: l.vehicle.model,
        color: l.vehicle.color,
        licensePlate: l.vehicle.licensePlate || undefined,
        currentBranch: l.vehicle.currentBranch,
      } : undefined,
      job: l.job ? {
        status: l.job.status,
        companyCode: l.job.company.code,
        pickupDateTime: l.job.pickupDateTime?.toISOString(),
        deliveryDateTime: l.job.deliveryDateTime?.toISOString(),
      } : undefined,
    }));

    return NextResponse.json({ success: true, logs: formatted });
  } catch (error) {
    console.error('GET /api/vehicles/slide-logs error:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลประวัติการสไลด์รถได้' }, { status: 500 });
  }
}
