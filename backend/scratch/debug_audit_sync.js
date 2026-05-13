const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAuditSync() {
  console.log('--- DEBUGGING AUDIT SYNC (JS) ---');
  
  try {
    const cycles = await prisma.inventory_audit_cycles.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    console.log(`Found ${cycles.length} completed cycles.`);

    for (const cycle of cycles) {
      console.log(`Cycle ID: ${cycle.id} | Location: ${cycle.location_code} | Counted: ${cycle.counted_value}`);
      const itemsCount = await prisma.inventory_audit_items.count({
        where: { cycle_id: cycle.id }
      });
      console.log(`- Audit Items Count: ${itemsCount}`);
    }

    const locs = await prisma.locations.findMany({
      where: { code: 'BS-SS-LOC' }
    });
    console.log(`BS-SS-LOC locations: ${locs.length}`);
    for (const l of locs) {
       const s = await prisma.stock_levels.count({ where: { location_id: l.id } });
       console.log(`Location ${l.id} has ${s} stock levels.`);
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuditSync();
