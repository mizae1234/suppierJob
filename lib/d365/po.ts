import { prisma } from '@/lib/prisma';
import { getD365Config, getD365Token, D365Error, fetchWithTimeout } from './client';

/** เวลารอ D365 ตอบการสร้าง PO (ทำเบื้องหลังหลังอนุมัติ จึงไม่บล็อกผู้ใช้ — เผื่อเวลาให้ D365 Sandbox cold-start + Confirm PO ได้สูงสุด 120 วินาที) */
const PO_REQUEST_TIMEOUT_MS = 120_000;
/** สถานะ PENDING ค้างนานเกินนี้ ถือว่าการส่งรอบนั้นหลุด (เช่น server restart) → ส่งใหม่ได้ */
const PO_PENDING_STALE_MS = 4 * 60_000;

/**
 * ค้นหา PO ใน D365 OData ที่อาจถูกสร้างไปแล้วแต่การเชื่อมต่อตัดก่อน (Timeout)
 * จับคู่ด้วย: บริษัท (dataAreaId) + รหัสคู่ค้า + เลขตัวถัง (VendorOrderReference) + วันที่ + รหัสสินค้าบริการ + ราคา
 * และตรวจสอบว่าเลข PO นั้นยังไม่เคยผูกกับใบงานอื่นในระบบของเรา
 */
async function findUnlinkedPoInD365(params: {
  company: string;
  vendorAccount: string;
  vin: string;
  accountingDatePrefix: string; // YYYY-MM-DD
  serviceItemNumber: string;
  price: number;
}): Promise<string | null> {
  const { company, vendorAccount, vin, accountingDatePrefix, serviceItemNumber, price } = params;
  if (!vin) return null;

  try {
    const cfg = getD365Config();
    const token = await getD365Token();
    const dataArea = company.toLowerCase().replace(/'/g, "''");
    const safeVendor = vendorAccount.replace(/'/g, "''");
    const safeVin = vin.replace(/'/g, "''");

    const filter = encodeURIComponent(
      `dataAreaId eq '${dataArea}' and OrderVendorAccountNumber eq '${safeVendor}' and VendorOrderReference eq '${safeVin}'`
    );
    const headersUrl = `${cfg.baseUrl}/data/PurchaseOrderHeadersV2?cross-company=true&$filter=${filter}&$top=5&$orderby=PurchaseOrderNumber%20desc&$select=PurchaseOrderNumber,AccountingDate`;
    const headersRes = await fetchWithTimeout(
      headersUrl,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      },
      20_000
    );
    if (!headersRes.ok) return null;

    const headersJson = (await headersRes.json().catch(() => ({}))) as {
      value?: Array<{ PurchaseOrderNumber?: string; AccountingDate?: string }>;
    };
    const candidates = (headersJson.value || []).filter(
      (h) =>
        h.PurchaseOrderNumber &&
        typeof h.AccountingDate === 'string' &&
        h.AccountingDate.startsWith(accountingDatePrefix)
    );

    for (const candidate of candidates) {
      const poNumber = candidate.PurchaseOrderNumber!;
      // ข้ามถ้าเลข PO นี้ผูกกับใบงานอื่นในระบบไปแล้ว
      const alreadyLinked = await prisma.job.findFirst({
        where: { d365PoNumber: poNumber },
        select: { id: true },
      });
      if (alreadyLinked) continue;

      // ตรวจสอบรายการสินค้าและราคาใน PurchaseOrderLinesV2 ให้ตรงกัน
      const safePo = poNumber.replace(/'/g, "''");
      const lineFilter = encodeURIComponent(
        `dataAreaId eq '${dataArea}' and PurchaseOrderNumber eq '${safePo}'`
      );
      const linesUrl = `${cfg.baseUrl}/data/PurchaseOrderLinesV2?cross-company=true&$filter=${lineFilter}&$select=ItemNumber,PurchasePrice,LineAmount`;
      const linesRes = await fetchWithTimeout(
        linesUrl,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        },
        20_000
      );
      if (!linesRes.ok) continue;

      const linesJson = (await linesRes.json().catch(() => ({}))) as {
        value?: Array<{ ItemNumber?: string; PurchasePrice?: number; LineAmount?: number }>;
      };
      const lines = linesJson.value || [];
      const matchingLine = lines.some(
        (l) =>
          l.ItemNumber === serviceItemNumber &&
          Math.abs((l.PurchasePrice ?? l.LineAmount ?? 0) - price) < 0.01
      );
      if (matchingLine) {
        return poNumber;
      }
    }
  } catch (err) {
    console.warn('[D365 PO] ไม่สามารถตรวจสอบ PO ตกค้างจาก OData ได้:', err);
  }
  return null;
}

/** รหัสสินค้า/บริการใน D365 (Lines[].ItemNumber) แยกตามประเภทงาน */
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

export interface SendPoOptions {
  trigger?: 'AUTO_APPROVE' | 'MANUAL_RETRY';
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
}

async function recordD365PoLog(entry: {
  jobId: string;
  jobNumber: string;
  jobType: string;
  trigger: string;
  companyCode?: string | null;
  branchName?: string | null;
  supplierId?: string | null;
  supplierCode?: string | null;
  supplierName?: string | null;
  vendorAccount?: string | null;
  vin?: string | null;
  itemNumber?: string | null;
  amount?: number | null;
  status: 'SUCCESS' | 'FAILED';
  purchId?: string | null;
  httpStatus?: number | null;
  message?: string | null;
  requestUrl?: string | null;
  requestPayload?: string | null;
  responseBody?: string | null;
  durationMs?: number | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
}) {
  try {
    await prisma.d365PoLog.create({
      data: {
        jobId: entry.jobId,
        jobNumber: entry.jobNumber,
        jobType: entry.jobType,
        trigger: entry.trigger,
        companyCode: entry.companyCode ?? null,
        branchName: entry.branchName ?? null,
        supplierCode: entry.supplierCode ?? null,
        supplierName: entry.supplierName ?? null,
        vendorAccount: entry.vendorAccount ?? null,
        vin: entry.vin ?? null,
        itemNumber: entry.itemNumber ?? null,
        amount: entry.amount ?? null,
        status: entry.status,
        purchId: entry.purchId ?? null,
        httpStatus: entry.httpStatus ?? null,
        message: entry.message ?? null,
        requestUrl: entry.requestUrl ?? null,
        requestPayload: entry.requestPayload ?? null,
        responseBody: entry.responseBody ?? null,
        durationMs: entry.durationMs ?? null,
        actorId: entry.actorId ?? null,
        actorName: entry.actorName ?? null,
        actorRole: entry.actorRole ?? null,
      },
    });
  } catch (logErr) {
    console.error('[D365 PO] ไม่สามารถบันทึก D365PoLog ลงฐานข้อมูลได้:', logErr);
  }
}

/**
 * ฟังก์ชันสร้างและส่ง Purchase Order (PO) ไปยัง D365 F&O
 * เมื่อสร้างเสร็จจะบันทึกเลข PO (PurchId) และสถานะลงในตาราง Job และบันทึก Log ทุกครั้งลงตาราง D365PoLog
 */
export async function sendJobToD365PurchaseOrder(
  jobId: string,
  options?: SendPoOptions
): Promise<{
  success: boolean;
  purchId?: string;
  message: string;
}> {
  const startTime = Date.now();
  const trigger = options?.trigger || 'AUTO_APPROVE';

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

  // ป้องกันการสร้าง PO ซ้ำ หากใบงานนี้ได้รับเลข PO จาก D365 ไปเรียบร้อยแล้ว
  if (job.d365PoNumber) {
    return { success: true, purchId: job.d365PoNumber, message: `ใบงานนี้มีเลข PO แล้ว (${job.d365PoNumber})` };
  }

  const actorId = options?.actorId ?? null;
  const actorName = options?.actorName ?? job.approvedBy ?? null;
  const actorRole = options?.actorRole ?? null;
  const vin = (job.vin || job.carWashItems?.[0]?.vin || '').trim();
  const price = job.actualCost ?? job.estimatedCost ?? 0;
  const serviceItemNumber = getD365ServiceItem(job.jobType);
  const d365Company = job.branch?.code?.trim() || null;

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
    await recordD365PoLog({
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobType: job.jobType,
      trigger,
      companyCode: d365Company,
      branchName: job.branch?.name,
      supplierId: job.supplierId,
      supplierCode: job.supplier?.code,
      supplierName: job.supplier?.name,
      vendorAccount: null,
      vin,
      itemNumber: serviceItemNumber,
      amount: price,
      status: 'FAILED',
      message: errorMsg,
      durationMs: Date.now() - startTime,
      actorId,
      actorName,
      actorRole,
    });
    return { success: false, message: errorMsg };
  }

  // คำนวณวันที่
  const deliveryDateObj = job.completedAt || job.deliveryDateTime || job.createdAt || new Date();
  const deliveryDateStr = deliveryDateObj.toISOString().split('T')[0] + 'T00:00:00Z';
  
  // Due date = 30 วันถัดไป
  const dueDateObj = new Date(deliveryDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueDateStr = dueDateObj.toISOString().split('T')[0] + 'T00:00:00Z';

  // เลือกรหัสสินค้าบริการ (Service Item) ตามประเภทงาน
  if (!serviceItemNumber) {
    const errorMsg = `ไม่พบรหัสสินค้า D365 สำหรับประเภทงาน "${job.jobType}"`;
    await prisma.job.update({
      where: { id: jobId },
      data: { d365PoStatus: 'FAILED', d365PoMessage: errorMsg, d365PoSentAt: new Date() },
    });
    await recordD365PoLog({
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobType: job.jobType,
      trigger,
      companyCode: d365Company,
      branchName: job.branch?.name,
      supplierId: job.supplierId,
      supplierCode: job.supplier?.code,
      supplierName: job.supplier?.name,
      vendorAccount,
      vin,
      itemNumber: null,
      amount: price,
      status: 'FAILED',
      message: errorMsg,
      durationMs: Date.now() - startTime,
      actorId,
      actorName,
      actorRole,
    });
    return { success: false, message: errorMsg };
  }

  // เปิด PO ตามสาขา: Company และ SiteId ใช้รหัสสาขาเดียวกัน (เช่น GI02 = มีนบุรี)
  // รหัสสาขาในระบบตรงกับรหัสบริษัท (Legal Entity) ใน D365
  if (!d365Company) {
    const errorMsg = 'ใบงานนี้ไม่มีรหัสสาขา ไม่สามารถระบุบริษัทใน D365 ได้';
    await prisma.job.update({
      where: { id: jobId },
      data: { d365PoStatus: 'FAILED', d365PoMessage: errorMsg, d365PoSentAt: new Date() },
    });
    await recordD365PoLog({
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobType: job.jobType,
      trigger,
      companyCode: null,
      branchName: job.branch?.name,
      supplierId: job.supplierId,
      supplierCode: job.supplier?.code,
      supplierName: job.supplier?.name,
      vendorAccount,
      vin,
      itemNumber: serviceItemNumber,
      amount: price,
      status: 'FAILED',
      message: errorMsg,
      durationMs: Date.now() - startTime,
      actorId,
      actorName,
      actorRole,
    });
    return { success: false, message: errorMsg };
  }

  // ประเภท VAT ตามคู่ค้า (Supplier): มี VAT (VAT_7) = '1', ไม่มี VAT (NO_VAT) = '0'
  const inclTax = job.supplier?.vatType === 'VAT_7' ? '1' : '0';

  const payload: D365PurchaseOrderPayload = {
    Bank: '',
    Company: d365Company,
    System: 'SupplierJob',
    DealerId: '',
    DeliveryDate: deliveryDateStr,
    DueDate: dueDateStr,
    ValueDate: deliveryDateStr,
    FloorPlanId: '',
    PaymentType: '', // เว้นว่างเพื่อให้ D365 ดึง Terms of payment (15D, 30D, Cash) และ Method of payment (Transfer) ตาม Vendor อัตโนมัติ
    PoDMS: vin,
    PoGiCore: job.jobNumber,
    SiteId: d365Company,
    VendorAccount: vendorAccount,
    WarehouseId: '',
    Admin: '',
    Buyer: '',
    Inspector: '',
    Approval: job.approvedBy || '',
    InclTax: inclTax,
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
  const payloadJson = JSON.stringify(payload);

  // จองสิทธิ์การส่ง (PENDING) แบบ atomic ควบคู่กับการเตรียม Token ล่วงหน้าแบบขนาน (Parallel)
  const [claimed, prewarmedToken] = await Promise.all([
    prisma.job.updateMany({
      where: {
        id: jobId,
        d365PoNumber: null,
        OR: [
          { d365PoStatus: null },
          { d365PoStatus: { not: 'PENDING' } },
          { d365PoSentAt: null },
          { d365PoSentAt: { lt: new Date(Date.now() - PO_PENDING_STALE_MS) } },
        ],
      },
      data: {
        d365PoStatus: 'PENDING',
        d365PoMessage: 'กำลังส่งเปิดใบสั่งซื้อไปยัง D365...',
        d365PoSentAt: new Date(),
      },
    }),
    getD365Token().catch(() => null),
  ]);
  if (claimed.count === 0) {
    return { success: false, message: 'ใบงานนี้กำลังส่งเปิด PO ไปยัง D365 อยู่ กรุณารอสักครู่แล้วรีเฟรชหน้าจอ' };
  }

  const accountingDatePrefix = deliveryDateStr.slice(0, 10);

  let poRequestSent = false;
  let requestUrl: string | null = null;
  try {
    // หากเป็นการกดส่งซ้ำหลังจากครั้งก่อนเคยล้มเหลว/Timeout → เช็กใน D365 OData ก่อนว่ามี PO ที่สร้างสำเร็จไปแล้วแต่ไม่ได้รับเลขกลับมาหรือไม่
    if (job.d365PoStatus === 'FAILED') {
      const existingPurchId = await findUnlinkedPoInD365({
        company: d365Company,
        vendorAccount,
        vin,
        accountingDatePrefix,
        serviceItemNumber,
        price,
      });
      if (existingPurchId) {
        const msg = `Created & confirmed PO ${existingPurchId} (ซิงค์จาก D365)`;
        await Promise.all([
          prisma.job.update({
            where: { id: jobId },
            data: {
              d365PoNumber: existingPurchId,
              d365PoStatus: 'SUCCESS',
              d365PoMessage: msg,
              d365PoSentAt: new Date(),
            },
          }),
          recordD365PoLog({
            jobId: job.id,
            jobNumber: job.jobNumber,
            jobType: job.jobType,
            trigger: 'ODATA_RECOVERY',
            companyCode: d365Company,
            branchName: job.branch?.name,
            supplierId: job.supplierId,
            supplierCode: job.supplier?.code,
            supplierName: job.supplier?.name,
            vendorAccount,
            vin,
            itemNumber: serviceItemNumber,
            amount: price,
            status: 'SUCCESS',
            purchId: existingPurchId,
            httpStatus: 200,
            message: msg,
            requestPayload: payloadJson,
            durationMs: Date.now() - startTime,
            actorId,
            actorName,
            actorRole,
          }),
        ]);
        console.log(`[D365 PO] พบ PO เดิมใน D365 สำหรับใบงาน ${job.jobNumber}: ${existingPurchId}`);
        return { success: true, purchId: existingPurchId, message: `ซิงค์เลข PO ${existingPurchId} จาก D365 สำเร็จ` };
      }
    }

    const cfg = getD365Config();
    const token = prewarmedToken || (await getD365Token());
    const url = `${cfg.baseUrl}/api/services/MIS_PurchImportSvcGroup/MIS_PurchImportSvc/createPurchaseOrder`;
    requestUrl = url;

    console.log(`[D365 PO] กำลังส่งใบงาน ${job.jobNumber} ไป D365...`, { url, company: d365Company, jobType: job.jobType, itemNumber: serviceItemNumber, vendorAccount, price, inclTax });

    poRequestSent = true;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: payloadJson,
    }, PO_REQUEST_TIMEOUT_MS);

    const rawResponseText = await res.text().catch(() => '');
    let json: D365PurchaseOrderResponse;
    try {
      json = JSON.parse(rawResponseText);
    } catch {
      json = {
        Status: 'Failed',
        Message: `HTTP ${res.status}: ไม่สามารถอ่าน JSON ตอบกลับได้`,
      };
    }

    if (res.ok && json.Status === 'Success' && json.PurchId) {
      const successMsg = json.Message || 'สร้าง PO ใน D365 สำเร็จ';
      await Promise.all([
        prisma.job.update({
          where: { id: jobId },
          data: {
            d365PoNumber: json.PurchId,
            d365PoStatus: 'SUCCESS',
            d365PoMessage: successMsg,
            d365PoSentAt: new Date(),
          },
        }),
        recordD365PoLog({
          jobId: job.id,
          jobNumber: job.jobNumber,
          jobType: job.jobType,
          trigger,
          companyCode: d365Company,
          branchName: job.branch?.name,
          supplierId: job.supplierId,
          supplierCode: job.supplier?.code,
          supplierName: job.supplier?.name,
          vendorAccount,
          vin,
          itemNumber: serviceItemNumber,
          amount: price,
          status: 'SUCCESS',
          purchId: json.PurchId,
          httpStatus: res.status,
          message: successMsg,
          requestUrl: url,
          requestPayload: payloadJson,
          responseBody: rawResponseText,
          durationMs: Date.now() - startTime,
          actorId,
          actorName,
          actorRole,
        }),
      ]);
      console.log(`[D365 PO] สำเร็จ! ใบงาน ${job.jobNumber} ได้รับ PO: ${json.PurchId}`);
      return { success: true, purchId: json.PurchId, message: successMsg };
    } else {
      const errMsg = json.Message || `HTTP ${res.status}: สร้าง PO ใน D365 ไม่สำเร็จ`;
      await Promise.all([
        prisma.job.update({
          where: { id: jobId },
          data: {
            d365PoStatus: 'FAILED',
            d365PoMessage: errMsg,
            d365PoSentAt: new Date(),
          },
        }),
        recordD365PoLog({
          jobId: job.id,
          jobNumber: job.jobNumber,
          jobType: job.jobType,
          trigger,
          companyCode: d365Company,
          branchName: job.branch?.name,
          supplierId: job.supplierId,
          supplierCode: job.supplier?.code,
          supplierName: job.supplier?.name,
          vendorAccount,
          vin,
          itemNumber: serviceItemNumber,
          amount: price,
          status: 'FAILED',
          purchId: null,
          httpStatus: res.status,
          message: errMsg,
          requestUrl: url,
          requestPayload: payloadJson,
          responseBody: rawResponseText,
          durationMs: Date.now() - startTime,
          actorId,
          actorName,
          actorRole,
        }),
      ]);
      console.error(`[D365 PO] ล้มเหลว! ใบงาน ${job.jobNumber}: ${errMsg}`);
      return { success: false, message: errMsg };
    }
  } catch (err: unknown) {
    let errMsg = err instanceof Error ? err.message : String(err);
    if (poRequestSent && err instanceof D365Error && err.timedOut) {
      // รอให้ D365 ประมวลผลจบสักครู่ แล้วเช็ก OData ว่า PO ถูกสร้างสำเร็จไปแล้วหรือไม่
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const recoveredPurchId = await findUnlinkedPoInD365({
        company: d365Company,
        vendorAccount,
        vin,
        accountingDatePrefix,
        serviceItemNumber,
        price,
      });
      if (recoveredPurchId) {
        const recoveredMsg = `Created & confirmed PO ${recoveredPurchId}`;
        await prisma.job.update({
          where: { id: jobId },
          data: {
            d365PoNumber: recoveredPurchId,
            d365PoStatus: 'SUCCESS',
            d365PoMessage: recoveredMsg,
            d365PoSentAt: new Date(),
          },
        });
        await recordD365PoLog({
          jobId: job.id,
          jobNumber: job.jobNumber,
          jobType: job.jobType,
          trigger: 'ODATA_RECOVERY',
          companyCode: d365Company,
          branchName: job.branch?.name,
          supplierId: job.supplierId,
          supplierCode: job.supplier?.code,
          supplierName: job.supplier?.name,
          vendorAccount,
          vin,
          itemNumber: serviceItemNumber,
          amount: price,
          status: 'SUCCESS',
          purchId: recoveredPurchId,
          httpStatus: 200,
          message: `${recoveredMsg} (กู้คืนหลัง Timeout)`,
          requestUrl,
          requestPayload: payloadJson,
          durationMs: Date.now() - startTime,
          actorId,
          actorName,
          actorRole,
        });
        console.log(`[D365 PO] กู้คืน PO หลัง Timeout สำเร็จ! ใบงาน ${job.jobNumber} ได้รับ PO: ${recoveredPurchId}`);
        return { success: true, purchId: recoveredPurchId, message: `สร้าง PO สำเร็จ (${recoveredPurchId})` };
      }

      // POST หมดเวลา ≠ D365 ไม่ได้สร้าง PO — เตือนให้ตรวจก่อนส่งซ้ำ กันเปิด PO ซ้ำ
      errMsg += ' — D365 อาจสร้าง PO ไปแล้ว กรุณาตรวจสอบใน D365 ก่อนกดส่งซ้ำ';
    }
    console.error(`[D365 PO] เกิดข้อผิดพลาดในการเชื่อมต่อ: ${errMsg}`);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        d365PoStatus: 'FAILED',
        d365PoMessage: errMsg,
        d365PoSentAt: new Date(),
      },
    });
    await recordD365PoLog({
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobType: job.jobType,
      trigger,
      companyCode: d365Company,
      branchName: job.branch?.name,
      supplierId: job.supplierId,
      supplierCode: job.supplier?.code,
      supplierName: job.supplier?.name,
      vendorAccount,
      vin,
      itemNumber: serviceItemNumber,
      amount: price,
      status: 'FAILED',
      purchId: null,
      httpStatus: err instanceof D365Error ? err.status : null,
      message: errMsg,
      requestUrl,
      requestPayload: payloadJson,
      durationMs: Date.now() - startTime,
      actorId,
      actorName,
      actorRole,
    });
    return { success: false, message: errMsg };
  }
}
