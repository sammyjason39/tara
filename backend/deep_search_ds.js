const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'locations', 'stores', 'departments', 'companies', 'retail_channels',
    'inventory_pools', 'warehouses', 'warehouse_bins', 'item_masters',
    'inventory_audit_cycles', 'stock_levels'
  ];

  for (const table of tables) {
    try {
      const records = await prisma[table].findMany({
        where: {
          OR: [
            { name: { contains: 'Double Six', mode: 'insensitive' } },
            { id: { contains: 'Double Six', mode: 'insensitive' } }
          ].filter(cond => {
             // Basic check to see if field exists in schema for this table
             // In a real script we'd check prisma metadata, but here we can just try/catch
             return true;
          })
        }
      });
      if (records.length > 0) {
        console.log(`Table ${table}:`, JSON.stringify(records, null, 2));
      }
    } catch (e) {
      // Field might not exist
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
