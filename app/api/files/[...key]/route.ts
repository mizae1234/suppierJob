import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canViewJob } from '@/lib/job-access';
import { FILES_ROUTE_PREFIX, isSafeStorageKey, mimeFromKey, readFromStorage } from '@/lib/s3';

/**
 * GET /api/files/<key>
 * ส่งไฟล์หลักฐาน (private) ให้เฉพาะผู้ที่มีสิทธิ์ดูงานที่ไฟล์นั้นผูกอยู่
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  const { key: segments } = await params;
  const key = (segments || []).join('/');
  if (!isSafeStorageKey(key)) {
    return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
  }

  // ไฟล์ต้องผูกกับหลักฐานของงานที่ผู้ใช้มีสิทธิ์ดู
  const evidence = await prisma.jobEvidence.findFirst({
    where: { photoUrl: `${FILES_ROUTE_PREFIX}${key}` },
    select: {
      job: {
        select: { companyId: true, branchId: true, originBranchId: true, destBranchId: true, supplierId: true },
      },
    },
  });
  if (!evidence || !canViewJob(user, evidence.job)) {
    return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
  }

  const data = await readFromStorage(key);
  if (!data) {
    return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': mimeFromKey(key),
      'Content-Length': String(data.length),
      // ไฟล์ไม่เปลี่ยน (ชื่อมี timestamp) → cache ฝั่ง browser ได้ แต่ห้าม shared cache
      'Cache-Control': 'private, max-age=86400, immutable',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
