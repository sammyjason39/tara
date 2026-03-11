const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    take: 10,
    select: { id: true, name: true },
  });
  console.log("Recent companies:", JSON.stringify(companies, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
