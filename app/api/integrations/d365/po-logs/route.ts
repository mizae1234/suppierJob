import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET: ดึงประวัติการยิงเปิด Purchase Order (D365PoLog) ทั้งหมด (เฉพาะ MASTER / ADMIN)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // SUCCESS | FAILED
    const companyCode = searchParams.get('companyCode');
    const q = searchParams.get('q')?.trim();
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (companyCode) where.companyCode = companyCode;

    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to + 'T23:59:59.999Z');
      where.createdAt = createdAt;
    }

    if (q) {
      where.OR = [
        { jobNumber: { contains: q } },
        { purchId: { contains: q } },
        { vendorAccount: { contains: q } },
        { supplierName: { contains: q } },
        { vin: { contains: q } },
        { message: { contains: q } },
      ];
    }

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 30;
    const skip = (page - 1) * limit;

    const [total, logs, successCount, failedCount] = await Promise.all([
      prisma.d365PoLog.count({ where }),
      prisma.d365PoLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.d365PoLog.count({ where: { ...where, status: 'SUCCESS' } }),
      prisma.d365PoLog.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      successCount,
      failedCount,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error('GET /api/integrations/d365/po-logs error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูล D365 PO Interface Log ได้' },
      { status: 500 }
    );
  }
}

