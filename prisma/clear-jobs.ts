import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing all jobs and related records from database...\n');

  // 1. Unlink invoices from jobs first
  await prisma.job.updateMany({
    data: { invoiceId: null },
  });

  // 2. Delete Invoices
  const deletedInvoices = await prisma.invoice.deleteMany({});
  console.log(`✅ Deleted ${deletedInvoices.count} invoice(s)`);

  // 3. Delete Evidences
  const deletedEvidences = await prisma.jobEvidence.deleteMany({});
  console.log(`✅ Deleted ${deletedEvidences.count} evidence(s)`);

  // 4. Delete Activities
  const deletedActivities = await prisma.jobActivity.deleteMany({});
  console.log(`✅ Deleted ${deletedActivities.count} activity log(s)`);

  // 5. Delete Car Wash Items
  const deletedItems = await prisma.carWashItem.deleteMany({});
  console.log(`✅ Deleted ${deletedItems.count} car wash item(s)`);

  // 6. Delete Jobs
  const deletedJobs = await prisma.job.deleteMany({});
  console.log(`✅ Deleted ${deletedJobs.count} job(s)`);

  // 7. Reset all vehicles to AVAILABLE status
  const resetVehicles = await prisma.vehicle.updateMany({
    data: { status: 'AVAILABLE' },
  });
  console.log(`✅ Reset status of all ${resetVehicles.count} vehicle(s) to 'AVAILABLE'`);

  console.log('\n🎉 System is completely clear and clean! Ready for fresh job creation.');
}

main()
  .catch((e) => {
    console.error('❌ Error clearing jobs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
