const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

async function main() {
  console.log('Querying Database Metadata for Tenant: tnt-3rlhko...\n');

  // 1. Fetch Categories
  const categories = await prisma.product_categories.findMany({
    where: { tenant_id: 'tnt-3rlhko' }
  });
  console.log('--- PRODUCT CATEGORIES ---');
  console.log(JSON.stringify(categories, null, 2));

  // 2. Fetch Locations
  const locations = await prisma.locations.findMany({
    where: { tenant_id: 'tnt-3rlhko' }
  });
  console.log('\n--- LOCATIONS ---');
  console.log(JSON.stringify(locations, null, 2));

  // 3. Fetch Sample Item Master
  const sampleItem = await prisma.item_masters.findFirst({
    where: { tenant_id: 'tnt-3rlhko' }
  });
  console.log('\n--- SAMPLE ITEM MASTER ---');
  console.log(JSON.stringify(sampleItem, null, 2));

  await prisma.$disconnect();
}

main();
