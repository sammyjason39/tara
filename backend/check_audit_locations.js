const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const audits = await prisma.inventory_audit_cycles.findMany({
    select: { location_code: true }
  });
  console.log('Audit Location Codes:', JSON.stringify([...new Set(audits.map(a => a.location_code))], null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
