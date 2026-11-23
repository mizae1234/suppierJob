import { z } from 'zod';
import { optionalDateString, optionalString } from './parse-body';

// ─── POST /api/invoices ──────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  supplierId: z
    .string({ error: 'กรุณาระบุ Supplier (supplierId)' })
    .trim()
    .min(1, 'กรุณาระบุ Supplier (supplierId)')
    .max(100),
  companyId: z
    .string({ error: 'กรุณาระบุบริษัท (companyId)' })
    .trim()
    .min(1, 'กรุณาระบุบริษัท (companyId)')
    .max(100),
  jobIds: z
    .array(
      z.string({ error: 'รหัสใบงานต้องเป็นข้อความ' }).trim().min(1, 'รหัสใบงานห้ามว่าง').max(100),
      { error: 'กรุณาเลือกงานอย่างน้อย 1 รายการ' }
    )
    .min(1, 'กรุณาเลือกงานอย่างน้อย 1 รายการ')
    .max(500, 'รวมใบงานได้สูงสุด 500 รายการต่อใบวางบิล'),
  dueDate: optionalDateString('วันครบกำหนดชำระ'),
  notes: optionalString(1000, 'หมายเหตุ'),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
