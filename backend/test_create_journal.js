require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testCreate() {
  console.log("--- Testing Journal Creation Directly via Prisma ---");

  try {
    // 1. Create a dummy company to ensure valid tenantId
    const company = await prisma.company.create({
      data: {
        id: "test-tenant-" + Date.now(),
        name: "Test Tenant " + Date.now(),
        code: "TEST" + (Date.now() % 1000),
        status: "active",
      },
    });
    const tenantId = company.id;
    console.log("SUCCESS Created Company:", tenantId);

    // 2. Create Journal Entry
    const journal = await prisma.journalEntry.create({
      data: {
        tenantId,
        ref: "TEST-" + Date.now(),
        description: "Direct Prisma Test",
        status: "POSTED",
        lines: {
          create: [
            {
              accountCode: "1001",
              description: "Debit",
              debit: 100.0,
              credit: 0.0,
            },
            {
              accountCode: "2001",
              description: "Credit",
              debit: 0.0,
              credit: 100.0,
            },
          ],
        },
      },
      include: { lines: true },
    });
    console.log("SUCCESS Journal:", journal.id);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCreate();
