/**
 * Dry-run: ดึงรถจาก D365 แล้วแสดงผลการแมพ โดย **ไม่เขียนฐานข้อมูล**
 *
 * วิธีรัน:
 *   npx tsx --env-file=.env scripts/d365-sync-dry-run.ts
 */
import { previewD365VehicleSync } from '../lib/d365/vehicle-sync';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('⏳ กำลังดึงข้อมูลจาก D365 ...');
  const started = Date.now();
  const { fetched, result } = await previewD365VehicleSync();
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`\n✅ ดึงข้อมูลสำเร็จใน ${seconds} วินาที`);
  console.log(`   แถวจาก D365 (BPC_InventOnHand) : ${fetched}`);
  console.log(`   แมพเป็นรถได้                    : ${result.vehicles.length}`);
  console.log(`   ข้าม                            : ${result.skipped.length}`);
  console.log(`   คำเตือน                         : ${result.warnings.length}`);
  console.log(`   ถูกจองใน D365                   : ${result.vehicles.filter(v => v.d365Reserved).length}`);

  const invalidVin = result.vehicles.filter(v => v.vin.length !== 17);
  if (invalidVin.length) console.log(`   ⚠️  VIN ไม่ใช่ 17 หลัก           : ${invalidVin.length}`);

  // สรุปต่อสาขา
  const bySite = new Map<string, number>();
  result.vehicles.forEach(v => bySite.set(v.d365SiteId, (bySite.get(v.d365SiteId) || 0) + 1));
  console.log('\n📍 จำนวนรถต่อสาขา:');
  [...bySite.entries()].sort().forEach(([site, n]) => console.log(`   ${site.padEnd(8)} ${n}`));

  console.log('\n🚗 ตัวอย่าง 10 คันแรก:');
  console.table(result.vehicles.slice(0, 10).map(v => ({
    vin: v.vin,
    model: v.model,
    color: v.color,
    site: v.d365SiteId,
    warehouse: v.d365WarehouseId,
    reserved: v.d365Reserved,
    item: v.d365ItemId,
  })));

  if (result.skipped.length) {
    // จัดกลุ่มเหตุผลการข้าม
    const reasons = new Map<string, number>();
    result.skipped.forEach(s => reasons.set(s.message, (reasons.get(s.message) || 0) + 1));
    console.log('\n⏭️  เหตุผลที่ข้าม:');
    reasons.forEach((n, msg) => console.log(`   ${n} × ${msg}`));
  }

  if (result.warnings.length) {
    console.log('\n⚠️  คำเตือน (20 รายการแรก):');
    result.warnings.slice(0, 20).forEach(w => console.log(`   - ${w.itemId || w.vin || ''}: ${w.message}`));
  }

  // เปรียบเทียบกับข้อมูลในระบบ (อ่านอย่างเดียว)
  const existingVins = new Set(
    (await prisma.vehicle.findMany({ select: { vin: true } })).map(v => v.vin.toUpperCase())
  );
  const newCount = result.vehicles.filter(v => !existingVins.has(v.vin)).length;
  console.log(`\n🗄️  เทียบกับฐานข้อมูล: รถใหม่ ${newCount} คัน, มีอยู่แล้ว ${result.vehicles.length - newCount} คัน`);
  console.log('\n(Dry-run — ไม่มีการเขียนฐานข้อมูล)');
}

main()
  .catch(err => {
    console.error('\n❌ Dry-run ล้มเหลว:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
