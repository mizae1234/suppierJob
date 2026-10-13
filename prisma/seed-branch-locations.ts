import { PrismaClient } from '@prisma/client';
import { BRANCH_DEFAULT_LOCATIONS } from '../lib/vehicle-slide-rates';

const prisma = new PrismaClient();

async function main() {
  console.log('📍 Seeding GPS coordinates and official addresses for all branches...\n');

  for (const [code, loc] of Object.entries(BRANCH_DEFAULT_LOCATIONS)) {
    const branch = await prisma.branch.findFirst({
      where: { code },
    });

    if (branch) {
      await prisma.branch.update({
        where: { id: branch.id },
        data: {
          latitude: loc.lat,
          longitude: loc.lng,
          address: loc.address,
        },
      });
      console.log(`  ✅ [${code}] ${branch.name} updated: (${loc.lat}, ${loc.lng})`);
    } else {
      console.warn(`  ⚠️ Branch ${code} not found in DB`);
    }
  }

  console.log('\n✨ All branch coordinates seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding branch locations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
