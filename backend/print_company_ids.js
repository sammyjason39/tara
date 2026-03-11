const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  companies.forEach(c => console.log(`ID: ${c.id} | NAME: ${c.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
