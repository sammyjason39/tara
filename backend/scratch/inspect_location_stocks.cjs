const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

async function main() {
  console.log('Querying stock level counts per location...');
  
  const locations = await prisma.locations.findMany({
    where: { tenant_id: 'tnt-3rlhko' }
  });

  console.log('\n--- STOCK LEVELS PER LOCATION ---');
  for (const loc of locations) {
    const count = await prisma.stock_levels.count({
      where: { location_id: loc.id }
    });
    console.log(`ID: ${loc.id} | Code: ${loc.code.padEnd(12)} | Name: ${loc.name.padEnd(25)} | Stocks Count: ${count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
