import { PrismaClient } from '@prisma/client';

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
    update: {},
    create: {
      code: 'GI',
      name: 'บริษัท เจเนอรัล อินเทลลิเจนท์ จำกัด (GI Fleet)',
      taxId: '0105564098765',
      address: '888 หมู่ 5 ถนนบางนา-ตราด กม.18 ตำบลบางโฉลง อำเภอบางพลี สมุทรปราการ 10540',
    },
  });
  console.log(`  ✅ ${ev7.code} (${ev7.id})`);
  console.log(`  ✅ ${gi.code} (${gi.id})`);

  // ─── 2. Branches ────────────────────────────────────
  console.log('\n🏢 Creating Branches...');

  const branchesData = [
    // EV7
    { companyId: ev7.id, code: 'EV7-RM9', name: 'EV7 สาขาพระราม 9 (สำนักงานใหญ่)', address: '99/9 ถ.พระราม 9 แขวงบางกะปิ เขตห้วยขวาง กทม.', phone: '02-719-8888' },
    { companyId: ev7.id, code: 'EV7-RNG', name: 'EV7 สาขารังสิต คลอง 1', address: '15/2 ถ.พหลโยธิน ต.ประชาธิปัตย์ อ.ธัญบุรี ปทุมธานี', phone: '02-998-1122' },
    { companyId: ev7.id, code: 'EV7-CNX', name: 'EV7 สาขาเชียงใหม่ ซุปเปอร์ไฮเวย์', address: '244 หมู่ 4 ถ.เชียงใหม่-ลำปาง ต.หนองป่าครั่ง อ.เมือง จ.เชียงใหม่', phone: '053-245-566' },
    // GI
    { companyId: gi.id, code: 'GI-BNA', name: 'GI Hub บางนา-สุวรรณภูมิ', address: '888 ถ.บางนา-ตราด กม.18 ต.บางโฉลง อ.บางพลี สมุทรปราการ', phone: '02-334-5500' },
    { companyId: gi.id, code: 'GI-CHON', name: 'GI Hub แหลมฉบัง ชลบุรี', address: '123/45 นิคมอุตสาหกรรมแหลมฉบัง ต.ทุ่งสุขลา อ.ศรีราชา จ.ชลบุรี', phone: '038-490-123' },
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
    // EV7 — พระราม 9
    { vin: 'LC07C5EB8PA001234', model: 'BYD Atto 3 Extended Range', color: 'Ski White', companyId: ev7.id, currentBranchId: branches['EV7-RM9'].id, vehicleType: 'SUV', licensePlate: '3ขข-1234 กทม.', mileage: 14200 },
    { vin: 'LC07C5EB1PA005678', model: 'BYD Dolphin Premium Extended', color: 'Coral Pink', companyId: ev7.id, currentBranchId: branches['EV7-RM9'].id, vehicleType: 'Hatchback', licensePlate: '4ขค-5678 กทม.', mileage: 8300 },
    { vin: 'LC07C5EB9PA009012', model: 'BYD Seal AWD Performance', color: 'Aurora White', companyId: ev7.id, currentBranchId: branches['EV7-RM9'].id, vehicleType: 'Sedan', licensePlate: '1ขฉ-9012 กทม.', mileage: 5600 },
    { vin: 'LSJ574892PA003344', model: 'MG4 Electric EV Long Range', color: 'Andes Grey', companyId: ev7.id, currentBranchId: branches['EV7-RM9'].id, vehicleType: 'Hatchback', licensePlate: '2กง-3344 กทม.', mileage: 18900 },
    // EV7 — รังสิต
    { vin: 'LZW7AE324PA007788', model: 'ORA Good Cat 500 Ultra', color: 'Hamilton White', companyId: ev7.id, currentBranchId: branches['EV7-RNG'].id, vehicleType: 'Hatchback', licensePlate: '5ขฐ-7788 กทม.', mileage: 22100 },
    { vin: 'LZW7AE329PA004455', model: 'ORA 07 GT Long Range', color: 'Amethyst Purple', companyId: ev7.id, currentBranchId: branches['EV7-RNG'].id, vehicleType: 'Sedan', licensePlate: '3ขต-4455 กทม.', mileage: 4100 },
    // EV7 — เชียงใหม่
    { vin: 'LC07C5EB4PA002233', model: 'BYD Atto 3 Dynamic', color: 'Forest Green', companyId: ev7.id, currentBranchId: branches['EV7-CNX'].id, vehicleType: 'SUV', licensePlate: 'ขข-2233 เชียงใหม่', mileage: 16500 },
    { vin: 'LC07C5EB7PA006699', model: 'BYD Dolphin Standard Range', color: 'Surf Blue', companyId: ev7.id, currentBranchId: branches['EV7-CNX'].id, vehicleType: 'Hatchback', licensePlate: 'ขง-6699 เชียงใหม่', mileage: 9800 },
    // GI — บางนา
    { vin: 'LGS4D8618PA001199', model: 'Deepal S07 Smart EV', color: 'Nebula Green', companyId: gi.id, currentBranchId: branches['GI-BNA'].id, vehicleType: 'SUV', licensePlate: '1ขษ-1199 กทม.', mileage: 7400 },
    { vin: 'LGS4D8613PA006677', model: 'Deepal L07 Fastback EV', color: 'Lunar Grey', companyId: gi.id, currentBranchId: branches['GI-BNA'].id, vehicleType: 'Sedan', licensePlate: '4ขส-6677 กทม.', mileage: 11200 },
    { vin: 'LNN6A5229PA008811', model: 'NETA V-II Smart', color: 'Baby Blue', companyId: gi.id, currentBranchId: branches['GI-BNA'].id, vehicleType: 'Hatchback', licensePlate: '2ขภ-8811 กทม.', mileage: 26500 },
    { vin: 'LNN6A5224PA003366', model: 'NETA V-II Explore', color: 'Pearl White', companyId: gi.id, currentBranchId: branches['GI-BNA'].id, vehicleType: 'Hatchback', licensePlate: '6กท-3366 กทม.', mileage: 31200 },
    // GI — ชลบุรี
    { vin: 'LGS4D8610PA009944', model: 'Deepal S07 Smart EV', color: 'Eclipse Black', companyId: gi.id, currentBranchId: branches['GI-CHON'].id, vehicleType: 'SUV', licensePlate: 'กง-9944 ชลบุรี', mileage: 19800 },
    { vin: 'LGS4D8615PA005522', model: 'Deepal S07 Max EV', color: 'Glacier White', companyId: gi.id, currentBranchId: branches['GI-CHON'].id, vehicleType: 'SUV', licensePlate: 'กจ-5522 ชลบุรี', mileage: 3200 },
    { vin: 'LNN6A5227PA007744', model: 'NETA X Mid Range', color: 'Titanium Grey', companyId: gi.id, currentBranchId: branches['GI-CHON'].id, vehicleType: 'SUV', licensePlate: 'กฉ-7744 ชลบุรี', mileage: 15600 },
  ];

  for (const v of vehiclesData) {
    await prisma.vehicle.upsert({
      where: { vin: v.vin },
      update: {},
      create: v,
    });
    console.log(`  ✅ ${v.vin} — ${v.model} (${v.color})`);
  }

  // ─── Summary ────────────────────────────────────────
  const counts = {
    companies: await prisma.company.count(),
    branches: await prisma.branch.count(),
    suppliers: await prisma.supplier.count(),
    vehicles: await prisma.vehicle.count(),
  };

  console.log('\n─────────────────────────────────');
  console.log('🎉 Seed completed successfully!');
  console.log(`  Companies: ${counts.companies}`);
  console.log(`  Branches:  ${counts.branches}`);
  console.log(`  Suppliers: ${counts.suppliers}`);
  console.log(`  Vehicles:  ${counts.vehicles}`);
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
