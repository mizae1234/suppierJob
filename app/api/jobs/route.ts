import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { logAuditFromUser } from '@/lib/audit-log';

// GET: ดึงรายการ Jobs (ตรวจสิทธิ์ตาม Role และรองรับ Pagination / Search)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const jobType = searchParams.get('jobType');
    const q = searchParams.get('q');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const where: Prisma.JobWhereInput = {};

    // ─── Enforce Tenant & Role Isolation ─────────────────
    if (user.role === 'SUPPLIER') {
      // Supplier must only see their own jobs
      where.supplierId = user.supplierId || 'none';
    } else if (user.role === 'BRANCH') {
      // Branch user can only see jobs involving their branch
      if (user.branchId) {
        where.OR = [
          { branchId: user.branchId },
          { originBranchId: user.branchId },
          { destBranchId: user.branchId },
        ];
      }
      if (user.companyId) {
        where.companyId = user.companyId;
      }
    } else if (user.role === 'ADMIN') {
      // Admin is constrained to their assigned company if present
      if (user.companyId) {
        where.companyId = user.companyId;
      } else if (companyId) {
        where.companyId = companyId;
      }
    } else {
      // MASTER can filter freely
      if (companyId) where.companyId = companyId;
    }

    // Additional query filters (if allowed)
    if (branchId && user.role !== 'BRANCH') where.branchId = branchId;
    if (supplierId && user.role !== 'SUPPLIER') where.supplierId = supplierId;
    if (status) where.status = status;
    if (jobType) where.jobType = jobType;

    // Search query
    if (q) {
      where.AND = [
        {
          OR: [
            { jobNumber: { contains: q } },
            { vin: { contains: q } },
            { vehicle: { licensePlate: { contains: q } } },
            { vehicle: { model: { contains: q } } },
          ],
        },
      ];
    }

    // Pagination
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : null;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : (page ? 20 : 150);
    const skip = page ? (page - 1) * limit : undefined;

    const [total, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        include: {
          company: { select: { code: true, name: true } },
          branch: { select: { code: true, name: true } },
          supplier: { select: { code: true, name: true } },
          vehicle: true,
          originBranch: { select: { code: true, name: true, address: true, latitude: true, longitude: true } },
          destBranch: { select: { code: true, name: true, address: true, latitude: true, longitude: true } },
          carWashItems: {
            include: {
              vehicle: { select: { model: true, color: true, licensePlate: true } },
            },
          },
          evidences: true,
          activities: { orderBy: { createdAt: 'asc' as const } },
          invoice: { select: { invoiceNumber: true } },
        } as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }) as unknown as any[],
    ]);

    // Format for frontend compatibility
    const formatted = jobs.map((job: any) => ({
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
      originBranchAddress: job.originBranch?.address || undefined,
      originBranchLat: job.originBranch?.latitude ?? undefined,
      originBranchLng: job.originBranch?.longitude ?? undefined,
      destBranchId: job.destBranchId,
      destBranchName: job.destBranch?.name,
      destBranchAddress: job.destBranch?.address || undefined,
      destBranchLat: job.destBranch?.latitude ?? undefined,
      destBranchLng: job.destBranch?.longitude ?? undefined,
      customDestAddress: job.customDestAddress || undefined,
      customDestLat: job.customDestLat ?? undefined,
      customDestLng: job.customDestLng ?? undefined,
      customOriginAddress: job.customOriginAddress || undefined,
      customOriginLat: job.customOriginLat ?? undefined,
      customOriginLng: job.customOriginLng ?? undefined,
      pickupDateTime: job.pickupDateTime?.toISOString(),
      deliveryDateTime: job.deliveryDateTime?.toISOString(),
      contactPerson: job.contactPerson,
      contactPhone: job.contactPhone,
      transferReason: job.transferReason,
      // Car Wash
      carWashItems: job.carWashItems.map((item: any) => ({
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
      // Approval — Requester Snapshot
      requestedById: job.requestedById || '',
      requestedBy: job.requestedBy || '',
      requesterPosition: job.requesterPosition || '',
      requesterPhone: job.requesterPhone || '',
      completedAt: job.completedAt?.toISOString(),
      approvedAt: job.approvedAt?.toISOString(),
      approvedBy: job.approvedBy,
      rejectReason: job.rejectReason,
      // Evidence
      evidences: job.evidences.map((e: any) => ({
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
      actualCost: (() => {
        if (job.status === 'CANCELLED') return 0;
        if (job.carWashItems && job.carWashItems.length > 0) {
          const hasCancelled = job.carWashItems.some((i: any) => i.status === 'CANCELLED');
          if (hasCancelled) {
            const validItems = job.carWashItems.filter((i: any) => i.status !== 'CANCELLED');
            return validItems.reduce((sum: number, i: any) => sum + (i.unitPrice || 0), 0);
          }
        }
        return job.actualCost;
      })(),
      invoiceId: job.invoiceId,
      invoiceNumber: job.invoice?.invoiceNumber,
      // Activities / Timeline
      activities: (job.activities || []).map((a: any) => ({
        id: a.id,
        jobId: a.jobId,
        action: a.action,
        actor: a.actor,
        actorRole: a.actorRole,
        itemId: a.itemId,
        vin: a.vin,
        description: a.description,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
      })),
      // Timestamps
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      jobs: formatted,
      total,
      page: page || 1,
      totalPages: Math.ceil(total / limit),
    });
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
  const auth = await requireAuth(request, ['MASTER', 'ADMIN', 'BRANCH']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const body = await request.json();
    let { jobType, companyId, branchId, supplierId, requestedBy, requesterPosition, requesterPhone } = body;

    // Auto-resolve branch if missing (e.g. EV7 unified company with no sub-branches)
    if (!branchId && companyId) {
      const primaryBranch = await prisma.branch.findFirst({ where: { companyId } });
      if (primaryBranch) {
        branchId = primaryBranch.id;
      }
    }

    // Build requester snapshot — always fetch fresh profile from DB for accuracy
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, position: true, phone: true, displayName: true },
    });
    const snapshotName = (dbUser?.firstName && dbUser?.lastName)
      ? `${dbUser.firstName} ${dbUser.lastName}`
      : (requestedBy || dbUser?.displayName || user.displayName || '');
    const snapshotPosition = dbUser?.position || requesterPosition || '';
    const snapshotPhone = dbUser?.phone || requesterPhone || '';

    // Validate required fields
    if (!jobType || !companyId || !branchId || !supplierId) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบ (jobType, companyId, branchId, supplierId)' },
        { status: 400 }
      );
    }

    // Role-specific company validation
    if (user.role === 'ADMIN' && user.companyId && user.companyId !== companyId) {
      return NextResponse.json(
        { error: 'คุณไม่มีสิทธิ์สร้างงานให้บริษัทอื่น' },
        { status: 403 }
      );
    }

    if (user.role === 'BRANCH') {
      if (user.companyId && user.companyId !== companyId) {
        return NextResponse.json(
          { error: 'คุณไม่มีสิทธิ์สร้างงานให้บริษัทอื่น' },
          { status: 403 }
        );
      }
      if (user.branchId && user.branchId !== branchId) {
        return NextResponse.json(
          { error: 'คุณสามารถสร้างงานได้เฉพาะสาขาตนเองเท่านั้น' },
          { status: 403 }
        );
      }
    }

    // Get company code for job number
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'ไม่พบบริษัทนี้' }, { status: 404 });
    }

    // Generate collision-resistant job number e.g. CW-EV7-2609-847291
    const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
    const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    const prefix = jobType === 'CAR_WASH' ? 'CW' : 'VS';
    const jobNumber = `${prefix}-${company.code}-${dateStr}-${uniqueSuffix}`;

    if (jobType === 'CAR_WASH') {
      // ─── Car Wash ─────────────────────
      const { items } = body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'กรุณาเลือกรถอย่างน้อย 1 คัน' }, { status: 400 });
      }

      const totalCost = items.reduce((sum: number, it: { unitPrice?: number }) => sum + (it.unitPrice || 150), 0);

      const job = await prisma.job.create({
        data: {
          jobNumber,
          jobType: 'CAR_WASH',
          status: 'IN_PROGRESS',
          companyId,
          branchId,
          supplierId,
          requestedById: user.id,
          requestedBy: snapshotName,
          requesterPosition: snapshotPosition,
          requesterPhone: snapshotPhone,
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

      // Audit Log: CREATE_JOB (Car Wash)
      logAuditFromUser(user, {
        action: 'CREATE_JOB',
        entityType: 'Job',
        entityId: job.id,
        description: `สร้างใบงานล้างรถ ${jobNumber} (${items.length} คัน, ฿${totalCost.toLocaleString()})`,
        metadata: { jobNumber, jobType: 'CAR_WASH', itemCount: items.length, totalCost },
        request,
      });

      return NextResponse.json({ success: true, job }, { status: 201 });

    } else if (jobType === 'VEHICLE_SLIDE') {
      // ─── Vehicle Slide ────────────────
      const { 
        vin, 
        vins,
        originBranchId, 
        destBranchId, 
        customDestAddress, 
        customDestLat, 
        customDestLng, 
        customOriginAddress,
        customOriginLat,
        customOriginLng,
        pickupDateTime, 
        deliveryDateTime, 
        contactPerson, 
        contactPhone, 
        transferReason, 
        estimatedCost,
        distance,
      } = body;

      const finalTransferReason = transferReason
        ? (distance && !transferReason.includes('ระยะทาง') ? `${transferReason} (ระยะทาง ${distance} กม.)` : transferReason)
        : (distance ? `ขนส่งรถสไลด์ (ระยะทาง ${distance} กม.)` : null);

      const vinsList: string[] = Array.isArray(vins) && vins.length > 0
        ? vins
        : (vin ? [vin] : []);

      if (vinsList.length === 0 || !originBranchId || (!destBranchId && !customDestAddress)) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลรถสไลด์ให้ครบ (ต้องระบุเลขตัวถัง และสาขาปลายทาง หรือจุดปักหมุด)' }, { status: 400 });
      }

      const costPerCar = estimatedCost ? parseFloat(estimatedCost) : 0;
      const totalEstimatedCost = costPerCar * vinsList.length;

      // Optional custom pickup pin (overrides origin branch location for navigation)
      const customOriginPin = {
        customOriginAddress: customOriginAddress || null,
        customOriginLat: customOriginLat ? parseFloat(customOriginLat) : null,
        customOriginLng: customOriginLng ? parseFloat(customOriginLng) : null,
      };

      const job = await prisma.job.create({
        data: {
          jobNumber,
          jobType: 'VEHICLE_SLIDE',
          status: 'IN_PROGRESS',
          companyId,
          branchId: originBranchId,
          supplierId,
          vin: vinsList[0],
          originBranchId,
          destBranchId: destBranchId || null,
          customDestAddress: customDestAddress || null,
          customDestLat: customDestLat ? parseFloat(customDestLat) : null,
          customDestLng: customDestLng ? parseFloat(customDestLng) : null,
          ...customOriginPin,
          pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : null,
          deliveryDateTime: deliveryDateTime ? new Date(deliveryDateTime) : null,
          contactPerson,
          contactPhone,
          transferReason: finalTransferReason,
          requestedById: user.id,
          requestedBy: snapshotName,
          requesterPosition: snapshotPosition,
          requesterPhone: snapshotPhone,
          estimatedCost: totalEstimatedCost,
          actualCost: totalEstimatedCost,
          carWashItems: {
            create: vinsList.map((v) => ({
              vin: v,
              actualWashDate: pickupDateTime ? new Date(pickupDateTime) : new Date(),
              washType: 'VEHICLE_SLIDE',
              unitPrice: costPerCar,
              status: 'PENDING',
            })),
          },
        },
        include: {
          carWashItems: {
            include: {
              vehicle: { select: { model: true, color: true, licensePlate: true } },
            },
          },
        },
      });

      // Update vehicle status to IN_TRANSIT
      await prisma.vehicle.updateMany({
        where: { vin: { in: vinsList } },
        data: { status: 'IN_TRANSIT' },
      });

      // Audit Log: CREATE_JOB (Vehicle Slide)
      logAuditFromUser(user, {
        action: 'CREATE_JOB',
        entityType: 'Job',
        entityId: job.id,
        description: `สร้างใบงานรถสไลด์ ${jobNumber} (${vinsList.length} คัน, ฿${totalEstimatedCost.toLocaleString()})`,
        metadata: { jobNumber, jobType: 'VEHICLE_SLIDE', vinCount: vinsList.length, totalEstimatedCost },
        request,
      });

      return NextResponse.json({ 
        success: true, 
        job, 
        count: vinsList.length 
      }, { status: 201 });
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
