import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';
import { createBranchSchema, parseBody } from '@/lib/validation';

// GET: ดึงรายการสาขาทั้งหมดพร้อมสถิติจำนวนรถ จำนวนผู้ใช้งาน และจำนวนงาน
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const whereClause =
      user.role === 'BRANCH' && user.branchId
        ? { id: user.branchId }
        : user.role === 'ADMIN' && user.companyId
        ? { companyId: user.companyId }
        : {};

    const branches = await prisma.branch.findMany({
      where: whereClause,
      include: {
        company: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: {
            vehicles: true,
            users: true,
            jobs: true,
            pickupJobs: true,
            destJobs: true,
          },
        },
      },
      orderBy: [{ company: { code: 'asc' } }, { code: 'asc' }],
    });

    // Also get active jobs counts for each branch
    const activeJobs = await prisma.job.findMany({
      where: {
        status: { in: ['PENDING_SUPPLIER', 'IN_PROGRESS', 'WAITING_APPROVAL'] },
        ...(user.role === 'BRANCH' && user.branchId
          ? {
              OR: [
                { branchId: user.branchId },
                { pickupBranchId: user.branchId },
                { destBranchId: user.branchId },
              ],
            }
          : user.role === 'ADMIN' && user.companyId
          ? { companyId: user.companyId }
          : {}),
      },
      select: {
        id: true,
        branchId: true,
        pickupBranchId: true,
        destBranchId: true,
      },
    });

    // นับงานที่ active ต่อสาขาในรอบเดียว (งานเดียวนับครั้งเดียวต่อสาขา แม้ branchId = pickup/dest)
    const activeCountByBranch = new Map<string, number>();
    for (const j of activeJobs) {
      for (const bid of new Set([j.branchId, j.pickupBranchId, j.destBranchId])) {
        if (bid) activeCountByBranch.set(bid, (activeCountByBranch.get(bid) || 0) + 1);
      }
    }

    const branchesWithStats = branches.map((b) => {
      const activeCount = activeCountByBranch.get(b.id) || 0;

      return {
        ...b,
        companyCode: b.company.code,
        companyName: b.company.name,
        activeJobsCount: activeCount,
        vehiclesCount: b._count.vehicles,
        usersCount: b._count.users,
        totalJobsCount: b._count.jobs + b._count.pickupJobs + b._count.destJobs,
      };
    });

    return NextResponse.json({ branches: branchesWithStats });
  } catch (error) {
    console.error('GET /api/branches error:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลสาขาได้' }, { status: 500 });
  }
}

// POST: เพิ่มสาขาใหม่
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const parsed = await parseBody(request, createBranchSchema);
    if (parsed.response) return parsed.response;
    const { companyId, code, name, phone, address, latitude, longitude } = parsed.data;

    if (user.role === 'ADMIN' && user.companyId && user.companyId !== companyId) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เพิ่มสาขาให้บริษัทอื่น' }, { status: 403 });
    }

    // Check duplicate code across entire system (Globally Unique)
    const existing = await prisma.branch.findFirst({
      where: {
        code,
      },
      include: {
        company: { select: { name: true, code: true } },
      },
    });

    if (existing) {
      return NextResponse.json({
        error: `รหัสสาขา ${code} ถูกใช้งานแล้วในระบบ (สังกัด ${existing.company.name})`,
      }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: {
        companyId,
        code,
        name,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
      include: {
        company: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    logAuditFromUser(user, {
      action: 'CREATE_BRANCH',
      entityType: 'Branch',
      entityId: branch.id,
      description: `สร้างสาขาใหม่: ${branch.name} (${branch.code}) บริษัท ${branch.company.name}`,
      metadata: { branch },
      request,
    });

    return NextResponse.json({ success: true, branch });
  } catch (error) {
    console.error('POST /api/branches error:', error);
    return NextResponse.json({ error: 'ไม่สามารถสร้างสาขาได้' }, { status: 500 });
  }
}
