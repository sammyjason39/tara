const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const folders = await prisma.explorer_folders.findMany({
    where: {
      name: { contains: 'Double Six', mode: 'insensitive' }
    }
  });
  console.log('Explorer Folders:', JSON.stringify(folders, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
