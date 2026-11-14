import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser, AuditAction } from '@/lib/audit-log';
import { recordVehicleSlideLog, getSlideRouteLabels } from '@/lib/vehicle-slide-log';
import { sendJobToD365PurchaseOrder } from '@/lib/d365/po';
import { sendJobToD365TransferJournal, getD365WarehouseForBranch } from '@/lib/d365/transfer';
import {
  isFailedAttemptJob,
  SLIDE_COMPLETION_DELIVERED,
  SLIDE_FAILED_ATTEMPT_FEE,
} from '@/lib/slide-failed-attempt';

// PATCH: อัปเดตสถานะงาน พร้อมตรวจสอบสิทธิ์ตามบทบาท (State Transition Guard)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const { id } = await params;
    const { status, rejectReason, approvedBy } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'กรุณาระบุสถานะใหม่' }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        carWashItems: true,
        originBranch: { select: { code: true, name: true, address: true } },
        destBranch: { select: { code: true, name: true, address: true } },
        supplier: { select: { name: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'ไม่พบงานนี้' }, { status: 404 });
    }

    // เที่ยวเปล่า (สไลด์ไม่สำเร็จ) ที่ Vendor ส่งแล้ว — รถไม่ถูกย้าย, ไม่ทำ Transfer Journal, PO ยอดตายตัว
    const isFailedAttempt = isFailedAttemptJob(job);

    // ─── Authorization Check ─────────────────────────
    if (user.role === 'SUPPLIER') {
      if (job.supplierId !== user.supplierId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขงานของ Supplier อื่น' }, { status: 403 });
      }
      // Supplier can transition to IN_PROGRESS, WAITING_APPROVAL, or CANCELLED (ปฏิเสธงาน)
      const allowedTransitions = ['IN_PROGRESS', 'WAITING_APPROVAL', 'CANCELLED'];
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: 'Supplier ไม่มีสิทธิ์อนุมัติ หรือแก้ไขสถานะนี้' },
          { status: 403 }
        );
      }
      // ต้องยืนยันตัวรถ (VIN/ทะเบียน + รูป) ก่อนส่งงาน
      if (status === 'WAITING_APPROVAL') {
        const notVerified = job.jobType === 'VEHICLE_SLIDE'
          ? !job.verifiedAt
          : job.carWashItems.some(c => ['PENDING', 'REJECTED'].includes(c.status) && !c.verifiedAt);
        if (notVerified) {
          return NextResponse.json(
            { error: 'กรุณายืนยันตัวรถ (VIN/ทะเบียน) ก่อนส่งงาน' },
            { status: 400 }
          );
        }
      }
    } else if (user.role === 'BRANCH') {
      // Branch user (ทั้งสาขาผู้สั่ง, สาขาต้นทาง, และสาขาปลายทาง) สามารถจัดการ/ยกเลิกใบงานที่เกี่ยวข้องกับสาขาตัวเองได้
      const isRelatedBranch = 
        job.requestedById === user.id ||
        job.branchId === user.branchId || 
        job.originBranchId === user.branchId || 
        job.destBranchId === user.branchId;

      if (user.branchId && !isRelatedBranch) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์จัดการงานของสาขาอื่น' }, { status: 403 });
      }
    } else if (user.role === 'ADMIN') {
      if (user.companyId && job.companyId !== user.companyId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขงานของบริษัทอื่น' }, { status: 403 });
      }
    }

    // ─── Status Transition & Concurrency Guard ────────
    if (status === 'APPROVED') {
      if (job.status === 'APPROVED') {
        return NextResponse.json(
          { error: `งานนี้ได้รับการอนุมัติเรียบร้อยแล้ว${job.approvedBy ? ` โดย ${job.approvedBy}` : ''}` },
          { status: 400 }
        );
      }
      if (job.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'งานนี้ถูกยกเลิกแล้ว ไม่สามารถอนุมัติได้' },
          { status: 400 }
        );
      }
    }

    if (status === 'CANCELLED') {
      if (job.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'งานนี้ถูกยกเลิกไปแล้ว' },
          { status: 400 }
        );
      }
      if (['APPROVED', 'INVOICED'].includes(job.status)) {
        return NextResponse.json(
          { error: 'งานนี้ผ่านการตรวจรับแล้ว ไม่สามารถยกเลิกได้' },
          { status: 400 }
        );
      }
      const hasVerified = Boolean(job.verifiedAt || job.carWashItems?.some((i: any) => i.verifiedAt));
      if (hasVerified && user.role !== 'MASTER') {
        return NextResponse.json(
          { error: 'ไม่สามารถยกเลิกใบงานได้ เนื่องจาก Supplier ได้ถ่ายรูปยืนยันตัวรถแล้ว' },
          { status: 400 }
        );
      }
      // Vendor มาหน้างานและส่งเป็นเที่ยวเปล่าแล้ว → ต้องอนุมัติค่าเที่ยวเปล่า ไม่ใช่ยกเลิก
      if (isFailedAttempt && user.role !== 'MASTER') {
        return NextResponse.json(
          { error: 'ไม่สามารถยกเลิกใบงานได้ เนื่องจาก Supplier ส่งงานเที่ยวเปล่า (สไลด์ไม่สำเร็จ) แล้ว กรุณาอนุมัติหรือขอแก้ไข' },
          { status: 400 }
        );
      }
    }

    // เก็บคลังต้นทางของรถแต่ละคันก่อนอัปเดตสถานะ เพื่อส่งให้ D365 Transfer Journal
    const preTransferWarehouses: Record<string, string | null | undefined> = {};

    // ─── Atomic Update with Transaction ──────────────
    const updatedJob = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'WAITING_APPROVAL') {
        updateData.completedAt = new Date();
        if (job.jobType === 'VEHICLE_SLIDE') {
          // ส่งงานสไลด์แบบปกติ (ส่งรถสำเร็จ) → ล้างข้อมูลเที่ยวเปล่าจากรอบก่อน (ถ้ามี) กันยอดค้าง
          updateData.completionType = SLIDE_COMPLETION_DELIVERED;
          updateData.failReasonCode = null;
          updateData.failNote = null;
          if (isFailedAttempt) updateData.actualCost = null;
        }
        if (job.jobType === 'CAR_WASH' && job.carWashItems && job.carWashItems.length > 0) {
          const completedItems = job.carWashItems.filter(c => c.status === 'COMPLETED' || c.status === 'APPROVED');
          const validItems = completedItems.length > 0 
            ? completedItems 
            : job.carWashItems.filter(c => c.status !== 'CANCELLED');
          updateData.actualCost = validItems.reduce((sum, c) => sum + (c.unitPrice || 0), 0);
        } else if (job.jobType === 'VEHICLE_SLIDE' && job.carWashItems && job.carWashItems.length > 0) {
          await tx.carWashItem.updateMany({
            where: { jobId: job.id, status: 'PENDING' },
            data: { status: 'COMPLETED' },
          });
        }
      } else if (status === 'APPROVED') {
        const userBranchLabel = user.branchName || user.branchCode || (user.role === 'ADMIN' ? 'ส่วนกลาง' : '');
        const userName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
        const defaultApprovedBy = userBranchLabel ? `${userBranchLabel} (${userName})` : userName;

        updateData.approvedAt = new Date();
        updateData.approvedBy = approvedBy || defaultApprovedBy;
        if (isFailedAttempt) {
          // เที่ยวเปล่า: ยอดตายตัวต่อใบงาน
          updateData.actualCost = SLIDE_FAILED_ATTEMPT_FEE;
        } else if (job.jobType === 'CAR_WASH' && job.carWashItems && job.carWashItems.length > 0) {
          const completedItems = job.carWashItems.filter(c => c.status === 'COMPLETED' || c.status === 'APPROVED');
          const validItems = completedItems.length > 0 
            ? completedItems 
            : job.carWashItems.filter(c => c.status !== 'CANCELLED');
          updateData.actualCost = validItems.reduce((sum, c) => sum + (c.unitPrice || 0), 0);
        } else if (!job.actualCost) {
          updateData.actualCost = job.estimatedCost;
        }

        // Reset vehicle status atomically
        if (job.jobType === 'VEHICLE_SLIDE' && isFailedAttempt) {
          // เที่ยวเปล่า: รถยังอยู่ที่เดิม → ปลดล็อกสถานะอย่างเดียว ไม่เปลี่ยนสาขา/คลัง
          const slideVins = job.carWashItems && job.carWashItems.length > 0
            ? job.carWashItems.filter(c => c.status !== 'CANCELLED').map(c => c.vin)
            : (job.vin ? [job.vin] : []);
          if (slideVins.length > 0) {
            await tx.vehicle.updateMany({
              where: { vin: { in: slideVins } },
              data: { status: 'AVAILABLE' },
            });
          }
          if (job.carWashItems && job.carWashItems.length > 0) {
            await tx.carWashItem.updateMany({
              where: { jobId: job.id, status: { not: 'CANCELLED' } },
              data: { status: 'APPROVED' },
            });
          }
        } else if (job.jobType === 'VEHICLE_SLIDE') {
          const slideVins = job.carWashItems && job.carWashItems.length > 0
            ? job.carWashItems.filter(c => c.status !== 'CANCELLED').map(c => c.vin)
            : (job.vin ? [job.vin] : []);

          if (slideVins.length > 0) {
            const existingVehicles = await tx.vehicle.findMany({
              where: { vin: { in: slideVins } },
              select: { vin: true, d365WarehouseId: true },
            });
            for (const ev of existingVehicles) {
              preTransferWarehouses[ev.vin] = ev.d365WarehouseId;
            }

            const destWarehouse = getD365WarehouseForBranch(job.destBranch?.code);
            // อัปเดตเฉพาะที่จอดปัจจุบัน (currentBranchId + d365WarehouseId) โดยไม่แตะ d365SiteId (สาขาเจ้าของรถ Original)
            await tx.vehicle.updateMany({
              where: { vin: { in: slideVins } },
              data: {
                status: 'AVAILABLE',
                ...(job.destBranchId ? { currentBranchId: job.destBranchId } : {}),
                ...(destWarehouse ? { d365WarehouseId: destWarehouse } : {}),
              },
            });
          }
          if (job.carWashItems && job.carWashItems.length > 0) {
            await tx.carWashItem.updateMany({
              where: { jobId: job.id, status: { not: 'CANCELLED' } },
              data: { status: 'APPROVED' },
            });
          }
        } else if (job.jobType === 'CAR_WASH' && job.carWashItems.length > 0) {
          // อนุมัติทั้งใบ = อนุมัติทุกคันที่ Supplier ส่งงานแล้ว
          await tx.carWashItem.updateMany({
            where: { jobId: job.id, status: 'COMPLETED' },
            data: { status: 'APPROVED' },
          });
          const vins = job.carWashItems.map(c => c.vin);
          await tx.vehicle.updateMany({
            where: { vin: { in: vins } },
            data: { status: 'AVAILABLE' },
          });
        }
      } else if (status === 'REJECTED') {
        updateData.rejectReason = rejectReason || 'ขอให้แก้ไขรายละเอียดงาน';
        if (isFailedAttempt) {
          // ตีกลับงานเที่ยวเปล่า → ล้างสถานะเที่ยวเปล่า ให้ Vendor เลือกส่งใหม่ได้ (สไลด์จริง หรือแจ้งเที่ยวเปล่าอีกครั้ง)
          updateData.completionType = null;
          updateData.failReasonCode = null;
          updateData.failNote = null;
          updateData.actualCost = null;
          if (job.carWashItems && job.carWashItems.length > 0) {
            await tx.carWashItem.updateMany({
              where: { jobId: job.id, status: { not: 'CANCELLED' } },
              data: { status: 'REJECTED', remarks: `ตีกลับงานเที่ยวเปล่า: ${updateData.rejectReason}` },
            });
          }
        }
      } else if (status === 'CANCELLED') {
        updateData.rejectReason = rejectReason || (user.role === 'SUPPLIER' ? 'Supplier ปฏิเสธงาน' : 'ยกเลิกคำสั่งงาน');
        updateData.actualCost = 0;

        // Reset vehicle status back to AVAILABLE and update all items to CANCELLED
        const allVins = job.carWashItems && job.carWashItems.length > 0
          ? job.carWashItems.map(c => c.vin)
          : (job.vin ? [job.vin] : []);

        if (allVins.length > 0) {
          await tx.vehicle.updateMany({
            where: { vin: { in: allVins } },
            data: { status: 'AVAILABLE' },
          });
        }
        if (job.carWashItems && job.carWashItems.length > 0) {
          await tx.carWashItem.updateMany({
            where: { jobId: job.id },
            data: { 
              status: 'CANCELLED',
              remarks: rejectReason ? `ยกเลิก: ${rejectReason}` : 'ยกเลิกคำสั่งงาน'
            },
          });
        }
      }

      return tx.job.update({
        where: { id },
        data: updateData,
      });
    });

    // Audit Log: Job Status Change
    const actionMap: Record<string, AuditAction> = {
      APPROVED: 'APPROVE_JOB',
      REJECTED: 'REJECT_JOB',
      CANCELLED: 'CANCEL_JOB',
      WAITING_APPROVAL: 'SUBMIT_JOB',
      IN_PROGRESS: 'UPDATE_JOB',
    };
    const descMap: Record<string, string> = {
      APPROVED: isFailedAttempt
        ? `อนุมัติค่าเที่ยวเปล่า (สไลด์ไม่สำเร็จ) ใบงาน ${job.jobNumber} — ${SLIDE_FAILED_ATTEMPT_FEE} บาท`
        : `อนุมัติใบงาน ${job.jobNumber}`,
      REJECTED: `ตีกลับใบงาน ${job.jobNumber}${rejectReason ? ` — ${rejectReason}` : ''}`,
      CANCELLED: `ยกเลิกใบงาน ${job.jobNumber}${rejectReason ? ` — ${rejectReason}` : ''}`,
      WAITING_APPROVAL: `ส่งงานใบงาน ${job.jobNumber} รอตรวจรับ`,
      IN_PROGRESS: `เปลี่ยนสถานะใบงาน ${job.jobNumber} เป็น ${status}`,
    };
    logAuditFromUser(user, {
      action: actionMap[status] || 'UPDATE_JOB',
      entityType: 'Job',
      entityId: id,
      description: descMap[status] || `เปลี่ยนสถานะงาน ${job.jobNumber} เป็น ${status}`,
      metadata: {
        jobNumber: job.jobNumber,
        fromStatus: job.status,
        toStatus: status,
        rejectReason,
        ...(isFailedAttempt ? { completionType: job.completionType } : {}),
      },
      request,
    });

    // Record VehicleSlideLog if VEHICLE_SLIDE
    if (job.jobType === 'VEHICLE_SLIDE') {
      const vins = job.carWashItems && job.carWashItems.length > 0
        ? job.carWashItems.map(c => c.vin)
        : (job.vin ? [job.vin] : []);

      let slideAction: 'IN_TRANSIT' | 'DELIVERED' | 'APPROVED' | 'CANCELLED' | 'FAILED_ATTEMPT_APPROVED' | null = null;
      if (status === 'IN_PROGRESS') slideAction = 'IN_TRANSIT';
      else if (status === 'WAITING_APPROVAL') slideAction = 'DELIVERED';
      else if (status === 'APPROVED') slideAction = isFailedAttempt ? 'FAILED_ATTEMPT_APPROVED' : 'APPROVED';
      else if (status === 'CANCELLED') slideAction = 'CANCELLED';

      if (slideAction && vins.length > 0) {
        const { originName, destName } = getSlideRouteLabels(job);
        recordVehicleSlideLog({
          jobId: job.id,
          jobNumber: job.jobNumber,
          vins,
          action: slideAction,
          originBranchId: job.originBranchId,
          originName,
          originAddress: job.customOriginAddress || job.originBranch?.address,
          originLat: job.customOriginLat,
          originLng: job.customOriginLng,
          destBranchId: job.destBranchId,
          destName,
          destAddress: job.customDestAddress || job.destBranch?.address,
          destLat: job.customDestLat,
          destLng: job.customDestLng,
          distance: null,
          supplierId: job.supplierId,
          supplierName: job.supplier?.name,
          actorId: user.id,
          actorName: user.displayName || user.username,
          actorRole: user.role,
          remarks: rejectReason || descMap[status] || null,
        });
      }
    }

    // ─── Trigger D365 Purchase Order & Inventory Transfer Journal ───
    // รอให้สร้าง PO (และโอนย้ายคลังที่จอดสำหรับงานสไลด์รถ) ใน D365 เสร็จก่อนตอบกลับ
    // (หาก D365 ล่มหรือเกิดข้อผิดพลาด จะถูกจับใน try/catch โดยไม่ทำให้การอนุมัติใบงานล้มเหลว)
    let d365Po: { success: boolean; purchId?: string; message: string } | undefined;
    let d365Transfer: { success: boolean; transferredCount: number; message: string } | undefined;
    if (status === 'APPROVED') {
      const [poResult, transferResult] = await Promise.allSettled([
        sendJobToD365PurchaseOrder(id, {
          trigger: 'AUTO_APPROVE',
          actorId: user.id,
          actorName: user.displayName || user.username,
          actorRole: user.role,
        }),
        // เที่ยวเปล่า: รถไม่ได้ย้ายจริง → ไม่ทำ Transfer Journal (กันสต็อกใน D365 เพี้ยน)
        job.jobType === 'VEHICLE_SLIDE' && !isFailedAttempt
          ? sendJobToD365TransferJournal(id, {
              actorId: user.id,
              actorName: user.displayName || user.username,
              actorRole: user.role,
              preTransferWarehouses,
            })
          : Promise.resolve(undefined),
      ]);

      if (poResult.status === 'fulfilled') {
        d365Po = poResult.value;
        console.log(`[JobStatus] D365 PO result for ${job.jobNumber}:`, d365Po);
      } else {
        console.error('Trigger D365 PO creation error:', poResult.reason);
      }

      if (transferResult.status === 'fulfilled' && transferResult.value) {
        d365Transfer = transferResult.value;
        console.log(`[JobStatus] D365 Transfer result for ${job.jobNumber}:`, d365Transfer);
      } else if (transferResult.status === 'rejected') {
        console.error('Trigger D365 Transfer Journal error:', transferResult.reason);
      }
    }

    return NextResponse.json({ success: true, job: updatedJob, d365Po, d365Transfer });
  } catch (error) {
    console.error('PATCH /api/jobs/[id]/status error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถอัปเดตสถานะงานได้' },
      { status: 500 }
    );
  }
}
