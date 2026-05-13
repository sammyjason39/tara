const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.users.findMany({ select: { email: true, tenant_id: true } });
  console.log(users);
  await prisma.$disconnect();
}
run();
