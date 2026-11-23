import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canViewJob } from '@/lib/job-access';
import { buildJobInclude, serializeJob } from '@/lib/job-serializer';

// GET: ดึงรายละเอียดงานเดียว (รวม activities / timeline) — รูปแบบเดียวกับรายการใน GET /api/jobs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const viewParam = searchParams.get('view');
    const includeParam = searchParams.get('include');
    const viewMode: 'list' | 'detail' = viewParam === 'list' ? 'list' : 'detail';
    // ค่าเริ่มต้นรวม activities เสมอเพื่อความเข้ากันได้เดิม ยกเว้นขอ view=list โดยไม่ระบุ include=activities
    const includeActivities = includeParam
      ? includeParam.split(',').map(s => s.trim()).includes('activities')
      : viewMode !== 'list';

    const job = await prisma.job.findUnique({
      where: { id },
      include: buildJobInclude(includeActivities, { view: viewMode }),
    });

    // ไม่มีสิทธิ์ดู → ตอบ 404 เหมือนไม่พบ (ไม่เปิดเผยว่ามีงานนี้อยู่)
    if (!job || !canViewJob(user, job)) {
      return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
    }

    return NextResponse.json({ job: serializeJob(job) });
  } catch (error) {
    console.error('GET /api/jobs/[id] error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลงานได้' },
      { status: 500 }
    );
  }
}
