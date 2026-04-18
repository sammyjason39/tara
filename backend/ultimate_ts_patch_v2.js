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
  'src/support/sync/sync.controller.ts',
  'src/agentic/inventory/anomaly-detector.service.ts',
  'src/agentic/inventory/forecaster.service.ts',
  'src/agentic/inventory/replenishment.service.ts',
  'src/core/admin/admin.controller.ts',
  'src/core/admin/repositories/admin.prisma.repository.ts',
  'src/core/auth/guards/branch-gating.guard.ts',
  'src/core/auth/guards/module-state.guard.ts',
  'src/core/auth/repositories/auth.db.repository.ts',
  'src/core/auth/repositories/provisioning.db.repository.ts'
];

function toSnakeCasePlural(camel) {
    if (camel === 'company') return 'companies';
    if (camel === 'department') return 'departments';
    if (camel === 'location') return 'locations';
    if (camel === 'employee') return 'employees';
    if (camel === 'store') return 'stores';
    if (camel === 'user') return 'users';
    
    // Ignore known correct camelCases in the current schema
    if (camel === 'itemMaster') return camel;
    if (camel === 'stockLevel') return camel;
    if (camel === 'priceVersion') return camel;
    
    // Check if plural
    let isPlural = camel.endsWith('s') && !camel.endsWith('ss') && !camel.endsWith('status');

    let snake = camel.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (snake.endsWith('status')) return snake + 'es';
    if (snake.endsWith('y')) return snake.slice(0, -1) + 'ies';
    if (snake.endsWith('s')) return snake; 
    if (snake.endsWith('branch')) return snake + 'es';
    if (camel === 'adminModuleStatu') return 'admin_module_statuses'; 
    return snake + 's';
}

targetFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/(this\.prisma|tx|prisma)\.([a-zA-Z]+)(?=\.|\(|\[)/g, (match, prefix, camel) => {
      const skip = ['$transaction', '$queryRaw', '$executeRaw', '$on', '$connect', '$disconnect', '$use', '$extends', 'itemMaster', 'stockLevel', 'priceVersion'];
      if (skip.includes(camel)) return match;
      if (camel.includes('_')) return match; 

      const snakePlural = toSnakeCasePlural(camel);
      return `${prefix}.${snakePlural}`;
  });

  const manualIncludes = {
      'adminModuleStatus': 'admin_module_statuses',
      'moduleDefinition': 'module_definitions',
      'eventDeliveries': 'event_deliveries',
      'eventDelivery': 'event_deliveries',
      'hrMentorshipPairs': 'hr_mentorship_pairs',
      'retailOrderLines': 'retail_order_lines',
      'Count': '_count',
      'userCompanies': 'user_companies'
  };

  for (const [camel, snake] of Object.entries(manualIncludes)) {
      content = content.replace(new RegExp(`\\b${camel}:\\s*{`, 'g'), `${snake}: {`);
      content = content.replace(new RegExp(`\\b${camel}:\\s*true`, 'g'), `${snake}: true`);
  }

  fs.writeFileSync(filePath, content);
});

console.log("Ultimate patch V2 applied.");
