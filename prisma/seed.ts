import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── 1. Companies ───────────────────────────────────
  console.log('📦 Creating Companies...');
  const ev7 = await prisma.company.upsert({
    where: { code: 'EV7' },
    update: {},
    create: {
      code: 'EV7',
      name: 'บริษัท อีวี เซเว่น จำกัด (EV7 Co., Ltd.)',
      taxId: '0105565012345',
      address: '99/9 อาคารอีวีทาวเวอร์ ชั้น 12 ถนนพระราม 9 ห้วยขวาง กรุงเทพฯ 10310',
    },
  });

  const gi = await prisma.company.upsert({
    where: { code: 'GI' },
    update: {
      name: 'บริษัท โกลด์ อินทิเกรท จำกัด (Gold Integrate)',
    },
    create: {
      code: 'GI',
      name: 'บริษัท โกลด์ อินทิเกรท จำกัด (Gold Integrate)',
      taxId: '0105564098765',
      address: '888 หมู่ 5 ถนนบางนา-ตราด กม.18 ตำบลบางโฉลง อำเภอบางพลี สมุทรปราการ 10540',
    },
  });
  console.log(`  ✅ ${ev7.code} (${ev7.id})`);
  console.log(`  ✅ ${gi.code} (${gi.id})`);

  // ─── 2. Branches ────────────────────────────────────
  console.log('\n🏢 Creating Branches...');

  const branchesData = [
    // EV7 (ไม่มีบริษัทย่อยหรือสาขา)
    { companyId: ev7.id, code: 'EV7', name: 'EV7', address: 'สำนักงานใหญ่ EV7 ถ.พระราม 9 แขวงบางกะปิ เขตห้วยขวาง กทม.', phone: '02-719-8888', latitude: 13.7563, longitude: 100.5648 },
    // GI (มีบริษัทย่อย/สาขา)
    { companyId: gi.id, code: 'GI-KANJANA', name: 'GI-กาญจนาภิเษก' },
    { companyId: gi.id, code: 'GI-CHIANGMAI', name: 'GI-เชียงใหม่' },
    { companyId: gi.id, code: 'GI-PHIBUN', name: 'GI-พิบูล' },
    { companyId: gi.id, code: 'GI-MAHACHAI', name: 'GI-มหาชัย' },
    { companyId: gi.id, code: 'GI-LIABDUAN', name: 'GI-เลียบด่วน' },
    { companyId: gi.id, code: 'GI-VIPHA', name: 'GI-วิภา' },
    { companyId: gi.id, code: 'GI-SALAYA', name: 'GI-ศาลายา' },
    { companyId: gi.id, code: 'GI-SILOM', name: 'GI-สีลม' },
    { companyId: gi.id, code: 'GI-AYUTTHAYA', name: 'GI-อยุธยา' },
    { companyId: gi.id, code: 'GI-UBON', name: 'GI-อุบลราชธานี' },
  ];

  const branches: Record<string, { id: string }> = {};
  for (const b of branchesData) {
    const branch = await prisma.branch.upsert({
      where: { companyId_code: { companyId: b.companyId, code: b.code } },
      update: {},
      create: b,
    });
    branches[b.code] = branch;
    console.log(`  ✅ ${b.code} — ${b.name}`);
  }

  // ─── 3. Suppliers ───────────────────────────────────
  console.log('\n🤝 Creating Suppliers...');

  const suppliersData = [
    {
      code: 'SP-CLEANPRO',
      name: 'บริษัท คลีนโปร คาร์วอช เซอร์วิส จำกัด',
      taxId: '0105558091234',
      phone: '081-456-7890',
      email: 'contact@cleanpro-fleet.com',
      address: '45/8 ถนนศรีนครินทร์ สวนหลวง กรุงเทพฯ',
      services: 'CAR_WASH',
      bankName: 'ธนาคารกสิกรไทย',
      bankAccount: '789-2-34567-8',
    },
    {
      code: 'SP-SLIDEEX',
      name: 'Slide Express Logistics Co., Ltd.',
      taxId: '0105561054321',
      phone: '089-012-3456',
      email: 'dispatch@slideexpress.co.th',
      address: '100/1 ถนนบางนา-ตราด กม.10 บางพลี สมุทรปราการ',
      services: 'VEHICLE_SLIDE',
      bankName: 'ธนาคารไทยพาณิชย์',
      bankAccount: '123-4-56789-0',
    },
    {
      code: 'SP-WASHHUB',
      name: 'Wash Hub Premium Service (วอชฮับ)',
      taxId: '0105562087654',
      phone: '095-678-9012',
      email: 'service@washhub.co.th',
      address: '22/3 ซอยลาดพร้าว 87 วังทองหลาง กรุงเทพฯ',
      services: 'CAR_WASH,VEHICLE_SLIDE',
      bankName: 'ธนาคารกรุงเทพ',
      bankAccount: '456-7-89012-3',
    },
  ];

  const suppliers: Record<string, { id: string }> = {};
  for (const s of suppliersData) {
    const supplier = await prisma.supplier.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
    suppliers[s.code] = supplier;
    console.log(`  ✅ ${s.code} — ${s.name}`);
  }

  // ─── 4. Vehicles ────────────────────────────────────
  console.log('\n🚗 Creating Vehicles...');

  const vehiclesData = [
    // EV7 (ไม่มีสาขาย่อย)
    { vin: 'LC07C5EB8PA001234', model: 'BYD Atto 3 Extended Range', color: 'Ski White', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'SUV', licensePlate: '3ขข-1234 กทม.', mileage: 14200 },
    { vin: 'LC07C5EB1PA005678', model: 'BYD Dolphin Premium Extended', color: 'Coral Pink', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Hatchback', licensePlate: '4ขค-5678 กทม.', mileage: 8300 },
    { vin: 'LC07C5EB9PA009012', model: 'BYD Seal AWD Performance', color: 'Aurora White', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Sedan', licensePlate: '1ขฉ-9012 กทม.', mileage: 5600 },
    { vin: 'LSJ574892PA003344', model: 'MG4 Electric EV Long Range', color: 'Andes Grey', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Hatchback', licensePlate: '2กง-3344 กทม.', mileage: 18900 },
    { vin: 'LZW7AE324PA007788', model: 'ORA Good Cat 500 Ultra', color: 'Hamilton White', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Hatchback', licensePlate: '5ขฐ-7788 กทม.', mileage: 22100 },
    { vin: 'LZW7AE329PA004455', model: 'ORA 07 GT Long Range', color: 'Amethyst Purple', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Sedan', licensePlate: '3ขต-4455 กทม.', mileage: 4100 },
    { vin: 'LC07C5EB4PA002233', model: 'BYD Atto 3 Dynamic', color: 'Forest Green', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'SUV', licensePlate: 'ขข-2233 เชียงใหม่', mileage: 16500 },
    { vin: 'LC07C5EB7PA006699', model: 'BYD Dolphin Standard Range', color: 'Surf Blue', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Hatchback', licensePlate: 'ขง-6699 เชียงใหม่', mileage: 9800 },
    // GI — กาญจนาภิเษก
    { vin: 'LGS4D8618PA001199', model: 'Deepal S07 Smart EV', color: 'Nebula Green', companyId: gi.id, currentBranchId: branches['GI-KANJANA'].id, vehicleType: 'SUV', licensePlate: '1ขษ-1199 กทม.', mileage: 7400 },
    { vin: 'LGS4D8613PA006677', model: 'Deepal L07 Fastback EV', color: 'Lunar Grey', companyId: gi.id, currentBranchId: branches['GI-KANJANA'].id, vehicleType: 'Sedan', licensePlate: '4ขส-6677 กทม.', mileage: 11200 },
    { vin: 'LNN6A5229PA008811', model: 'NETA V-II Smart', color: 'Baby Blue', companyId: gi.id, currentBranchId: branches['GI-KANJANA'].id, vehicleType: 'Hatchback', licensePlate: '2ขภ-8811 กทม.', mileage: 26500 },
    { vin: 'LNN6A5224PA003366', model: 'NETA V-II Explore', color: 'Pearl White', companyId: gi.id, currentBranchId: branches['GI-KANJANA'].id, vehicleType: 'Hatchback', licensePlate: '6กท-3366 กทม.', mileage: 31200 },
    // GI — เชียงใหม่
    { vin: 'LGS4D8610PA009944', model: 'Deepal S07 Smart EV', color: 'Eclipse Black', companyId: gi.id, currentBranchId: branches['GI-CHIANGMAI'].id, vehicleType: 'SUV', licensePlate: 'กง-9944 เชียงใหม่', mileage: 19800 },
    { vin: 'LGS4D8615PA005522', model: 'Deepal S07 Max EV', color: 'Glacier White', companyId: gi.id, currentBranchId: branches['GI-CHIANGMAI'].id, vehicleType: 'SUV', licensePlate: 'กจ-5522 เชียงใหม่', mileage: 3200 },
    { vin: 'LNN6A5227PA007744', model: 'NETA X Mid Range', color: 'Titanium Grey', companyId: gi.id, currentBranchId: branches['GI-CHIANGMAI'].id, vehicleType: 'SUV', licensePlate: 'กฉ-7744 เชียงใหม่', mileage: 15600 },
    // EV7 — เพิ่มเติม (5 คัน)
    { vin: 'LC07C5EB3PA004123', model: 'BYD Sealion 6 DM-i', color: 'Arctic White', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'SUV', licensePlate: '5ขร-4123 กทม.', mileage: 3500 },
    { vin: 'LZW7AE321PA008899', model: 'ORA Good Cat GT', color: 'Sun Black', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Hatchback', licensePlate: '2ขล-8899 กทม.', mileage: 12400 },
    { vin: 'LC07C5EB2PA007711', model: 'BYD Seal Dynamic', color: 'Atlantis Grey', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Sedan', licensePlate: '4ขบ-7711 กทม.', mileage: 6800 },
    { vin: 'LSJ574898PA005566', model: 'MG Cyberster EV', color: 'Inca Yellow', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Sedan', licensePlate: 'ขจ-5566 เชียงใหม่', mileage: 2100 },
    { vin: 'LC07C5EB6PA003322', model: 'BYD Dolphin Standard Range', color: 'Maldive Purple', companyId: ev7.id, currentBranchId: branches['EV7'].id, vehicleType: 'Hatchback', licensePlate: 'ขฉ-3322 เชียงใหม่', mileage: 15300 },
    // GI — เพิ่มเติม (5 คัน)
    { vin: 'LGS4D8617PA002288', model: 'Deepal S07 L EV', color: 'Comet White', companyId: gi.id, currentBranchId: branches['GI-KANJANA'].id, vehicleType: 'SUV', licensePlate: '3ขษ-2288 กทม.', mileage: 8900 },
    { vin: 'LGS4D8612PA004499', model: 'Deepal L07 Sport EV', color: 'Sunset Orange', companyId: gi.id, currentBranchId: branches['GI-KANJANA'].id, vehicleType: 'Sedan', licensePlate: '1ขห-4499 กทม.', mileage: 4700 },
    { vin: 'LNN6A5221PA006633', model: 'NETA X Smart EV', color: 'Glacier Blue', companyId: gi.id, currentBranchId: branches['GI-KANJANA'].id, vehicleType: 'SUV', licensePlate: '5กท-6633 กทม.', mileage: 11200 },
    { vin: 'LGS4D8616PA008855', model: 'Deepal S07 Max EV', color: 'Space Grey', companyId: gi.id, currentBranchId: branches['GI-CHIANGMAI'].id, vehicleType: 'SUV', licensePlate: 'กน-8855 เชียงใหม่', mileage: 6300 },
    { vin: 'LNN6A5228PA001144', model: 'NETA V-II Lite', color: 'Sakura Pink', companyId: gi.id, currentBranchId: branches['GI-CHIANGMAI'].id, vehicleType: 'Hatchback', licensePlate: 'กต-1144 เชียงใหม่', mileage: 18700 },
  ];

  for (const v of vehiclesData) {
    await prisma.vehicle.upsert({
      where: { vin: v.vin },
      update: {},
      create: v,
    });
    console.log(`  ✅ ${v.vin} — ${v.model} (${v.color})`);
  }

  // ─── 5. Users ───────────────────────────────────────
  console.log('\n👤 Creating Users...');

  const usersData = [
    {
      username: 'master',
      password: 'master1234',
      displayName: 'ผู้ดูแลระบบสูงสุด (Master)',
      firstName: 'วิชัย',
      lastName: 'ศรีสุข',
      position: 'ผู้ดูแลระบบสูงสุด',
      phone: '081-111-0000',
      role: 'MASTER',
      companyId: null as string | null,
      branchId: null as string | null,
      supplierId: null as string | null,
    },
    {
      username: 'admin-ev7',
      password: 'ev71234',
      displayName: 'ผู้ดูแล EV7 (Admin EV7)',
      firstName: 'สมชาย',
      lastName: 'พัฒนกิจ',
      position: 'ผู้จัดการทั่วไป',
      phone: '089-222-3333',
      role: 'ADMIN',
      companyId: ev7.id,
      branchId: null as string | null,
      supplierId: null as string | null,
    },
    {
      username: 'admin-gi',
      password: 'gi1234',
      displayName: 'ผู้ดูแล GI (Admin GI)',
      firstName: 'ปิยะ',
      lastName: 'กิจเจริญ',
      position: 'ผู้จัดการทั่วไป',
      phone: '062-444-5555',
      role: 'ADMIN',
      companyId: gi.id,
      branchId: null as string | null,
      supplierId: null as string | null,
    },
    {
      username: 'branch-rm9',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขาพระราม 9',
      firstName: 'ธนา',
      lastName: 'วงศ์ประเสริฐ',
      position: 'ผู้จัดการสาขา',
      phone: '085-666-7777',
      role: 'BRANCH',
      companyId: ev7.id,
      branchId: branches['EV7'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-kanjana',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขากาญจนาภิเษก',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-KANJANA'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-chiangmai',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขาเชียงใหม่',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-CHIANGMAI'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-phibun',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขาพิบูล',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-PHIBUN'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-mahachai',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขามหาชัย',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-MAHACHAI'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-liabduan',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขาเลียบด่วน',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-LIABDUAN'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-vipha',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขาวิภา',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-VIPHA'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-salaya',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขาศาลายา',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-SALAYA'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-silom',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขาสีลม',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-SILOM'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-ayutthaya',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขาอยุธยา',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-AYUTTHAYA'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-ubon',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขาอุบลราชธานี',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: gi.id,
      branchId: branches['GI-UBON'].id,
      supplierId: null as string | null,
    },
    {
      username: 'branch-ev7',
      password: 'branch1234',
      displayName: 'เจ้าหน้าที่สาขา EV7',
      position: 'เจ้าหน้าที่สาขา',
      role: 'BRANCH',
      companyId: ev7.id,
      branchId: branches['EV7'].id,
      supplierId: null as string | null,
    },
    {
      username: 'supplier-cleanpro',
      password: 'sup1234',
      displayName: 'CleanPro คาร์วอช',
      firstName: 'อนุชา',
      lastName: 'คลีนโปร',
      position: 'ผู้จัดการฝ่ายปฏิบัติการ',
      phone: '081-456-7890',
      role: 'SUPPLIER',
      companyId: ev7.id,
      branchId: null as string | null,
      supplierId: suppliers['SP-CLEANPRO'].id,
    },
    {
      username: 'supplier-slideex',
      password: 'sup1234',
      displayName: 'Slide Express Logistics',
      firstName: 'พิชัย',
      lastName: 'สไลด์เอ็กซ์เพรส',
      position: 'ผู้จัดการขนส่ง',
      phone: '089-012-3456',
      role: 'SUPPLIER',
      companyId: null as string | null,
      branchId: null as string | null,
      supplierId: suppliers['SP-SLIDEEX'].id,
    },
    {
      username: 'supplier-washhub',
      password: 'sup1234',
      displayName: 'Wash Hub Premium Service (วอชฮับ)',
      firstName: 'กิตติ',
      lastName: 'วอชฮับ',
      position: 'เจ้าหน้าที่บริการ',
      phone: '095-678-9012',
      role: 'SUPPLIER',
      companyId: null as string | null,
      branchId: null as string | null,
      supplierId: suppliers['SP-WASHHUB'].id,
    },
  ];

  for (const u of usersData) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        companyId: u.companyId,
        firstName: u.firstName,
        lastName: u.lastName,
        position: u.position,
        phone: u.phone,
      },
      create: {
        username: u.username,
        password: hashedPassword,
        displayName: u.displayName,
        firstName: u.firstName,
        lastName: u.lastName,
        position: u.position,
        phone: u.phone,
        role: u.role,
        companyId: u.companyId,
        branchId: u.branchId,
        supplierId: u.supplierId,
      },
    });
    console.log(`  ✅ ${u.username} (${u.role}) — ${u.firstName} ${u.lastName} / ${u.position}`);
  }

  // ─── Summary ────────────────────────────────────────
  const counts = {
    companies: await prisma.company.count(),
    branches: await prisma.branch.count(),
    suppliers: await prisma.supplier.count(),
    vehicles: await prisma.vehicle.count(),
    users: await prisma.user.count(),
  };

  console.log('\n─────────────────────────────────');
  console.log('🎉 Seed completed successfully!');
  console.log(`  Companies: ${counts.companies}`);
  console.log(`  Branches:  ${counts.branches}`);
  console.log(`  Suppliers: ${counts.suppliers}`);
  console.log(`  Vehicles:  ${counts.vehicles}`);
  console.log(`  Users:     ${counts.users}`);
  console.log('─────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
