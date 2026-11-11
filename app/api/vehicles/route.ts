import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { getActiveJobsByVin } from '@/lib/active-jobs';

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
    const q = searchParams.get('q');
    const scope = searchParams.get('scope');

    // Build filter
    const where: Prisma.VehicleWhereInput = {};

    // Enforce Tenant Isolation
    if (user.role === 'BRANCH') {
      if (scope !== 'all') {
        if (user.companyId) where.companyId = user.companyId;
        if (user.branchId) where.currentBranchId = user.branchId;
      }
    } else if (user.role === 'ADMIN') {
      if (user.companyId) {
        where.companyId = user.companyId;
      } else if (companyId) {
        where.companyId = companyId;
      }
      if (branchId && scope !== 'all') where.currentBranchId = branchId;
    } else if (user.role === 'MASTER') {
      if (companyId) where.companyId = companyId;
      if (branchId && scope !== 'all') where.currentBranchId = branchId;
    } else if (user.role === 'SUPPLIER') {
      // Supplier เห็นเฉพาะรถที่อยู่ในงานของตัวเองเท่านั้น
      const ownSupplierId = user.supplierId || 'none';
      where.OR = [
        { jobs: { some: { supplierId: ownSupplierId } } },
        { carWashItems: { some: { job: { supplierId: ownSupplierId } } } },
      ];
    }

    if (q) {
      const term = q.trim();
      const compactTerm = term.replace(/\s+/g, '');
      const searchTerms = [term];
      if (compactTerm && compactTerm !== term) {
        searchTerms.push(compactTerm);
      }

      const orConditions: Prisma.VehicleWhereInput[] = [];
      for (const t of searchTerms) {
        orConditions.push(
          { vin: { contains: t } },
          { licensePlate: { contains: t } },
          { model: { contains: t } }
        );
      }

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: orConditions },
        ];
        delete where.OR;
      } else {
        where.OR = orConditions;
      }
    }

    if (status) where.status = status;

    // D365 sync ดึงรถทั้งเครือมา (200+ คัน) และหน้าเว็บโหลดทั้งหมดฝั่ง client → เพดาน 2000
    const MAX_LIMIT = 2000;
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN;
    const limit = Number.isFinite(parsedLimit) ? Math.min(MAX_LIMIT, Math.max(1, parsedLimit)) : MAX_LIMIT;

    const [vehicles, allBranches] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: {
          company: { select: { code: true, name: true } },
          currentBranch: { select: { code: true, name: true, address: true } },
        },
        orderBy: { model: 'asc' },
        take: limit,
      }),
      prisma.branch.findMany({
        select: { id: true, code: true, name: true, address: true },
      }),
    ]);

    const branchByCode = new Map(
      allBranches.map((b) => [b.code.trim().toUpperCase(), b])
    );

    // Cars that still have unfinished work → can't be ordered again
    const activeJobs = await getActiveJobsByVin(vehicles.map(v => v.vin));

    // Format for frontend compatibility
    const formatted = vehicles.map(v => {
      const activeJobRef = activeJobs.get(v.vin);
      const canUserCancelActiveJob = Boolean(
        activeJobRef?.canCancel && user.role !== 'SUPPLIER'
      );
      const ownerSiteCode = v.d365SiteId?.trim().toUpperCase();
      const ownerBranch = ownerSiteCode ? branchByCode.get(ownerSiteCode) : undefined;

      return {
        vin: v.vin,
        model: v.model,
        color: v.color,
        companyId: v.companyId,
        companyCode: v.company.code,
        currentBranchId: v.currentBranchId,
        currentBranchCode: v.currentBranch.code,
        currentBranchName: v.currentBranch.name,
        ownerBranchId: ownerBranch?.id || v.currentBranchId,
        ownerBranchCode: ownerBranch?.code || v.d365SiteId || v.currentBranch.code,
        ownerBranchName: ownerBranch?.name || v.currentBranch.name,
        ownerBranchAddress: ownerBranch?.address || v.currentBranch.address || null,
        vehicleType: v.vehicleType,
        licensePlate: v.licensePlate,
        mileage: v.mileage,
        status: v.status || 'AVAILABLE',
        source: v.source,
        d365ItemId: v.d365ItemId,
        d365SiteId: v.d365SiteId,
        d365WarehouseId: v.d365WarehouseId,
        d365Reserved: v.d365Reserved,
        lastSyncedAt: v.lastSyncedAt,
        activeJob: activeJobRef
          ? { ...activeJobRef, canCancel: canUserCancelActiveJob }
          : null,
      };
    });

    return NextResponse.json({ vehicles: formatted });
  } catch (error) {
    console.error('GET /api/vehicles error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลรถยนต์ได้' },
      { status: 500 }
    );
  }
}
