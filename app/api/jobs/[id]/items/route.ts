import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { logAuditFromUser } from '@/lib/audit-log';
import { getActiveJobsByVin, type ActiveJobRef } from '@/lib/active-jobs';
import { getVehicleLabel, haversineDistance } from '@/lib/job-utils';
import { getSupplierWashConfig } from '@/lib/car-wash-rates';
import { calculateSlideJobCost, getBranchDefaultCoords } from '@/lib/vehicle-slide-rates';
import { recordVehicleSlideLog, getSlideRouteLabels } from '@/lib/vehicle-slide-log';
import { buildJobInclude, serializeJob } from '@/lib/job-serializer';

const ADD_ITEMS_TX_TIMEOUT_MS = 20_000;

class JobAddItemConflict extends Error {
  constructor(public body: Record<string, unknown>, public status = 409) {
    super(String(body.error));
    this.name = 'JobAddItemConflict';
  }
}

async function buildBusyConflictBody(
  busy: Map<string, ActiveJobRef>,
  client: Pick<Prisma.TransactionClient, 'vehicle'>
) {
  const plates = await client.vehicle.findMany({
    where: { vin: { in: [...busy.keys()] } },
    select: { vin: true, licensePlate: true },
  });
  const plateOf = new Map(plates.map(p => [p.vin, p.licensePlate]));
  const lines = [...busy.entries()].map(([v, j]) =>
    `${getVehicleLabel(v, plateOf.get(v))} (ใบงาน ${j.jobNumber})`
  );
  return {
    error: `รถต่อไปนี้มีงานที่ยังไม่เสร็จสิ้น สั่งงานซ้ำไม่ได้: ${lines.join(', ')}`,
    busyVins: [...busy.keys()],
  };
}

function buildOutOfStockBody(outOfStock: { vin: string; licensePlate: string | null }[]) {
  return {
    error: `รถต่อไปนี้ไม่อยู่ในสต็อกแล้ว (ตามข้อมูล D365) สั่งงานไม่ได้: ${outOfStock.map(v => getVehicleLabel(v.vin, v.licensePlate)).join(', ')}`,
    outOfStockVins: outOfStock.map(v => v.vin),
  };
}

async function reserveVehiclesInTx(
  tx: Prisma.TransactionClient,
  vins: string[],
  newStatus: 'IN_WASH' | 'IN_TRANSIT',
  allowsOutOfStock: boolean
) {
  const uniqueVins = [...new Set(vins.filter(Boolean))];
  if (uniqueVins.length === 0) return;

  const res = await tx.vehicle.updateMany({
    where: {
      vin: { in: uniqueVins },
      ...(allowsOutOfStock ? {} : { status: { not: 'OUT_OF_STOCK' } }),
    },
    data: { status: newStatus },
  });

  if (res.count !== uniqueVins.length) {
    const rows = await tx.vehicle.findMany({
      where: { vin: { in: uniqueVins } },
      select: { vin: true, licensePlate: true, status: true },
    });
    const outOfStock = allowsOutOfStock ? [] : rows.filter(r => r.status === 'OUT_OF_STOCK');
    if (outOfStock.length > 0) throw new JobAddItemConflict(buildOutOfStockBody(outOfStock));
    const found = new Set(rows.map(r => r.vin.toUpperCase()));
    const missing = uniqueVins.filter(v => !found.has(v.toUpperCase()));
    throw new JobAddItemConflict(
      { error: `ไม่พบข้อมูลรถในระบบ: ${missing.join(', ') || uniqueVins.join(', ')}` },
      400
    );
  }

  const busy = await getActiveJobsByVin(uniqueVins, tx);
  if (busy.size > 0) throw new JobAddItemConflict(await buildBusyConflictBody(busy, tx));
}

/**
 * POST /api/jobs/[id]/items
 * เพิ่มรถเข้าใบงานเดิม (ได้เฉพาะก่อนที่ Supplier จะกดยืนยันตัวรถคันแรก — แนวทางที่ 1)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, ['MASTER', 'ADMIN', 'BRANCH']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const rawItems: Array<{
      vin: string;
      washType?: string;
      unitPrice?: number;
      remarks?: string;
      actualWashDate?: string;
      model?: string;
      color?: string;
      licensePlate?: string;
    }> = Array.isArray(body.items) ? body.items : [];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาเลือกรถที่ต้องการเพิ่มอย่างน้อย 1 คัน' },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        carWashItems: true,
        originBranch: { select: { code: true, name: true, address: true, latitude: true, longitude: true } },
        destBranch: { select: { code: true, name: true, address: true, latitude: true, longitude: true } },
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
            vatType: true,
            vatRate: true,
            showroomLabel: true,
            rateItems: { where: { isActive: true } },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'ไม่พบใบงานนี้' }, { status: 404 });
    }

    if (job.jobType !== 'CAR_WASH' && job.jobType !== 'VEHICLE_SLIDE') {
      return NextResponse.json(
        { error: 'รองรับการเพิ่มรถเฉพาะงานล้างรถและงานรถสไลด์เท่านั้น' },
        { status: 400 }
      );
    }

    // ─── Role & Tenant Isolation ───
    if (user.role === 'ADMIN' && user.companyId && job.companyId !== user.companyId) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขใบงานของบริษัทอื่น' }, { status: 403 });
    }
    if (user.role === 'BRANCH' && user.branchId) {
      const isRelatedBranch =
        job.requestedById === user.id ||
        job.branchId === user.branchId ||
        job.originBranchId === user.branchId ||
        job.destBranchId === user.branchId;
      if (!isRelatedBranch) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขใบงานของสาขาอื่น' }, { status: 403 });
      }
    }

    // ─── แนวทางที่ 1 Guard: ต้องอยู่ในสถานะกำลังดำเนินงาน และ Supplier ยังไม่กดยืนยันรถแม้แต่คันเดียว ───
    if (!['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(job.status)) {
      return NextResponse.json(
        { error: 'ไม่สามารถเพิ่มรถได้ เนื่องจากใบงานไม่ได้อยู่ในสถานะกำลังดำเนินการ' },
        { status: 400 }
      );
    }

    const hasSupplierStarted = Boolean(
      job.verifiedAt ||
      job.carWashItems.some(i => i.verifiedAt || i.status === 'COMPLETED' || i.status === 'APPROVED')
    );
    if (hasSupplierStarted) {
      return NextResponse.json(
        { error: 'ไม่สามารถเพิ่มรถเข้าใบงานนี้ได้ เนื่องจาก Supplier ได้ถ่ายรูปยืนยันตัวรถและเริ่มงานแล้ว กรุณาสร้างใบงานใหม่' },
        { status: 400 }
      );
    }

    const requestedVins = rawItems.map(it => String(it.vin || '').trim()).filter(Boolean);
    if (requestedVins.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุเลขตัวถัง (VIN) ให้ครบถ้วน' }, { status: 400 });
    }

    const dupVins = requestedVins.filter((v, i) => requestedVins.indexOf(v) !== i);
    if (dupVins.length > 0) {
      return NextResponse.json(
        { error: `เลือกรถซ้ำกัน: ${[...new Set(dupVins)].join(', ')}` },
        { status: 400 }
      );
    }

    // ตรวจว่ารถอยู่ในใบงานนี้แล้วหรือไม่ (เฉพาะรายการที่ยังไม่ถูกยกเลิก)
    const activeVinsInJob = new Set(
      job.carWashItems
        .filter(i => i.status !== 'CANCELLED')
        .map(i => i.vin.toUpperCase())
    );
    const alreadyInThisJob = requestedVins.filter(v => activeVinsInJob.has(v.toUpperCase()));
    if (alreadyInThisJob.length > 0) {
      return NextResponse.json(
        { error: `รถต่อไปนี้อยู่ในใบงานนี้แล้ว: ${alreadyInThisJob.join(', ')}` },
        { status: 400 }
      );
    }

    // ตรวจว่ารถติดงานค้างในใบงานอื่นหรือไม่
    const busy = await getActiveJobsByVin(requestedVins);
    if (busy.size > 0) {
      return NextResponse.json(await buildBusyConflictBody(busy, prisma), { status: 409 });
    }

    const allowsOutOfStock = job.jobType === 'CAR_WASH' && Boolean(job.transferReason?.includes('Service'));
    if (!allowsOutOfStock) {
      const outOfStock = await prisma.vehicle.findMany({
        where: { vin: { in: requestedVins }, status: 'OUT_OF_STOCK' },
        select: { vin: true, licensePlate: true },
      });
      if (outOfStock.length > 0) {
        return NextResponse.json(buildOutOfStockBody(outOfStock), { status: 409 });
      }
    }

    // เรทราคาตามสัญญาของ Supplier เจ้านั้นๆ (ล็อกไม่ให้แก้ไขตามเรทของแต่ละเจ้า)
    const washConfig = getSupplierWashConfig(job.supplier?.code, job.supplier?.name, job.supplier as any);
    const existingActiveItems = job.carWashItems.filter(i => i.status !== 'CANCELLED');
    const existingPositiveUnitPrice =
      existingActiveItems.find(i => i.unitPrice > 0)?.unitPrice ??
      job.carWashItems.find(i => i.unitPrice > 0)?.unitPrice;

    const originCoords =
      (job.customOriginLat != null && job.customOriginLng != null)
        ? { lat: job.customOriginLat, lng: job.customOriginLng }
        : (job.originBranch?.latitude != null && job.originBranch?.longitude != null)
          ? { lat: job.originBranch.latitude, lng: job.originBranch.longitude }
          : getBranchDefaultCoords(job.originBranch?.code || job.originBranch?.name);

    const destCoords =
      (job.customDestLat != null && job.customDestLng != null)
        ? { lat: job.customDestLat, lng: job.customDestLng }
        : (job.destBranch?.latitude != null && job.destBranch?.longitude != null)
          ? { lat: job.destBranch.latitude, lng: job.destBranch.longitude }
          : getBranchDefaultCoords(job.destBranch?.code || job.destBranch?.name);

    const estimatedDistanceKm =
      originCoords && destCoords
        ? Math.round(haversineDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng) * 1.25 * 10) / 10
        : 32;

    const slideRateCalc = job.jobType === 'VEHICLE_SLIDE'
      ? calculateSlideJobCost({
          supplierCodeOrId: job.supplier?.code || job.supplierId,
          supplierName: job.supplier?.name,
          distanceKm: estimatedDistanceKm,
          originMode: job.customOriginAddress ? 'custom' : 'branch',
          destMode: (job.customDestAddress || !job.destBranchId) ? 'custom' : 'branch',
          originBranchCode: job.originBranch?.code,
          originBranchName: job.originBranch?.name,
          destBranchCode: job.destBranch?.code,
          destBranchName: job.destBranch?.name,
          carCount: 1,
        })
      : null;

    const defaultSlideUnitPrice =
      existingPositiveUnitPrice ||
      slideRateCalc?.costPerCar ||
      1500;

    const updatedJob = await prisma.$transaction(async (tx) => {
      // สร้าง Vehicle อัตโนมัติกรณีเป็นรถลูกค้า Service ที่ยังไม่มีในตาราง Vehicle
      if (job.jobType === 'CAR_WASH') {
        const existingRows = await tx.vehicle.findMany({
          where: { vin: { in: requestedVins } },
          select: { vin: true },
        });
        const known = new Set(existingRows.map(r => r.vin.toUpperCase()));
        const toCreate = rawItems.filter(it => it.vin && !known.has(it.vin.toUpperCase()));
        if (toCreate.length > 0) {
          await tx.vehicle.createMany({
            data: toCreate.map(it => ({
              vin: it.vin.trim(),
              model: it.model || 'รถลูกค้า Service',
              color: it.color || '-',
              licensePlate: it.licensePlate || null,
              companyId: job.companyId,
              currentBranchId: job.branchId,
              vehicleType: 'CUSTOMER_SERVICE',
              status: 'IN_WASH',
            })),
          });
        }
      }

      // จองรถ (เปลี่ยนสถานะเป็น IN_WASH หรือ IN_TRANSIT + ตรวจซ้ำใน transaction)
      await reserveVehiclesInTx(
        tx,
        requestedVins,
        job.jobType === 'CAR_WASH' ? 'IN_WASH' : 'IN_TRANSIT',
        allowsOutOfStock
      );

      // เพิ่มหรือเปิดใช้งานใหม่ (กรณีคันเดิมในใบงานนี้เคยถูกยกเลิกไปแล้ว)
      for (const it of rawItems) {
        const cleanVin = it.vin.trim();
        const existingCancelled = job.carWashItems.find(
          c => c.vin.toUpperCase() === cleanVin.toUpperCase() && c.status === 'CANCELLED'
        );

        const resolvedWashType =
          job.jobType === 'VEHICLE_SLIDE'
            ? 'VEHICLE_SLIDE'
            : (it.washType || existingActiveItems[0]?.washType || washConfig.services[0]?.serviceCode || 'WASH_NORMAL');

        const matchedRate = washConfig.services.find(s => s.serviceCode === resolvedWashType);
        const resolvedPrice =
          job.jobType === 'VEHICLE_SLIDE'
            ? defaultSlideUnitPrice
            : (matchedRate?.price ?? existingPositiveUnitPrice ?? washConfig.services[0]?.price ?? 150);

        const resolvedDate = it.actualWashDate
          ? new Date(it.actualWashDate)
          : (job.pickupDateTime || existingActiveItems[0]?.actualWashDate || new Date());

        if (existingCancelled) {
          await tx.carWashItem.update({
            where: { id: existingCancelled.id },
            data: {
              status: 'PENDING',
              washType: resolvedWashType,
              unitPrice: resolvedPrice,
              actualWashDate: resolvedDate,
              remarks: it.remarks ?? null,
              verifiedAt: null,
              verifiedBy: null,
              verifyMethod: null,
            },
          });
        } else {
          await tx.carWashItem.create({
            data: {
              jobId: job.id,
              vin: cleanVin,
              washType: resolvedWashType,
              unitPrice: resolvedPrice,
              actualWashDate: resolvedDate,
              remarks: it.remarks ?? null,
              status: 'PENDING',
            },
          });
        }
      }

      // คำนวณยอดรวมใหม่ของใบงาน
      const allItemsAfter = await tx.carWashItem.findMany({ where: { jobId: job.id } });
      const activeAfter = allItemsAfter.filter(i => i.status !== 'CANCELLED');
      const newTotalCost = activeAfter.reduce((sum, i) => sum + (i.unitPrice || 0), 0);

      const updated = await tx.job.update({
        where: { id: job.id },
        data: {
          estimatedCost: newTotalCost,
          actualCost: newTotalCost,
          ...(job.jobType === 'VEHICLE_SLIDE' && !job.vin && activeAfter[0]?.vin
            ? { vin: activeAfter[0].vin }
            : {}),
          updatedAt: new Date(),
        },
        include: buildJobInclude(false),
      });

      const actorName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
      await tx.jobActivity.create({
        data: {
          jobId: job.id,
          action: 'ITEM_ADDED',
          actor: actorName,
          actorRole: user.role,
          vin: requestedVins[0],
          description: `เพิ่มรถเข้าใบงาน ${requestedVins.length} คัน (${requestedVins.join(', ')}) — รวมเป็น ${activeAfter.length} คัน (ยอดสุทธิ ฿${newTotalCost.toLocaleString()})`,
          metadata: JSON.stringify({
            addedVins: requestedVins,
            activeCount: activeAfter.length,
            newTotalCost,
          }),
        },
      });

      return updated;
    }, { timeout: ADD_ITEMS_TX_TIMEOUT_MS });

    // บันทึก Movement Log สำหรับรถสไลด์
    if (job.jobType === 'VEHICLE_SLIDE') {
      const { originName, destName } = getSlideRouteLabels({
        originBranch: job.originBranch,
        destBranch: job.destBranch,
        customOriginAddress: job.customOriginAddress,
        customDestAddress: job.customDestAddress,
      });

      recordVehicleSlideLog({
        jobId: job.id,
        jobNumber: job.jobNumber,
        vins: requestedVins,
        action: 'CREATED',
        originBranchId: job.originBranchId,
        originName,
        originAddress: job.customOriginAddress || job.originBranch?.address,
        originLat: job.customOriginLat ?? job.originBranch?.latitude,
        originLng: job.customOriginLng ?? job.originBranch?.longitude,
        destBranchId: job.destBranchId,
        destName,
        destAddress: job.customDestAddress || job.destBranch?.address,
        destLat: job.customDestLat ?? job.destBranch?.latitude,
        destLng: job.customDestLng ?? job.destBranch?.longitude,
        distance: null,
        supplierId: job.supplierId,
        supplierName: job.supplier?.name,
        actorId: user.id,
        actorName: user.displayName || user.username,
        actorRole: user.role,
        remarks: `เพิ่มรถเข้าใบงาน ${job.jobNumber}`,
      });
    }

    logAuditFromUser(user, {
      action: 'UPDATE_JOB',
      entityType: 'Job',
      entityId: job.id,
      description: `เพิ่มรถเข้าใบงาน ${job.jobNumber} จำนวน ${requestedVins.length} คัน (${requestedVins.join(', ')})`,
      metadata: { jobId: job.id, jobNumber: job.jobNumber, addedVins: requestedVins },
      request,
    });

    return NextResponse.json({
      success: true,
      job: serializeJob(updatedJob),
      addedCount: requestedVins.length,
    });
  } catch (error) {
    if (error instanceof JobAddItemConflict) {
      return NextResponse.json(error.body, { status: error.status });
    }
    console.error('POST /api/jobs/[id]/items error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถเพิ่มรถเข้าใบงานได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}

