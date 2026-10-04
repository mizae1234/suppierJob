import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';

// GET: ดึงรายการสาขาทั้งหมดพร้อมสถิติจำนวนรถ จำนวนผู้ใช้งาน และจำนวนงาน
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const whereClause = user.role === 'ADMIN' && user.companyId ? { companyId: user.companyId } : {};

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
            originJobs: true,
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
        ...(user.role === 'ADMIN' && user.companyId ? { companyId: user.companyId } : {}),
      },
      select: {
        id: true,
        branchId: true,
        originBranchId: true,
        destBranchId: true,
      },
    });

    const branchesWithStats = branches.map((b) => {
      const activeCount = activeJobs.filter(
        (j) => j.branchId === b.id || j.originBranchId === b.id || j.destBranchId === b.id
      ).length;

      return {
        ...b,
        companyCode: b.company.code,
        companyName: b.company.name,
        activeJobsCount: activeCount,
        vehiclesCount: b._count.vehicles,
        usersCount: b._count.users,
        totalJobsCount: b._count.jobs + b._count.originJobs + b._count.destJobs,
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
    const body = await request.json();
    const { companyId, code, name, phone, address, latitude, longitude } = body;

    if (!companyId || !code?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลบริษัท รหัสสาขา และชื่อสาขาให้ครบถ้วน' }, { status: 400 });
    }

    if (user.role === 'ADMIN' && user.companyId && user.companyId !== companyId) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เพิ่มสาขาให้บริษัทอื่น' }, { status: 403 });
    }

    // Check duplicate code within company
    const existing = await prisma.branch.findUnique({
      where: {
        companyId_code: {
          companyId,
          code: code.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `รหัสสาขา ${code.trim()} มีอยู่ในระบบของบริษัทนี้แล้ว` }, { status: 400 });
    }

    const lat = latitude !== undefined && latitude !== '' && latitude !== null ? Number(latitude) : null;
    const lng = longitude !== undefined && longitude !== '' && longitude !== null ? Number(longitude) : null;

    const branch = await prisma.branch.create({
      data: {
        companyId,
        code: code.trim(),
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        latitude: lat && Number.isFinite(lat) ? lat : null,
        longitude: lng && Number.isFinite(lng) ? lng : null,
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
