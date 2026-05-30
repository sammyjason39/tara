import { PrismaClient } from '@prisma/client';

const prodUrl = "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public";
const prisma = new PrismaClient({ datasources: { db: { url: prodUrl } } });

async function run() {
  console.log("Checking production stock levels...");
  
  // Resolve locations
  const locations = await prisma.locations.findMany({
    where: { tenant_id: 'tnt-3rlhko' }
  });
  
  for (const loc of locations) {
    const stockCount = await prisma.stock_levels.count({
      where: { location_id: loc.id }
    });
    
    const totalQty = await prisma.stock_levels.findMany({
      where: { location_id: loc.id },
      select: { on_hand: true }
    });
    const sumQty = totalQty.reduce((acc, curr) => acc + Number(curr.on_hand), 0);
    
    console.log(`Location: "${loc.name}" (Code: ${loc.code}) | Stock Row Count: ${stockCount} | Sum of On Hand Qty: ${sumQty}`);
  }
  
  await prisma.$disconnect();
}

run();
