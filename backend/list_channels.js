const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const channels = await prisma.retail_channels.findMany({
    select: { id: true, name: true, type: true, tenant_id: true }
  });
  console.log(JSON.stringify(channels, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
