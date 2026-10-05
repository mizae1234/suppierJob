import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { uploadBase64Evidence, uploadToStorage, buildS3EvidenceKey } from '@/lib/s3';

// POST: เพิ่มรูปหลักฐาน พร้อมอัปโหลดขึ้น S3 (DigitalOcean Spaces) ตามโครงสร้างโฟลเดอร์ที่กำหนด
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
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

      // Verify job exists
      const job = await prisma.job.findUnique({ where: { id } });
      if (!job) {
        return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
      }

      if (user.role === 'SUPPLIER' && job.supplierId !== user.supplierId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แนบหลักฐานในงานนี้' }, { status: 403 });
      }

      if (user.role === 'BRANCH' && user.companyId && job.companyId !== user.companyId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แนบหลักฐานในงานของบริษัทอื่น' }, { status: 403 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = file.name?.split('.').pop() || 'jpg';

      const key = buildS3EvidenceKey({
        jobType: job.jobType,
        createdAt: job.createdAt,
        jobNumber: job.jobNumber,
        vin: vin || job.vin || 'general',
        evidenceType,
        extension: ext,
      });

      photoUrl = await uploadToStorage({
        buffer,
        key,
        contentType: file.type || 'image/jpeg',
      });

      const evidence = await prisma.jobEvidence.create({
        data: {
          jobId: id,
          vin: vin || null,
          photoUrl,
          caption: typeof caption === 'string' ? caption.slice(0, 500) : '',
          evidenceType,
        },
      });

      return NextResponse.json({ success: true, evidence }, { status: 201 });
    }

    // Handle JSON payload
    const body = await request.json();
    vin = body.vin || null;
    photoUrl = body.photoUrl || '';
    caption = body.caption || '';
    evidenceType = body.evidenceType || '';

    if (!photoUrl || !evidenceType) {
      return NextResponse.json(
        { error: 'กรุณาระบุ photoUrl และ evidenceType' },
        { status: 400 }
      );
    }

    // Verify job exists and user has access
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
    }

    if (user.role === 'SUPPLIER' && job.supplierId !== user.supplierId) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แนบหลักฐานในงานนี้' }, { status: 403 });
    }

    if (user.role === 'BRANCH' && user.companyId && job.companyId !== user.companyId) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แนบหลักฐานในงานของบริษัทอื่น' }, { status: 403 });
    }

    // If photoUrl is base64 data URL, upload to S3 with path:
    // {jobType}/{year-month}/{jobNumber}/{vin}/{filename}
    if (photoUrl.startsWith('data:image/')) {
      const uploadResult = await uploadBase64Evidence({
        base64Data: photoUrl,
        job,
        vin,
        evidenceType,
      });
      photoUrl = uploadResult.url;
    } else {
      // Validate safe URL format (prevent javascript: or XSS payloads)
      const isSafeUrl =
        photoUrl.startsWith('/') ||
        photoUrl.startsWith('https://') ||
        photoUrl.startsWith('http://');

      if (!isSafeUrl) {
        return NextResponse.json(
          { error: 'รูปแบบ photoUrl ไม่ถูกต้องหรือไม่ปลอดภัย' },
          { status: 400 }
        );
      }
    }

    const evidence = await prisma.jobEvidence.create({
      data: {
        jobId: id,
        vin: vin || null,
        photoUrl,
        caption: typeof caption === 'string' ? caption.slice(0, 500) : '',
        evidenceType,
      },
    });

    return NextResponse.json({ success: true, evidence }, { status: 201 });
  } catch (error) {
    console.error('POST /api/jobs/[id]/evidence error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถเพิ่มหลักฐานได้' },
      { status: 500 }
    );
  }
}

