import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';

// GET: ดึงข้อมูลรายละเอียดของสาขาเดี่ยว
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, code: true, name: true },
        },
        users: {
          select: { id: true, displayName: true, username: true, role: true, phone: true, position: true },
        },
        vehicles: {
          take: 20,
          orderBy: { updatedAt: 'desc' },
          select: { vin: true, licensePlate: true, model: true, color: true, status: true, vehicleType: true },
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
    });

    if (!branch) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลสาขานี้' }, { status: 404 });
    }

    if (user.role === 'ADMIN' && user.companyId && user.companyId !== branch.companyId) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงสาขานี้' }, { status: 403 });
    }

    if (user.role === 'BRANCH' && user.branchId && user.branchId !== branch.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงสาขานี้' }, { status: 403 });
    }

    return NextResponse.json({ branch });
  } catch (error) {
    console.error('GET /api/branches/[id] error:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลสาขาได้' }, { status: 500 });
  }
}

// PATCH: แก้ไขข้อมูลสาขา
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN', 'BRANCH']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, code, phone, address, latitude, longitude } = body;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!branch) {
      return NextResponse.json({ error: 'ไม่พบสาขานี้' }, { status: 404 });
    }

    if (user.role === 'ADMIN' && user.companyId && user.companyId !== branch.companyId) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขสาขาของบริษัทอื่น' }, { status: 403 });
    }

    if (user.role === 'BRANCH' && user.branchId !== branch.id) {
      return NextResponse.json({ error: 'คุณสามารถแก้ไขได้เฉพาะสาขาของตนเองเท่านั้น' }, { status: 403 });
    }

    const isBranch = user.role === 'BRANCH';

    // If code is changing, check uniqueness (only for MASTER/ADMIN)
    if (!isBranch && code && code.trim() !== branch.code) {
      const existing = await prisma.branch.findUnique({
        where: {
          companyId_code: {
            companyId: branch.companyId,
            code: code.trim(),
          },
        },
      });
      if (existing) {
        return NextResponse.json({ error: `รหัสสาขา ${code.trim()} ถูกใช้งานแล้ว` }, { status: 400 });
      }
    }

    const lat = latitude !== undefined && latitude !== '' && latitude !== null ? Number(latitude) : null;
    const lng = longitude !== undefined && longitude !== '' && longitude !== null ? Number(longitude) : null;

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(!isBranch && name?.trim() ? { name: name.trim() } : {}),
        ...(!isBranch && code?.trim() ? { code: code.trim() } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(address !== undefined ? { address: address?.trim() || null } : {}),
        ...(lat !== null && Number.isFinite(lat) ? { latitude: lat } : lat === null ? { latitude: null } : {}),
        ...(lng !== null && Number.isFinite(lng) ? { longitude: lng } : lng === null ? { longitude: null } : {}),
      },
      include: {
        company: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    logAuditFromUser(user, {
      action: 'UPDATE_BRANCH',
      entityType: 'Branch',
      entityId: id,
      description: `แก้ไขข้อมูลสาขา ${updated.name} (${updated.code})`,
      metadata: { before: branch, after: updated },
      request,
    });

    return NextResponse.json({ success: true, branch: updated });
  } catch (error) {
    console.error('PATCH /api/branches/[id] error:', error);
    return NextResponse.json({ error: 'ไม่สามารถอัปเดตข้อมูลสาขาได้' }, { status: 500 });
  }
}

// DELETE: ลบสาขา (เฉพาะ MASTER และต้องไม่มีงานหรือรถผูกอยู่)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['MASTER']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vehicles: true,
            jobs: true,
            originJobs: true,
            destJobs: true,
            users: true,
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: 'ไม่พบสาขานี้' }, { status: 404 });
    }

    if (branch._count.jobs > 0 || branch._count.originJobs > 0 || branch._count.destJobs > 0) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบสาขานี้ได้เนื่องจากมีประวัติงานที่ผูกกับสาขานี้อยู่ในระบบ' },
        { status: 400 }
      );
    }

    if (branch._count.vehicles > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบสาขานี้ได้เนื่องจากมีรถยนต์อยู่ในสต็อกสาขานี้จำนวน ${branch._count.vehicles} คัน กรุณาย้ายรถก่อน` },
        { status: 400 }
      );
    }

    // Delete branch users or unassign branch
    if (branch._count.users > 0) {
      await prisma.user.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      });
    }

    await prisma.branch.delete({ where: { id } });

    logAuditFromUser(user, {
      action: 'DELETE_BRANCH',
      entityType: 'Branch',
      entityId: id,
      description: `ลบสาขา: ${branch.name} (${branch.code})`,
      metadata: { deletedBranch: branch },
      request,
    });

    return NextResponse.json({ success: true, message: 'ลบสาขาสำเร็จ' });
  } catch (error) {
    console.error('DELETE /api/branches/[id] error:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบสาขาได้' }, { status: 500 });
  }
}
