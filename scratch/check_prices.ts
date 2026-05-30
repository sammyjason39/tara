import { PrismaClient } from '@prisma/client';

const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

async function main() {
  const skus = ['585 557G', '585 558F', '100 000', '429 041A'];
  for (const sku of skus) {
    const item = await prodPrisma.item_masters.findFirst({
      where: { sku }
    });
    if (item) {
      console.log(`SKU: ${sku}`);
      console.log(`  - base_price (capital):    ${item.base_price.toString()} (Type: ${typeof item.base_price})`);
      console.log(`  - selling_price (selling):  ${item.selling_price.toString()} (Type: ${typeof item.selling_price})`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prodPrisma.$disconnect();
  });
