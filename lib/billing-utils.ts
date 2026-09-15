import { Job, CompanyCode } from '@/types';
import { getJobTotalCost } from './job-utils';

export interface BillingSummary {
  subtotal: number;
  vat: number;
  grandTotal: number;
  jobCount: number;
}

/**
 * Calculate Billing Summary with VAT 7%
 */
export function calculateBillingSummary(jobs: Job[]): BillingSummary {
  const subtotal = jobs.reduce((sum, job) => sum + getJobTotalCost(job), 0);
  const vat = subtotal * 0.07;
  const grandTotal = subtotal + vat;

  return {
    subtotal,
    vat,
    grandTotal,
    jobCount: jobs.length,
  };
}

/**
 * Format currency in Thai Baht format
 */
export function formatCurrency(
  amount: number,
  options?: { showDecimal?: boolean; prefix?: string }
): string {
  const prefix = options?.prefix ?? '฿';
  const showDecimal = options?.showDecimal ?? false;

  const formatted = amount.toLocaleString('th-TH', {
    minimumFractionDigits: showDecimal ? 2 : 0,
    maximumFractionDigits: showDecimal ? 2 : 0,
  });

  return `${prefix}${formatted}`;
}

/**
 * Validate jobs before creating an invoice (Strict Company separation & Approved only rule)
 */
export function validateJobsForInvoicing(
  jobs: Job[],
  expectedCompanyCode?: CompanyCode
): { isValid: boolean; error?: string } {
  if (!jobs || jobs.length === 0) {
    return { isValid: false, error: 'กรุณาเลือกงานอย่างน้อย 1 รายการ' };
  }

  // Check 1: All must be APPROVED
  const nonApproved = jobs.filter(j => j.status !== 'APPROVED');
  if (nonApproved.length > 0) {
    return {
      isValid: false,
      error: `มีงานจำนวน ${nonApproved.length} รายการที่ยังไม่ผ่านการอนุมัติ (เฉพาะสถานะ APPROVED เท่านั้นที่วางบิลได้)`,
    };
  }

  // Check 2: None can have existing invoiceId
  const alreadyInvoiced = jobs.filter(j => !!j.invoiceId);
  if (alreadyInvoiced.length > 0) {
    return {
      isValid: false,
      error: `มีงานจำนวน ${alreadyInvoiced.length} รายการที่ถูกเปิดใบวางบิลไปแล้ว ห้ามวางบิลซ้ำ`,
    };
  }

  // Check 3: Strict single company rule
  const firstCompany = expectedCompanyCode || jobs[0].companyCode;
  const mixedCompany = jobs.filter(j => j.companyCode !== firstCompany);
  if (mixedCompany.length > 0) {
    return {
      isValid: false,
      error: `ไม่สามารถรวมงานระหว่าง EV7 และ GI ในใบเดียวกันได้ (กฎการแยกบริษัทเด็ดขาด)`,
    };
  }

  return { isValid: true };
}
