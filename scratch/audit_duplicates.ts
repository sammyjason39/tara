import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function audit() {
  console.log("--- Location Duplicates ---");
  const locations = await prisma.locations.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: 'asc' }
  });

  const locGroups = new Map<string, any[]>();
  for (const loc of locations) {
    const key = `${loc.tenant_id}:${loc.code}`;
    if (!locGroups.has(key)) locGroups.set(key, []);
    locGroups.get(key)!.push(loc);
  }

  for (const [key, group] of locGroups.entries()) {
    if (group.length > 1) {
      console.log(`Duplicate found for ${key}:`);
      group.forEach(l => console.log(`  - ID: ${l.id}, Name: ${l.name}, Created: ${l.created_at}`));
    }
  }

  console.log("\n--- Explorer Folder Duplicates ---");
  const folders = await prisma.explorer_folders.findMany({
    where: { deleted_at: null }
  });

  const folderGroups = new Map<string, any[]>();
  for (const f of folders) {
    const key = `${f.tenant_id}:${f.parent_id}:${f.name}`;
    if (!folderGroups.has(key)) folderGroups.set(key, []);
    folderGroups.get(key)!.push(f);
  }

  for (const [key, group] of folderGroups.entries()) {
    if (group.length > 1) {
      console.log(`Duplicate folder found for ${key}:`);
      group.forEach(f => console.log(`  - ID: ${f.id}, Created: ${f.created_at}`));
    }
  }

  await prisma.$disconnect();
}

audit();
