import { PrismaClient } from '@prisma/client';

const prodUrl = "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public";
const prisma = new PrismaClient({ datasources: { db: { url: prodUrl } } });

async function run() {
  console.log("Checking database valuations for Seminyak branch (BS-03)...");
  
  // Resolve location
  const loc = await prisma.locations.findFirst({
    where: { tenant_id: 'tnt-3rlhko', code: 'BS-03' }
  });
  
  if (!loc) {
    console.error("Seminyak location not found in DB!");
    await prisma.$disconnect();
    return;
  }
  
  const stockLevels = await prisma.stock_levels.findMany({
    where: { location_id: loc.id },
    include: {
      item_masters: true
    }
  });

  let totalItems = 0;
  let totalQty = 0;
  let totalCapital = 0;
  let totalSelling = 0;

  for (const sl of stockLevels) {
    const qty = Number(sl.on_hand);
    if (qty > 0) {
      totalItems++;
      totalQty += qty;
      const capital = Number(sl.item_masters?.base_price || 0);
      const selling = Number(sl.item_masters?.selling_price || 0);
      totalCapital += qty * capital;
      totalSelling += qty * selling;
    }
  }

  console.log("--- DATABASE VALUATIONS (SEMINYAK BS-03) ---");
  console.log(`Total Active SKUs in DB: ${totalItems}`);
  console.log(`Total Quantity: ${totalQty} units`);
  console.log(`Total Valuation (Capital Cost): Rp ${totalCapital.toLocaleString('id-ID')}`);
  console.log(`Total Valuation (Selling Price): Rp ${totalSelling.toLocaleString('id-ID')}`);

  await prisma.$disconnect();
}

run();
