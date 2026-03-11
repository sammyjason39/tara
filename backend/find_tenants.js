require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function findTenants() {
  console.log("--- Finding Existing Tenants ---");
  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    });
    console.log("Companies in DB:", companies);

    if (companies.length === 0) {
      console.log("No companies found. You may need to run the seed script.");
    }
  } catch (error) {
    console.error("ERROR connecting to DB:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findTenants();
