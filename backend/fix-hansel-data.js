const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'hansel@zenvix.id';
  console.log(`🛠️ Fixing DB Data for Hansel: ${email}`);

  try {
    // 1. Update User Identity
    const user = await prisma.user.update({
      where: { email },
      data: {
        firstName: 'Hansel',
        lastName: 'Representative'
      }
    });
    console.log(`✅ User name updated to: ${user.firstName} ${user.lastName}`);

    // 2. Ensure at least one company is named "Zenvix" (case sensitive match for user request)
    // We saw "Zenvix" and "zenvix" in the query earlier.
    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: user.id },
      include: { company: true }
    });

    for (const uc of userCompanies) {
       if (uc.company.name.toLowerCase() === 'zenvix') {
          await prisma.company.update({
            where: { id: uc.tenantId },
            data: { name: 'Zenvix' }
          });
       }
    }
    console.log(`✅ Verified Zenvix company naming.`);

  } catch (e) {
    console.error('❌ Error fixing DB data:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
