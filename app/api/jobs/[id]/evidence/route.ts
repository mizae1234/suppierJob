import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, type SessionUser } from '@/lib/auth';
import {
  uploadBase64Evidence,
  uploadToStorage,
  buildS3EvidenceKey,
  detectImageType,
  FILES_ROUTE_PREFIX,
  isSafeStorageKey,
  MAX_UPLOAD_BYTES,
} from '@/lib/s3';
import { canMutateJob, canViewJob } from '@/lib/job-access';

const EVIDENCE_TYPES = ['BEFORE', 'AFTER', 'PICKUP', 'DROPOFF', 'GENERAL', 'VERIFY', 'ISSUE'];
/** เพดานขนาด HTTP request body (~15MB รองรับไฟล์ 10MB + base64/multipart overhead) */
const MAX_REQUEST_BYTES = 15 * 1024 * 1024;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

async function loadJobForUpload(id: string, user: SessionUser) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      pickupBranch: { select: { companyId: true } },
      destBranch: { select: { companyId: true } },
    },
  });
  if (!job) return { response: NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 }) };
  if (!canMutateJob(user, job)) {
    return { response: NextResponse.json({ error: 'คุณไม่มีสิทธิ์แนบหลักฐานในงานนี้' }, { status: 403 }) };
  }
  return { job };
}

// POST: เพิ่มรูปหลักฐาน พร้อมอัปโหลดขึ้น S3 (DigitalOcean Spaces) ตามโครงสร้างโฟลเดอร์ที่กำหนด
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    // ตรวจขนาด request body ก่อนอ่าน formData/json เพื่อกัน payload ขนาดใหญ่เกิน
    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
        return NextResponse.json(
          { error: 'ขนาดไฟล์หรือข้อมูลใหญ่เกินกำหนด (สูงสุด 15MB)' },
          { status: 413 }
        );
      }
    }

    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';

    let vin: string | null = null;
    let photoUrl = '';
    let caption = '';
    let evidenceType = '';

    // Handle Multipart Form-Data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      vin = (formData.get('vin') as string) || null;
      caption = (formData.get('caption') as string) || '';
      evidenceType = (formData.get('evidenceType') as string) || '';

      if (!file || !evidenceType) {
        return NextResponse.json(
          { error: 'กรุณาระบุไฟล์รูปภาพและ evidenceType' },
          { status: 400 }
        );
      }
      if (!EVIDENCE_TYPES.includes(evidenceType)) return badRequest('evidenceType ไม่ถูกต้อง');
      if (file.size > MAX_UPLOAD_BYTES) return badRequest('ไฟล์รูปใหญ่เกิน 10MB');

      const loaded = await loadJobForUpload(id, user);
      if (loaded.response) return loaded.response;
      const { job } = loaded;

      const buffer = Buffer.from(await file.arrayBuffer());
      // ตรวจชนิดไฟล์จากเนื้อไฟล์จริง (ไม่ใช้นามสกุล/ชนิดที่ client ส่งมา)
      const detected = detectImageType(buffer);
      if (!detected) return badRequest('รองรับเฉพาะไฟล์รูป JPG, PNG, WEBP');

      const key = buildS3EvidenceKey({
        jobType: job.jobType,
        createdAt: job.createdAt,
        jobNumber: job.jobNumber,
        vin: vin || job.vin || 'general',
        evidenceType,
        extension: detected.ext,
      });

      photoUrl = await uploadToStorage({
        buffer,
        key,
        contentType: detected.mime,
      });

      const [evidence] = await prisma.$transaction([
        prisma.jobEvidence.create({
          data: {
            jobId: id,
            vin: vin || null,
            photoUrl,
            caption: typeof caption === 'string' ? caption.slice(0, 500) : '',
            evidenceType,
          },
        }),
        // ขยับ updatedAt ของใบงานเพื่อให้ incremental polling (?updatedSince) รับรู้ว่ามีรูปใหม่
        prisma.job.update({
          where: { id },
          data: { updatedAt: new Date() },
        }),
      ]);

      return NextResponse.json({ success: true, evidence }, { status: 201 });
    }

    // Handle JSON payload
    const body = await request.json();
    vin = typeof body.vin === 'string' ? body.vin : null;
    photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl : '';
    caption = typeof body.caption === 'string' ? body.caption : '';
    evidenceType = typeof body.evidenceType === 'string' ? body.evidenceType : '';

    if (!photoUrl || !evidenceType) {
      return NextResponse.json(
        { error: 'กรุณาระบุ photoUrl และ evidenceType' },
        { status: 400 }
      );
    }
    if (!EVIDENCE_TYPES.includes(evidenceType)) return badRequest('evidenceType ไม่ถูกต้อง');

    // Verify job exists and user has access
    const loaded = await loadJobForUpload(id, user);
    if (loaded.response) return loaded.response;
    const { job } = loaded;

    // If photoUrl is base64 data URL, upload to S3 with path:
    // {jobType}/{year-month}/{jobNumber}/{vin}/{filename}
    if (photoUrl.startsWith('data:image/')) {
      try {
        const uploadResult = await uploadBase64Evidence({
          base64Data: photoUrl,
          job,
          vin,
          evidenceType,
        });
        photoUrl = uploadResult.url;
      } catch (err) {
        // ข้อความ validation ของเราเป็นภาษาไทย → ส่งกลับเป็น 400; error อื่น (เช่น S3) ให้เป็น 500
        if (err instanceof Error && /[\u0E00-\u0E7F]/.test(err.message)) return badRequest(err.message);
        throw err;
      }
    } else {
      // อนุญาตเฉพาะ URL ภายใน /api/files/<safe-key> เท่านั้น (ไม่อนุญาตลิงก์ https ภายนอกหรือ path อื่น)
      const isInternalFileUrl =
        photoUrl.startsWith(FILES_ROUTE_PREFIX) &&
        isSafeStorageKey(photoUrl.slice(FILES_ROUTE_PREFIX.length));

      // จำกัด 800 ตัวอักษร: คอลัมน์ photoUrl มี index (SQL Server จำกัดขนาด key ของ index ~1700 bytes)
      if (!isInternalFileUrl || photoUrl.length > 800) {
        return NextResponse.json(
          { error: 'รองรับเฉพาะการอัปโหลดรูปภาพ (data:image/) หรือไฟล์ภายในระบบ (/api/files/) เท่านั้น' },
          { status: 400 }
        );
      }

      // ป้องกันการอ้างอิงไฟล์ส่วนตัวของงานอื่นที่ผู้ใช้ไม่มีสิทธิ์ดู
      const existingEvidence = await prisma.jobEvidence.findFirst({
        where: { photoUrl },
        select: {
          job: {
            select: {
              companyId: true,
              branchId: true,
              pickupBranchId: true,
              destBranchId: true,
              requestedById: true,
              supplierId: true,
              pickupBranch: { select: { companyId: true } },
              destBranch: { select: { companyId: true } },
            },
          },
        },
      });
      if (existingEvidence && !canViewJob(user, existingEvidence.job)) {
        return NextResponse.json(
          { error: 'คุณไม่มีสิทธิ์อ้างอิงไฟล์หลักฐานนี้' },
          { status: 403 }
        );
      }
    }

    const [evidence] = await prisma.$transaction([
      prisma.jobEvidence.create({
        data: {
          jobId: id,
          vin: vin || null,
          photoUrl,
          caption: typeof caption === 'string' ? caption.slice(0, 500) : '',
          evidenceType,
        },
      }),
      // ขยับ updatedAt ของใบงานเพื่อให้ incremental polling (?updatedSince) รับรู้ว่ามีรูปใหม่
      prisma.job.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, evidence }, { status: 201 });
  } catch (error) {
    console.error('POST /api/jobs/[id]/evidence error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถเพิ่มหลักฐานได้' },
      { status: 500 }
    );
  }
}

