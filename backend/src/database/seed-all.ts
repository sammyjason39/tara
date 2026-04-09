import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting master seed (v5 - Final Fixes)...");

  // 1. Seed Companies
  const companies = [
    { id: "tenant-001", name: "Zenvix HQ", code: "ZX-HQ", status: "active", updatedAt: new Date() },
    {
      id: "tenant-002",
      name: "Zenvix Retail",
      code: "ZX-RT",
      status: "active",
      updatedAt: new Date(),
    },
    {
      id: "comp-demo-a",
      name: "Demo Corp A",
      code: "DEMO-A",
      status: "active",
      updatedAt: new Date(),
    },
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: company,
      create: company,
    });
  }
  console.log("Seeded Companies");

  // 2. Seed Locations
  const locations = [
    {
      id: "location-001",
      tenantId: "tenant-001",
      name: "HQ Jakarta",
      code: "LOC-JKT-HQ",
      type: "office",
    },
    {
      id: "location-002",
      tenantId: "tenant-002",
      name: "Store Jakarta",
      code: "LOC-JKT-ST",
      type: "store",
    },
    {
      id: "loc-demo-1",
      tenantId: "comp-demo-a",
      name: "Chicago Plant",
      code: "LOC-CHI-PL",
      type: "factory",
    },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: loc,
      create: loc,
    });
  }
  console.log("Seeded Locations");

  // 3. Seed Users (Demo User)
  const users = [
    {
      id: "user-demo",
      email: "demo@zenvix.local",
      passwordHash: "$2b$10$Ep7viJ6m5Q7Z2Y5X2Z2Y5O.Z2Y5X2Z2Y5O.Z2Y5X2Z2Y5O.", // dummy hash
      firstName: "Demo",
      lastName: "User",
      tenantId: "tenant-001",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }
  console.log("Seeded Users");

  // 4. Connect User to Companies
  for (const company of companies) {
    await prisma.userCompany.upsert({
      where: {
        userId_tenantId: {
          userId: "user-demo",
          tenantId: company.id,
        },
      },
      update: { role: "OWNER" },
      create: {
        userId: "user-demo",
        tenantId: company.id,
        role: "OWNER",
      },
    });
  }
  console.log("Connected User to Companies");

  // 5. Seed Sale Leads
  const salesLeads = [
    {
      id: "tenant-001-lead-1",
      tenantId: "tenant-001",
      companyName: "Acme Retail",
      contactName: "Lena Ward",
      contactEmail: "lena.ward@acmeretail.example",
      source: "MARKETING",
      ownerId: "rep-jessie",
      ownerName: "Jessie Allan",
      score: 88,
      potentialValue: 420000,
      currency: "USD",
      priority: "HIGH",
      status: "CONTACTED",
      slaDueAt: new Date(),
    },
  ];

  for (const lead of salesLeads) {
    await prisma.salesLead.upsert({
      where: { id: lead.id },
      update: lead,
      create: lead,
    });
  }
  console.log("Seeded Sales Leads");

  // 6. Seed Sales Opportunities
  const opportunities = [
    {
      id: "tenant-001-opp-1",
      tenantId: "tenant-001",
      leadId: "tenant-001-lead-1",
      accountName: "Acme Retail",
      ownerId: "rep-jessie",
      ownerName: "Jessie Allan",
      stage: "PROPOSAL",
      probability: 60,
      amount: 420000,
      currency: "USD",
      expectedCloseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      health: "MEDIUM_RISK",
    },
  ];

  for (const opp of opportunities) {
    await prisma.salesOpportunity.upsert({
      where: { id: opp.id },
      update: opp,
      create: opp,
    });
  }
  console.log("Seeded Sales Opportunities");

  // 7. Seed Marketing Campaigns
  const campaigns = [
    {
      id: "tenant-001-cmp-001",
      tenantId: "tenant-001",
      name: "Q2 Enterprise Expansion",
      objective: "LEAD_GEN",
      channelMix: ["META_ADS", "GOOGLE_ADS", "EMAIL"],
      ownerId: "mkt-jessie",
      ownerName: "Jessie Allan",
      budget: 120000,
      currency: "USD",
      status: "ACTIVE",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-06-30"),
      audience: "Mid-market retail and manufacturing leaders",
    },
  ];

  for (const cmp of campaigns) {
    await prisma.marketingCampaign.upsert({
      where: { id: cmp.id },
      update: cmp,
      create: cmp,
    });
  }
  console.log("Seeded Marketing Campaigns");

  // 8. Seed Payment Providers
  const providers = [
    {
      id: "BANK_BCA",
      tenantId: "tenant-001",
      name: "Bank BCA",
      status: "HEALTHY",
      priority: 1,
      channels: ["BANK_TRANSFER", "QR"],
      maxAmountPerTxn: 1000000000,
      settlementSlaHours: 6,
    },
    {
      id: "STRIPE",
      tenantId: "tenant-001",
      name: "Stripe",
      status: "HEALTHY",
      priority: 3,
      channels: ["CARD_ONLINE", "CARD_POS", "WALLET"],
      maxAmountPerTxn: 750000000,
      settlementSlaHours: 24,
    },
  ];

  for (const provider of providers) {
    await prisma.paymentProvider.upsert({
      where: { id: provider.id },
      update: provider,
      create: provider,
    });
  }
  console.log("Seeded Payment Providers");

  // 9. Seed IT Devices
  const devices = [
    {
      id: "tenant-001-dev-1",
      tenantId: "tenant-001",
      locationId: "location-001",
      type: "POS_TERMINAL",
      name: "HQ POS Terminal 1",
      connection: "LAN",
      status: "ONLINE",
    },
  ];

  for (const dev of devices) {
    await prisma.itDevice.upsert({
      where: { id: dev.id },
      update: dev,
      create: dev,
    });
  }
  console.log("Seeded IT Devices");

  // 10. Seed IT Settings
  const itSettings = [
    {
      id: "tenant-001-set-1",
      tenantId: "tenant-001",
      key: "company.timezone",
      value: "America/New_York",
      category: "general",
    },
    {
      id: "tenant-001-set-2",
      tenantId: "tenant-001",
      key: "company.currency",
      value: "USD",
      category: "finance",
    },
  ];

  for (const set of itSettings) {
    await prisma.itSettings.upsert({
      // Corrected to iTSetting
      where: { id: set.id },
      update: set,
      create: set,
    });
  }
  console.log("Seeded IT Settings");

  console.log("Master seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
