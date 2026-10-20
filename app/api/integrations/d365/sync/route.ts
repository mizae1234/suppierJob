import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isD365Configured } from '@/lib/d365/client';
import { runD365VehicleSync } from '@/lib/d365/vehicle-sync';

/**
 * GET  /api/integrations/d365/sync — ประวัติการ Sync ล่าสุด + สถานะการตั้งค่า
 * POST /api/integrations/d365/sync — สั่ง Sync รถจาก D365 ทันที (MASTER / ADMIN)
 */

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN', 'BRANCH']);
  if (auth.response) return auth.response;

  try {
    const runs = await prisma.d365SyncRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      configured: isD365Configured(),
      autoSyncEnabled: process.env.D365_SYNC_ENABLED === 'true',
      intervalMinutes: Number(process.env.D365_SYNC_INTERVAL_MINUTES) || 60,
      runs: runs.map(r => ({
        ...r,
        // ผู้ใช้ BRANCH ไม่ต้องเห็นรายละเอียด error
        errors: auth.user.role === 'BRANCH' ? null : safeParse(r.errors),
      })),
    });
  } catch (error) {
    console.error('GET /api/integrations/d365/sync error:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงประวัติการ Sync ได้' }, { status: 500 });
  }
}

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
    const summary = await runD365VehicleSync({ trigger: 'MANUAL', user: auth.user });

    if (summary.status === 'SKIPPED_LOCKED') {
      return NextResponse.json({ ...summary, error: summary.message }, { status: 409 });
    }
    if (summary.status === 'FAILED') {
      return NextResponse.json({ ...summary, error: summary.message }, { status: 502 });
    }
    return NextResponse.json(summary);
  } catch (error: unknown) {
    console.error('POST /api/integrations/d365/sync error:', error);
    return NextResponse.json(
      { error: 'Sync ข้อมูลจาก D365 ไม่สำเร็จ', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function safeParse(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
