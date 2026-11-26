import { sendJobToD365PurchaseOrder, type SendPoOptions } from '@/lib/d365/po';
import { isPoPendingActive } from '@/lib/services/jobs/approve-job';

export interface InvoicePoTargetJob {
  id: string;
  jobNumber: string;
  d365PoNumber: string | null;
  d365PoStatus: string | null;
  d365PoSentAt: Date | null;
}

export interface InvoicePoActor {
  id: string;
  name: string;
  role: string;
}

export type SendJobPoFn = (
  jobId: string,
  options?: SendPoOptions
) => Promise<{ success: boolean; purchId?: string; message: string }>;

export interface EnsureInvoicePosSuccess {
  ok: true;
  poByJobId: Record<string, string>;
  poNumbers: string[];
  openedCount: number;
  existingCount: number;
}

export interface EnsureInvoicePosFailure {
  ok: false;
  status: number;
  error: string;
  failedJobId: string;
  failedJobNumber: string;
  openedBeforeFailure: Array<{ jobId: string; jobNumber: string; purchId: string }>;
}

export type EnsureInvoicePosResult = EnsureInvoicePosSuccess | EnsureInvoicePosFailure;

/**
 * ตรวจสอบและเปิด D365 Purchase Order (1 ใบงาน = 1 PO) แบบ Fail-closed ก่อนสร้างใบวางบิล:
 * - ใบงานที่มีเลข d365PoNumber อยู่แล้วจะถูกข้ามทันที (กันเปิด PO ซ้ำเมื่อกดลองใหม่)
 * - หากมีใบงานที่กำลังส่งเปิด PO ค้างอยู่ (PENDING ที่ยังไม่หมดอายุ) จะปฏิเสธทันที (409)
 * - ยิงเปิด PO ทีละใบงานตามลำดับ เพื่อลดโอกาสชน Number Sequence / Deadlock ใน D365
 *   และหยุดทันที (Fail-fast) เมื่อพบใบงานแรกที่เปิด PO ไม่สำเร็จ
 */
export async function ensureJobsHaveD365Po(
  jobs: InvoicePoTargetJob[],
  actor: InvoicePoActor,
  sendPo: SendJobPoFn = sendJobToD365PurchaseOrder
): Promise<EnsureInvoicePosResult> {
  // 1) กันการยิงซ้อนหากมีใบงานใดกำลังส่งเปิด PO อยู่แล้ว
  const activePending = jobs.find((j) => !j.d365PoNumber && isPoPendingActive(j));
  if (activePending) {
    return {
      ok: false,
      status: 409,
      error: `ใบงาน ${activePending.jobNumber} กำลังส่งเปิด PO ไปยัง D365 อยู่ กรุณารอสักครู่แล้วลองใหม่อีกครั้ง`,
      failedJobId: activePending.id,
      failedJobNumber: activePending.jobNumber,
      openedBeforeFailure: [],
    };
  }

  const poByJobId: Record<string, string> = {};
  const openedBeforeFailure: Array<{ jobId: string; jobNumber: string; purchId: string }> = [];
  let existingCount = 0;
  let openedCount = 0;

  // 2) วนเปิด PO ทีละใบงาน (Fail-closed & Fail-fast)
  for (const job of jobs) {
    if (job.d365PoNumber?.trim()) {
      poByJobId[job.id] = job.d365PoNumber.trim();
      existingCount++;
      continue;
    }

    const result = await sendPo(job.id, {
      trigger: 'AUTO_INVOICE',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
    });

    if (!result.success || !result.purchId?.trim()) {
      const reason = result.message || 'ไม่สามารถเปิด PO ใน D365 ได้';
      const partialNote =
        openedBeforeFailure.length > 0
          ? ` (เปิด PO สำเร็จไปแล้ว ${openedBeforeFailure.length} งาน: ${openedBeforeFailure
              .map((p) => `${p.jobNumber}→${p.purchId}`)
              .join(', ')} — ระบบจะใช้เลข PO เดิมอัตโนมัติเมื่อกดออกบิลอีกครั้ง)`
          : '';
      return {
        ok: false,
        status: 422,
        error: `ไม่สามารถออกใบวางบิลได้ เนื่องจากเปิด PO ใน D365 สำหรับใบงาน ${job.jobNumber} ไม่สำเร็จ: ${reason}${partialNote}`,
        failedJobId: job.id,
        failedJobNumber: job.jobNumber,
        openedBeforeFailure,
      };
    }

    const purchId = result.purchId.trim();
    poByJobId[job.id] = purchId;
    openedBeforeFailure.push({ jobId: job.id, jobNumber: job.jobNumber, purchId });
    openedCount++;
  }

  return {
    ok: true,
    poByJobId,
    poNumbers: Array.from(new Set(Object.values(poByJobId))),
    openedCount,
    existingCount,
  };
}
