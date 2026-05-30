import { PrismaClient } from '@prisma/client';

const prodUrl = "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prodUrl,
    },
  },
});

async function main() {
  console.log("--- Querying Prod Tenants ---");
  const tenants = await prisma.tenants.findMany();
  console.log("Tenants:", tenants.map(t => ({ id: t.id, name: t.name, code: t.code })));

  for (const t of tenants) {
    console.log(`\n--- Tenant: ${t.name} (ID: ${t.id}) ---`);
    
    // Find locations
    const locations = await prisma.locations.findMany({
      where: { tenant_id: t.id }
    });
    console.log("Locations:");
    for (const l of locations) {
      console.log(`  - ID: ${l.id}, Name: ${l.name}, Code: ${l.code}, Type: ${l.type}`);
    }

    // Find stores
    const stores = await prisma.stores.findMany({
      where: { tenant_id: t.id }
    });
    console.log("Stores:");
    for (const s of stores) {
      console.log(`  - ID: ${s.id}, Name: ${s.name}, Code: ${s.code}, Location ID: ${s.location_id}`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
