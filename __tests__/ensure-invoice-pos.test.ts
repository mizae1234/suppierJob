import { describe, it, expect, vi } from 'vitest';
import {
  ensureJobsHaveD365Po,
  type InvoicePoTargetJob,
  type SendJobPoFn,
} from '@/lib/services/invoices/ensure-invoice-pos';

const actor = {
  id: 'user-vendor-1',
  name: 'Vendor Test',
  role: 'SUPPLIER',
};

function makeJob(overrides: Partial<InvoicePoTargetJob> & { id: string; jobNumber: string }): InvoicePoTargetJob {
  return {
    d365PoNumber: null,
    d365PoStatus: null,
    d365PoSentAt: null,
    ...overrides,
  };
}

describe('ensureJobsHaveD365Po (fail-closed 1 job = 1 PO on invoice)', () => {
  it('opens POs sequentially with trigger AUTO_INVOICE for every job without a PO', async () => {
    const callOrder: string[] = [];
    const sendPo = vi.fn<SendJobPoFn>(async (jobId, options) => {
      callOrder.push(jobId);
      expect(options).toEqual({
        trigger: 'AUTO_INVOICE',
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
      });
      return {
        success: true,
        purchId: `PO-${jobId}`,
        message: 'Created',
      };
    });

    const jobs = [
      makeJob({ id: 'j1', jobNumber: 'CW-001' }),
      makeJob({ id: 'j2', jobNumber: 'CW-002' }),
    ];

    const result = await ensureJobsHaveD365Po(jobs, actor, sendPo);

    expect(result).toEqual({
      ok: true,
      poByJobId: { j1: 'PO-j1', j2: 'PO-j2' },
      poNumbers: ['PO-j1', 'PO-j2'],
      openedCount: 2,
      existingCount: 0,
    });
    expect(callOrder).toEqual(['j1', 'j2']);
    expect(sendPo).toHaveBeenCalledTimes(2);
  });

  it('skips jobs that already have a d365PoNumber without calling D365 again', async () => {
    const sendPo = vi.fn<SendJobPoFn>(async (jobId) => ({
      success: true,
      purchId: `PO-${jobId}`,
      message: 'Created',
    }));

    const jobs = [
      makeJob({ id: 'j1', jobNumber: 'CW-001', d365PoNumber: 'PO-EXISTING-1', d365PoStatus: 'SUCCESS' }),
      makeJob({ id: 'j2', jobNumber: 'CW-002' }),
    ];

    const result = await ensureJobsHaveD365Po(jobs, actor, sendPo);

    expect(result).toEqual({
      ok: true,
      poByJobId: { j1: 'PO-EXISTING-1', j2: 'PO-j2' },
      poNumbers: ['PO-EXISTING-1', 'PO-j2'],
      openedCount: 1,
      existingCount: 1,
    });
    expect(sendPo).toHaveBeenCalledTimes(1);
    expect(sendPo).toHaveBeenCalledWith('j2', expect.objectContaining({ trigger: 'AUTO_INVOICE' }));
  });

  it('fails closed and stops immediately (fail-fast) when a job fails to open PO', async () => {
    const sendPo = vi.fn<SendJobPoFn>(async (jobId) => {
      if (jobId === 'j1') {
        return { success: true, purchId: 'PO-001', message: 'OK' };
      }
      if (jobId === 'j2') {
        return { success: false, message: 'Vendor account not found in GI06' };
      }
      return { success: true, purchId: 'PO-003', message: 'OK' };
    });

    const jobs = [
      makeJob({ id: 'j1', jobNumber: 'CW-001' }),
      makeJob({ id: 'j2', jobNumber: 'CW-002' }),
      makeJob({ id: 'j3', jobNumber: 'CW-003' }),
    ];

    const result = await ensureJobsHaveD365Po(jobs, actor, sendPo);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.failedJobId).toBe('j2');
      expect(result.failedJobNumber).toBe('CW-002');
      expect(result.openedBeforeFailure).toEqual([
        { jobId: 'j1', jobNumber: 'CW-001', purchId: 'PO-001' },
      ]);
      expect(result.error).toContain('CW-002');
      expect(result.error).toContain('Vendor account not found in GI06');
      expect(result.error).toContain('CW-001→PO-001');
    }
    // Must NOT call D365 for j3 after j2 failed
    expect(sendPo).toHaveBeenCalledTimes(2);
  });

  it('rejects with 409 before calling D365 if any job has an active PENDING PO request', async () => {
    const sendPo = vi.fn<SendJobPoFn>();
    const jobs = [
      makeJob({ id: 'j1', jobNumber: 'CW-001' }),
      makeJob({
        id: 'j2',
        jobNumber: 'CW-002',
        d365PoStatus: 'PENDING',
        d365PoSentAt: new Date(Date.now() - 30_000),
      }),
    ];

    const result = await ensureJobsHaveD365Po(jobs, actor, sendPo);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.failedJobId).toBe('j2');
      expect(result.error).toContain('CW-002');
    }
    expect(sendPo).not.toHaveBeenCalled();
  });

  it('allows opening PO when a previous PENDING status is stale (> 4 minutes)', async () => {
    const sendPo = vi.fn<SendJobPoFn>(async () => ({
      success: true,
      purchId: 'PO-RECOVERED',
      message: 'OK',
    }));
    const jobs = [
      makeJob({
        id: 'j1',
        jobNumber: 'CW-001',
        d365PoStatus: 'PENDING',
        d365PoSentAt: new Date(Date.now() - 5 * 60_000),
      }),
    ];

    const result = await ensureJobsHaveD365Po(jobs, actor, sendPo);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.poByJobId.j1).toBe('PO-RECOVERED');
    }
    expect(sendPo).toHaveBeenCalledTimes(1);
  });
});
