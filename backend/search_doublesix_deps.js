const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const departments = await prisma.departments.findMany({
    where: {
      name: { contains: 'Double Six', mode: 'insensitive' }
    }
  });
  console.log('Departments:', JSON.stringify(departments, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
