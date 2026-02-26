import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "zen-demo-123";
  const modules = [
    "it",
    "retail",
    "finance",
    "hr",
    "inventory",
    "procurement",
    "sales",
    "marketing",
    "payment",
  ];

  console.log(`Seeding module status for tenant: ${tenantId}`);

  for (const moduleKey of modules) {
    await prisma.adminModuleStatus.upsert({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey,
        },
      },
      update: {
        enabled: true,
        updatedBy: "seed-script",
      },
      create: {
        tenantId,
        moduleKey,
        enabled: true,
        updatedBy: "seed-script",
      },
    });
  }

  console.log("Module seeding complete.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
