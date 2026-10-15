import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Supplier@1234';

async function main() {
  console.log('🔄 กำลังรีเซ็ตรหัสผ่านของ Supplier ทั้งหมด...\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // ดึงรายชื่อ Supplier ทั้งหมด
  const suppliers = await prisma.user.findMany({
    where: { role: 'SUPPLIER' },
    include: { supplier: true },
    orderBy: { username: 'asc' },
  });

  console.log(`พบผู้ใช้งาน Supplier ทั้งหมด ${suppliers.length} บัญชี\n`);

  for (const user of suppliers) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false, // ไม่บังคับเปลี่ยนรหัสผ่าน เพื่อให้ใช้รหัสกลางได้ตลอด
        isActive: true,
      },
    });

    console.log(`✅ [${user.supplier?.code || 'N/A'}] ${user.username.padEnd(20)} -> รหัสผ่าน: ${DEFAULT_PASSWORD} (${user.displayName})`);
  }

  console.log('\n🎉 รีเซ็ตรหัสผ่าน Supplier ทุกบัญชีสำเร็จเรียบร้อยแล้ว!');
  console.log(`🔑 รหัสผ่านกลางของทุกบัญชีคือ: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาด:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
