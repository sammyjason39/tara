const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { AuditService } = require('./dist/shared/audit/audit.service');
const { PrismaService } = require('./dist/persistence/prisma.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const auditService = app.get(AuditService);
  const prisma = app.get(PrismaService);

  const tenants = await prisma.tenants.findMany({
    select: { id: true, code: true }
  });

  console.log(`Checking audit chains for ${tenants.length} tenants...`);

  for (const tenant of tenants) {
    try {
      const isValid = await auditService.verifyChain(tenant.id);
      if (!isValid) {
        console.log(`[INVALID] Tenant: ${tenant.code} (${tenant.id})`);
        console.log(`Attempting repair for ${tenant.code}...`);
        const result = await auditService.repairChain(tenant.id, 'SYSTEM_HEALER');
        console.log(`Repair result for ${tenant.code}:`, result);
      } else {
        console.log(`[VALID] Tenant: ${tenant.code}`);
      }
    } catch (error) {
      console.error(`Error processing tenant ${tenant.code}:`, error.message);
    }
  }

  await app.close();
}

bootstrap();
