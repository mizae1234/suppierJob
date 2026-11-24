import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { getFailedAttemptFee, SLIDE_COMPLETION_FAILED_ATTEMPT } from '@/lib/slide-failed-attempt';
import { createInvoiceSchema, parseBody } from '@/lib/validation';

/** ข้อผิดพลาดทางธุรกิจในการสร้างใบวางบิลที่ส่งข้อความกลับให้ผู้ใช้ได้ตรงๆ */
class InvoiceValidationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'InvoiceValidationError';
  }
}

/**
 * หารหัสสาขาเจ้าของรถ (นิติบุคคลผู้เปิด PO ใน D365) ของใบงาน เพื่อห้ามรวมงานข้ามนิติบุคคลในใบวางบิลเดียวกัน
 * ลำดับความสำคัญตรงกับ lib/d365/po.ts และ getOwnerBranchCorporateInfo:
 * 1) d365SiteId ของรถในใบงาน
 * 2) pickupBranch (กรณีงานรถสไลด์)
 * 3) currentBranch ของรถ → job.branch → fallback จาก company.code
 */
function resolveJobOwnerBranchCode(job: {
  jobType: string;
  carWashItems?: Array<{
    status: string;
    vehicle?: { d365SiteId?: string | null; currentBranch?: { code?: string | null } | null } | null;
  }>;
  vehicle?: { d365SiteId?: string | null; currentBranch?: { code?: string | null } | null } | null;
  pickupBranch?: { code?: string | null } | null;
  branch?: { code?: string | null } | null;
  company?: { code?: string | null } | null;
}): string {
  const activeItems = (job.carWashItems || []).filter((i) => i.status !== 'CANCELLED');
  const firstActive = activeItems[0] || job.carWashItems?.[0];

  const d365OwnerCode = (
    activeItems.find((i) => i.vehicle?.d365SiteId?.trim())?.vehicle?.d365SiteId ||
    job.vehicle?.d365SiteId ||
    ''
  )
    .trim()
    .toUpperCase();
  if (d365OwnerCode) return d365OwnerCode;

  const fallback = (
    (job.jobType === 'VEHICLE_SLIDE' ? job.pickupBranch?.code : '') ||
    firstActive?.vehicle?.currentBranch?.code ||
    job.vehicle?.currentBranch?.code ||
    job.branch?.code ||
    (job.company?.code === 'EV7' ? 'GI06' : 'GI')
  )
    .trim()
    .toUpperCase();
  return fallback || 'GI';
}

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
          select: { id: true, jobNumber: true, jobType: true, estimatedCost: true, actualCost: true, d365PoNumber: true },
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
      jobIds: inv.jobs.map((j: { id: string }) => j.id),
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
    const parsed = await parseBody(request, createInvoiceSchema);
    if (parsed.response) return parsed.response;
    const { supplierId, companyId, jobIds, dueDate, notes } = parsed.data;

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
    const [company, supplier] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, vatType: true, vatRate: true } }),
    ]);
    if (!company) {
      return NextResponse.json({ error: 'ไม่พบบริษัทนี้' }, { status: 404 });
    }
    if (!supplier) {
      return NextResponse.json({ error: 'ไม่พบข้อมูล Supplier นี้' }, { status: 404 });
    }

    const dateSeq = new Date().toISOString().slice(2, 7).replace('-', '');
    const uniqueSuffix = `${Date.now().toString().slice(-4)}${randomInt(100, 1000)}`;
    const invoiceNumber = `INV-${company.code}-${dateSeq}-${uniqueSuffix}`;

    // Execute atomic validation and creation within a single transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Fetch target jobs inside transaction (รวมข้อมูลเจ้าของรถเพื่อตรวจไม่ให้รวมข้ามนิติบุคคล)
      const targetJobs = await tx.job.findMany({
        where: { id: { in: jobIds } },
        include: {
          carWashItems: {
            include: {
              vehicle: {
                select: {
                  d365SiteId: true,
                  currentBranch: { select: { code: true } },
                },
              },
            },
          },
          vehicle: {
            select: {
              d365SiteId: true,
              currentBranch: { select: { code: true } },
            },
          },
          pickupBranch: { select: { code: true } },
          branch: { select: { code: true } },
          company: { select: { code: true } },
        },
      });

      if (targetJobs.length !== jobIds.length) {
        throw new InvoiceValidationError('พบบางงานไม่ถูกต้องหรือไม่มีอยู่ในระบบ');
      }

      const unapproved = targetJobs.filter(j => j.status !== 'APPROVED');
      if (unapproved.length > 0) {
        throw new InvoiceValidationError('ทุกงานที่นำมาวางบิลต้องได้รับการ Approve แล้วเท่านั้น');
      }

      const wrongCompany = targetJobs.filter(j => j.companyId !== companyId);
      if (wrongCompany.length > 0) {
        throw new InvoiceValidationError('ไม่สามารถรวมงานข้ามบริษัทได้');
      }

      const wrongSupplier = targetJobs.filter(j => j.supplierId !== supplierId);
      if (wrongSupplier.length > 0) {
        throw new InvoiceValidationError('ไม่สามารถรวมงานข้าม Supplier ได้');
      }

      const alreadyInvoiced = targetJobs.filter(j => j.invoiceId || j.status === 'INVOICED');
      if (alreadyInvoiced.length > 0) {
        throw new InvoiceValidationError('มีบางรายการงานที่ถูกวางบิลไปแล้ว กรุณารีเฟรชหน้ารายการ');
      }

      // ป้องกันการรวมงานข้ามสาขาเจ้าของรถ (คนละนิติบุคคล / Legal Entity ใน D365) ไว้ในใบวางบิลใบเดียวกัน
      const ownerBranchCodes = Array.from(
        new Set(targetJobs.map((j) => resolveJobOwnerBranchCode(j)))
      );
      if (ownerBranchCodes.length > 1) {
        throw new InvoiceValidationError(
          `ไม่สามารถรวมงานข้ามสาขาเจ้าของรถในใบวางบิลเดียวกันได้ (${ownerBranchCodes.join(', ')}) กรุณาแยกออกบิลตามสาขาเจ้าของรถ`
        );
      }

      // Calculate amounts (exclude cancelled items)
      const subtotal = targetJobs.reduce((sum, j) => {
        // เที่ยวเปล่า (สไลด์ไม่สำเร็จ): ยอดต่อใบงาน
        if (j.completionType === SLIDE_COMPLETION_FAILED_ATTEMPT) return sum + getFailedAttemptFee(j);
        if (j.carWashItems && j.carWashItems.length > 0) {
          const valid = j.carWashItems.filter(i => i.status !== 'CANCELLED');
          return sum + valid.reduce((s, i) => s + (i.unitPrice || 0), 0);
        }
        return sum + (j.actualCost || j.estimatedCost || 0);
      }, 0);
      const effectiveVatRate = supplier.vatType === 'VAT_7' ? (supplier.vatRate || 0.07) : 0;
      const vatAmount = Number((subtotal * effectiveVatRate).toFixed(2));
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
        throw new InvoiceValidationError('เกิดข้อผิดพลาดในการล็อกสถานะงาน (บางงานอาจถูกวางบิลไปก่อนหน้า)');
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
            select: { id: true, jobNumber: true, jobType: true, estimatedCost: true, actualCost: true, d365PoNumber: true },
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
    if (error instanceof InvoiceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/invoices error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถสร้าง Invoice ได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
