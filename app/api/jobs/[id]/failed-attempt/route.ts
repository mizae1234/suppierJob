import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { uploadBase64Evidence } from '@/lib/s3';
import { rateLimit } from '@/lib/rate-limit';
import { logAuditFromUser } from '@/lib/audit-log';
import { recordVehicleSlideLog, getSlideRouteLabels } from '@/lib/vehicle-slide-log';
import {
  SLIDE_COMPLETION_FAILED_ATTEMPT,
  SLIDE_FAILED_ATTEMPT_FEE,
  SLIDE_FAIL_NOTE_MIN_LENGTH,
  SLIDE_FAIL_NOTE_MAX_LENGTH,
} from '@/lib/slide-failed-attempt';

const MIN_PHOTOS = 1;
const MAX_PHOTOS = 5;
/** สถานะที่ Vendor ส่งงานเที่ยวเปล่าได้ (REJECTED = สาขาตีกลับให้ส่งใหม่) */
const ALLOWED_STATUSES = ['PENDING_SUPPLIER', 'IN_PROGRESS', 'REJECTED'];

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST: Vendor ส่งงานสไลด์แบบ "เที่ยวเปล่า" (มาถึงหน้างานแล้วแต่สไลด์รถไม่ได้)
 * body: { note: string (บังคับ — Vendor พิมพ์สาเหตุเอง), photos: string[] (data:image/...) }
 *
 * - ใช้ใบงานเดิม → WAITING_APPROVAL ให้สาขาอนุมัติ
 * - ค่าบริการตายตัวต่อใบงาน (ไม่คูณจำนวนคัน) — ไม่ต้องยืนยัน VIN เพราะบางกรณีเข้าไม่ถึงตัวรถ
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  if (user.role !== 'SUPPLIER' && user.role !== 'MASTER') {
    return badRequest('เฉพาะ Supplier เท่านั้นที่ส่งงานเที่ยวเปล่าได้', 403);
  }

  try {
    const { id: jobId } = await params;
    const body = await request.json().catch(() => ({}));

    const note = typeof body.note === 'string' ? body.note.trim().slice(0, SLIDE_FAIL_NOTE_MAX_LENGTH) : '';
    const photos: string[] = Array.isArray(body.photos)
      ? body.photos.filter((p: unknown): p is string => typeof p === 'string' && p.startsWith('data:image/'))
      : [];

    if (note.length < SLIDE_FAIL_NOTE_MIN_LENGTH) {
      return badRequest(`กรุณาระบุหมายเหตุ / สาเหตุที่สไลด์ไม่ได้ (อย่างน้อย ${SLIDE_FAIL_NOTE_MIN_LENGTH} ตัวอักษร)`);
    }
    if (photos.length < MIN_PHOTOS) return badRequest('กรุณาถ่ายรูปหน้างานอย่างน้อย 1 รูปเพื่อเป็นหลักฐาน');
    if (photos.length > MAX_PHOTOS) return badRequest(`แนบรูปได้สูงสุด ${MAX_PHOTOS} รูป`);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        carWashItems: true,
        originBranch: { select: { code: true, name: true, address: true } },
        destBranch: { select: { code: true, name: true, address: true } },
        supplier: { select: { name: true } },
      },
    });
    if (!job) return badRequest('ไม่พบงานนี้', 404);

    if (user.role === 'SUPPLIER' && job.supplierId !== user.supplierId) {
      return badRequest('คุณไม่มีสิทธิ์ในงานนี้', 403);
    }
    if (job.jobType !== 'VEHICLE_SLIDE') return badRequest('ส่งงานเที่ยวเปล่าได้เฉพาะงานรถสไลด์เท่านั้น');
    if (!ALLOWED_STATUSES.includes(job.status)) {
      return badRequest('ใบงานนี้ไม่อยู่ในสถานะที่ส่งงานเที่ยวเปล่าได้');
    }

    const activeItems = job.carWashItems.filter(i => i.status !== 'CANCELLED');
    if (activeItems.some(i => i.status === 'APPROVED')) {
      return badRequest('ใบงานนี้มีรถที่ผ่านการตรวจรับแล้ว ไม่สามารถส่งเป็นเที่ยวเปล่าได้');
    }
    // ถ้าส่งงานสไลด์สำเร็จไปแล้วบางคัน (และสาขายังไม่ได้ตีกลับ) → ไม่ใช่เที่ยวเปล่า
    if (job.status !== 'REJECTED' && activeItems.some(i => i.status === 'COMPLETED')) {
      return badRequest('ใบงานนี้มีรถที่ส่งงานสไลด์สำเร็จแล้ว ไม่สามารถส่งเป็นเที่ยวเปล่าได้');
    }

    const vins = activeItems.length > 0 ? activeItems.map(i => i.vin) : (job.vin ? [job.vin] : []);
    if (vins.length === 0) return badRequest('ใบงานนี้ไม่มีรถที่ยังดำเนินการอยู่');

    const limit = rateLimit(`failed-attempt:${user.id}:${jobId}`, 10, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `ทำรายการบ่อยเกินไป กรุณารอ ${Math.ceil(limit.retryAfterSec / 60)} นาที แล้วลองใหม่` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    // ─── อัปโหลดรูปหลักฐานก่อน (นอก transaction) ──
    const uploadedUrls: string[] = [];
    try {
      for (const photo of photos) {
        const uploaded = await uploadBase64Evidence({
          base64Data: photo,
          job,
          vin: vins[0],
          evidenceType: 'ISSUE',
        });
        uploadedUrls.push(uploaded.url);
      }
    } catch (err) {
      if (err instanceof Error && /[\u0E00-\u0E7F]/.test(err.message)) return badRequest(err.message);
      throw err;
    }

    const actorName = user.displayName || user.username;
    const shortNote = note.length > 120 ? `${note.slice(0, 120)}…` : note;
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      // จองสิทธิ์แบบ atomic กันกดส่งซ้ำ / สถานะเปลี่ยนระหว่างทาง
      const claimed = await tx.job.updateMany({
        where: { id: jobId, status: { in: ALLOWED_STATUSES } },
        data: {
          status: 'WAITING_APPROVAL',
          completionType: SLIDE_COMPLETION_FAILED_ATTEMPT,
          failReasonCode: null,
          failNote: note,
          actualCost: SLIDE_FAILED_ATTEMPT_FEE,
          completedAt: now,
          rejectReason: null,
        },
      });
      if (claimed.count === 0) return false;

      // รถทุกคันในใบงานถือว่า Vendor ส่งงานแล้ว (ให้แสดงในแท็บ "รอตรวจรับ")
      if (activeItems.length > 0) {
        await tx.carWashItem.updateMany({
          where: { jobId, status: { in: ['PENDING', 'REJECTED', 'COMPLETED'] } },
          data: { status: 'COMPLETED', remarks: `เที่ยวเปล่า: ${shortNote}` },
        });
      }

      await tx.jobEvidence.createMany({
        data: uploadedUrls.map((url, idx) => ({
          jobId,
          vin: vins[0],
          photoUrl: url,
          caption: `รูปปัญหาหน้างาน — ${shortNote} (${idx + 1}/${uploadedUrls.length})`.slice(0, 500),
          evidenceType: 'ISSUE',
        })),
      });

      await tx.jobActivity.create({
        data: {
          jobId,
          action: 'FAILED_ATTEMPT',
          actor: actorName,
          actorRole: user.role,
          description: `Supplier แจ้งสไลด์ไม่สำเร็จ (เที่ยวเปล่า) — ${note} • ค่าบริการ ${SLIDE_FAILED_ATTEMPT_FEE} บาท`,
          metadata: JSON.stringify({ note, photos: uploadedUrls.length, fee: SLIDE_FAILED_ATTEMPT_FEE }),
        },
      });

      return true;
    });

    if (!updated) {
      return badRequest('สถานะใบงานมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอแล้วลองใหม่', 409);
    }

    const { originName, destName } = getSlideRouteLabels(job);
    recordVehicleSlideLog({
      jobId: job.id,
      jobNumber: job.jobNumber,
      vins,
      action: 'FAILED_ATTEMPT',
      originBranchId: job.originBranchId,
      originName,
      originAddress: job.customOriginAddress || job.originBranch?.address,
      originLat: job.customOriginLat,
      originLng: job.customOriginLng,
      destBranchId: job.destBranchId,
      destName,
      destAddress: job.customDestAddress || job.destBranch?.address,
      destLat: job.customDestLat,
      destLng: job.customDestLng,
      supplierId: job.supplierId,
      supplierName: job.supplier?.name,
      actorId: user.id,
      actorName,
      actorRole: user.role,
      remarks: `สไลด์ไม่สำเร็จ (เที่ยวเปล่า) — ${note}`,
    });

    logAuditFromUser(user, {
      action: 'SUBMIT_JOB',
      entityType: 'Job',
      entityId: jobId,
      description: `ส่งงานเที่ยวเปล่า (สไลด์ไม่สำเร็จ) ใบงาน ${job.jobNumber} — ${shortNote}`,
      metadata: {
        jobNumber: job.jobNumber,
        fromStatus: job.status,
        toStatus: 'WAITING_APPROVAL',
        completionType: SLIDE_COMPLETION_FAILED_ATTEMPT,
        note,
        fee: SLIDE_FAILED_ATTEMPT_FEE,
      },
      request,
    });

    return NextResponse.json({ success: true, fee: SLIDE_FAILED_ATTEMPT_FEE });
  } catch (error) {
    console.error('POST /api/jobs/[id]/failed-attempt error:', error);
    return badRequest('ไม่สามารถส่งงานเที่ยวเปล่าได้ กรุณาลองใหม่', 500);
  }
}

