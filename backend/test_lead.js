require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testLead() {
  const tenantId = "3a2ab252-5b92-475e-95dc-3d84a51c9f6c";
  console.log("--- Testing SalesLead Creation ---");

  try {
    const lead = await prisma.salesLead.create({
      data: {
        tenantId,
        companyName: "Test Corp",
        contactName: "John Doe",
        ownerId: "owner-1",
        ownerName: "Owner One",
        potentialValue: 5000,
        slaDueAt: new Date(Date.now() + 86400000),
      },
    });
    console.log("SUCCESS Lead:", lead);
  } catch (error) {
    console.error("ERROR Lead:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testLead();
