import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: ดึงรายการ Jobs (กรองได้ตาม company, branch, supplier, status)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const jobType = searchParams.get('jobType');

    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (jobType) where.jobType = jobType;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        company: { select: { code: true, name: true } },
        branch: { select: { code: true, name: true } },
        supplier: { select: { code: true, name: true } },
        vehicle: true,
        originBranch: { select: { code: true, name: true } },
        destBranch: { select: { code: true, name: true } },
        carWashItems: {
          include: {
            vehicle: { select: { model: true, color: true, licensePlate: true } },
          },
        },
        evidences: true,
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format for frontend compatibility
    const formatted = jobs.map(job => ({
      id: job.id,
      jobNumber: job.jobNumber,
      jobType: job.jobType,
      status: job.status,
      companyId: job.companyId,
      companyCode: job.company.code,
      branchId: job.branchId,
      branchName: job.branch.name,
      supplierId: job.supplierId,
      supplierName: job.supplier.name,
      // Vehicle Slide
      vin: job.vin,
      vehicle: job.vehicle,
      originBranchId: job.originBranchId,
      originBranchName: job.originBranch?.name,
      destBranchId: job.destBranchId,
      destBranchName: job.destBranch?.name,
      pickupDateTime: job.pickupDateTime?.toISOString(),
      deliveryDateTime: job.deliveryDateTime?.toISOString(),
      contactPerson: job.contactPerson,
      contactPhone: job.contactPhone,
      transferReason: job.transferReason,
      // Car Wash
      carWashItems: job.carWashItems.map(item => ({
        id: item.id,
        jobId: item.jobId,
        vin: item.vin,
        vehicleModel: item.vehicle.model,
        vehicleColor: item.vehicle.color,
        licensePlate: item.vehicle.licensePlate,
        actualWashDate: item.actualWashDate.toISOString().slice(0, 10),
        washType: item.washType,
        unitPrice: item.unitPrice,
        status: item.status,
        remarks: item.remarks,
      })),
      // Approval
      requestedBy: job.requestedBy || '',
      completedAt: job.completedAt?.toISOString(),
      approvedAt: job.approvedAt?.toISOString(),
      approvedBy: job.approvedBy,
      rejectReason: job.rejectReason,
      // Evidence
      evidences: job.evidences.map(e => ({
        id: e.id,
        jobId: e.jobId,
        vin: e.vin,
        photoUrl: e.photoUrl,
        caption: e.caption || '',
        evidenceType: e.evidenceType,
        uploadedAt: e.uploadedAt.toISOString(),
      })),
      // Cost
      estimatedCost: job.estimatedCost || 0,
      actualCost: job.actualCost,
      invoiceId: job.invoiceId,
      invoiceNumber: job.invoice?.invoiceNumber,
      // Timestamps
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    }));

    return NextResponse.json({ jobs: formatted });
  } catch (error) {
    console.error('GET /api/jobs error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลงานได้' },
      { status: 500 }
    );
  }
}

// POST: สร้าง Job ใหม่ (Car Wash / Vehicle Slide)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobType, companyId, branchId, supplierId, requestedBy } = body;

    // Validate required fields
    if (!jobType || !companyId || !branchId || !supplierId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบ (jobType, companyId, branchId, supplierId)' },
        { status: 400 }
      );
    }

    // Get company code for job number
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'ไม่พบบริษัทนี้' }, { status: 404 });
    }

    // Generate job number
    const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
    const randomSeq = String(Math.floor(Math.random() * 900) + 100);
    const prefix = jobType === 'CAR_WASH' ? 'CW' : 'VS';
    const jobNumber = `${prefix}-${company.code}-${dateStr}-${randomSeq}`;

    if (jobType === 'CAR_WASH') {
      // ─── Car Wash ─────────────────────
      const { items } = body; // items: [{ vin, actualWashDate, washType, unitPrice, remarks }]

      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'กรุณาเลือกรถอย่างน้อย 1 คัน' }, { status: 400 });
      }

      const totalCost = items.reduce((sum: number, it: { unitPrice: number }) => sum + it.unitPrice, 0);

      const job = await prisma.job.create({
        data: {
          jobNumber,
          jobType: 'CAR_WASH',
          status: 'PENDING_SUPPLIER',
          companyId,
          branchId,
          supplierId,
          requestedBy: requestedBy || '',
          estimatedCost: totalCost,
          carWashItems: {
            create: items.map((it: { vin: string; actualWashDate: string; washType?: string; unitPrice?: number; remarks?: string }) => ({
              vin: it.vin,
              actualWashDate: new Date(it.actualWashDate),
              washType: it.washType || 'STANDARD',
              unitPrice: it.unitPrice || 150,
              remarks: it.remarks,
            })),
          },
        },
        include: { carWashItems: true },
      });

      // Update vehicle status to IN_WASH
      const vins = items.map((it: { vin: string }) => it.vin);
      await prisma.vehicle.updateMany({
        where: { vin: { in: vins } },
        data: { status: 'IN_WASH' },
      });

      return NextResponse.json({ success: true, job }, { status: 201 });

    } else if (jobType === 'VEHICLE_SLIDE') {
      // ─── Vehicle Slide ────────────────
      const { vin, originBranchId, destBranchId, pickupDateTime, deliveryDateTime, contactPerson, contactPhone, transferReason, estimatedCost } = body;

      if (!vin || !originBranchId || !destBranchId) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลรถสไลด์ให้ครบ' }, { status: 400 });
      }

      const job = await prisma.job.create({
        data: {
          jobNumber,
          jobType: 'VEHICLE_SLIDE',
          status: 'PENDING_SUPPLIER',
          companyId,
          branchId: originBranchId,
          supplierId,
          vin,
          originBranchId,
          destBranchId,
          pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : null,
          deliveryDateTime: deliveryDateTime ? new Date(deliveryDateTime) : null,
          contactPerson,
          contactPhone,
          transferReason,
          requestedBy: requestedBy || '',
          estimatedCost: estimatedCost || 0,
        },
      });

      // Update vehicle status to IN_TRANSIT
      await prisma.vehicle.update({
        where: { vin },
        data: { status: 'IN_TRANSIT' },
      });

      return NextResponse.json({ success: true, job }, { status: 201 });
    }

    return NextResponse.json({ error: 'jobType ไม่ถูกต้อง' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/jobs error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถสร้างงานได้' },
      { status: 500 }
    );
  }
}
