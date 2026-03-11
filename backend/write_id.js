const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ select: { id: true } });
  if (company) {
    fs.writeFileSync('valid_id.txt', company.id);
    console.log('ID written to valid_id.txt');
  } else {
    console.log('No company found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
