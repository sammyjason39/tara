import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = "comp-demo-a";
  const modules = [
    "finance",
    "hr",
    "it",
    "admin",
    "retail",
    "sales",
    "procurement",
  ];
  for (const moduleKey of modules) {
    await prisma.adminModuleStatus.upsert({
      where: { tenantId_moduleKey: { tenantId, moduleKey } },
      update: { enabled: true },
      create: {
        tenantId,
        moduleKey,
        enabled: true,
        updatedBy: "system",
      },
    });
  }
  console.log("Admin module statuses seeded for", tenantId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
