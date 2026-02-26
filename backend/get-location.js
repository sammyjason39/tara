const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = "comp-demo-a";

  let loc = await prisma.location.findFirst({
    where: { companyId: tenantId },
  });

  if (!loc) {
    console.log("No location found. Creating one...");
    loc = await prisma.location.create({
      data: {
        companyId: tenantId,
        name: "Main HQ Base",
        code: "HQ-01",
        address: "123 Base St",
        type: "headquarters",
      },
    });
  }

  console.log("VALID_LOCATION_ID=" + loc.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
