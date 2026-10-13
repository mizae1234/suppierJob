import { PrismaClient } from '@prisma/client';
import { SUPPLIER_WASH_RATES } from '../lib/car-wash-rates';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding Supplier Car Wash Rate Cards into Database...\n');

  for (const [code, config] of Object.entries(SUPPLIER_WASH_RATES)) {
    // 1. Find or update supplier
    const supplier = await prisma.supplier.findUnique({
      where: { code },
    });

    if (!supplier) {
      console.warn(`⚠️ Supplier ${code} not found in database. Skipping.`);
      continue;
    }

    // Update tax info and showroom label
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        vatType: config.vatType,
        vatRate: config.vatRate,
        showroomLabel: config.showroomLabel,
      },
    });

    console.log(`🏢 [${code}] ${config.name} (VAT: ${config.vatType}, Showrooms: ${config.showroomLabel})`);

    // 2. Upsert each rate item
    for (const svc of config.services) {
      const item = await prisma.supplierRateItem.upsert({
        where: {
          supplierId_serviceCode: {
            supplierId: supplier.id,
            serviceCode: svc.serviceCode,
          },
        },
        update: {
          priceType: svc.priceType,
          price: svc.price,
          minPrice: svc.minPrice ?? null,
          maxPrice: svc.maxPrice ?? null,
          isActive: true,
        },
        create: {
          supplierId: supplier.id,
          serviceCode: svc.serviceCode,
          priceType: svc.priceType,
          price: svc.price,
          minPrice: svc.minPrice ?? null,
          maxPrice: svc.maxPrice ?? null,
          isActive: true,
        },
      });

      const priceDisplay = svc.priceType === 'RANGE' ? `฿${svc.minPrice} - ฿${svc.maxPrice}` : `฿${svc.price}`;
      console.log(`   └─ ✅ Service: ${svc.serviceCode} | Type: ${svc.priceType} | Price: ${priceDisplay}`);
    }
  }

  console.log('\n✨ All car wash supplier rate card items seeded successfully into DB!');

  console.log('\n🚚 Seeding Slide Supplier Details & Showroom Labels...');
  const slideSuppliersData = [
    {
      code: 'SP-SLIDE01',
      name: 'เอ สไลด์ออน (อุบลราชธานี)',
      showroomLabel: 'อุบลราชธานี',
      phone: '066-052-5522',
      address: '104/1 ถ. สมเด็จ อ. เมือง จ. อุบลราชธานี 34000',
      vatType: 'NO_VAT',
      vatRate: 0,
    },
    {
      code: 'SP-SLIDE02',
      name: 'ตรีเพชร คุ้มยิ้ม สไลด์คาร์ (อยุธยา)',
      showroomLabel: 'พระนครศรีอยุธยา',
      phone: '083-223-2849, 092-950-0223',
      address: '6/1 หมู่ 12 ต.อุทัย อ.อุทัย จ.พระนครศรีอยุธยา 13210',
      vatType: 'NO_VAT',
      vatRate: 0,
    },
    {
      code: 'SP-SLIDE03',
      name: 'PCW สไลด์คาร์ (กรุงเทพฯ)',
      showroomLabel: 'กรุงเทพฯ, ปริมณฑล, อยุธยา',
      phone: '081-000-0000',
      address: 'กรุงเทพฯ และปริมณฑล',
      vatType: 'NO_VAT',
      vatRate: 0,
    },
  ];

  for (const s of slideSuppliersData) {
    const existing = await prisma.supplier.findUnique({ where: { code: s.code } });
    if (existing) {
      await prisma.supplier.update({
        where: { id: existing.id },
        data: {
          showroomLabel: s.showroomLabel,
          phone: s.phone,
          address: s.address,
          vatType: s.vatType,
          vatRate: s.vatRate,
        },
      });
      console.log(`  ✅ [${s.code}] ${s.name} updated with showroomLabel: "${s.showroomLabel}"`);
    } else {
      await prisma.supplier.create({
        data: {
          code: s.code,
          name: s.name,
          services: 'VEHICLE_SLIDE',
          showroomLabel: s.showroomLabel,
          phone: s.phone,
          address: s.address,
          vatType: s.vatType,
          vatRate: s.vatRate,
        },
      });
      console.log(`  ✅ [${s.code}] ${s.name} created with showroomLabel: "${s.showroomLabel}"`);
    }
  }

  console.log('\n✨ All supplier rates and slide suppliers updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding supplier rates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
