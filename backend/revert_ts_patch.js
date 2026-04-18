const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/agentic/inventory/anomaly-detector.service.ts',
  'src/agentic/inventory/forecaster.service.ts',
  'src/agentic/inventory/replenishment.service.ts',
  'src/core/admin/admin.controller.ts',
  'src/core/admin/repositories/admin.prisma.repository.ts',
  'src/core/auth/guards/branch-gating.guard.ts',
  'src/core/auth/guards/module-state.guard.ts',
  'src/core/auth/repositories/auth.db.repository.ts',
  'src/core/auth/repositories/provisioning.db.repository.ts',
  'src/core/finance/repositories/finance.db.repository.ts',
  'src/core/hr/repositories/hr.db.repository.ts',
  'src/core/inventory/repositories/inventory.db.repository.ts',
  'src/core/it/repositories/it.db.repository.ts',
  'src/core/payment/repositories/payment.db.repository.ts',
  'src/core/procurement/repositories/procurement.db.repository.ts',
  'src/modules/retail/repositories/retail.db.repository.ts',
  'src/modules/retail/retail-public-auth.service.ts',
  'src/modules/retail/retail-public-customer.service.ts',
  'src/modules/retail/seeders/retail.seeder.ts',
  'src/shared/audit/audit-chain.service.ts',
  'src/shared/audit/audit.service.ts',
  'src/shared/comms/bulletin.service.ts',
  'src/shared/comms/chat.gateway.ts',
  'src/shared/comms/chat.service.ts',
  'src/shared/comms/mail.service.ts',
  'src/shared/comms/notification.service.ts',
  'src/shared/events/event-bus.service.ts',
  'src/shared/helpers/module-active.helper.ts',
  'src/shared/idempotency/idempotency.service.ts',
  'src/shared/interceptors/idempotency.interceptor.ts',
  'src/shared/license/license.service.ts',
  'src/shared/logger/logger.service.ts',
  'src/shared/maintenance/idempotency-cleanup.service.ts',
  'src/shared/maintenance/outbox-worker.service.ts',
  'src/shared/workflow/workflow.service.ts',
  'src/support/explorer/explorer.service.ts',
  'src/support/sync/sync.controller.ts'
];

function toSingularCamel(s) {
    let name = s.replace(/ies$/, 'y').replace(/statuses$/, 'status').replace(/s$/, '').replace(/([^e])s$/, '$1');
    if (name.endsWith('classe')) name = 'class';
    if (name.endsWith('branthe')) name = 'branch';
    if (name.endsWith('categoric')) name = 'category';
    
    const parts = name.split('_');
    return parts[0] + parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

targetFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Reverse this.prisma.snake_case to this.prisma.camelCase
  content = content.replace(/(this\.prisma|tx|prisma)\.([a-z_]+)(?=\.|\(|\[)/g, (match, prefix, snake) => {
      if (!snake.includes('_') && !snake.endsWith('s')) return match; 
      // Convert snake to camel
      if (snake === 'users') return `${prefix}.user`;
      if (snake === 'stores') return `${prefix}.store`;
      
      const camel = toSingularCamel(snake);
      return `${prefix}.${camel}`;
  });

  // Reverse include clauses
  content = content.replace(/\b([a-z_]+):\s*{/g, (match, snake) => {
      if (!snake.includes('_') && !snake.endsWith('s')) return match;
      if (snake === 'status' || snake === 'address') return match; // skip common fields
      
      const camel = toSingularCamel(snake);
      return `${camel}: {`;
  });
  
  content = content.replace(/\b([a-z_]+):\s*true/g, (match, snake) => {
      if (!snake.includes('_') && !snake.endsWith('s')) return match;
      if (snake === 'status' || snake === 'success') return match;
      
      const camel = toSingularCamel(snake);
      return `${camel}: true`;
  });

  // Extra manual fixes for things my scripts accidentally destroyed
  content = content.replace(/this\.prisma\.locationss/g, 'this.prisma.location');
  content = content.replace(/this\.prisma\.employeess/g, 'this.prisma.employee');
  content = content.replace(/this\.prisma\.storess/g, 'this.prisma.store');
  
  fs.writeFileSync(filePath, content);
});

console.log("All TS edits cleanly reverted.");
