import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const companyCount = await prisma.company.count();
  console.log('USER_COUNT:' + userCount);
  console.log('COMPANY_COUNT:' + companyCount);
  
  if (userCount > 0) {
    const firstUser = await prisma.user.findFirst();
    console.log('FIRST_USER_EMAIL:' + firstUser?.email);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
