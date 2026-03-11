const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'ff1752e0-5c04-48a3-9ace-2a6bc9c29b8c';
  console.log('Testing getLedger for tenant:', tenantId);
  try {
    const journalEntries = await prisma.journalEntry.findMany({
      where: { tenantId },
      include: { lines: true },
    });
    console.log('Journal Entries found:', journalEntries.length);
  } catch (err) {
    console.error('Error in Prisma findMany:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
