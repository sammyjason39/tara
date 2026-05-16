const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const locations = await prisma.locations.findMany({
    where: {
      OR: [
        { name: { contains: 'Double Six', mode: 'insensitive' } },
        { name: { contains: 'Seminyak', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Locations:', JSON.stringify(locations, null, 2));
  
  const stores = await prisma.stores.findMany({
    where: {
      OR: [
        { name: { contains: 'Double Six', mode: 'insensitive' } },
        { name: { contains: 'Seminyak', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Stores:', JSON.stringify(stores, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
