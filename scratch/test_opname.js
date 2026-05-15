const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const ctx = { tenant_id: 'tnt-3rlhko' };
  const productId = '000c6df0-09d0-4b7c-929c-32cae8153d8d';
  const locationId = 'ee3bcfcf-d49c-4894-8b52-0e87df2794ff';
  const storeId = '9062d2bc-67e5-4174-a9c1-7532d4c82e3a';

  try {
    // 1. Initial Stock
    const initialStock = await prisma.stock_levels.findFirst({
      where: { tenant_id: ctx.tenant_id, product_id: productId, location_id: locationId }
    });
    console.log('INITIAL_STOCK:', JSON.stringify(initialStock));

    // 2. Perform Retail Opname (Simulate API logic)
    // We'll update the stock to a new value (e.g., 50)
    const newCount = 50;
    
    // Simulate repository.submitOpname logic
    await prisma.$transaction(async (tx) => {
      const stock = await tx.stock_levels.findFirst({
        where: { tenant_id: ctx.tenant_id, product_id: productId, location_id: locationId }
      });
      if (stock) {
        await tx.stock_levels.update({
          where: { id: stock.id },
          data: {
            on_hand: newCount,
            available: newCount - Number(stock.reserved || 0),
            updated_at: new Date()
          }
        });
      } else {
         await tx.stock_levels.create({
            data: {
               tenant_id: ctx.tenant_id,
               product_id: productId,
               location_id: locationId,
               on_hand: newCount,
               available: newCount,
               company_id: 'b74e21b9-4e99-42fd-857b-36bf4dee7ed5' // Bambu Silver
            }
         });
      }
    });

    // 3. Check Updated Stock
    const updatedStock = await prisma.stock_levels.findFirst({
      where: { tenant_id: ctx.tenant_id, product_id: productId, location_id: locationId }
    });
    console.log('UPDATED_STOCK:', JSON.stringify(updatedStock));

    // 4. Check KPIs (Simulation of InventoryKpiBar logic)
    const stats = await prisma.stock_levels.aggregate({
      where: { tenant_id: ctx.tenant_id, location_id: locationId },
      _sum: { on_hand: true },
      _count: { id: true }
    });
    console.log('LOCATION_STATS:', JSON.stringify(stats));

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
