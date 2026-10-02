import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// GET: ดึงรายการ Invoices (ป้องกันข้อมูลรั่วไหลตาม Role)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');

    const where: Prisma.InvoiceWhereInput = {};

    // ─── Enforce Tenant & Role Isolation ─────────────────
    if (user.role === 'SUPPLIER') {
      where.supplierId = user.supplierId || 'none';
    } else if (user.role === 'ADMIN') {
      if (user.companyId) {
        where.companyId = user.companyId;
      } else if (companyId) {
        where.companyId = companyId;
      }
      if (supplierId) where.supplierId = supplierId;
    } else if (user.role === 'BRANCH') {
      if (user.companyId) where.companyId = user.companyId;
    } else {
      // MASTER can filter freely
      if (supplierId) where.supplierId = supplierId;
      if (companyId) where.companyId = companyId;
    }

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
      take: 100, // Safe query limit
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

// POST: สร้าง Invoice ใหม่ พร้อมป้องกัน Race Condition & Double Invoicing
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'SUPPLIER', 'ADMIN']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { supplierId, companyId, jobIds, dueDate, notes } = await request.json();

    if (!supplierId || !companyId || !jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุ supplierId, companyId และเลือกงานอย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    // Role-based validation
    if (user.role === 'SUPPLIER' && user.supplierId !== supplierId) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์ออกบิลแทน Supplier อื่น' },
        { status: 403 }
      );
    }

    if (user.role === 'ADMIN' && user.companyId && user.companyId !== companyId) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์ออกบิลให้บริษัทอื่น' },
        { status: 403 }
      );
    }

    // Generate collision-free invoice number
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'ไม่พบบริษัทนี้' }, { status: 404 });
    }

    const dateSeq = new Date().toISOString().slice(2, 7).replace('-', '');
    const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    const invoiceNumber = `INV-${company.code}-${dateSeq}-${uniqueSuffix}`;

    // Execute atomic validation and creation within a single transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Fetch target jobs inside transaction
      const targetJobs = await tx.job.findMany({
        where: { id: { in: jobIds } },
        include: { carWashItems: true },
      });

      if (targetJobs.length !== jobIds.length) {
        throw new Error('พบบางงานไม่ถูกต้องหรือไม่มีอยู่ในระบบ');
      }

      const unapproved = targetJobs.filter(j => j.status !== 'APPROVED');
      if (unapproved.length > 0) {
        throw new Error('ทุกงานที่นำมาวางบิลต้องได้รับการ Approve แล้วเท่านั้น');
      }

      const wrongCompany = targetJobs.filter(j => j.companyId !== companyId);
      if (wrongCompany.length > 0) {
        throw new Error('ไม่สามารถรวมงานข้ามบริษัทได้');
      }

      const wrongSupplier = targetJobs.filter(j => j.supplierId !== supplierId);
      if (wrongSupplier.length > 0) {
        throw new Error('ไม่สามารถรวมงานข้าม Supplier ได้');
      }

      const alreadyInvoiced = targetJobs.filter(j => j.invoiceId || j.status === 'INVOICED');
      if (alreadyInvoiced.length > 0) {
        throw new Error('มีบางรายการงานที่ถูกวางบิลไปแล้ว กรุณารีเฟรชหน้ารายการ');
      }

      // Calculate amounts (exclude cancelled items)
      const subtotal = targetJobs.reduce((sum, j) => {
        if (j.carWashItems && j.carWashItems.length > 0) {
          const valid = j.carWashItems.filter(i => i.status !== 'CANCELLED');
          return sum + valid.reduce((s, i) => s + (i.unitPrice || 0), 0);
        }
        return sum + (j.actualCost || j.estimatedCost || 0);
      }, 0);
      const vatAmount = Number((subtotal * 0.07).toFixed(2));
      const totalAmount = Number((subtotal + vatAmount).toFixed(2));

      // 2. Atomically verify and lock all target jobs to INVOICED
      const updateResult = await tx.job.updateMany({
        where: { 
          id: { in: jobIds },
          status: 'APPROVED',
          invoiceId: null,
        },
        data: {
          status: 'INVOICED',
          updatedAt: new Date(),
        },
      });

      if (updateResult.count !== jobIds.length) {
        throw new Error('เกิดข้อผิดพลาดในการล็อกสถานะงาน (บางงานอาจถูกวางบิลไปก่อนหน้า)');
      }

      // 3. Create invoice and connect jobs (sets invoiceId to inv.id)
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
          notes: typeof notes === 'string' ? notes.slice(0, 1000) : null,
          jobs: { connect: jobIds.map((id: string) => ({ id })) },
        },
        include: {
          supplier: { select: { code: true, name: true, bankName: true, bankAccount: true } },
          company: { select: { code: true, name: true } },
          jobs: {
            select: { id: true, jobNumber: true, jobType: true, estimatedCost: true, actualCost: true },
          },
        },
      });

      return inv;
    });

    const formatted = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      supplierId: invoice.supplierId,
      supplierName: invoice.supplier?.name || '',
      companyCode: invoice.company?.code,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
      dueDate: invoice.dueDate?.toISOString().slice(0, 10) || null,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      totalAmount: invoice.totalAmount,
      jobIds: invoice.jobs.map(j => j.id),
      jobs: invoice.jobs,
      notes: invoice.notes,
      createdAt: invoice.createdAt.toISOString(),
    };

    return NextResponse.json({ success: true, invoice: formatted }, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/invoices error:', error);
    const message = error instanceof Error ? error.message : 'ไม่สามารถสร้าง Invoice ได้';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
