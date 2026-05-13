import { PrismaClient } from '@prisma/client';

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
  const items = await prisma.item_masters.findMany({ take: 10 });
  console.table(items.map(i => ({ id: i.id, name: i.name, sku: i.sku, barcode: i.barcode })));
}

main().finally(() => prisma.$disconnect());
