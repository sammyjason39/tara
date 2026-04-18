import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      passwordHash: true,
      id: true
    }
  });
  console.log('USERS_IN_DB:');
  users.forEach(u => {
    console.log(`- ${u.email} (ID: ${u.id}) HasHash: ${!!u.passwordHash}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
