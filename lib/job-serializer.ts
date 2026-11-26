import type { Prisma } from '@prisma/client';
import { getFailedAttemptFee, SLIDE_COMPLETION_FAILED_ATTEMPT } from './slide-failed-attempt';

/**
 * แปลงข้อมูล Job จาก Prisma → รูปแบบที่หน้าเว็บใช้ (ใช้ร่วมกันระหว่าง GET /api/jobs และ GET /api/jobs/[id])
 * - activities (timeline) โหลดเฉพาะเมื่อขอ — ถ้าไม่ได้ include จะคืน `activities: []` เสมอ
 */

export interface BuildJobIncludeOptions {
  /** 'list' = โหมดรายการ (ไม่ดึงรูปทั้งหมด ใช้ thumbnail 1 รูป + _count และเลือกเฉพาะฟิลด์รถที่ใช้จริง) */
  view?: 'list' | 'detail';
}

const JOB_BASE_INCLUDE = {
  company: { select: { code: true, name: true } },
  branch: { select: { code: true, name: true, address: true } },
  supplier: { select: { code: true, name: true } },
  pickupBranch: {
    select: { code: true, name: true, address: true, latitude: true, longitude: true, companyId: true },
  },
  destBranch: {
    select: { code: true, name: true, address: true, latitude: true, longitude: true, companyId: true },
  },
  carWashItems: {
    include: {
      vehicle: {
        select: {
          model: true,
          color: true,
          licensePlate: true,
          d365SiteId: true,
          d365WarehouseId: true,
          currentBranchId: true,
          currentBranch: { select: { code: true, name: true, address: true } },
        },
      },
    },
  },
  invoice: { select: { invoiceNumber: true } },
} satisfies Prisma.JobInclude;

export const JOB_LIST_INCLUDE = {
  ...JOB_BASE_INCLUDE,
  vehicle: {
    select: {
      vin: true,
      model: true,
      color: true,
      licensePlate: true,
      vehicleType: true,
      d365SiteId: true,
      d365WarehouseId: true,
      currentBranchId: true,
      currentBranch: { select: { code: true, name: true, address: true } },
    },
  },
  evidences: {
    take: 1,
    orderBy: { uploadedAt: 'desc' as const },
    select: {
      id: true,
      jobId: true,
      vin: true,
      photoUrl: true,
      caption: true,
      evidenceType: true,
      uploadedAt: true,
    },
  },
  _count: { select: { evidences: true } },
} satisfies Prisma.JobInclude;

export const JOB_DETAIL_INCLUDE = {
  ...JOB_BASE_INCLUDE,
  vehicle: {
    include: {
      currentBranch: { select: { code: true, name: true, address: true } },
    },
  },
  evidences: true,
} satisfies Prisma.JobInclude;

export const JOB_LIST_WITH_ACTIVITIES_INCLUDE = {
  ...JOB_LIST_INCLUDE,
  activities: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.JobInclude;

export const JOB_DETAIL_WITH_ACTIVITIES_INCLUDE = {
  ...JOB_DETAIL_INCLUDE,
  activities: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.JobInclude;

export type JobListPayload = Prisma.JobGetPayload<{ include: typeof JOB_LIST_INCLUDE }>;
export type JobDetailPayload = Prisma.JobGetPayload<{ include: typeof JOB_DETAIL_INCLUDE }>;
export type JobListWithActivitiesPayload = Prisma.JobGetPayload<{
  include: typeof JOB_LIST_WITH_ACTIVITIES_INCLUDE;
}>;
export type JobDetailWithActivitiesPayload = Prisma.JobGetPayload<{
  include: typeof JOB_DETAIL_WITH_ACTIVITIES_INCLUDE;
}>;

/** include ที่ใช้ดึงงานให้ครบสำหรับหน้าเว็บ */
export function buildJobInclude(
  includeActivities: boolean,
  options: BuildJobIncludeOptions = {}
) {
  const isListView = options.view === 'list';

  return {
    ...JOB_BASE_INCLUDE,
    vehicle: isListView ? JOB_LIST_INCLUDE.vehicle : JOB_DETAIL_INCLUDE.vehicle,
    ...(isListView
      ? {
          evidences: JOB_LIST_INCLUDE.evidences,
          _count: JOB_LIST_INCLUDE._count,
        }
      : {
          evidences: true as const,
        }),
    ...(includeActivities ? { activities: { orderBy: { createdAt: 'asc' as const } } } : {}),
  } satisfies Prisma.JobInclude;
}

export type BuiltJobPayload = Prisma.JobGetPayload<{
  include: ReturnType<typeof buildJobInclude>;
}>;

export type SerializableJob =
  | JobListPayload
  | JobDetailPayload
  | JobListWithActivitiesPayload
  | JobDetailWithActivitiesPayload
  | BuiltJobPayload;

// Format for frontend compatibility
export function serializeJob(job: SerializableJob) {
  const evidenceCount =
    '_count' in job && typeof job._count?.evidences === 'number'
      ? job._count.evidences
      : Array.isArray(job.evidences)
        ? job.evidences.length
        : 0;

  const activities =
    'activities' in job && Array.isArray(job.activities) ? job.activities : [];

  return {
    id: job.id,
    jobNumber: job.jobNumber,
    jobType: job.jobType,
    status: job.status,
    companyId: job.companyId,
    companyCode: job.company.code,
    branchId: job.branchId,
    branchCode: job.branch.code,
    branchName: job.branch.name,
    supplierId: job.supplierId,
    supplierName: job.supplier.name,
    // Vehicle Slide
    vin: job.vin,
    vehicle: job.vehicle,
    pickupBranchId: job.pickupBranchId,
    pickupBranchCode: job.pickupBranch?.code,
    pickupBranchName: job.pickupBranch?.name,
    pickupBranchAddress: job.pickupBranch?.address || undefined,
    pickupBranchLat: job.pickupBranch?.latitude ?? undefined,
    pickupBranchLng: job.pickupBranch?.longitude ?? undefined,
    destBranchId: job.destBranchId,
    destBranchCode: job.destBranch?.code,
    destBranchName: job.destBranch?.name,
    destBranchAddress: job.destBranch?.address || undefined,
    destBranchLat: job.destBranch?.latitude ?? undefined,
    destBranchLng: job.destBranch?.longitude ?? undefined,
    destWarehouseId: job.destWarehouseId || null,
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
    carWashItems: job.carWashItems.map((item) => ({
      id: item.id,
      jobId: item.jobId,
      vin: item.vin,
      vehicleModel: item.vehicle.model,
      vehicleColor: item.vehicle.color,
      licensePlate: item.vehicle.licensePlate,
      vehicleSiteId: item.vehicle.d365SiteId || item.vehicle.currentBranch?.code || undefined,
      vehicleWarehouseId: item.vehicle.d365WarehouseId || undefined,
      vehicleBranchId: item.vehicle.currentBranchId || undefined,
      vehicleBranchCode: item.vehicle.currentBranch?.code || undefined,
      vehicleBranchName: item.vehicle.currentBranch?.name || undefined,
      vehicleBranchAddress: item.vehicle.currentBranch?.address || undefined,
      actualWashDate: item.actualWashDate.toISOString().slice(0, 10),
      washType: item.washType,
      unitPrice: item.unitPrice,
      status: item.status,
      remarks: item.remarks,
      verifiedAt: item.verifiedAt?.toISOString(),
      verifiedBy: item.verifiedBy || undefined,
      verifyMethod: item.verifyMethod || undefined,
      fromWarehouseId: item.fromWarehouseId || undefined,
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
    completionType: job.completionType || null,
    failReasonCode: job.failReasonCode || null,
    failNote: job.failNote || null,
    pricingMode: job.pricingMode === 'MANUAL' ? 'MANUAL' : (job.pricingMode === 'AUTO' ? 'AUTO' : null),
    distance: job.distance ?? undefined,
    contractCost: job.contractCost ?? null,
    manualPriceNote: job.manualPriceNote || null,
    // Evidence (รองรับทั้งโหมด detail ที่มีครบทุกรูป และโหมด list ที่มี thumbnail + _count)
    evidences: Array.isArray(job.evidences)
      ? job.evidences.map((e) => ({
          id: e.id,
          jobId: e.jobId,
          vin: e.vin,
          photoUrl: e.photoUrl,
          caption: e.caption || '',
          evidenceType: e.evidenceType,
          uploadedAt: e.uploadedAt instanceof Date ? e.uploadedAt.toISOString() : String(e.uploadedAt),
        }))
      : [],
    evidenceCount,
    // Cost
    estimatedCost: job.estimatedCost || 0,
    actualCost: (() => {
      if (job.status === 'CANCELLED') return 0;
      // เที่ยวเปล่า: ยอดต่อใบงาน (ไม่คำนวณจากราคารายคัน)
      if (job.completionType === SLIDE_COMPLETION_FAILED_ATTEMPT) return getFailedAttemptFee(job);
      if (job.carWashItems && job.carWashItems.length > 0) {
        const hasCancelled = job.carWashItems.some((i) => i.status === 'CANCELLED');
        if (hasCancelled) {
          const validItems = job.carWashItems.filter((i) => i.status !== 'CANCELLED');
          return validItems.reduce((sum: number, i) => sum + (i.unitPrice || 0), 0);
        }
      }
      return job.actualCost;
    })(),
    invoiceId: job.invoiceId,
    invoiceNumber: job.invoice?.invoiceNumber ?? job.initialInvoiceNumber ?? undefined,
    initialInvoiceNumber: job.initialInvoiceNumber ?? null,
    vendorInvoiceNumber: job.vendorInvoiceNumber ?? null,
    invoiceUpdateStatus: job.invoiceUpdateStatus ?? null,
    invoiceUpdatedAt: job.invoiceUpdatedAt?.toISOString() ?? null,
    invoiceUpdatedBy: job.invoiceUpdatedBy ?? null,
    // D365 PO Integration
    d365PoNumber: job.d365PoNumber,
    d365PoStatus: job.d365PoStatus,
    d365PoMessage: job.d365PoMessage,
    d365PoSentAt: job.d365PoSentAt?.toISOString(),
    // D365 Inventory Transfer Journal
    d365TransferStatus: job.d365TransferStatus ?? null,
    d365TransferMessage: job.d365TransferMessage ?? null,
    d365TransferSentAt: job.d365TransferSentAt?.toISOString() ?? null,
    // Activities / Timeline (ไม่ได้ include → [] เพื่อให้ .activities เป็น array เสมอ)
    activities: activities.map((a) => ({
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
