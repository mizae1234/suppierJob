import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canMutateJob } from '@/lib/job-access';
import { sendJobToD365TransferJournal } from '@/lib/d365/transfer';
import { isFailedAttemptJob } from '@/lib/slide-failed-attempt';
import { logAuditFromUser } from '@/lib/audit-log';

// POST: ส่งใบโอนย้ายคลัง (D365 Inventory Transfer Journal) ซ้ำ สำหรับงานรถสไลด์ที่อนุมัติแล้ว
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  // เฉพาะ ADMIN หรือ MASTER เท่านั้นที่สามารถสั่งส่งโอนคลังใหม่ได้
  if (user.role !== 'ADMIN' && user.role !== 'MASTER') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์ดำเนินการ' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        jobNumber: true,
        jobType: true,
        status: true,
        completionType: true,
        d365TransferStatus: true,
        companyId: true,
        branchId: true,
        pickupBranchId: true,
        destBranchId: true,
        requestedById: true,
        supplierId: true,
        pickupBranch: { select: { companyId: true } },
        destBranch: { select: { companyId: true } },
      },
    });

    // ADMIN ต้องอยู่ในขอบเขตบริษัทของงาน (ตอบ 404 เพื่อไม่เปิดเผยว่ามีงานนี้อยู่)
    if (!job || !canMutateJob(user, job)) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลใบสั่งงาน' }, { status: 404 });
    }

    if (job.jobType !== 'VEHICLE_SLIDE') {
      return NextResponse.json(
        { error: 'การโอนย้ายคลัง D365 ใช้ได้เฉพาะงานรถสไลด์เท่านั้น' },
        { status: 400 }
      );
    }

    if (isFailedAttemptJob(job)) {
      return NextResponse.json(
        { error: 'ใบงานเที่ยวเปล่า (สไลด์ไม่สำเร็จ) ไม่มีการย้ายรถ จึงไม่ต้องโอนคลังใน D365' },
        { status: 400 }
      );
    }

    if (job.status !== 'APPROVED' && job.status !== 'INVOICED') {
      return NextResponse.json(
        { error: 'สามารถส่งโอนคลัง D365 ได้เฉพาะใบงานที่อนุมัติแล้ว (APPROVED) หรือวางบิลแล้ว (INVOICED) เท่านั้น' },
        { status: 400 }
      );
    }

    if (job.d365TransferStatus === 'PENDING') {
      return NextResponse.json(
        { error: 'ใบงานนี้กำลังส่งโอนคลังไปยัง D365 อยู่ กรุณารอสักครู่' },
        { status: 409 }
      );
    }

    if (job.d365TransferStatus !== null && job.d365TransferStatus !== 'FAILED') {
      return NextResponse.json(
        {
          error:
            job.d365TransferStatus === 'SUCCESS'
              ? 'ใบงานนี้โอนย้ายคลังใน D365 สำเร็จเรียบร้อยแล้ว'
              : 'ใบงานนี้ไม่จำเป็นต้องโอนย้ายคลังใน D365',
        },
        { status: 400 }
      );
    }

    const result = await sendJobToD365TransferJournal(id, {
      actorId: user.id,
      actorName: user.displayName || user.username,
      actorRole: user.role,
    });

    logAuditFromUser(user, {
      action: 'UPDATE_JOB',
      entityType: 'Job',
      entityId: id,
      description: `ส่งโอนย้ายคลัง D365 ใหม่ ใบงาน ${job.jobNumber} — ${result.success ? 'สำเร็จ' : 'ไม่สำเร็จ'}`,
      metadata: {
        jobNumber: job.jobNumber,
        transferStatus: result.status,
        transferredCount: result.transferredCount,
        message: result.message,
      },
      request,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        status: result.status,
        transferredCount: result.transferredCount,
        message: result.message,
        details: result.details,
      });
    }

    return NextResponse.json(
      {
        success: false,
        status: result.status,
        error: result.message,
        details: result.details,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('POST /api/jobs/[id]/d365-transfer error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งโอนย้ายคลังไป D365' },
      { status: 500 }
    );
  }
}
