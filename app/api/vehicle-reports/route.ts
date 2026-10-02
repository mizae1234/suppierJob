import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

/**
 * GET /api/vehicle-reports
 * 
 * Returns a per-vehicle breakdown report:
 * Each vehicle (VIN) => list of services performed, job reference, invoice number, cost, status
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const supplierId = searchParams.get('supplierId');
    const invoiceId = searchParams.get('invoiceId');
    const vin = searchParams.get('vin');

    // ─── 1. Query CarWashItems (covers both CAR_WASH and VEHICLE_SLIDE items) ───
    const itemWhere: Prisma.CarWashItemWhereInput = {};
    const jobWhere: Prisma.JobWhereInput = {};

    // Role isolation
    if (user.role === 'SUPPLIER') {
      jobWhere.supplierId = user.supplierId || 'none';
    } else if (user.role === 'ADMIN' && user.companyId) {
      jobWhere.companyId = user.companyId;
    } else if (user.role === 'BRANCH' && user.companyId) {
      jobWhere.companyId = user.companyId;
    }

    // Filters
    if (companyId) jobWhere.companyId = companyId;
    if (supplierId) jobWhere.supplierId = supplierId;
    if (invoiceId) jobWhere.invoiceId = invoiceId;
    if (vin) itemWhere.vin = vin;

    itemWhere.job = jobWhere;

    const carWashItems = await prisma.carWashItem.findMany({
      where: itemWhere,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            jobType: true,
            status: true,
            companyId: true,
            branchId: true,
            supplierId: true,
            invoiceId: true,
            estimatedCost: true,
            actualCost: true,
            createdAt: true,
            completedAt: true,
            approvedAt: true,
            company: { select: { code: true, name: true } },
            branch: { select: { code: true, name: true } },
            supplier: { select: { code: true, name: true } },
            invoice: { select: { invoiceNumber: true, status: true } },
          },
        },
        vehicle: {
          select: {
            vin: true,
            model: true,
            color: true,
            licensePlate: true,
            vehicleType: true,
          },
        },
      },
      orderBy: { actualWashDate: 'desc' },
      take: 500,
    });

    // ─── 2. Query single-vehicle VEHICLE_SLIDE jobs (those without carWashItems) ───
    const slideJobWhere: Prisma.JobWhereInput = {
      ...jobWhere,
      jobType: 'VEHICLE_SLIDE',
      vin: { not: null },
      carWashItems: { none: {} },
    };
    if (vin) slideJobWhere.vin = vin;

    const slideJobs = await prisma.job.findMany({
      where: slideJobWhere,
      include: {
        company: { select: { code: true, name: true } },
        branch: { select: { code: true, name: true } },
        supplier: { select: { code: true, name: true } },
        invoice: { select: { invoiceNumber: true, status: true } },
        vehicle: {
          select: {
            vin: true,
            model: true,
            color: true,
            licensePlate: true,
            vehicleType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // ─── 3. Normalize all records into a flat per-vehicle list ───
    interface VehicleReportItem {
      id: string;
      vin: string;
      vehicleModel: string;
      vehicleColor: string;
      licensePlate: string;
      vehicleType: string;
      jobId: string;
      jobNumber: string;
      jobType: string;
      serviceType: string; // e.g., STANDARD, DEEP_CLEAN, VEHICLE_SLIDE
      serviceDate: string;
      unitPrice: number;
      itemStatus: string;
      jobStatus: string;
      companyCode: string;
      branchName: string;
      supplierName: string;
      invoiceNumber: string | null;
      invoiceStatus: string | null;
      completedAt: string | null;
      approvedAt: string | null;
      remarks: string | null;
    }

    const results: VehicleReportItem[] = [];

    // From CarWashItems
    for (const item of carWashItems) {
      results.push({
        id: item.id,
        vin: item.vin,
        vehicleModel: item.vehicle?.model || '-',
        vehicleColor: item.vehicle?.color || '-',
        licensePlate: item.vehicle?.licensePlate || '-',
        vehicleType: item.vehicle?.vehicleType || '-',
        jobId: item.job.id,
        jobNumber: item.job.jobNumber,
        jobType: item.job.jobType,
        serviceType: item.washType,
        serviceDate: item.actualWashDate.toISOString().slice(0, 10),
        unitPrice: item.unitPrice,
        itemStatus: item.status,
        jobStatus: item.job.status,
        companyCode: item.job.company.code,
        branchName: item.job.branch.name,
        supplierName: item.job.supplier.name,
        invoiceNumber: item.job.invoice?.invoiceNumber || null,
        invoiceStatus: item.job.invoice?.status || null,
        completedAt: item.job.completedAt?.toISOString() || null,
        approvedAt: item.job.approvedAt?.toISOString() || null,
        remarks: item.remarks || null,
      });
    }

    // From single-vehicle VEHICLE_SLIDE jobs
    for (const job of slideJobs) {
      results.push({
        id: `slide-${job.id}`,
        vin: job.vin!,
        vehicleModel: job.vehicle?.model || '-',
        vehicleColor: job.vehicle?.color || '-',
        licensePlate: job.vehicle?.licensePlate || '-',
        vehicleType: job.vehicle?.vehicleType || '-',
        jobId: job.id,
        jobNumber: job.jobNumber,
        jobType: job.jobType,
        serviceType: 'VEHICLE_SLIDE',
        serviceDate: job.createdAt.toISOString().slice(0, 10),
        unitPrice: job.actualCost || job.estimatedCost || 0,
        itemStatus: job.status,
        jobStatus: job.status,
        companyCode: job.company.code,
        branchName: job.branch.name,
        supplierName: job.supplier.name,
        invoiceNumber: job.invoice?.invoiceNumber || null,
        invoiceStatus: job.invoice?.status || null,
        completedAt: job.completedAt?.toISOString() || null,
        approvedAt: job.approvedAt?.toISOString() || null,
        remarks: null,
      });
    }

    // Sort by date descending
    results.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));

    return NextResponse.json({ items: results, total: results.length });
  } catch (error) {
    console.error('GET /api/vehicle-reports error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลรายงานรายคันได้' },
      { status: 500 }
    );
  }
}
