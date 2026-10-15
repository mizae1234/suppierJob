import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { uploadBase64Evidence } from '@/lib/s3';
import { rateLimit } from '@/lib/rate-limit';
import { logAuditFromUser } from '@/lib/audit-log';
import { recordVehicleSlideLog, getSlideRouteLabels } from '@/lib/vehicle-slide-log';

const MAX_ATTEMPTS = 20;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST: Supplier ยืนยันตัวรถก่อนเริ่มงานด้วยรูปถ่าย
 * body: { itemId?: string, photoUrl: string (data:image/...) }
 * - itemId มี → ยืนยันรายคัน (CarWashItem)
 * - itemId ไม่มี → ยืนยันระดับใบงาน (Vehicle Slide)
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
    const photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl : '';

    if (!photoUrl.startsWith('data:image/')) return badRequest('กรุณาถ่ายรูปยืนยันตัวรถเพื่อเป็นหลักฐาน');

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        vehicle: true,
        originBranch: { select: { code: true, name: true, address: true } },
        destBranch: { select: { code: true, name: true, address: true } },
        supplier: { select: { name: true } },
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

    const matchedVin = item ? item.vin : (job.vehicle?.vin || job.carWashItems[0]?.vin || job.vin || '');
    if (!matchedVin) return badRequest('ใบงานนี้ไม่มีข้อมูลรถให้ยืนยัน');

    // ─── Rate limit guard ──
    const limit = rateLimit(`verify:${user.id}:${itemId || jobId}`, MAX_ATTEMPTS, ATTEMPT_WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `ทำรายการบ่อยเกินไป กรุณารอ ${Math.ceil(limit.retryAfterSec / 60)} นาที แล้วลองใหม่` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
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
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.jobEvidence.create({
        data: {
          jobId,
          vin: matchedVin,
          photoUrl: uploadedUrl,
          caption: 'ถ่ายรูปยืนยันตัวรถก่อนเริ่มงาน',
          evidenceType: 'VERIFY',
        },
      });

      if (item) {
        await tx.carWashItem.update({
          where: { id: item.id },
          data: { verifiedAt: now, verifiedBy: actorName, verifyMethod: 'PHOTO' },
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
          description: `Supplier ถ่ายรูปยืนยันตัวรถ ${matchedVin} — เริ่มงานได้`,
          metadata: JSON.stringify({ method: 'PHOTO' }),
        },
      });
    });

    if (job.jobType === 'VEHICLE_SLIDE') {
      const { originName, destName } = getSlideRouteLabels({
        originBranch: job.originBranch,
        destBranch: job.destBranch,
        customOriginAddress: job.customOriginAddress,
        customDestAddress: job.customDestAddress,
      });

      recordVehicleSlideLog({
        jobId: job.id,
        jobNumber: job.jobNumber,
        vins: [matchedVin],
        action: 'PICKUP_VERIFIED',
        originBranchId: job.originBranchId,
        originName,
        destBranchId: job.destBranchId,
        destName,
        supplierId: job.supplierId,
        supplierName: job.supplier?.name,
        actorId: user.id,
        actorName,
        actorRole: user.role,
        remarks: `Supplier ยืนยันรับรถขึ้นสไลด์ ณ ${originName} เตรียมเดินทางไป ${destName}`,
      });
    }

    logAuditFromUser(user, {
      action: 'VERIFY_VEHICLE',
      entityType: item ? 'CarWashItem' : 'Job',
      entityId: item?.id || jobId,
      description: `ยืนยันตัวรถ ${matchedVin} ด้วยรูปถ่าย ในใบงาน ${job.jobNumber}`,
      metadata: { jobId, jobNumber: job.jobNumber, vin: matchedVin, method: 'PHOTO' },
      request,
    });

    return NextResponse.json({ success: true, method: 'PHOTO', verifiedAt: now.toISOString() });
  } catch (error) {
    console.error('POST /api/jobs/[id]/verify error:', error);
    return badRequest('ไม่สามารถยืนยันตัวรถได้ กรุณาลองใหม่', 500);
  }
}

