require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function findJournals() {
  console.log("--- Finding Any Existing Journals ---");
  try {
    const journals = await prisma.journalEntry.findMany({
      take: 5,
      select: { id: true, tenantId: true, description: true },
    });
    console.log("Journals in DB:", journals);

    const count = await prisma.journalEntry.count();
    console.log("Total Journals:", count);
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findJournals();
