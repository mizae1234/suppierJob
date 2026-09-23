import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: ดึงรายการ Invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (supplierId) where.supplierId = supplierId;
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        supplier: { select: { code: true, name: true } },
        company: { select: { code: true, name: true } },
        jobs: {
          select: { id: true, jobNumber: true, jobType: true, estimatedCost: true, actualCost: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      supplierId: inv.supplierId,
      supplierName: inv.supplier.name,
      companyId: inv.companyId,
      companyCode: inv.company.code,
      status: inv.status,
      invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate?.toISOString().slice(0, 10) || null,
      subtotal: inv.subtotal,
      vatAmount: inv.vatAmount,
      totalAmount: inv.totalAmount,
      jobIds: inv.jobs.map(j => j.id),
      jobs: inv.jobs,
      notes: inv.notes,
      createdAt: inv.createdAt.toISOString(),
    }));

    return NextResponse.json({ invoices: formatted });
  } catch (error) {
    console.error('GET /api/invoices error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูล Invoice ได้' },
      { status: 500 }
    );
  }
}

// POST: สร้าง Invoice ใหม่
export async function POST(request: NextRequest) {
  try {
    const { supplierId, companyId, jobIds, dueDate, notes } = await request.json();

    if (!supplierId || !companyId || !jobIds || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุ supplierId, companyId และเลือกงานอย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    // Validate all jobs are APPROVED and belong to same company
    const targetJobs = await prisma.job.findMany({
      where: { id: { in: jobIds } },
    });

    const unapproved = targetJobs.filter(j => j.status !== 'APPROVED');
    if (unapproved.length > 0) {
      return NextResponse.json(
        { error: 'ทุกงานที่นำมาวางบิลต้องได้รับการ Approve แล้วเท่านั้น' },
        { status: 400 }
      );
    }

    const wrongCompany = targetJobs.filter(j => j.companyId !== companyId);
    if (wrongCompany.length > 0) {
      return NextResponse.json(
        { error: 'ไม่สามารถรวมงานข้ามบริษัทได้' },
        { status: 400 }
      );
    }

    const alreadyInvoiced = targetJobs.filter(j => j.invoiceId || j.status === 'INVOICED');
    if (alreadyInvoiced.length > 0) {
      return NextResponse.json(
        { error: 'มีบางรายการงานที่ถูกวางบิลไปแล้ว' },
        { status: 400 }
      );
    }

    // Calculate amounts
    const subtotal = targetJobs.reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);
    const vatAmount = Number((subtotal * 0.07).toFixed(2));
    const totalAmount = Number((subtotal + vatAmount).toFixed(2));

    // Generate invoice number
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const dateSeq = new Date().toISOString().slice(2, 7).replace('-', '');
    const randomNum = String(Math.floor(Math.random() * 900) + 100);
    const invoiceNumber = `INV-${company?.code || 'XX'}-${dateSeq}-${randomNum}`;

    // Create invoice and update jobs in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          supplierId,
          companyId,
          status: 'SUBMITTED',
          invoiceDate: new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          subtotal,
          vatAmount,
          totalAmount,
          notes,
          jobs: { connect: jobIds.map((id: string) => ({ id })) },
        },
      });

      // Update all jobs to INVOICED
      await tx.job.updateMany({
        where: { id: { in: jobIds } },
        data: {
          status: 'INVOICED',
          invoiceId: inv.id,
          updatedAt: new Date(),
        },
      });

      return inv;
    });

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error) {
    console.error('POST /api/invoices error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถสร้าง Invoice ได้' },
      { status: 500 }
    );
  }
}
