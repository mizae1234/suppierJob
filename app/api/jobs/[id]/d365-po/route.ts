import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendJobToD365PurchaseOrder } from '@/lib/d365/po';
import { prisma } from '@/lib/prisma';

// POST: ส่งเปิด Purchase Order (PO) ใน D365 ซ้ำ (Manual Trigger / Retry)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  // เฉพาะ ADMIN หรือ MASTER เท่านั้นที่สามารถสั่งสร้าง PO ได้
  if (user.role !== 'ADMIN' && user.role !== 'MASTER') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์ดำเนินการ' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, status: true, d365PoNumber: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลใบสั่งงาน' }, { status: 404 });
    }

    if (job.status !== 'APPROVED' && job.status !== 'INVOICED') {
      return NextResponse.json(
        { error: 'สามารถสร้าง PO ได้เฉพาะงานที่ได้รับอนุมัติ (APPROVED) แล้วเท่านั้น' },
        { status: 400 }
      );
    }

    const result = await sendJobToD365PurchaseOrder(id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        purchId: result.purchId,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('POST /api/jobs/[id]/d365-po error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งข้อมูลไป D365', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
