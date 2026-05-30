import { PrismaClient } from '@prisma/client';

const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

async function main() {
  console.log("--- Querying production items with SKU starting with '580' ---");
  const items580 = await prodPrisma.item_masters.findMany({
    where: { sku: { startsWith: '580' } },
    take: 10
  });
  console.log("Found starting with '580':", items580.map(i => ({ sku: i.sku, name: i.name })));

  console.log("\n--- Querying production items with SKU starting with '585' ---");
  const items585 = await prodPrisma.item_masters.findMany({
    where: { sku: { startsWith: '585' } },
    take: 5
  });
  console.log("Found starting with '585':", items585.map(i => ({ sku: i.sku, name: i.name })));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prodPrisma.$disconnect();
  });
