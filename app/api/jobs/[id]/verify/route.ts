import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { uploadBase64Evidence } from '@/lib/s3';
import { rateLimit } from '@/lib/rate-limit';
import { logAuditFromUser } from '@/lib/audit-log';
import { matchVehicleIdentifier, hasUsablePlate } from '@/lib/vehicle-verify';

const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST: Supplier ยืนยันตัวรถก่อนเริ่มงาน
 * body: { itemId?: string, value: string, photoUrl: string (data:image/...) }
 * - itemId มี → ยืนยันรายคัน (CarWashItem)
 * - itemId ไม่มี → ยืนยันระดับใบงาน (Vehicle Slide)
 * ระบบตรวจค่าฝั่ง server เท่านั้น และไม่ส่งค่าที่ถูกต้องกลับไป
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  if (user.role !== 'SUPPLIER' && user.role !== 'MASTER') {
    return badRequest('เฉพาะ Supplier เท่านั้นที่ยืนยันตัวรถได้', 403);
  }

  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const itemId = typeof body.itemId === 'string' && body.itemId ? body.itemId : null;
    const value = typeof body.value === 'string' ? body.value.trim() : '';
    const photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl : '';

    if (!value) return badRequest('กรุณากรอก VIN 6 ตัวท้าย หรือเลขทะเบียนรถ');
    if (value.length > 40) return badRequest('ข้อมูลยาวเกินไป');
    if (!photoUrl.startsWith('data:image/')) return badRequest('กรุณาถ่ายรูปป้าย VIN หรือป้ายทะเบียนเพื่อเป็นหลักฐาน');

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        vehicle: true,
        carWashItems: { include: { vehicle: true } },
      },
    });
    if (!job) return badRequest('ไม่พบงานนี้', 404);

    if (user.role === 'SUPPLIER' && job.supplierId !== user.supplierId) {
      return badRequest('คุณไม่มีสิทธิ์ในงานนี้', 403);
    }
    if (!['IN_PROGRESS', 'PENDING_SUPPLIER', 'REJECTED'].includes(job.status)) {
      return badRequest('ใบงานนี้ไม่อยู่ในสถานะที่ยืนยันรถได้');
    }

    // ─── Resolve target vehicle(s) ──
    const item = itemId ? job.carWashItems.find(i => i.id === itemId) : null;
    if (itemId && !item) return badRequest('ไม่พบรถคันนี้ในใบงาน', 404);
    if (item && !['PENDING', 'REJECTED'].includes(item.status)) {
      return badRequest('รถคันนี้ส่งงานไปแล้ว ไม่ต้องยืนยันซ้ำ');
    }

    const alreadyVerified = item ? item.verifiedAt : job.verifiedAt;
    if (alreadyVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true, verifiedAt: alreadyVerified.toISOString() });
    }

    const candidates = item
      ? [{ vin: item.vin, licensePlate: item.vehicle.licensePlate }]
      : [
          ...(job.vehicle ? [{ vin: job.vehicle.vin, licensePlate: job.vehicle.licensePlate }] : []),
          ...job.carWashItems.map(i => ({ vin: i.vin, licensePlate: i.vehicle.licensePlate })),
        ];
    if (candidates.length === 0) return badRequest('ใบงานนี้ไม่มีข้อมูลรถให้ยืนยัน');

    // ─── Brute-force guard ──
    const limit = rateLimit(`verify:${user.id}:${itemId || jobId}`, MAX_ATTEMPTS, ATTEMPT_WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `กรอกผิดหลายครั้งเกินไป กรุณารอ ${Math.ceil(limit.retryAfterSec / 60)} นาที แล้วลองใหม่` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    let method: 'VIN' | 'PLATE' | null = null;
    let matchedVin = '';
    for (const c of candidates) {
      const m = matchVehicleIdentifier(value, c);
      if (m) { method = m; matchedVin = c.vin; break; }
    }

    if (!method) {
      const canUsePlate = candidates.some(c => hasUsablePlate(c.licensePlate));
      await prisma.jobActivity.create({
        data: {
          jobId,
          action: 'VERIFY_FAILED',
          actor: user.displayName || user.username,
          actorRole: user.role,
          itemId: item?.id,
          vin: item?.vin || job.vin,
          description: `ยืนยันตัวรถไม่สำเร็จ — ข้อมูลที่กรอกไม่ตรงกับรถในใบงาน`,
          metadata: JSON.stringify({ input: value.slice(0, 40) }),
        },
      });
      return badRequest(
        canUsePlate
          ? 'VIN หรือเลขทะเบียนไม่ตรงกับรถในใบงาน กรุณาตรวจสอบรถอีกครั้ง'
          : 'VIN ไม่ตรงกับรถในใบงาน (รถคันนี้ยังไม่มีทะเบียน กรุณาใช้ VIN 6 ตัวท้าย)'
      );
    }

    // ─── Upload verification photo ──
    let uploadedUrl: string;
    try {
      const uploaded = await uploadBase64Evidence({
        base64Data: photoUrl,
        job,
        vin: matchedVin,
        evidenceType: 'VERIFY',
      });
      uploadedUrl = uploaded.url;
    } catch (err) {
      if (err instanceof Error && /[\u0E00-\u0E7F]/.test(err.message)) return badRequest(err.message);
      throw err;
    }

    const actorName = user.displayName || user.username;
    const methodLabel = method === 'VIN' ? 'VIN 6 ตัวท้าย' : 'เลขทะเบียน';
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.jobEvidence.create({
        data: {
          jobId,
          vin: matchedVin,
          photoUrl: uploadedUrl,
          caption: `ยืนยันตัวรถด้วย${methodLabel}`,
          evidenceType: 'VERIFY',
        },
      });

      if (item) {
        await tx.carWashItem.update({
          where: { id: item.id },
          data: { verifiedAt: now, verifiedBy: actorName, verifyMethod: method },
        });
      } else {
        await tx.job.update({
          where: { id: jobId },
          data: { verifiedAt: now, verifiedBy: actorName },
        });
      }

      await tx.jobActivity.create({
        data: {
          jobId,
          action: 'ITEM_VERIFIED',
          actor: actorName,
          actorRole: user.role,
          itemId: item?.id,
          vin: matchedVin,
          description: `Supplier ยืนยันตัวรถ ${matchedVin} ด้วย${methodLabel} พร้อมรูปถ่าย — เริ่มงานได้`,
          metadata: JSON.stringify({ method }),
        },
      });
    });

    logAuditFromUser(user, {
      action: 'VERIFY_VEHICLE',
      entityType: item ? 'CarWashItem' : 'Job',
      entityId: item?.id || jobId,
      description: `ยืนยันตัวรถ ${matchedVin} ด้วย${methodLabel} ในใบงาน ${job.jobNumber}`,
      metadata: { jobId, jobNumber: job.jobNumber, vin: matchedVin, method },
      request,
    });

    return NextResponse.json({ success: true, method, verifiedAt: now.toISOString() });
  } catch (error) {
    console.error('POST /api/jobs/[id]/verify error:', error);
    return badRequest('ไม่สามารถยืนยันตัวรถได้ กรุณาลองใหม่', 500);
  }
}
