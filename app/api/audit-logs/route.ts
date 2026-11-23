import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

    const where: Prisma.AuditLogWhereInput = {};

    // Pagination
    const parsedPage = pageParam ? parseInt(pageParam, 10) : NaN;
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN;
    const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 50;
    const skip = (page - 1) * limit;

    // ADMIN ที่ผูกกับบริษัท เห็นเฉพาะ Audit Log ของผู้ใช้ในบริษัทตนเอง (รวมผู้ใช้สาขาที่สังกัดบริษัทนั้น)
    if (user.role === 'ADMIN' && user.companyId) {
      const companyUsers = await prisma.user.findMany({
        where: {
          OR: [
            { companyId: user.companyId },
            { branch: { companyId: user.companyId } },
          ],
        },
        select: { id: true },
      });
      const companyUserIds = companyUsers.map((u) => u.id);

      if (userId) {
        if (!companyUserIds.includes(userId)) {
          return NextResponse.json({ logs: [], total: 0, page, totalPages: 0 });
        }
        where.userId = userId;
      } else {
        if (companyUserIds.length === 0) {
          return NextResponse.json({ logs: [], total: 0, page, totalPages: 0 });
        }
        where.userId = { in: companyUserIds };
      }
    } else if (userId) {
      where.userId = userId;
    }

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (supplierId) where.supplierId = supplierId;

    // Date range filter
    if (from || to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to + 'T23:59:59.999Z');
      where.createdAt = createdAt;
    }

    // Search
    if (q) {
      where.OR = [
        { description: { contains: q } },
        { userName: { contains: q } },
        { entityId: { contains: q } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Format dates
    const formatted = logs.map((log) => ({
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
