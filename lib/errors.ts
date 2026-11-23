import { NextResponse } from 'next/server';

/**
 * ข้อผิดพลาดระดับแอปพลิเคชันที่ระบุ HTTP status และ JSON response body ได้ตรง ๆ
 * ใช้ throw ภายใน Prisma transaction เพื่อสั่ง rollback และตอบกลับ client อย่างสม่ำเสมอ
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly body: Record<string, unknown>;

  constructor(messageOrBody: string | Record<string, unknown>, status = 400) {
    const body = typeof messageOrBody === 'string' ? { error: messageOrBody } : messageOrBody;
    super(typeof body.error === 'string' ? body.error : 'เกิดข้อผิดพลาด');
    this.name = 'AppError';
    this.status = status;
    this.body = body;
  }
}

/**
 * ข้อผิดพลาดกรณีสถานะ/ข้อมูลชนกัน (409 Conflict) เช่น รถถูกจองซ้อน หรือสถานะใบงานถูกเปลี่ยนระหว่างทาง
 */
export class ConflictError extends AppError {
  constructor(messageOrBody: string | Record<string, unknown>, status = 409) {
    super(messageOrBody, status);
    this.name = 'ConflictError';
  }
}

/**
 * แปลง Error ที่ถูก throw ให้เป็น NextResponse
 */
export function toErrorResponse(
  error: unknown,
  fallbackMessage = 'เกิดข้อผิดพลาดในระบบ',
  fallbackStatus = 500
): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(error.body, { status: error.status });
  }
  return NextResponse.json({ error: fallbackMessage }, { status: fallbackStatus });
}
