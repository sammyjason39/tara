const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const locations = await prisma.locations.findMany({
    where: {
      name: { contains: 'Double Six', mode: 'insensitive' }
    }
  });
  console.log('Locations:', JSON.stringify(locations, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
