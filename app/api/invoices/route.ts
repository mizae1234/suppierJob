import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { getFailedAttemptFee, SLIDE_COMPLETION_FAILED_ATTEMPT } from '@/lib/slide-failed-attempt';
import { createInvoiceSchema, parseBody } from '@/lib/validation';
import { ensureJobsHaveD365Po } from '@/lib/services/invoices/ensure-invoice-pos';
import { generateInitialInvoiceNumber } from '@/lib/invoice-number';
import { isJobInvoiceUpdated, mergeVendorInvoiceNumbers } from '@/lib/invoice-workflow';

/** เผื่อเวลาให้การเปิด D365 PO หลายใบงานใน 1 ใบวางบิล (Fail-closed) */
export const maxDuration = 300;

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
          select: {
            id: true,
            jobNumber: true,
            jobType: true,
            estimatedCost: true,
            actualCost: true,
            d365PoNumber: true,
            initialInvoiceNumber: true,
            vendorInvoiceNumber: true,
            invoiceUpdateStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Safe query limit
    });

    const formatted = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      vendorInvoiceNumber:
        inv.vendorInvoiceNumber ??
        mergeVendorInvoiceNumbers(inv.jobs.map((j) => j.vendorInvoiceNumber)),
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

// POST: สร้าง Invoice ใหม่ พร้อมเปิด D365 PO แบบ Fail-closed (1 ใบงาน = 1 PO) และป้องกัน Race Condition & Double Invoicing
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['MASTER', 'SUPPLIER', 'ADMIN']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const parsed = await parseBody(request, createInvoiceSchema);
    if (parsed.response) return parsed.response;
    const { supplierId, companyId, jobIds: rawJobIds, dueDate, notes } = parsed.data;
    const jobIds = Array.from(new Set(rawJobIds));

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

    const jobInclude = {
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
    } as const;

    const validateTargetJobs = (
      jobs: Awaited<ReturnType<typeof prisma.job.findMany<{ include: typeof jobInclude }>>>
    ) => {
      if (jobs.length !== jobIds.length) {
        throw new InvoiceValidationError('พบบางงานไม่ถูกต้องหรือไม่มีอยู่ในระบบ');
      }

      const alreadyInvoiced = jobs.filter(j => j.invoiceId || j.status === 'INVOICED');
      if (alreadyInvoiced.length > 0) {
        throw new InvoiceValidationError('มีบางรายการงานที่ถูกวางบิลไปแล้ว กรุณารีเฟรชหน้ารายการ');
      }

      const unapproved = jobs.filter(j => j.status !== 'APPROVED');
      if (unapproved.length > 0) {
        throw new InvoiceValidationError('ทุกงานที่นำมาวางบิลต้องได้รับการ Approve แล้วเท่านั้น');
      }

      const wrongCompany = jobs.filter(j => j.companyId !== companyId);
      if (wrongCompany.length > 0) {
        throw new InvoiceValidationError('ไม่สามารถรวมงานข้ามบริษัทได้');
      }

      const wrongSupplier = jobs.filter(j => j.supplierId !== supplierId);
      if (wrongSupplier.length > 0) {
        throw new InvoiceValidationError('ไม่สามารถรวมงานข้าม Supplier ได้');
      }

      // บังคับต้องอัปเดตเลข Invoice ของ Vendor เรียบร้อยแล้วทุกใบงานก่อนกดออกบิลเพื่อเปิด PO
      const pendingInvoiceUpdates = jobs.filter((j) => !isJobInvoiceUpdated(j));
      if (pendingInvoiceUpdates.length > 0) {
        throw new InvoiceValidationError(
          `กรุณาอัปเดตเลข Invoice ของใบงาน ${pendingInvoiceUpdates.map((j) => j.jobNumber).join(', ')} ให้เรียบร้อยก่อนกดออกบิลเพื่อเปิด PO`
        );
      }

      // ป้องกันการรวมงานข้ามสาขาเจ้าของรถ (คนละนิติบุคคล / Legal Entity ใน D365) ไว้ในใบวางบิลใบเดียวกัน
      const ownerBranchCodes = Array.from(
        new Set(jobs.map((j) => resolveJobOwnerBranchCode(j)))
      );
      if (ownerBranchCodes.length > 1) {
        throw new InvoiceValidationError(
          `ไม่สามารถรวมงานข้ามสาขาเจ้าของรถในใบวางบิลเดียวกันได้ (${ownerBranchCodes.join(', ')}) กรุณาแยกออกบิลตามสาขาเจ้าของรถ`
        );
      }
    };

    // ─── ขั้นตอนที่ 1: ตรวจสอบความถูกต้องของใบงานทั้งหมดก่อนยิง D365 PO ───────────
    const preCheckJobs = await prisma.job.findMany({
      where: { id: { in: jobIds } },
      include: jobInclude,
      orderBy: { createdAt: 'asc' },
    });
    validateTargetJobs(preCheckJobs);

    // ─── ขั้นตอนที่ 2: เปิด D365 PO (1 ใบงาน = 1 PO) แบบ Fail-closed ก่อนสร้างบิล ───
    const actorName = user.displayName || user.username;
    const poResult = await ensureJobsHaveD365Po(
      preCheckJobs.map((j) => ({
        id: j.id,
        jobNumber: j.jobNumber,
        d365PoNumber: j.d365PoNumber,
        d365PoStatus: j.d365PoStatus,
        d365PoSentAt: j.d365PoSentAt,
      })),
      { id: user.id, name: actorName, role: user.role }
    );

    if (!poResult.ok) {
      return NextResponse.json(
        {
          error: poResult.error,
          failedJobId: poResult.failedJobId,
          failedJobNumber: poResult.failedJobNumber,
          openedBeforeFailure: poResult.openedBeforeFailure,
        },
        { status: poResult.status }
      );
    }

    // ใช้เลข Invoice ชุดแรกที่ได้ตอนอนุมัติของใบงานแรก (หากยังไม่ซ้ำในตาราง Invoice) มิฉะนั้นสร้างเลขใหม่
    const candidateInvoiceNumber = preCheckJobs.find((j) => j.initialInvoiceNumber?.trim())?.initialInvoiceNumber?.trim();
    const existingWithCandidate = candidateInvoiceNumber
      ? await prisma.invoice.findUnique({ where: { invoiceNumber: candidateInvoiceNumber }, select: { id: true } })
      : null;
    const invoiceNumber =
      candidateInvoiceNumber && !existingWithCandidate
        ? candidateInvoiceNumber
        : generateInitialInvoiceNumber(company.code);

    // ─── ขั้นตอนที่ 3: ล็อกงานเป็น INVOICED และสร้างใบวางบิลแบบ Atomic ─────────────
    const invoice = await prisma.$transaction(async (tx) => {
      const targetJobs = await tx.job.findMany({
        where: { id: { in: jobIds } },
        include: jobInclude,
      });
      validateTargetJobs(targetJobs);

      const missingPo = targetJobs.filter((j) => !j.d365PoNumber);
      if (missingPo.length > 0) {
        throw new InvoiceValidationError(
          `ไม่สามารถสร้างใบวางบิลได้ เนื่องจากใบงาน ${missingPo.map((j) => j.jobNumber).join(', ')} ยังไม่มีเลข D365 PO`,
          422
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
      const mergedVendorInvoiceNumber = mergeVendorInvoiceNumbers(
        targetJobs.map((j) => j.vendorInvoiceNumber)
      );

      // Atomically verify and lock all target jobs to INVOICED (must have d365PoNumber & UPDATED invoice)
      const updateResult = await tx.job.updateMany({
        where: {
          id: { in: jobIds },
          status: 'APPROVED',
          invoiceId: null,
          invoiceUpdateStatus: 'UPDATED',
          vendorInvoiceNumber: { not: null },
          d365PoNumber: { not: null },
        },
        data: {
          status: 'INVOICED',
          updatedAt: new Date(),
        },
      });

      if (updateResult.count !== jobIds.length) {
        throw new InvoiceValidationError('เกิดข้อผิดพลาดในการล็อกสถานะงาน (บางงานอาจถูกวางบิลไปก่อนหน้า)');
      }

      // Create invoice and connect jobs (sets invoiceId to inv.id)
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          vendorInvoiceNumber: mergedVendorInvoiceNumber,
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
            select: {
              id: true,
              jobNumber: true,
              jobType: true,
              estimatedCost: true,
              actualCost: true,
              d365PoNumber: true,
              initialInvoiceNumber: true,
              vendorInvoiceNumber: true,
              invoiceUpdateStatus: true,
            },
          },
        },
      });

      return inv;
    });

    const formatted = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      vendorInvoiceNumber:
        invoice.vendorInvoiceNumber ??
        mergeVendorInvoiceNumbers(invoice.jobs.map((j) => j.vendorInvoiceNumber)),
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

    return NextResponse.json(
      {
        success: true,
        invoice: formatted,
        poSummary: {
          openedCount: poResult.openedCount,
          existingCount: poResult.existingCount,
          poNumbers: poResult.poNumbers,
        },
      },
      { status: 201 }
    );
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
