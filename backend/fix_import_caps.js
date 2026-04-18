const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/core/hr/repositories/hr.db.repository.ts',
  'src/modules/retail/repositories/retail.db.repository.ts',
  'src/modules/retail/retail-public-auth.service.ts',
  'src/modules/retail/retail-public-customer.service.ts',
  'src/modules/retail/seeders/retail.seeder.ts',
  'src/shared/audit/audit-chain.service.ts',
  'src/core/finance/repositories/finance.db.repository.ts',
  'src/core/inventory/repositories/inventory.db.repository.ts'
];

targetFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix import { RetailCustomer, X, Y } from '@prisma/client'
  content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]@prisma\/client['"]/g, (match, importsStr) => {
      let newImports = importsStr.replace(/\b([A-Z][a-zA-Z]+)\b/g, (m) => {
          if (m === 'PrismaClient' || m === 'Prisma' || m === 'Decimal') return m;
          return m.charAt(0).toLowerCase() + m.slice(1);
      });
      return match.replace(importsStr, newImports);
  });

  // Fix generic typings: e.g. "Promise<RetailCustomer>" -> "Promise<retailCustomer>"
  // Not going to run wild unless bounded by known words. Let's just fix the specific names emitting errors.
  const badNames = ['RetailCustomer', 'RetailCustomerSession', 'RetailCart', 'RetailCartItem', 'RetailWishlist', 'RetailWishlistItem', 'FinanceAccountBalance', 'HrMentorshipPair', 'InventoryPool', 'RetailPromotion', 'RetailOrder'];
  
  badNames.forEach(bn => {
      const regex = new RegExp(`\\b${bn}\\b`, 'g');
      content = content.replace(regex, bn.charAt(0).toLowerCase() + bn.slice(1));
  });

  fs.writeFileSync(filePath, content);
});

console.log('Fixed export caps.');
