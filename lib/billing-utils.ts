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

/**
 * Converts a numeric amount to Thai Baht text (e.g. 1070 -> "หนึ่งพันเจ็ดสิบบาทถ้วน")
 */
export function thaiBahtText(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'ศูนย์บาทถ้วน';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const rounded = Math.round(absAmount * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  const integerPart = parseInt(parts[0], 10);
  const satangPart = parseInt(parts[1], 10);

  const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  function convertGroup(n: number): string {
    let result = '';
    const digits = String(n).split('').map(Number);
    const len = digits.length;

    for (let i = 0; i < len; i++) {
      const digit = digits[i];
      const pos = len - 1 - i;

      if (digit === 0) continue;

      if (pos === 0) {
        if (digit === 1 && n > 1) {
          result += 'เอ็ด';
        } else {
          result += numbers[digit];
        }
      } else if (pos === 1) {
        if (digit === 1) {
          result += 'สิบ';
        } else if (digit === 2) {
          result += 'ยี่สิบ';
        } else {
          result += numbers[digit] + 'สิบ';
        }
      } else {
        result += numbers[digit] + units[pos];
      }
    }
    return result;
  }

  function convertNumber(num: number): string {
    if (num === 0) return '';
    if (num < 1000000) return convertGroup(num);

    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    return convertNumber(millions) + 'ล้าน' + convertGroup(remainder);
  }

  let text = '';
  if (integerPart > 0) {
    text += convertNumber(integerPart) + 'บาท';
  } else {
    text += 'ศูนย์บาท';
  }

  if (satangPart === 0) {
    text += 'ถ้วน';
  } else {
    text += convertGroup(satangPart) + 'สตางค์';
  }

  return (isNegative ? 'ลบ' : '') + text;
}

