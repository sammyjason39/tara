import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mergeFolders() {
  console.log("Starting folder merge: 'Stock opname' -> 'Stock Opname Reports'...");
  
  // 1. Find all 'Stock opname' folders
  const sourceFolders = await prisma.explorer_folders.findMany({
    where: {
      name: { equals: "Stock opname", mode: 'insensitive' },
      deleted_at: null
    }
  });

  console.log(`Found ${sourceFolders.length} source folders to consolidate.`);

  for (const source of sourceFolders) {
    if (source.name === "Stock Opname Reports") {
      console.log(`Skipping "${source.name}" as it is the target.`);
      continue;
    }

    // 2. Ensure target 'Stock Opname Reports' exists at the same level
    let target = await prisma.explorer_folders.findFirst({
      where: {
        tenant_id: source.tenant_id,
        name: "Stock Opname Reports",
        parent_id: source.parent_id,
        deleted_at: null
      }
    });

    if (!target) {
      console.log(`Creating target folder "Stock Opname Reports" for tenant ${source.tenant_id}`);
      target = await prisma.explorer_folders.create({
        data: {
          tenant_id: source.tenant_id,
          name: "Stock Opname Reports",
          parent_id: source.parent_id,
          access_level: source.access_level
        }
      });
    }

    // 3. Move all subfolders from source to target
    const subfolders = await prisma.explorer_folders.findMany({
      where: { parent_id: source.id, deleted_at: null }
    });

    for (const sub of subfolders) {
      await prisma.explorer_folders.update({
        where: { id: sub.id },
        data: { parent_id: target.id }
      });
      console.log(`Moved subfolder "${sub.name}" from "${source.name}" to "${target.name}"`);
    }

    // 4. Move all files from source to target
    const files = await prisma.explorer_files.findMany({
      where: { folder_id: source.id, deleted_at: null }
    });

    for (const file of files) {
      await prisma.explorer_files.update({
        where: { id: file.id },
        data: { folder_id: target.id }
      });
      console.log(`Moved file "${file.name}" from "${source.name}" to "${target.name}"`);
    }

    // 5. Delete the source folder
    await prisma.explorer_folders.update({
      where: { id: source.id },
      data: { deleted_at: new Date() }
    });
    console.log(`Soft-deleted source folder "${source.name}" (ID: ${source.id})`);
  }

  console.log("Folder merge complete.");
}

mergeFolders()
  .catch((e) => {
    console.error("Merge failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
