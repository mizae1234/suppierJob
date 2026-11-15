import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { d365FetchAll, isD365Configured } from '@/lib/d365/client';
import {
  D365WarehouseOption,
  getFallbackWarehouseOptionsForBranch,
  sortWarehouseOptionsForBranch,
} from '@/lib/d365/warehouses';

interface RawD365Warehouse {
  WarehouseId: string;
  WarehouseName: string;
  dataAreaId: string;
}

const CACHE_TTL_MS = 10 * 60_000; // 10 นาที
const warehouseCache = new Map<string, { expiresAt: number; items: D365WarehouseOption[] }>();

/**
 * GET /api/integrations/d365/warehouses?company=GI01
 * ดึงรายการคลังสินค้าจาก D365 F&O ตามบริษัท (dataAreaId)
 * Endpoint D365: /data/Warehouses?$filter=dataAreaId eq 'GI01'&$select=WarehouseId,WarehouseName,dataAreaId&$top=100&cross-company=true
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN', 'BRANCH']);
  if (auth.response) return auth.response;

  const companyParam = request.nextUrl.searchParams.get('company')?.trim().toUpperCase() || 'GI';
  const safeCompany = companyParam.replace(/[^A-Z0-9_-]/g, '') || 'GI';
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';

  const cached = warehouseCache.get(safeCompany);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      company: safeCompany,
      source: 'D365_CACHE',
      warehouses: cached.items,
    });
  }

  if (!isD365Configured()) {
    return NextResponse.json({
      company: safeCompany,
      source: 'FALLBACK',
      warehouses: getFallbackWarehouseOptionsForBranch(safeCompany),
    });
  }

  try {
    const rows = await d365FetchAll<RawD365Warehouse>('Warehouses', {
      $filter: `dataAreaId eq '${safeCompany.toLowerCase()}'`,
      $select: 'WarehouseId,WarehouseName,dataAreaId',
      $top: '100',
      'cross-company': 'true',
    });

    const items =
      rows.length > 0
        ? sortWarehouseOptionsForBranch(
            safeCompany,
            rows.map((r) => ({
              warehouseId: r.WarehouseId,
              warehouseName: r.WarehouseName,
              dataAreaId: r.dataAreaId,
            }))
          )
        : getFallbackWarehouseOptionsForBranch(safeCompany);

    warehouseCache.set(safeCompany, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      items,
    });

    return NextResponse.json({
      company: safeCompany,
      source: rows.length > 0 ? 'D365_LIVE' : 'FALLBACK',
      warehouses: items,
    });
  } catch (error) {
    console.warn(`GET /api/integrations/d365/warehouses (${safeCompany}) fallback:`, error);
    return NextResponse.json({
      company: safeCompany,
      source: 'FALLBACK',
      warehouses: getFallbackWarehouseOptionsForBranch(safeCompany),
    });
  }
}

