
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();
  
  for (const company of companies) {
    const categories = [
      { name: 'General', code: 'general', color: '#3b82f6' },
      { name: 'IT Support', code: 'it', color: '#6366f1' },
      { name: 'HR & People', code: 'hr', color: '#10b981' },
      { name: 'Policy', code: 'policy', color: '#f43f5e' },
    ];

    for (const cat of categories) {
      await prisma.bulletinCategory.upsert({
        where: {
          tenantId_code: {
            tenantId: company.id,
            code: cat.code,
          },
        },
        update: {},
        create: {
          tenantId: company.id,
          ...cat,
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
