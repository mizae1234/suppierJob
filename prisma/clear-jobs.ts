import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing all jobs and related records from database...\n');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Unlink invoices from jobs first
    await tx.job.updateMany({
      data: { invoiceId: null },
    });

    // 2. Delete child logs & items
    const deletedPoLogs = await tx.d365PoLog.deleteMany({});
    const deletedSlideLogs = await tx.vehicleSlideLog.deleteMany({});
    const deletedEvidences = await tx.jobEvidence.deleteMany({});
    const deletedActivities = await tx.jobActivity.deleteMany({});
    const deletedItems = await tx.carWashItem.deleteMany({});

    // 3. Delete Jobs & Invoices
    const deletedJobs = await tx.job.deleteMany({});
    const deletedInvoices = await tx.invoice.deleteMany({});

    // 4. Reset only job-locked vehicles (IN_TRANSIT / IN_WASH) back to AVAILABLE
    //    (preserve OUT_OF_STOCK status synced from D365)
    const resetVehicles = await tx.vehicle.updateMany({
      where: { status: { in: ['IN_TRANSIT', 'IN_WASH'] } },
      data: { status: 'AVAILABLE' },
    });

    return {
      deletedPoLogs: deletedPoLogs.count,
      deletedSlideLogs: deletedSlideLogs.count,
      deletedEvidences: deletedEvidences.count,
      deletedActivities: deletedActivities.count,
      deletedItems: deletedItems.count,
      deletedJobs: deletedJobs.count,
      deletedInvoices: deletedInvoices.count,
      resetVehicles: resetVehicles.count,
    };
  });

  console.log(`✅ Deleted ${result.deletedJobs} job(s)`);
  console.log(`✅ Deleted ${result.deletedItems} car wash / slide item(s)`);
  console.log(`✅ Deleted ${result.deletedInvoices} invoice(s)`);
  console.log(`✅ Deleted ${result.deletedEvidences} evidence(s)`);
  console.log(`✅ Deleted ${result.deletedActivities} activity log(s)`);
  console.log(`✅ Deleted ${result.deletedSlideLogs} vehicle slide log(s)`);
  console.log(`✅ Deleted ${result.deletedPoLogs} D365 PO log(s)`);
  console.log(`✅ Reset ${result.resetVehicles} locked vehicle(s) (IN_TRANSIT/IN_WASH) back to 'AVAILABLE'`);

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
