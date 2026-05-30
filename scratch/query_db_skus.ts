import { PrismaClient } from '@prisma/client';

const localPrisma = new PrismaClient();
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

const skus = [
  '585 557R', '585 557G', '585 558F', '585 558E', '585 555G',
  '580 209C', '580.209C', '585 209C', '538 016', '538 557R',
  '585 561B', '585 561EE', '585 561AB', '585 561EC', '585 561A', '585 561EA', '585 561', '585 561D',
  '535 401', '535 402', '535 402A', '535 403', '535 403A',
  '100 000', '100 003', '100 022', '100 002', '100 023',
  '429 041A', '534 212AG', '531 566ED', '532 948A', '531 578RC', '531 993RA', '532 570BA', '429 102R'
];

async function checkDb(client: PrismaClient, name: string) {
  console.log(`\n--- Checking SKUs in ${name} DB ---`);
  let count = 0;
  for (const sku of skus) {
    const item = await client.item_masters.findFirst({
      where: {
        sku: { equals: sku, mode: 'insensitive' }
      }
    });
    if (item) {
      console.log(`Match: SKU='${sku}' | ID='${item.id}' | Name='${item.name}' | Capital=${item.base_price} | Selling=${item.selling_price}`);
      count++;
    }
  }
  console.log(`Total matches in ${name}: ${count}`);
}

async function main() {
  await checkDb(localPrisma, "Local");
  await checkDb(prodPrisma, "Production");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await localPrisma.$disconnect();
    await prodPrisma.$disconnect();
  });
