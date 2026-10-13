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

  console.log('\n✨ All supplier rate card items seeded successfully into DB!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding supplier rates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
