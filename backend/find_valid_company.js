const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  console.log("Valid company ID:", company?.id);
  console.log("Record:", JSON.stringify(company, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
