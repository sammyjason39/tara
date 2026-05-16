const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stores = await prisma.stores.findMany({
    select: { id: true, name: true, code: true, tenant_id: true, location_id: true }
  });
  console.log(JSON.stringify(stores, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
