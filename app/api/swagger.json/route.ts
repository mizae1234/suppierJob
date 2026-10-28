import { NextRequest, NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/openapi-spec';
import { requireAuth } from '@/lib/auth';

// GET /api/swagger.json (Alias ของ /api/openapi.json) — ต้อง login เป็น MASTER/ADMIN
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, max-age=60',
    },
  });
}
