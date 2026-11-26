/**
 * ซิงค์ตาราง Master D365Warehouse จาก D365 F&O (GET /data/Warehouses)
 *
 * วิธีใช้:
 *   npx tsx scripts/sync-d365-warehouses.ts          # ซิงค์ทุกสาขา (GI, GI01..GI12)
 *   npx tsx scripts/sync-d365-warehouses.ts GI01     # ซิงค์เฉพาะบริษัท GI01
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { syncD365Warehouses } from '../lib/d365/warehouse-sync';

async function main() {
  const companyArg = process.argv[2]?.trim() || null;
  console.log(
    companyArg
      ? `🔄 กำลังซิงค์ D365Warehouse สำหรับบริษัท ${companyArg}...`
      : '🔄 กำลังซิงค์ D365Warehouse จาก D365 F&O สำหรับทุกสาขา...'
  );

  const summary = await syncD365Warehouses({ company: companyArg });
  console.log('\n📊 สรุปผลการซิงค์ D365Warehouse:');
  console.log(`  • บริษัทที่ซิงค์ (${summary.companiesSynced.length}): ${summary.companiesSynced.join(', ')}`);
  console.log(`  • ดึงจาก D365: ${summary.fetched} แถว`);
  console.log(`  • สร้างใหม่: ${summary.created} แถว`);
  console.log(`  • อัปเดต: ${summary.updated} แถว`);
  console.log(`  • ปิดการใช้งาน (ไม่พบใน D365): ${summary.deactivated} แถว`);

  if (summary.errors.length > 0) {
    console.log('\n⚠️ พบข้อผิดพลาดบางบริษัท:');
    for (const err of summary.errors) {
      console.log(`  - ${err.company}: ${err.message}`);
    }
  }

  const totalActive = await prisma.d365Warehouse.count({ where: { isActive: true } });
  const byCompany = await prisma.d365Warehouse.groupBy({
    by: ['dataAreaId'],
    where: { isActive: true },
    _count: { _all: true },
    orderBy: { dataAreaId: 'asc' },
  });
  console.log(`\n✅ รวมคลัง Active ในตาราง Master D365Warehouse: ${totalActive} แถว`);
  for (const row of byCompany) {
    console.log(`  • ${row.dataAreaId}: ${row._count._all} คลัง`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Sync failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
