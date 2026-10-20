import { isD365Configured } from './client';

/**
 * ตัวตั้งเวลา Sync รถจาก D365 อัตโนมัติ
 * ถูกเรียกจาก instrumentation.ts ตอน server เริ่ม (Node.js runtime เท่านั้น)
 */

const FIRST_RUN_DELAY_MS = 2 * 60_000; // รอ 2 นาทีหลัง server start ก่อนรันรอบแรก
const DEFAULT_INTERVAL_MINUTES = 60;
const MIN_INTERVAL_MINUTES = 5;

const globalForScheduler = globalThis as unknown as { __d365SyncSchedulerStarted?: boolean };

export function startD365SyncScheduler() {
  if (process.env.D365_SYNC_ENABLED !== 'true') return;
  if (globalForScheduler.__d365SyncSchedulerStarted) return;

  if (!isD365Configured()) {
    console.warn('[D365 Sync] D365_SYNC_ENABLED=true แต่ตั้งค่า D365_* ไม่ครบ — ไม่เริ่มตัวตั้งเวลา');
    return;
  }

  const parsed = Number(process.env.D365_SYNC_INTERVAL_MINUTES);
  const intervalMinutes = Math.max(MIN_INTERVAL_MINUTES, Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MINUTES);

  globalForScheduler.__d365SyncSchedulerStarted = true;

  const tick = async () => {
    try {
      // import แบบ dynamic เพื่อไม่ให้ instrumentation โหลด Prisma ตั้งแต่ตอน start
      const { runD365VehicleSync } = await import('./vehicle-sync');
      const summary = await runD365VehicleSync({ trigger: 'SCHEDULED' });
      console.log(`[D365 Sync] ${summary.status}: ${summary.message}`);
    } catch (err) {
      console.error('[D365 Sync] scheduler tick error:', err);
    }
  };

  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), intervalMinutes * 60_000);
  }, FIRST_RUN_DELAY_MS);

  console.log(`[D365 Sync] ตัวตั้งเวลาเริ่มทำงาน — ทุก ${intervalMinutes} นาที (รอบแรกใน ${FIRST_RUN_DELAY_MS / 60_000} นาที)`);
}
