import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.item_masters.count();
  console.log("Total items in item_masters:", count);

  if (count > 0) {
    const items = await prisma.item_masters.findMany({
      take: 10
    });
    console.log("First 10 items in DB:");
    for (const i of items) {
      console.log(`ID: ${i.id} | SKU: ${i.sku} | Name: ${i.name} | Tenant: ${i.tenant_id}`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
