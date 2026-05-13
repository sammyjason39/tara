const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  const tenantId = 'bambu-tenant';
  console.log("Tenant ID:", tenantId);

  const locations = await prisma.locations.findMany({
    where: { tenant_id: tenantId, deleted_at: null }
  });
  console.log("\n--- Locations ---");
  locations.forEach(l => console.log(`ID: ${l.id}, Code: ${l.code}, Name: ${l.name}, Type: ${l.type}`));

  const stores = await prisma.stores.findMany({
    where: { tenant_id: tenantId, deleted_at: null }
  });
  console.log("\n--- Stores ---");
  stores.forEach(s => console.log(`ID: ${s.id}, Code: ${s.code}, Name: ${s.name}, LocationID: ${s.location_id}`));

  const folders = await prisma.explorer_folders.findMany({
    where: { tenant_id: tenantId, deleted_at: null }
  });
  console.log("\n--- Explorer Folders ---");
  folders.forEach(f => console.log(`ID: ${f.id}, Name: ${f.name}, ParentID: ${f.parent_id}`));

  await prisma.$disconnect();
}

run().catch(console.error);
