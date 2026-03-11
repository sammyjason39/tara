import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { code: 'ZENVIX' }
  });

  if (!company) {
    console.error('Company ZENVIX not found');
    return;
  }

  const tenantId = company.id;

  // 1. Create Module Definitions
  const modules = [
    { code: 'RETAIL', name: 'Retail Industry Suite', category: 'industry', description: 'Complete POS, Inventory, and Ecommerce integration for retail businesses.' },
    { code: 'LOGISTICS', name: 'Logistics Core', category: 'industry', description: 'Fleet management, routing optimization, and last-mile delivery tracking.' },
    { code: 'HR_ADVANCED', name: 'HR Advanced Tools', category: 'core', description: 'Talent scoring, performance cycles, and payroll automated processing.' },
  ];

  for (const mod of modules) {
    await prisma.moduleDefinition.upsert({
      where: { code: mod.code },
      update: mod,
      create: mod,
    });
  }

  // 2. Create Licenses for the company
  const licenses = [
    { 
      tenantId, 
      moduleCode: 'RETAIL', 
      licenseKey: 'LIC-RETAIL-001', 
      status: 'active', 
      isEnabled: true, 
      planType: 'annual', 
      maxSeats: 50,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    { 
      tenantId, 
      moduleCode: 'HR_ADVANCED', 
      licenseKey: 'LIC-HR-001', 
      status: 'active', 
      isEnabled: false, 
      planType: 'monthly', 
      maxSeats: 10,
      startDate: new Date(),
    }
  ];

  for (const lic of licenses) {
    await prisma.moduleLicense.upsert({
      where: { tenantId_moduleCode: { tenantId: lic.tenantId, moduleCode: lic.moduleCode } },
      update: lic,
      create: lic,
    });
  }

  console.log('Seed license data completed.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
