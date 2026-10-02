import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET: ดึง Audit Logs (เฉพาะ MASTER / ADMIN เท่านั้น)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const supplierId = searchParams.get('supplierId');
    const q = searchParams.get('q');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (supplierId) where.supplierId = supplierId;

    // Date range filter
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z');
    }

    // Search
    if (q) {
      where.OR = [
        { description: { contains: q } },
        { userName: { contains: q } },
        { entityId: { contains: q } },
      ];
    }

    // Pagination
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50;
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      (prisma as any).auditLog.count({ where }),
      (prisma as any).auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Format dates
    const formatted = (logs as any[]).map((log: any) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      logs: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('GET /api/audit-logs error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูล Audit Log ได้' },
      { status: 500 }
    );
  }
}
