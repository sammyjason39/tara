const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

async function main() {
  console.log('Fetching all stores for tenant...');
  const stores = await prisma.stores.findMany({
    where: { tenant_id: 'tnt-3rlhko' }
  });
  console.log('\n--- RETAIL STORES ---');
  console.log(JSON.stringify(stores, null, 2));

  console.log('\nFetching all retail channels...');
  const channels = await prisma.retail_channels.findMany({
    where: { tenant_id: 'tnt-3rlhko' }
  });
  console.log('\n--- RETAIL CHANNELS ---');
  console.log(JSON.stringify(channels, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
