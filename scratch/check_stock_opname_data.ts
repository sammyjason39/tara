import { PrismaClient } from '@prisma/client';

// Use port 5433 as in the other script, assuming it's the VPS tunnel
const databaseUrl = "postgresql://zenvix:zenvix_secure_2026!@localhost:5432/zenvix_prod?schema=public";
process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  console.log("Connecting to:", databaseUrl);
  try {
    const locations = await prisma.locations.findMany({
      where: {
        code: { in: ['BS-SS-LOC', 'BS-ANC-LOC'] }
      },
      select: { id: true, name: true, code: true }
    });

    console.log("--- target Locations ---");
    console.table(locations);

    if (locations.length === 0) {
      console.log("No locations found with code 'ss' or 'anchor'. Checking all locations to see if codes differ.");
      const allLocs = await prisma.locations.findMany({ take: 10 });
      console.table(allLocs.map(l => ({ id: l.id, name: l.name, code: l.code })));
      return;
    }

    for (const loc of locations) {
      console.log(`\n--- Stock Levels for ${loc.name} (${loc.code}) ---`);
      const stocks = await prisma.stock_levels.findMany({
        where: { location_id: loc.id },
        include: {
          item_masters: {
            select: { name: true, sku: true, barcode: true }
          }
        },
        take: 10
      });
      
      console.table(stocks.map(s => ({
        id: s.id,
        item: s.item_masters.name,
        sku: s.item_masters.sku,
        on_hand: Number(s.on_hand),
        available: Number(s.available)
      })));
    }

  } catch (err) {
    console.error("Failed to query DB:", err);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
