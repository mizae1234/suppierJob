import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: เพิ่มรูปหลักฐาน
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { vin, photoUrl, caption, evidenceType } = await request.json();

    if (!photoUrl || !evidenceType) {
      return NextResponse.json(
        { error: 'กรุณาระบุ photoUrl และ evidenceType' },
        { status: 400 }
      );
    }

    // Verify job exists
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
    }

    const evidence = await prisma.jobEvidence.create({
      data: {
        jobId: id,
        vin: vin || null,
        photoUrl,
        caption: caption || '',
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
