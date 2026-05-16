import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant_id = 'tnt-3rlhko';
  const location_id = '30bb1b66-931c-4108-bcf1-1c9f1081b882'; // Double Six

  const items = await prisma.item_masters.findMany({
    where: { tenant_id, status: 'active' },
    include: {
      stock_levels: {
        where: { location_id }
      }
    }
  });

  let totalOnHandQty = 0;
  items.forEach(product => {
    const currentStock = product.stock_levels.reduce((sum, level) => sum + Number(level.on_hand), 0);
    totalOnHandQty += currentStock;
  });

  console.log('Total Items:', items.length);
  console.log('Total On Hand Qty:', totalOnHandQty);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
