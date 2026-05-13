const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const locations = await prisma.locations.findMany({ where: { deleted_at: null } });
  const counts = {};
  locations.forEach(l => {
    const key = l.name.toLowerCase();
    if (!counts[key]) counts[key] = [];
    counts[key].push(l);
  });
  for (const key in counts) {
    if (counts[key].length > 1) {
      console.log(`Potential duplicates for "${key}":`);
      counts[key].forEach(l => console.log(`  Tenant: ${l.tenant_id}, ID: ${l.id}, Code: ${l.code}`));
    }
  }
  await prisma.$disconnect();
}
run();
