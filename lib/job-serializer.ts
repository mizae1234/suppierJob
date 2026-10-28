import type { Prisma } from '@prisma/client';

/**
 * แปลงข้อมูล Job จาก Prisma → รูปแบบที่หน้าเว็บใช้ (ใช้ร่วมกันระหว่าง GET /api/jobs และ GET /api/jobs/[id])
 * - activities (timeline) โหลดเฉพาะเมื่อขอ — ถ้าไม่ได้ include จะคืน `activities: []` เสมอ
 */

/** include ที่ใช้ดึงงานให้ครบสำหรับหน้าเว็บ */
export function buildJobInclude(includeActivities: boolean) {
  return {
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
    ...(includeActivities ? { activities: { orderBy: { createdAt: 'asc' as const } } } : {}),
    invoice: { select: { invoiceNumber: true } },
  } satisfies Prisma.JobInclude;
}

// Format for frontend compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeJob(job: any) {
  return {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      verifiedAt: item.verifiedAt?.toISOString(),
      verifiedBy: item.verifiedBy || undefined,
      verifyMethod: item.verifyMethod || undefined,
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
    verifiedAt: job.verifiedAt?.toISOString(),
    verifiedBy: job.verifiedBy || undefined,
    // Evidence
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasCancelled = job.carWashItems.some((i: any) => i.status === 'CANCELLED');
        if (hasCancelled) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const validItems = job.carWashItems.filter((i: any) => i.status !== 'CANCELLED');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return validItems.reduce((sum: number, i: any) => sum + (i.unitPrice || 0), 0);
        }
      }
      return job.actualCost;
    })(),
    invoiceId: job.invoiceId,
    invoiceNumber: job.invoice?.invoiceNumber,
    // D365 PO Integration
    d365PoNumber: job.d365PoNumber,
    d365PoStatus: job.d365PoStatus,
    d365PoMessage: job.d365PoMessage,
    d365PoSentAt: job.d365PoSentAt?.toISOString(),
    // Activities / Timeline (ไม่ได้ include → [] เพื่อให้ .activities เป็น array เสมอ)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  };
}

export type SerializedJob = ReturnType<typeof serializeJob>;
