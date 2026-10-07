/**
 * 🧹 เคลียร์ Job ทั้งหมดในระบบ
 * 
 * วิธีใช้: เปิด Terminal แล้วรัน
 *   npx tsx scripts/clear-jobs.ts
 * 
 * สิ่งที่จะถูกลบ:
 *   - JobEvidence (รูปหลักฐาน)
 *   - CarWashItem (รายการรถในใบงานล้างรถ)
 *   - Job (ใบงานทั้งหมด)
 *   - Vehicle status → reset กลับเป็น AVAILABLE
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllJobs() {
  console.log('🧹 กำลังเคลียร์ Job ทั้งหมดในระบบ...\n');

  // 1. ลบรูปหลักฐาน
  const evi = await prisma.jobEvidence.deleteMany({});
  console.log(`  ✓ ลบ JobEvidence: ${evi.count} รายการ`);

  // 2. ลบกิจกรรม / Timeline
  const act = await prisma.jobActivity.deleteMany({});
  console.log(`  ✓ ลบ JobActivity: ${act.count} รายการ`);

  // 3. ลบรายการรถล้าง
  const items = await prisma.carWashItem.deleteMany({});
  console.log(`  ✓ ลบ CarWashItem: ${items.count} รายการ`);

  // 4. ลบ Job ทั้งหมด
  const jobs = await prisma.job.deleteMany({});
  console.log(`  ✓ ลบ Job: ${jobs.count} ใบงาน`);

  // 5. ลบ Invoice ทั้งหมด
  const inv = await prisma.invoice.deleteMany({});
  console.log(`  ✓ ลบ Invoice: ${inv.count} ใบ`);

  // 6. Reset สถานะรถทั้งหมดกลับเป็น AVAILABLE
  const vehicles = await prisma.vehicle.updateMany({
    where: { status: { not: 'AVAILABLE' } },
    data: { status: 'AVAILABLE' },
  });
  console.log(`  ✓ Reset Vehicle → AVAILABLE: ${vehicles.count} คัน`);

  console.log('\n✅ เคลียร์ Job และข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว!');
  await prisma.$disconnect();
}

clearAllJobs().catch((e: Error) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
