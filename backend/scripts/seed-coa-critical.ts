import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const CRITICAL_ACCOUNTS = [
  { code: '1000', name: 'Vault / Cash on Hand', type: 'ASSET' },
  { code: '1001', name: 'Bank Account - Operations', type: 'ASSET' },
  { code: '1002', name: 'Gateway Clearing / AR', type: 'ASSET' },
  { code: 'EXP-FEE', name: 'Gateway Processing Fees', type: 'EXPENSE' },
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
];

async function seed() {
  console.log('🌱 Starting COA Critical Accounts Validation...');

  // Get all active companies (tenants)
  const companies = await prisma.companies.findMany({ select: { id: true, name: true } });

  for (const company of companies) {
    console.log(`\n🏢 Processing Tenant: ${company.name} (${company.id})`);

    for (const acc of CRITICAL_ACCOUNTS) {
      const existing = await prisma.finance_chart_of_accounts.findUnique({
        where: {
          tenant_id_code: { tenant_id: company.id, code: acc.code }
        }
      });

      if (!existing) {
        await prisma.finance_chart_of_accounts.create({
          data: {
            id: uuidv4(),
            tenant_id: company.id,
            code: acc.code,
            name: acc.name,
            type: acc.type,
            status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date(),
          } as any
        });
        console.log(`  ✅ Added: ${acc.code} - ${acc.name}`);
      } else {
        console.log(`  🔹 Exists: ${acc.code} - ${acc.name}`);
      }
    }
  }

  console.log('\n✅ COA Verification Complete!');
}

seed()
  .catch(e => {
    console.error('❌ Error seeding COA:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
