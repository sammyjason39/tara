import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "comp-demo-a";
  const email = "hansel@zenvix.id";
  const password = "hansel8891";

  console.log(`🛠️ Restoring User: ${email}`);

  // 1. Ensure Tenant (Company) Exists
  const company = await prisma.company.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: "Zenvix Demo HQ",
      code: "ZVX",
    },
  });
  console.log(`✅ Tenant ${tenantId} ready.`);

  // 2. Ensure Hansel User Exists
  const passwordHash = bcrypt.hashSync(password, 10);
  const hansel = await prisma.user.upsert({
    where: { email: email },
    update: {
      passwordHash: passwordHash,
      status: "active",
    },
    create: {
      email: email,
      passwordHash: passwordHash,
      firstName: "Hansel",
      lastName: "Representative",
      status: "active",
      userCompanies: {
        create: {
          tenantId: tenantId,
          role: "owner",
        },
      },
    },
  });
  console.log(`✅ User ${email} restored.`);

  // 3. Ensure Default Location exists to prevent UI crashes
  const locationId = "loc-jakarta";
  await prisma.location.upsert({
    where: { id: locationId },
    update: {},
    create: {
      id: locationId,
      tenantId: tenantId,
      name: "Jakarta HQ",
      code: "JKT-01",
      type: "headquarters",
      country: "ID",
      currency: "IDR",
    },
  });
  console.log(`✅ Location ${locationId} ready.`);

  // 4. Seed Finance Baseline
  const accounts = [
    { code: "4000", name: "Retail Sales", type: "REVENUE" },
    { code: "5000", name: "COGS", type: "EXPENSE" },
    { code: "6300", name: "Rent Expense", type: "EXPENSE" },
  ];

  for (const acc of accounts) {
    await prisma.financeAccount.upsert({
      where: { id: `acc-${acc.code}` }, // Strategy: acc-CODE
      update: {},
      create: {
        id: `acc-${acc.code}`,
        tenantId,
        code: acc.code,
        name: acc.name,
        type: acc.type as any,
        status: "ACTIVE",
        isFscEnabled: true,
      }
    }).catch(e => console.log(`   ⚠️ Could not seed account ${acc.code} (might use different schema structure)`));
  }

  console.log("🏁 Restoration Complete. Hansel is ready to login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
