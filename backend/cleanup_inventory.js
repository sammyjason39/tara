const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING INVENTORY DATA CLEANUP ---');

  // 1. Reset Stock Levels
  console.log('Resetting stock levels to zero...');
  const resetStocks = await prisma.stock_levels.updateMany({
    data: {
      on_hand: 0,
      reserved: 0,
      available: 0,
      damaged: 0,
      in_repair: 0
    }
  });
  console.log(`Updated ${resetStocks.count} stock level records.`);

  // 2. Clear Audit Cycles
  console.log('Deleting all inventory audit cycles...');
  const deleteAudits = await prisma.inventory_audit_cycles.deleteMany({});
  console.log(`Deleted ${deleteAudits.count} audit cycles.`);

  // 3. Clear Stock Movements
  console.log('Deleting all stock movements...');
  const deleteMovements = await prisma.stock_movements.deleteMany({});
  console.log(`Deleted ${deleteMovements.count} stock movements.`);

  // 4. Clear Explorer reports
  console.log('Cleaning up Stock Opname reports from Explorer...');
  // Find "Stock opname" folders
  const folders = await prisma.explorer_folders.findMany({
    where: { name: { contains: 'Stock opname', mode: 'insensitive' } }
  });
  
  for (const folder of folders) {
    // Delete files in these folders recursively (Simplified: just delete the folders and files associated)
    // Note: We should probably delete files first to avoid FK constraints if any, 
    // but explorer_files uses folder_id.
    const files = await prisma.explorer_files.deleteMany({
      where: { folder_id: folder.id }
    });
    console.log(`Deleted ${files.count} files from folder "${folder.name}"`);
  }
  
  const deletedFolders = await prisma.explorer_folders.deleteMany({
    where: { name: { contains: 'Stock opname', mode: 'insensitive' } }
  });
  console.log(`Deleted ${deletedFolders.count} explorer folders.`);

  console.log('--- CLEANUP COMPLETE ---');
}

main()
  .catch(e => {
    console.error('CLEANUP FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
