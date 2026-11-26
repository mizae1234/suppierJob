import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { assertCanMutateJob } from '@/lib/job-access';
import { logAuditFromUser } from '@/lib/audit-log';
import { generateInitialInvoiceNumber } from '@/lib/invoice-number';
import { INVOICE_UPDATE_STATUS } from '@/lib/invoice-workflow';
import { parseBody, updateJobInvoiceNumberSchema } from '@/lib/validation';

/**
 * PATCH /api/jobs/[id]/invoice-number
 * อัปเดตเลข Invoice ของ Vendor บนใบงานที่อนุมัติแล้ว (APPROVED)
 * เปลี่ยนสถานะ invoiceUpdateStatus จาก PENDING_UPDATE (รออัปเดต Invoice) → UPDATED (อัปเดต Invoice แล้ว)
 * เพื่อให้สามารถนำไปกดออกใบวางบิลและเปิด D365 PO ได้
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['MASTER', 'SUPPLIER', 'ADMIN']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;
    const parsed = await parseBody(request, updateJobInvoiceNumberSchema);
    if (parsed.response) return parsed.response;
    const { vendorInvoiceNumber } = parsed.data;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        company: { select: { code: true } },
        pickupBranch: { select: { companyId: true } },
        destBranch: { select: { companyId: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'ไม่พบใบงานนี้' }, { status: 404 });
    }

    const authError = assertCanMutateJob(user, job);
    if (authError) return authError;

    if (job.invoiceId || job.status === 'INVOICED') {
      return NextResponse.json(
        { error: 'ใบงานนี้ถูกออกใบวางบิลและเปิด PO แล้ว ไม่สามารถแก้ไขเลข Invoice ได้' },
        { status: 409 }
      );
    }

    if (job.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'สามารถอัปเดตเลข Invoice ได้เฉพาะงานที่อนุมัติแล้ว (APPROVED) เท่านั้น' },
        { status: 400 }
      );
    }

    const now = new Date();
    const actorName = user.displayName || user.username;
    const initialInvoiceNumber =
      job.initialInvoiceNumber ||
      generateInitialInvoiceNumber(job.company?.code || 'GI', now);

    const updated = await prisma.$transaction(async (tx) => {
      const locked = await tx.job.updateMany({
        where: { id, status: 'APPROVED', invoiceId: null },
        data: {
          initialInvoiceNumber,
          vendorInvoiceNumber,
          invoiceUpdateStatus: INVOICE_UPDATE_STATUS.UPDATED,
          invoiceUpdatedAt: now,
          invoiceUpdatedBy: actorName,
          updatedAt: now,
        },
      });

      if (locked.count === 0) {
        return null;
      }

      await tx.jobActivity.create({
        data: {
          jobId: id,
          action: 'INVOICE_UPDATED',
          actor: actorName,
          actorRole: user.role,
          description: `อัปเดตเลข Invoice เป็น ${vendorInvoiceNumber} (เลขชุดแรก: ${initialInvoiceNumber}) — พร้อมออกใบวางบิลและเปิด PO`,
          metadata: JSON.stringify({
            initialInvoiceNumber,
            previousVendorInvoiceNumber: job.vendorInvoiceNumber ?? null,
            vendorInvoiceNumber,
          }),
        },
      });

      return tx.job.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          jobNumber: true,
          initialInvoiceNumber: true,
          vendorInvoiceNumber: true,
          invoiceUpdateStatus: true,
          invoiceUpdatedAt: true,
          invoiceUpdatedBy: true,
          updatedAt: true,
        },
      });
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'สถานะใบงานมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอ' },
        { status: 409 }
      );
    }

    logAuditFromUser(user, {
      action: 'UPDATE_JOB',
      entityType: 'Job',
      entityId: id,
      description: `อัปเดตเลข Invoice ใบงาน ${job.jobNumber} เป็น ${vendorInvoiceNumber} (เลขชุดแรก: ${initialInvoiceNumber})`,
      metadata: {
        jobNumber: job.jobNumber,
        initialInvoiceNumber,
        previousVendorInvoiceNumber: job.vendorInvoiceNumber ?? null,
        vendorInvoiceNumber,
        invoiceUpdateStatus: INVOICE_UPDATE_STATUS.UPDATED,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      job: {
        id: updated.id,
        jobNumber: updated.jobNumber,
        initialInvoiceNumber: updated.initialInvoiceNumber,
        vendorInvoiceNumber: updated.vendorInvoiceNumber,
        invoiceUpdateStatus: updated.invoiceUpdateStatus,
        invoiceUpdatedAt: updated.invoiceUpdatedAt?.toISOString() ?? null,
        invoiceUpdatedBy: updated.invoiceUpdatedBy,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('PATCH /api/jobs/[id]/invoice-number error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถอัปเดตเลข Invoice ได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
