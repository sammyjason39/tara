const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { AuditService } = require('./dist/shared/audit/audit.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const auditService = app.get(AuditService);

  console.log('Starting chain repair for zenvix-tenant...');
  const result = await auditService.repairChain({
    tenant_id: 'zenvix-tenant',
    actor_id: 'SYSTEM_HEALER',
    reason: 'Chain corruption detected in logs (actualPrevHash: null)',
  });

  console.log('Repair result:', result);
  await app.close();
}

bootstrap();
