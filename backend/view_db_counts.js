const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Locations Count:', await prisma.locations.count());
  console.log('Items Count:', await prisma.item_masters.count());
  console.log('Stock Levels Count:', await prisma.stock_levels.count());
  console.log('Audit Cycles Count:', await prisma.inventory_audit_cycles.count());
  console.log('Stock Movements Count:', await prisma.stock_movements.count());
  console.log('Explorer Files Count:', await prisma.explorer_files.count());
  console.log('Explorer Folders Count:', await prisma.explorer_folders.count());
  
  const stocks = await prisma.stock_levels.findMany({ take: 5 });
  console.log('Sample Stocks:', JSON.stringify(stocks, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
