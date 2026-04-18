const fs = require('fs');
const path = require('path');

const manualReplacements = {
    'arPaymentAllocation': 'financeArPaymentAllocation',
    'financeSubledgerEntry': 'financeJournalEntry',
    'accountBalance': 'financeAccountBalance',
    'arInvoiceLine': 'financeArInvoiceLine',
    'arPayment': 'financeArPaymentAllocation', 
    'arInvoice': 'financeArInvoice',
    'paymentAllocation': 'financeArPaymentAllocation',
    'journalEntry': 'financeJournalEntry',
    'subledgerEntry': 'financeJournalEntry',
    'hrMentorshipPairs': 'hrMentorshipPair',
    'retailOrderLine': 'retailOrderLine'
};

const targetFiles = [
  'src/core/finance/ar/repositories/ar-payment.db.repository.ts',
  'src/core/finance/ar/services/ar-invoice.service.ts',
  'src/core/finance/repositories/account-balance.db.repository.ts',
  'src/core/finance/repositories/finance.db.repository.ts',
  'src/core/finance/ar/repositories/ar-invoice.db.repository.ts',
  'src/modules/retail/seeders/retail.seeder.ts',
  'src/modules/retail/repositories/retail.db.repository.ts',
  'src/modules/retail/retail-public-customer.service.ts'
];

targetFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Prefix mapping for this.db as well
  content = content.replace(/(tx|this\.prisma|this\.db)\.([a-zA-Z]+)(?=\.|\(|\[)/g, (match, prefix, camel) => {
      if (manualReplacements[camel]) {
          return `${prefix}.${manualReplacements[camel]}`;
      }
      return match;
  });

  // Specifically for retail.seeder.ts
  content = content.replace(/this\.prisma\.companies/g, 'this.prisma.company');

  // Hardcode fix for sourceModule inside financeJournalEntryCreateInput
  content = content.replace(/sourceModule:\s*"[^"]+",\s*/g, '');

  fs.writeFileSync(filePath, content);
});

console.log('Final flawless straggler patches applied encompassing this.db prefix.');
