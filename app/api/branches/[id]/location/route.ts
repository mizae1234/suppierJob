import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';

// PATCH: อัปเดตพิกัด GPS ของสาขา (ใช้สำหรับคำนวณระยะทาง + ปุ่มนำทางของ Supplier)
// สิทธิ์: MASTER (ทุกบริษัท), ADMIN (เฉพาะบริษัทตัวเอง)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;
    const { latitude, longitude, address } = await request.json();

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'พิกัดไม่ถูกต้อง' }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: 'ไม่พบสาขานี้' }, { status: 404 });
    }

    if (user.role === 'ADMIN' && user.companyId && user.companyId !== branch.companyId) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขสาขาของบริษัทอื่น' }, { status: 403 });
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        latitude: lat,
        longitude: lng,
        ...(typeof address === 'string' && address.trim()
          ? { address: address.trim() }
          : {}),
      },
    });

    logAuditFromUser(user, {
      action: 'UPDATE_BRANCH',
      entityType: 'Branch',
      entityId: id,
      description: `แก้ไขพิกัดสาขา ${branch.name} → ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      metadata: {
        before: { latitude: branch.latitude, longitude: branch.longitude },
        after: { latitude: lat, longitude: lng },
      },
      request,
    });

    return NextResponse.json({ success: true, branch: updated });
  } catch (error) {
    console.error('PATCH /api/branches/[id]/location error:', error);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกพิกัดสาขาได้' }, { status: 500 });
  }
}
