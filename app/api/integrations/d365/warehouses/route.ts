import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isD365Configured } from '@/lib/d365/client';
import {
  getFallbackWarehouseOptionsForBranch,
  sortWarehouseOptionsForBranch,
} from '@/lib/d365/warehouses';
import { syncD365Warehouses } from '@/lib/d365/warehouse-sync';

/**
 * GET /api/integrations/d365/warehouses
 * ดึงรายการคลังสินค้าจากตาราง Master `D365Warehouse` (ซิงค์จาก D365 /data/Warehouses)
 *
 * Query params:
 * - company=GI01 | ALL (ไม่ระบุหรือ ALL = ดึงทุกบริษัทในตาราง Master)
 * - scope=branch | all (ค่าเริ่มต้น: branch เมื่อระบุ company เพื่อให้ dropdown รถสไลด์กรองเฉพาะคลังของสาขานั้น; all = คืนทุกแถวในบริษัทนั้น)
 * - includeInactive=1 (รวมคลังที่ isActive=false)
 * - refresh=1 (บังคับซิงค์จาก D365 เข้าตาราง Master ก่อนคืนค่า — เฉพาะ MASTER/ADMIN หรือเมื่อตารางยังว่าง)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN', 'BRANCH']);
  if (auth.response) return auth.response;

  const rawCompany = request.nextUrl.searchParams.get('company')?.trim().toUpperCase() || '';
  const isAllCompanies = !rawCompany || rawCompany === 'ALL';
  const safeCompany = isAllCompanies ? '' : rawCompany.replace(/[^A-Z0-9_-]/g, '');
  const scope =
    request.nextUrl.searchParams.get('scope')?.trim().toLowerCase() ||
    (isAllCompanies ? 'all' : 'branch');
  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === '1';
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';

  try {
    // หากขอ refresh=1 (เฉพาะ MASTER/ADMIN) → ซิงค์จาก D365 เข้าตาราง Master ก่อน
    let syncedNow = false;
    if (forceRefresh && (auth.user.role === 'MASTER' || auth.user.role === 'ADMIN') && isD365Configured()) {
      await syncD365Warehouses({ company: safeCompany || null });
      syncedNow = true;
    }

    const queryWhere = {
      ...(safeCompany ? { dataAreaId: safeCompany } : {}),
      ...(includeInactive ? {} : { isActive: true }),
    };

    let masterRows = await prisma.d365Warehouse.findMany({
      where: queryWhere,
      include: {
        branch: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ dataAreaId: 'asc' }, { isPrimary: 'desc' }, { warehouseId: 'asc' }],
    });

    // กรณีตาราง Master ยังไม่มีข้อมูลของบริษัทที่ขอ และตั้งค่า D365 ไว้แล้ว → auto-sync เข้าตาราง Master ให้อัตโนมัติ
    if (masterRows.length === 0 && !syncedNow && isD365Configured()) {
      try {
        await syncD365Warehouses({ company: safeCompany || null });
        syncedNow = true;
        masterRows = await prisma.d365Warehouse.findMany({
          where: queryWhere,
          include: {
            branch: { select: { id: true, code: true, name: true } },
          },
          orderBy: [{ dataAreaId: 'asc' }, { isPrimary: 'desc' }, { warehouseId: 'asc' }],
        });
      } catch (syncErr) {
        console.warn(`GET /api/integrations/d365/warehouses auto-sync fallback:`, syncErr);
      }
    }

    if (masterRows.length > 0) {
      if (scope === 'branch' && safeCompany) {
        const branchFiltered = sortWarehouseOptionsForBranch(
          safeCompany,
          masterRows.map((r) => ({
            warehouseId: r.warehouseId,
            warehouseName: r.warehouseName,
            dataAreaId: r.dataAreaId,
          }))
        );
        return NextResponse.json({
          company: safeCompany,
          source: syncedNow ? 'D365_SYNCED' : 'DB_MASTER',
          warehouses: branchFiltered.length > 0 ? branchFiltered : masterRows.map((r) => ({
            id: r.id,
            warehouseId: r.warehouseId,
            warehouseName: r.warehouseName,
            dataAreaId: r.dataAreaId,
            branchId: r.branchId,
            branchName: r.branch?.name ?? null,
            isPrimary: r.isPrimary,
            isActive: r.isActive,
            lastSyncedAt: r.lastSyncedAt.toISOString(),
          })),
        });
      }

      return NextResponse.json({
        company: safeCompany || 'ALL',
        source: syncedNow ? 'D365_SYNCED' : 'DB_MASTER',
        total: masterRows.length,
        warehouses: masterRows.map((r) => ({
          id: r.id,
          warehouseId: r.warehouseId,
          warehouseName: r.warehouseName,
          dataAreaId: r.dataAreaId,
          branchId: r.branchId,
          branchName: r.branch?.name ?? null,
          isPrimary: r.isPrimary,
          isActive: r.isActive,
          lastSyncedAt: r.lastSyncedAt.toISOString(),
        })),
      });
    }

    // Fallback (กรณี D365 ยังไม่ได้ตั้งค่าและตาราง Master ยังว่าง)
    return NextResponse.json({
      company: safeCompany || 'ALL',
      source: 'FALLBACK',
      warehouses: safeCompany ? getFallbackWarehouseOptionsForBranch(safeCompany) : [],
    });
  } catch (error) {
    console.error('GET /api/integrations/d365/warehouses error:', error);
    return NextResponse.json({
      company: safeCompany || 'ALL',
      source: 'FALLBACK',
      warehouses: safeCompany ? getFallbackWarehouseOptionsForBranch(safeCompany) : [],
    });
  }
}

/**
 * POST /api/integrations/d365/warehouses
 * สั่ง Sync ตาราง Master `D365Warehouse` จาก D365 F&O (`GET /data/Warehouses`)
 * Body (optional): { company?: "GI01" } — ไม่ระบุ = ซิงค์ทุกสาขา (GI, GI01..GI12)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;

  if (!isD365Configured()) {
    return NextResponse.json(
      { error: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ D365 (D365_TENANT_ID / CLIENT_ID / CLIENT_SECRET / BASE_URL)' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { company?: string };
    const company = typeof body?.company === 'string' && body.company.trim() ? body.company.trim() : null;
    const summary = await syncD365Warehouses({ company });

    return NextResponse.json({
      success: summary.errors.length === 0,
      summary,
    });
  } catch (error) {
    console.error('POST /api/integrations/d365/warehouses error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ไม่สามารถ Sync ข้อมูล Warehouse จาก D365 ได้' },
      { status: 500 }
    );
  }
}
