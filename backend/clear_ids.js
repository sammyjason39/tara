const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const c of companies) {
    process.stdout.write('ID_START|' + c.id + '|ID_END\n');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
