const fs = require('fs');
const path = require('path');

const targetFiles = [
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

let uniqueAccessors = new Set();
let includeAccessors = new Set();

targetFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find this.prisma.X, tx.X, prisma.X
  const regex = /(?:this\.prisma|tx|prisma)\.([a-zA-Z]+)(?=\.|\()/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
      if (!['$transaction', '$queryRaw', '$executeRaw', '$on', '$connect', '$disconnect', '$use', '$extends'].includes(match[1])) {
          // Ignore already snake_case things if any, but our regex `[a-zA-Z]+` excludes underscores anyway!
          uniqueAccessors.add(match[1]);
      }
  }

  // Find includes (e.g. `retailOrders: {`)
  // Not 100% accurate but catches common ones
  const incRegex = /([a-zA-Z]+):\s*\{\s*include:\s*\{/g;
  while ((match = incRegex.exec(content)) !== null) {
      includeAccessors.add(match[1]);
  }
});

console.log("Accessors:", Array.from(uniqueAccessors).join(', '));
console.log("Includes:", Array.from(includeAccessors).join(', '));
