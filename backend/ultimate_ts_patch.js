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

function toSnakeCasePlural(camel) {
    if (camel === 'company') return 'companies';
    if (camel === 'department') return 'departments';
    if (camel === 'location') return 'locations';
    if (camel === 'employee') return 'employees';
    if (camel === 'store') return 'stores';
    if (camel === 'user') return 'users';
    
    // Convert to snake_case
    let snake = camel.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    // Handle pluralization
    if (snake.endsWith('status')) return snake + 'es';
    if (snake.endsWith('y')) return snake.slice(0, -1) + 'ies';
    if (snake.endsWith('s')) return snake; 
    if (snake.endsWith('branch')) return snake + 'es';
    if (camel === 'adminModuleStatu') return 'admin_module_statuses'; // catch edge case
    return snake + 's';
}

function processIncludes(match, camel) {
    if (camel === 'adminModuleStatus' || camel === 'adminModuleStatu') return 'admin_module_statuses';
    if (camel === 'moduleDefinition') return 'module_definitions';
    if (camel === 'eventDeliveries') return 'event_deliveries';
    return toSnakeCasePlural(camel.replace(/s$/, '')); // If it's plural camel, safely snake plural it
}

targetFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace this.prisma.X and tx.X
  content = content.replace(/(this\.prisma|tx|prisma)\.([a-zA-Z]+)(?=\.|\(|\[)/g, (match, prefix, camel) => {
      const skip = ['$transaction', '$queryRaw', '$executeRaw', '$on', '$connect', '$disconnect', '$use', '$extends'];
      if (skip.includes(camel)) return match;
      if (camel.includes('_')) return match; // already snake

      const snakePlural = toSnakeCasePlural(camel);
      return `${prefix}.${snakePlural}`;
  });

  // Replace includes
  const manualIncludes = {
      'adminModuleStatus': 'admin_module_statuses',
      'moduleDefinition': 'module_definitions',
      'eventDeliveries': 'event_deliveries',
      'jobPostMetadata': 'job_post_metadata', // maybe?
      'hrMentorshipPairs': 'hr_mentorship_pairs',
      'retailOrderLines': 'retail_order_lines'
  };

  for (const [camel, snake] of Object.entries(manualIncludes)) {
      content = content.replace(new RegExp(`\\b${camel}:\\s*{`, 'g'), `${snake}: {`);
      content = content.replace(new RegExp(`\\b${camel}:\\s*true`, 'g'), `${snake}: true`);
  }

  // Generic include replacement for camelCase keys mapping to true or {
  content = content.replace(/\b([a-z][a-zA-Z]+):\s*({|true)/g, (match, camel, suffix) => {
      // Don't auto-snake basic TS keys like data, where, select, include, etc.
      const safeKeywords = ['select', 'where', 'orderBy', 'data', 'create', 'update', 'connect', 'include', 'cursor', 'skip', 'take', 'tenantId', 'id', 'email', 'status', 'createdAt', 'updatedAt', 'published'];
      if (safeKeywords.includes(camel)) return match;
      
      const snakePlural = toSnakeCasePlural(camel); // Not necessarily 100% correct for includes but usually works
      // Actually auto-snaking all includes is dangerous because `where: { tenantId: '...' }` has `tenantId:`.
      return match; 
  });

  fs.writeFileSync(filePath, content);
});

console.log("Ultimate patch applied.");
