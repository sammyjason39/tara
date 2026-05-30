const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

async function main() {
  console.log('Fetching all open stock opname cycles...');
  
  const cycles = await prisma.inventory_audit_cycles.findMany({
    where: { 
      tenant_id: 'tnt-3rlhko',
      status: 'OPEN'
    }
  });

  console.log('\n--- OPEN AUDIT CYCLES ---');
  console.log(JSON.stringify(cycles, null, 2));

  await prisma.$disconnect();
}

main();
