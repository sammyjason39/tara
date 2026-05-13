const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function audit() {
  console.log("--- Store Duplicates ---");
  const stores = await prisma.stores.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: 'asc' }
  });

  const storeGroups = new Map();
  for (const s of stores) {
    const key = `${s.tenant_id}:${s.code}`;
    if (!storeGroups.has(key)) storeGroups.set(key, []);
    storeGroups.get(key).push(s);
  }

  for (const [key, group] of storeGroups.entries()) {
    if (group.length > 1) {
      console.log(`Duplicate store found for ${key}:`);
      group.forEach(s => console.log(`  - ID: ${s.id}, Name: ${s.name}, LocationID: ${s.location_id}, Created: ${s.created_at}`));
    }
  }

  await prisma.$disconnect();
}

audit().catch(console.error);
