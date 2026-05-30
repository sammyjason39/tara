const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

async function main() {
  console.log('Fetching active retail stores and channels...');
  
  // Try to query any tables related to stores or channels. Let's see if we can find them.
  // In NestJS we saw: retailService.listStores and retailService.listChannels
  // Let's check which tables exist in schema.prisma for stores/channels/POS.
  // We can query prisma.locations and print their details.
  
  const locations = await prisma.locations.findMany({
    where: { tenant_id: 'tnt-3rlhko' }
  });

  console.log('\n--- LOCATIONS IN DATABASE ---');
  console.log(JSON.stringify(locations, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
