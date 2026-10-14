import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/openapi-spec';

// GET /api/openapi.json
// คืนค่า OpenAPI 3.0.3 Specification สำหรับนำไปใช้กับ Swagger UI, Postman, Insomnia
export async function GET() {
  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
