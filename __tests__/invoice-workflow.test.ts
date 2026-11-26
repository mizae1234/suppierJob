import { describe, it, expect } from 'vitest';
import {
  INVOICE_UPDATE_STATUS,
  getInvoiceUpdateStatusMeta,
  isJobInvoiceUpdated,
  mergeVendorInvoiceNumbers,
} from '@/lib/invoice-workflow';
import { generateInitialInvoiceNumber } from '@/lib/invoice-number';
import { updateJobInvoiceNumberSchema } from '@/lib/validation';

describe('invoice update workflow helpers', () => {
  it('generateInitialInvoiceNumber produces INV-<COMPANY>-<YYMM>-<7digits>', () => {
    const fixedDate = new Date('2026-11-26T10:00:00.000Z');
    const num = generateInitialInvoiceNumber('gi', fixedDate);
    expect(num).toMatch(/^INV-GI-2611-\d{7}$/);

    const ev7 = generateInitialInvoiceNumber('EV7', fixedDate);
    expect(ev7).toMatch(/^INV-EV7-2611-\d{7}$/);
  });

  it('isJobInvoiceUpdated requires both UPDATED status and non-empty vendorInvoiceNumber', () => {
    expect(
      isJobInvoiceUpdated({
        invoiceUpdateStatus: INVOICE_UPDATE_STATUS.PENDING_UPDATE,
        vendorInvoiceNumber: null,
      })
    ).toBe(false);

    expect(
      isJobInvoiceUpdated({
        invoiceUpdateStatus: INVOICE_UPDATE_STATUS.PENDING_UPDATE,
        vendorInvoiceNumber: 'V-INV-001',
      })
    ).toBe(false);

    expect(
      isJobInvoiceUpdated({
        invoiceUpdateStatus: INVOICE_UPDATE_STATUS.UPDATED,
        vendorInvoiceNumber: '   ',
      })
    ).toBe(false);

    expect(
      isJobInvoiceUpdated({
        invoiceUpdateStatus: INVOICE_UPDATE_STATUS.UPDATED,
        vendorInvoiceNumber: 'V-INV-001',
      })
    ).toBe(true);
  });

  it('getInvoiceUpdateStatusMeta returns Thai labels for both states', () => {
    const pending = getInvoiceUpdateStatusMeta('PENDING_UPDATE', null);
    expect(pending.code).toBe('PENDING_UPDATE');
    expect(pending.label).toBe('รออัปเดต Invoice');

    const updated = getInvoiceUpdateStatusMeta('UPDATED', 'IV-2026-0099');
    expect(updated.code).toBe('UPDATED');
    expect(updated.label).toBe('อัปเดต Invoice แล้ว');
  });

  it('mergeVendorInvoiceNumbers deduplicates and trims values', () => {
    expect(mergeVendorInvoiceNumbers([' IV-001 ', 'IV-001', null, '', 'IV-002'])).toBe(
      'IV-001, IV-002'
    );
    expect(mergeVendorInvoiceNumbers([null, undefined, '   '])).toBeNull();
  });

  it('updateJobInvoiceNumberSchema trims valid values and rejects blank input', () => {
    const ok = updateJobInvoiceNumberSchema.safeParse({ vendorInvoiceNumber: '  IV-6911-001  ' });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.vendorInvoiceNumber).toBe('IV-6911-001');
    }

    const empty = updateJobInvoiceNumberSchema.safeParse({ vendorInvoiceNumber: '   ' });
    expect(empty.success).toBe(false);
  });
});
