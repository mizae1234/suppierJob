import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// POST: เพิ่มรูปหลักฐาน พร้อมตรวจสอบสิทธิ์และความปลอดภัยของ URL
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;
    const { vin, photoUrl, caption, evidenceType } = await request.json();

    if (!photoUrl || !evidenceType) {
      return NextResponse.json(
        { error: 'กรุณาระบุ photoUrl และ evidenceType' },
        { status: 400 }
      );
    }

    // Validate safe URL format (prevent javascript: or XSS payloads)
    const isSafeUrl = 
      photoUrl.startsWith('/') || 
      photoUrl.startsWith('https://') || 
      photoUrl.startsWith('http://') || 
      photoUrl.startsWith('data:image/');

    if (!isSafeUrl) {
      return NextResponse.json(
        { error: 'รูปแบบ photoUrl ไม่ถูกต้องหรือไม่ปลอดภัย' },
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
