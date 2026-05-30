const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying database logs...');
  
  try {
    // Check system_logs table
    console.log('\n--- SYSTEM LOGS (Recent 10) ---');
    const systemLogs = await prisma.system_logs.findMany({
      take: 10,
      orderBy: { created_at: 'desc' }
    });
    console.log(JSON.stringify(systemLogs, null, 2));

    // Check audit_logs table for lookup actions
    console.log('\n--- AUDIT LOGS (Recent 10) ---');
    const auditLogs = await prisma.audit_logs.findMany({
      take: 10,
      orderBy: { created_at: 'desc' }
    });
    console.log(JSON.stringify(auditLogs, null, 2));

    // Specifically search for lookup or stock opname actions in audit logs
    console.log('\n--- SEARCHING FOR LOOKUP OR OPNAME IN AUDIT LOGS ---');
    const opnameAudit = await prisma.audit_logs.findMany({
      where: {
        OR: [
          { module: { contains: 'inventory', mode: 'insensitive' } },
          { action: { contains: 'look', mode: 'insensitive' } },
          { action: { contains: 'scan', mode: 'insensitive' } },
          { action: { contains: 'opname', mode: 'insensitive' } }
        ]
      },
      take: 10,
      orderBy: { created_at: 'desc' }
    });
    console.log(JSON.stringify(opnameAudit, null, 2));
    
  } catch (err) {
    console.error('Error querying logs:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
