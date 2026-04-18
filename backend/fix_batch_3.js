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

// 1. Build Dictionary from TS Errors
let errorMap = {}; // camel -> exact target specified by tsc
let includeMap = {};

if (fs.existsSync('full_tsc_errors.txt')) {
    const lines = fs.readFileSync('full_tsc_errors.txt', 'utf8').split('\n');
    lines.forEach(line => {
        // Pattern 1: Property 'financeAccountBalance' does not exist ... Did you mean 'finance_account_balances'?
        const propMatch = line.match(/Property '([\w]+)' does not exist.*?Did you mean '([^']+)'/);
        if (propMatch) {
            errorMap[propMatch[1]] = propMatch[2];
        } else {
            // Pattern 2: but 'userCompanies' does not exist in type 'usersInclude<...>' ... Did you mean to write 'user_companies'?
            const incMatch = line.match(/but '([^']+)' does not exist in type '.*?Include.*?'.*?Did you mean to write '([^']+)'/);
            if (incMatch) {
                includeMap[incMatch[1]] = incMatch[2];
            }
        }
    });
}

// Add some known manual mappings if tsc 'Did you mean' didn't catch them
errorMap['user'] = 'users'; // Frequently missing 'Did you mean'
includeMap['userCompanies'] = 'user_companies';

console.log(`Discovered ${Object.keys(errorMap).length} object accessors and ${Object.keys(includeMap).length} include mappings from compiler errors.`);

// 2. Perform replacements
let totalReplaced = 0;

targetFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) {
      console.log('Skipping missing file', relPath);
      return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix property accessor this.prisma.X and tx.X safely
  for (const [camel, target] of Object.entries(errorMap)) {
      // Must not match if followed by a letter to avoid partial matching (e.g. user matching userCompanies)
      const thisRegex = new RegExp(`this\\.prisma\\.${camel}(?![A-Za-z0-9])`, 'g');
      const txRegex = new RegExp(`(?<=[\\s\\[\\(,\\.])tx\\.${camel}(?![A-Za-z0-9])`, 'g'); 
      const prismaTxRegex = new RegExp(`prisma\\.${camel}(?![A-Za-z0-9])`, 'g'); 
      
      content = content.replace(thisRegex, `this.prisma.${target}`);
      content = content.replace(txRegex, `tx.${target}`);
      content = content.replace(prismaTxRegex, `prisma.${target}`);
  }

  // Fix relation includes (e.g. `retailOrders: {`)
  for (const [camel, target] of Object.entries(includeMap)) {
      const incRegex = new RegExp(`${camel}:( {|\\[|\\s+true)`, 'g');
      content = content.replace(incRegex, `${target}:$1`);
  }

  fs.writeFileSync(filePath, content);
});

console.log('Batch update complete.');
