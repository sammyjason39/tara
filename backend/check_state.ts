import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "zen-demo-123";

  console.log(`Checking state for tenant: ${tenantId}`);

  const modules = await prisma.adminModuleStatus.findMany({
    where: { tenantId },
  });
  console.log(
    "Modules:",
    modules.map((m) => `${m.moduleKey}: ${m.enabled}`),
  );

  const storeCount = await prisma.store.count({
    where: { tenantId },
  });
  console.log("Store Count:", storeCount);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
