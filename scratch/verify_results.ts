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
  console.log("--- Recent Audit Cycles ---");
  const audits = await prisma.inventory_audit_cycles.findMany({
    orderBy: { created_at: 'desc' },
    take: 5
  });
  console.table(audits.map(a => ({
    id: a.id,
    location: a.location_code,
    status: a.status,
    created: a.created_at
  })));

  const anchorId = '79705e98-a53e-498c-8d2e-9db0e7754155';
  const ssId = '7c1f69ed-42c7-4963-96a7-76f48a3a1927';

  console.log("\n--- Stock Levels for Anchor ---");
  const anchorStock = await prisma.stock_levels.findMany({
    where: { location_id: anchorId, on_hand: { gt: 0 } },
    include: { item_masters: true }
  });
  console.table(anchorStock.map(s => ({
    sku: s.item_masters.sku,
    name: s.item_masters.name,
    on_hand: Number(s.on_hand)
  })));

  console.log("\n--- Stock Levels for Retail Branch SS ---");
  const ssStock = await prisma.stock_levels.findMany({
    where: { location_id: ssId, on_hand: { gt: 0 } },
    include: { item_masters: true }
  });
  console.table(ssStock.map(s => ({
    sku: s.item_masters.sku,
    name: s.item_masters.name,
    on_hand: Number(s.on_hand)
  })));

  console.log("\n--- Recent Explorer Files ---");
  const files = await prisma.explorer_files.findMany({
    orderBy: { created_at: 'desc' },
    take: 10,
    include: { folder: true }
  });
  console.table(files.map(f => ({
    name: f.name,
    folder: f.folder?.name,
    path: f.path,
    created: f.created_at
  })));
}

main().finally(() => prisma.$disconnect());
