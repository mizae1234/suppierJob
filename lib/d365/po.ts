import { prisma } from '@/lib/prisma';
import type { SupplierVendorCode } from '@prisma/client';
import { getD365Config, getD365Token, D365Error } from './client';

/** รหัสสินค้า/บริการใน D365 (Lines[].ItemNumber) แยกตามประเภทงาน (v1.1) */
export const D365_SERVICE_ITEMS = {
  CAR_WASH: 'GI-0900832', // ค่าบริการล้างรถ
  VEHICLE_SLIDE: 'GI-0900833', // ค่าบริการรถสไลด์
  WINDOW_FILM: 'GI-0900834', // ค่าบริการติดฟิล์ม (ยังไม่มีประเภทงานนี้ในระบบ — เตรียมไว้สำหรับอนาคต)
} as const;

export function getD365ServiceItem(jobType: string): string | null {
  return D365_SERVICE_ITEMS[jobType as keyof typeof D365_SERVICE_ITEMS] ?? null;
}

export interface D365PurchaseOrderLine {
  DiscountAmount?: number;
  DiscountPercent?: number;
  ExteriorColor?: string;
  InteriorColor?: string;
  ItemNumber: string;
  Model?: string;
  MotorNo?: string;
  Price: number;
  Quantity: number;
  SerialNo?: string;
  Series?: string;
  SiteId?: string;
  Unit?: string;
  WarehouseId?: string;
}

export interface D365PurchaseOrderPayload {
  Bank?: string;
  Company: string;
  System?: string;
  DealerId?: string;
  DeliveryDate: string;
  DueDate: string;
  FloorPlanId?: string;
  PaymentType?: string;
  PoDMS?: string;
  PoGiCore: string;
  SiteId: string;
  ValueDate: string;
  VendorAccount: string;
  WarehouseId?: string;
  Admin?: string;
  Buyer?: string;
  Inspector?: string;
  Approval?: string;
  InclTax?: string;
  Lines: D365PurchaseOrderLine[];
}

export interface D365PurchaseOrderResponse {
  $id?: string;
  Status: 'Success' | 'Failed' | string;
  PurchId?: string;
  Message?: string;
}

/**
 * ฟังก์ชันสร้างและส่ง Purchase Order (PO) ไปยัง D365 F&O
 * เมื่อสร้างเสร็จจะบันทึกเลข PO (PurchId) และสถานะลงในตาราง Job
 */
export async function sendJobToD365PurchaseOrder(jobId: string): Promise<{
  success: boolean;
  purchId?: string;
  message: string;
}> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      supplier: true,
      branch: true,
      company: true,
      vehicle: true,
      carWashItems: true,
    },
  });

  if (!job) {
    return { success: false, message: 'ไม่พบข้อมูลใบสั่งงาน' };
  }

  // ตรวจสอบรหัสคู่ค้าใน D365 ของสาขานี้ (แต่ละบริษัท/สาขามีรหัส Vendor ไม่เหมือนกัน — ไม่มีการใช้รหัสสาขาอื่นแทน)
  const branchVendor = job.supplierId
    ? await prisma.supplierVendorCode.findUnique({
        where: { supplierId_branchId: { supplierId: job.supplierId, branchId: job.branchId } },
      })
    : null;
  const vendorAccount = branchVendor?.vendorCode?.trim();
  if (!vendorAccount) {
    const errorMsg = `Supplier "${job.supplier?.name || '-'}" ยังไม่มีรหัส Vendor D365 ของสาขา ${job.branch?.code || '-'}`;
    await prisma.job.update({
      where: { id: jobId },
      data: {
        d365PoStatus: 'FAILED',
        d365PoMessage: errorMsg,
        d365PoSentAt: new Date(),
      },
    });
    return { success: false, message: errorMsg };
  }

  // คำนวณวันที่
  const deliveryDateObj = job.completedAt || job.deliveryDateTime || job.createdAt || new Date();
  const deliveryDateStr = deliveryDateObj.toISOString().split('T')[0] + 'T00:00:00Z';
  
  // Due date = 30 วันถัดไป
  const dueDateObj = new Date(deliveryDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueDateStr = dueDateObj.toISOString().split('T')[0] + 'T00:00:00Z';

  // หาเลข VIN ของรถ
  const vin = (job.vin || job.carWashItems?.[0]?.vin || '').trim();

  // กำหนดราคาค่าบริการ
  const price = job.actualCost ?? job.estimatedCost ?? 0;

  // เลือกรหัสสินค้าบริการ (Service Item) ตามประเภทงาน
  const serviceItemNumber = getD365ServiceItem(job.jobType);
  if (!serviceItemNumber) {
    const errorMsg = `ไม่พบรหัสสินค้า D365 สำหรับประเภทงาน "${job.jobType}"`;
    await prisma.job.update({
      where: { id: jobId },
      data: { d365PoStatus: 'FAILED', d365PoMessage: errorMsg, d365PoSentAt: new Date() },
    });
    return { success: false, message: errorMsg };
  }

  // เปิด PO ตามสาขา: Company และ SiteId ใช้รหัสสาขาเดียวกัน (เช่น GI02 = มีนบุรี)
  // รหัสสาขาในระบบตรงกับรหัสบริษัท (Legal Entity) ใน D365
  const d365Company = job.branch?.code?.trim();
  if (!d365Company) {
    const errorMsg = 'ใบงานนี้ไม่มีรหัสสาขา ไม่สามารถระบุบริษัทใน D365 ได้';
    await prisma.job.update({
      where: { id: jobId },
      data: { d365PoStatus: 'FAILED', d365PoMessage: errorMsg, d365PoSentAt: new Date() },
    });
    return { success: false, message: errorMsg };
  }

  const payload: D365PurchaseOrderPayload = {
    Bank: '',
    Company: d365Company,
    System: 'SupplierJob',
    DealerId: '',
    DeliveryDate: deliveryDateStr,
    DueDate: dueDateStr,
    ValueDate: deliveryDateStr,
    FloorPlanId: '',
    PaymentType: 'Cash',
    PoDMS: vin,
    PoGiCore: job.jobNumber,
    SiteId: d365Company,
    VendorAccount: vendorAccount,
    WarehouseId: '',
    Admin: '',
    Buyer: '',
    Inspector: '',
    Approval: job.approvedBy || '',
    InclTax: '1',
    Lines: [
      {
        DiscountAmount: 0,
        DiscountPercent: 0,
        ExteriorColor: '',
        InteriorColor: '',
        ItemNumber: serviceItemNumber,
        Model: '',
        MotorNo: '',
        Price: price,
        Quantity: 1,
        SerialNo: '',
        Series: '',
        SiteId: '',
        Unit: 'Unit',
        WarehouseId: '',
      },
    ],
  };

  try {
    const cfg = getD365Config();
    const token = await getD365Token();
    const url = `${cfg.baseUrl}/api/services/MIS_PurchImportSvcGroup/MIS_PurchImportSvc/createPurchaseOrder`;

    console.log(`[D365 PO] กำลังส่งใบงาน ${job.jobNumber} ไป D365...`, { url, company: d365Company, jobType: job.jobType, itemNumber: serviceItemNumber, vendorAccount, price });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json: D365PurchaseOrderResponse = await res.json().catch(() => ({
      Status: 'Failed',
      Message: `HTTP ${res.status}: ไม่สามารถอ่าน JSON ตอบกลับได้`,
    }));

    if (res.ok && json.Status === 'Success' && json.PurchId) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          d365PoNumber: json.PurchId,
          d365PoStatus: 'SUCCESS',
          d365PoMessage: json.Message || 'สร้าง PO ใน D365 สำเร็จ',
          d365PoSentAt: new Date(),
        },
      });
      console.log(`[D365 PO] สำเร็จ! ใบงาน ${job.jobNumber} ได้รับ PO: ${json.PurchId}`);
      return { success: true, purchId: json.PurchId, message: json.Message || 'สร้าง PO สำเร็จ' };
    } else {
      const errMsg = json.Message || `HTTP ${res.status}: สร้าง PO ใน D365 ไม่สำเร็จ`;
      await prisma.job.update({
        where: { id: jobId },
        data: {
          d365PoStatus: 'FAILED',
          d365PoMessage: errMsg,
          d365PoSentAt: new Date(),
        },
      });
      console.error(`[D365 PO] ล้มเหลว! ใบงาน ${job.jobNumber}: ${errMsg}`);
      return { success: false, message: errMsg };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[D365 PO] เกิดข้อผิดพลาดในการเชื่อมต่อ: ${errMsg}`);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        d365PoStatus: 'FAILED',
        d365PoMessage: errMsg,
        d365PoSentAt: new Date(),
      },
    });
    return { success: false, message: errMsg };
  }
}
