export const INVOICE_UPDATE_STATUS = {
  PENDING_UPDATE: 'PENDING_UPDATE',
  UPDATED: 'UPDATED',
} as const;

export type InvoiceUpdateStatus =
  (typeof INVOICE_UPDATE_STATUS)[keyof typeof INVOICE_UPDATE_STATUS];

/**
 * ตรวจว่าใบงานผ่านการอัปเดตเลข Invoice จาก Vendor แล้วหรือยัง
 * (ต้องมีทั้งสถานะ UPDATED และเลข vendorInvoiceNumber ที่ไม่ว่าง ถึงจะสามารถกดออกบิลเพื่อเปิด PO ได้)
 */
export function isJobInvoiceUpdated(job: {
  invoiceUpdateStatus?: string | null;
  vendorInvoiceNumber?: string | null;
}): boolean {
  return (
    job.invoiceUpdateStatus === INVOICE_UPDATE_STATUS.UPDATED &&
    Boolean(job.vendorInvoiceNumber?.trim())
  );
}

/**
 * ป้ายข้อความและสไตล์ของสถานะการอัปเดต Invoice (2 สถานะหลัก)
 */
export function getInvoiceUpdateStatusMeta(
  status?: string | null,
  vendorInvoiceNumber?: string | null
): {
  code: InvoiceUpdateStatus;
  label: string;
  badgeClass: string;
} {
  if (isJobInvoiceUpdated({ invoiceUpdateStatus: status, vendorInvoiceNumber })) {
    return {
      code: INVOICE_UPDATE_STATUS.UPDATED,
      label: 'อัปเดต Invoice แล้ว',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  return {
    code: INVOICE_UPDATE_STATUS.PENDING_UPDATE,
    label: 'รออัปเดต Invoice',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  };
}

/**
 * รวมเลข Invoice ของ Vendor จากหลายใบงานในใบวางบิลเดียวกัน (ตัดค่าซ้ำและค่าว่าง)
 */
export function mergeVendorInvoiceNumbers(
  values: Array<string | null | undefined>
): string | null {
  const unique = Array.from(
    new Set(values.map((v) => (v || '').trim()).filter(Boolean))
  );
  return unique.length > 0 ? unique.join(', ') : null;
}
