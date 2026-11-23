import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { assertCanMutateJob } from '@/lib/job-access';
import { logAuditFromUser } from '@/lib/audit-log';
import { getActiveJobsByVin } from '@/lib/active-jobs';
import { AppError, toErrorResponse } from '@/lib/errors';
import {
  buildBusyConflictBody,
  buildOutOfStockBody,
  reserveVehiclesInTx,
} from '@/lib/services/vehicles/reserve';
import { haversineDistance } from '@/lib/job-utils';
import { getSupplierWashConfig } from '@/lib/car-wash-rates';
import { calculateSlideJobCost, getBranchDefaultCoords } from '@/lib/vehicle-slide-rates';
import { recordVehicleSlideLog, getSlideRouteLabels } from '@/lib/vehicle-slide-log';
import { buildJobInclude, serializeJob } from '@/lib/job-serializer';
import { addJobItemsSchema, parseBody } from '@/lib/validation';

const ADD_ITEMS_TX_TIMEOUT_MS = 20_000;

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
    const parsed = await parseBody(request, addJobItemsSchema);
    if (parsed.response) return parsed.response;
    const rawItems = parsed.data.items;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        carWashItems: true,
        pickupBranch: { select: { code: true, name: true, address: true, latitude: true, longitude: true, companyId: true } },
        destBranch: { select: { code: true, name: true, address: true, latitude: true, longitude: true, companyId: true } },
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
    const authError = assertCanMutateJob(user, job);
    if (authError) return authError;

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
    const washConfig = getSupplierWashConfig(job.supplier?.code, job.supplier?.name, job.supplier || undefined);
    const existingActiveItems = job.carWashItems.filter(i => i.status !== 'CANCELLED');
    const existingPositiveUnitPrice =
      existingActiveItems.find(i => i.unitPrice > 0)?.unitPrice ??
      job.carWashItems.find(i => i.unitPrice > 0)?.unitPrice;

    const originCoords =
      (job.customOriginLat != null && job.customOriginLng != null)
        ? { lat: job.customOriginLat, lng: job.customOriginLng }
        : (job.pickupBranch?.latitude != null && job.pickupBranch?.longitude != null)
          ? { lat: job.pickupBranch.latitude, lng: job.pickupBranch.longitude }
          : getBranchDefaultCoords(job.pickupBranch?.code || job.pickupBranch?.name);

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
          originBranchCode: job.pickupBranch?.code,
          originBranchName: job.pickupBranch?.name,
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
        pickupBranch: job.pickupBranch,
        destBranch: job.destBranch,
        customOriginAddress: job.customOriginAddress,
        customDestAddress: job.customDestAddress,
      });

      recordVehicleSlideLog({
        jobId: job.id,
        jobNumber: job.jobNumber,
        vins: requestedVins,
        action: 'CREATED',
        pickupBranchId: job.pickupBranchId,
        originName,
        originAddress: job.customOriginAddress || job.pickupBranch?.address,
        originLat: job.customOriginLat ?? job.pickupBranch?.latitude,
        originLng: job.customOriginLng ?? job.pickupBranch?.longitude,
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
    if (error instanceof AppError) {
      return toErrorResponse(error);
    }
    console.error('POST /api/jobs/[id]/items error:', error);
    return toErrorResponse(error, 'ไม่สามารถเพิ่มรถเข้าใบงานได้ กรุณาลองใหม่อีกครั้ง');
  }
}

