import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      user_companies: true,
    }
  });

  const employees = await prisma.employee.findMany();

  console.log('USERS:', JSON.stringify(users, null, 2));
  console.log('EMPLOYEES:', JSON.stringify(employees, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
