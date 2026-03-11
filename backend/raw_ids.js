const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true } });
  companies.forEach(c => console.log(c.id));
}

main().catch(console.error).finally(() => prisma.$disconnect());
