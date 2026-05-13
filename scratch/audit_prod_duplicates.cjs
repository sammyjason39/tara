const { PrismaClient } = require('@prisma/client');

const databaseUrl = "postgresql://zenvix:zenvix_secure_2026!@localhost:5432/zenvix_prod?schema=public";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function audit() {
  console.log("Connecting to:", databaseUrl);
  
  const tenantId = 'bambu-tenant'; // Based on previous analysis
  console.log("Tenant ID:", tenantId);

  console.log("\n--- Location Duplicates (by Code) ---");
  const locations = await prisma.locations.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    orderBy: { created_at: 'asc' }
  });

  const locGroups = new Map();
  for (const loc of locations) {
    const key = loc.code;
    if (!locGroups.has(key)) locGroups.set(key, []);
    locGroups.get(key).push(loc);
  }

  for (const [key, group] of locGroups.entries()) {
    if (group.length > 1) {
      console.log(`Duplicate found for code "${key}":`);
      group.forEach(l => console.log(`  - ID: ${l.id}, Name: ${l.name}, Created: ${l.created_at}`));
    }
  }

  console.log("\n--- Explorer Folder Duplicates (by Name in same parent) ---");
  const folders = await prisma.explorer_folders.findMany({
    where: { tenant_id: tenantId, deleted_at: null }
  });

  const folderGroups = new Map();
  for (const f of folders) {
    const key = `${f.parent_id}:${f.name}`;
    if (!folderGroups.has(key)) folderGroups.set(key, []);
    folderGroups.get(key).push(f);
  }

  for (const [key, group] of folderGroups.entries()) {
    if (group.length > 1) {
      console.log(`Duplicate folder found for "${key}":`);
      group.forEach(f => console.log(`  - ID: ${f.id}, Created: ${f.created_at}`));
    }
  }

  console.log("\n--- Explorer File Duplicates (by Name in same folder) ---");
  const files = await prisma.explorer_files.findMany({
    where: { tenant_id: tenantId, deleted_at: null }
  });

  const fileGroups = new Map();
  for (const f of files) {
    const key = `${f.folder_id}:${f.name}`;
    if (!fileGroups.has(key)) fileGroups.set(key, []);
    fileGroups.get(key).push(f);
  }

  for (const [key, group] of fileGroups.entries()) {
    if (group.length > 1) {
      console.log(`Duplicate file found for "${key}":`);
      group.forEach(f => console.log(`  - ID: ${f.id}, Created: ${f.created_at}`));
    }
  }

  await prisma.$disconnect();
}

audit().catch(console.error);
