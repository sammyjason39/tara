const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'hansel@zenvix.id';
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        user_companies: {
          include: {
            company: true
          }
        }
      }
    });
    console.log('---START_JSON---');
    console.log(JSON.stringify(user, null, 2));
    console.log('---END_JSON---');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
