const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const ctx = { tenant_id: 'tnt-3rlhko' };
  
  // Test Case 2: Different Branch, Different Product, Different Quantity
  const productId = '00127e17-f1cc-4ea5-a8dd-8cad8c87fb16';
  const locationId = '30bb1b66-931c-4108-bcf1-1c9f1081b882';
  const newCount = 75;

  try {
    console.log('--- TEST CASE 2 ---');
    const initialStock = await prisma.stock_levels.findFirst({
      where: { tenant_id: ctx.tenant_id, product_id: productId, location_id: locationId }
    });
    console.log('INITIAL_STOCK_B2:', JSON.stringify(initialStock));

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
               company_id: 'b74e21b9-4e99-42fd-857b-36bf4dee7ed5'
            }
         });
      }
    });

    const updatedStock = await prisma.stock_levels.findFirst({
      where: { tenant_id: ctx.tenant_id, product_id: productId, location_id: locationId }
    });
    console.log('UPDATED_STOCK_B2:', JSON.stringify(updatedStock));

    const stats = await prisma.stock_levels.aggregate({
      where: { tenant_id: ctx.tenant_id, location_id: locationId },
      _sum: { on_hand: true },
      _count: { id: true }
    });
    console.log('LOCATION_STATS_B2:', JSON.stringify(stats));

    // Also check Branch 1 again to ensure no cross-contamination
    const b1Stats = await prisma.stock_levels.aggregate({
      where: { tenant_id: ctx.tenant_id, location_id: 'ee3bcfcf-d49c-4894-8b52-0e87df2794ff' },
      _sum: { on_hand: true }
    });
    console.log('REVERIFY_B1_STATS:', JSON.stringify(b1Stats));

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
