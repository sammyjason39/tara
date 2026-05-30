const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying database counts...');
  
  try {
    // 1. Group by tenant_id in item_masters
    const itemsByTenant = await prisma.item_masters.groupBy({
      by: ['tenant_id'],
      _count: {
        id: true
      }
    });
    console.log('\nProducts per Tenant in item_masters:', JSON.stringify(itemsByTenant, null, 2));

    // 2. Look at a few sample items in item_masters
    const sampleItems = await prisma.item_masters.findMany({
      take: 10,
      select: {
        id: true,
        tenant_id: true,
        sku: true,
        barcode: true,
        name: true
      }
    });
    console.log('\nSample items:', JSON.stringify(sampleItems, null, 2));

    // 3. Check users table
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        tenant_id: true
      }
    });
    console.log('\nUsers table:', JSON.stringify(users, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
