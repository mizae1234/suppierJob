import { NextRequest, NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/openapi-spec';
import { requireAuth } from '@/lib/auth';

// GET /api/openapi.json
// คืนค่า OpenAPI 3.0.3 Specification สำหรับนำไปใช้กับ Swagger UI, Postman, Insomnia
// ต้อง login เป็น MASTER/ADMIN (ไม่เปิดเผยโครงสร้าง API ให้คนนอก)
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
