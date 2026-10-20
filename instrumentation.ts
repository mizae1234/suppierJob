/**
 * Next.js instrumentation — register() ถูกเรียกครั้งเดียวตอน server instance เริ่มทำงาน
 * ใช้เริ่มตัวตั้งเวลา Sync รถจาก D365 (ไม่ await งาน sync เพื่อไม่ block การเริ่ม server)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startD365SyncScheduler } = await import('./lib/d365/scheduler');
    startD365SyncScheduler();
  }
}
