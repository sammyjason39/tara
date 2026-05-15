const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    const locs = await prisma.locations.findMany({ where: { deleted_at: null }, take: 10 });
    const items = await prisma.item_masters.findMany({ take: 10 });
    const stores = await prisma.stores.findMany({ take: 10 });
    console.log(JSON.stringify({ locs, items, stores }));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
