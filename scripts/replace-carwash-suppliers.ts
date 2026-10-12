/**
 * 🚿 แทนที่ Supplier ล้างรถชุดเดิมด้วยรายชื่อใหม่ + สร้าง User ให้แต่ละราย
 *
 * วิธีใช้:  npx tsx scripts/replace-carwash-suppliers.ts
 *
 * - ลบ SP-CLEANPRO ถาวร (ไม่มีงาน/ใบแจ้งหนี้ผูก)
 * - ปิดการใช้งาน SP-WASHHUB + user (เก็บประวัติงาน/ใบแจ้งหนี้ไว้)
 * - เพิ่ม Supplier ล้างรถใหม่ 9 ราย พร้อม user role SUPPLIER
 * รันซ้ำได้ (upsert)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Supplier@1234';

const NEW_SUPPLIERS = [
  { code: 'SP-CW001', username: 'supplier-hiend', name: 'HI-END CAR WASH & GLASS COATING By นันทิตา xxx' },
  { code: 'SP-CW002', username: 'supplier-cleanday', name: 'CleanDay Carcare By สุพัตรา xxx' },
  { code: 'SP-CW003', username: 'supplier-huaykum', name: 'ห้วยคุ้มคาร์แคร์ By ทรงชัย xxx' },
  { code: 'SP-CW004', username: 'supplier-twoshine', name: 'ทู ไชน์ คาร์ดีเทลลิ่ง By อรรถวิทย์ xxx' },
  { code: 'SP-CW005', username: 'supplier-washmobil', name: 'บริษัท วอชโมบิล จำกัด' },
  { code: 'SP-CW006', username: 'supplier-eksalit', name: 'บริษัท เอกชลิต จำกัด' },
  { code: 'SP-CW007', username: 'supplier-autocar108', name: 'ห้างหุ้นส่วนจำกัด ออโต้คาร์ 108' },
  { code: 'SP-CW008', username: 'supplier-baisai', name: 'บริษัท ใบ สัย คลีนนิ่ง คาร์ จำกัด' },
  { code: 'SP-CW009', username: 'supplier-penek', name: 'เป็นเอกคาร์แคร์ By เอกสิทธิ์ xxx' },
];

async function main() {
  // 1) ลบ CLEANPRO (ตรวจซ้ำว่าไม่มีข้อมูลผูก)
  const cleanpro = await prisma.supplier.findUnique({
    where: { code: 'SP-CLEANPRO' },
    include: { _count: { select: { jobs: true, invoices: true } } },
  });
  if (cleanpro) {
    if (cleanpro._count.jobs === 0 && cleanpro._count.invoices === 0) {
      await prisma.user.deleteMany({ where: { supplierId: cleanpro.id } });
      await prisma.supplier.delete({ where: { id: cleanpro.id } });
      console.log('🗑️  ลบ SP-CLEANPRO แล้ว');
    } else {
      console.log('⚠️  SP-CLEANPRO มีข้อมูลผูกอยู่ ข้ามการลบ');
    }
  }

  // 2) ปิดการใช้งาน WASHHUB
  const washhub = await prisma.supplier.findUnique({ where: { code: 'SP-WASHHUB' } });
  if (washhub) {
    await prisma.supplier.update({ where: { id: washhub.id }, data: { isActive: false } });
    await prisma.user.updateMany({ where: { supplierId: washhub.id }, data: { isActive: false } });
    console.log('⏸️  ปิดการใช้งาน SP-WASHHUB แล้ว');
  }

  // 3) เพิ่ม supplier ใหม่ + user
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const s of NEW_SUPPLIERS) {
    // หา supplier เดิม: ตาม code ใหม่ก่อน ถ้าไม่เจอให้ดูจาก supplier ที่ผูกกับ username (กรณีเปลี่ยน code)
    const existingUser = await prisma.user.findUnique({ where: { username: s.username } });
    const existing =
      (await prisma.supplier.findUnique({ where: { code: s.code } })) ??
      (existingUser?.supplierId
        ? await prisma.supplier.findUnique({ where: { id: existingUser.supplierId } })
        : null);
    const data = { code: s.code, name: s.name, services: 'CAR_WASH', isActive: true };
    const supplier = existing
      ? await prisma.supplier.update({ where: { id: existing.id }, data })
      : await prisma.supplier.create({ data });
    await prisma.user.upsert({
      where: { username: s.username },
      update: { supplierId: supplier.id, role: 'SUPPLIER', displayName: s.name, isActive: true },
      create: {
        username: s.username,
        password: hashed,
        displayName: s.name,
        role: 'SUPPLIER',
        supplierId: supplier.id,
        isActive: true,
      },
    });
    console.log(`✅ ${s.code}  ${s.username}  ${s.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
