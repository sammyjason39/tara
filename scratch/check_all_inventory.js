const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const ctx = { tenant_id: 'tnt-3rlhko' };
  try {
    const allStock = await prisma.stock_levels.findMany({
      where: { tenant_id: ctx.tenant_id },
      include: { locations: true }
    });
    console.log('ALL_INVENTORY:', JSON.stringify(allStock.map(s => ({
      location: s.locations.name,
      type: s.locations.type,
      qty: s.on_hand
    }))));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
