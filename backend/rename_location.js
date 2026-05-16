const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.locations.updateMany({
    where: { name: 'Double Six - Seminyak' },
    data: { name: 'Double Six' }
  });
  console.log(`Renamed ${result.count} locations.`);
  
  // Also check if there are any other similar ones
  const locs = await prisma.locations.findMany();
  console.log('Current Locations:', locs.map(l => l.name));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
