const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const userCount = await prisma.user.count();
    console.log('TOTAL_USERS:', userCount);

    const user = await prisma.user.findUnique({
      where: { email: 'superadmin@zenvix.id' },
    });
    
    if (user) {
      console.log('USER_FOUND: superadmin@zenvix.id');
    } else {
      console.log('USER_NOT_FOUND: superadmin@zenvix.id');
    }
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
