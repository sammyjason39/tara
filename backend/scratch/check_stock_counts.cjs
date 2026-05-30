const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

async function main() {
  const totalStocks = await prisma.stock_levels.count({
    where: { tenant_id: 'tnt-3rlhko' }
  });

  const locations = await prisma.locations.findMany({
    where: { tenant_id: 'tnt-3rlhko' }
  });

  console.log(`\n========================================`);
  console.log(`📊 LIVE DATABASE STOCK LEVEL COUNT: ${totalStocks} 📊`);
  console.log(`========================================`);
  
  for (const loc of locations) {
    const count = await prisma.stock_levels.count({
      where: { location_id: loc.id }
    });
    console.log(`Branch: ${loc.name.padEnd(25)} | Count: ${count}`);
  }
  console.log(`========================================\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
