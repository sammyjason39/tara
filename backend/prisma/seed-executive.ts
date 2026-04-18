import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "comp-demo-a";
  
  console.log(`🚀 Executing TRIUMPH Seed for: ${tenantId}`);

  // A. Infrastructure
  console.log("   🏗️ Ensuring Infrastructure...");
  await prisma.company.upsert({ where: { id: tenantId }, update: {}, create: { id: tenantId, name: "Zenvix Demo HQ", code: "ZVX" } });
  
  const location = await prisma.location.upsert({ 
    where: { id: "loc-bali-demo" }, update: {}, 
    create: { id: "loc-bali-demo", tenantId, name: "Bali HQ", code: "BLH", type: "OFFICE", currency: "IDR" } 
  });
  
  const department = await prisma.department.upsert({
    where: { id: "dep-exec-001" }, update: {},
    create: { id: "dep-exec-001", tenantId, name: "Executive", code: "EXEC" }
  });

  const store = await prisma.store.upsert({ 
    where: { id: "sto-bali-demo" }, update: {}, 
    create: { id: "sto-bali-demo", tenantId, locationId: location.id, name: "Bali Flagship", code: "BLF", type: "RETAIL" } 
  });

  const employee = await prisma.employee.upsert({ 
    where: { id: "emp-demo-001" }, update: {}, 
    create: { 
      id: "emp-demo-001", 
      tenantId, 
      firstName: "CEO", 
      lastName: "Demo", 
      email: "ceo@zenvix.id",
      position: "Chief Executive Officer",
      employeeCode: "EMP001",
      hireDate: new Date("2020-01-01"),
      status: "active", 
      locationId: location.id,
      departmentId: department.id
    } 
  });

  // B. Finance Foundation
  console.log("   💰 Building Ledger...");
  const accounts = [
    { code: "4000", name: "Sales Revenue", type: "REVENUE" },
    { code: "5000", name: "COGS", type: "EXPENSE" },
    { code: "6000", name: "Payroll", type: "EXPENSE" },
    { code: "6300", name: "Rent", type: "EXPENSE" },
  ];

  const accountMap: Record<string, string> = {};
  for (const acc of accounts) {
    const created = await prisma.financeChartOfAccount.upsert({
      where: { tenantId_code: { tenantId, code: acc.code } },
      update: {},
      create: { tenantId, code: acc.code, name: acc.name, type: acc.type, status: "ACTIVE" }
    });
    accountMap[acc.code] = created.id;
  }

  const fiscalPeriod = await prisma.financeFiscalPeriod.create({
    data: { tenantId, name: "P1-26", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"), status: "OPEN" }
  });

  // C. History
  console.log("   📦 Generating 6 Months of History...");
  const months = 6;
  const now = new Date();
  
  await prisma.retailOrder.deleteMany({ where: { tenantId } });
  await prisma.financeJournalLine.deleteMany({ where: { tenantId } });
  await prisma.financeJournalEntry.deleteMany({ where: { tenantId } });

  for (let m = 0; m < months; m++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const label = monthDate.toLocaleString('default', { month: 'short' });
    console.log(`      🗓️ ${label}...`);

    // 1. Revenue
    for (let o = 0; o < 30; o++) {
      await prisma.retailOrder.create({
        data: {
          tenantId,
          storeId: store.id,
          status: "paid",
          subtotal: new Decimal(135000),
          tax: new Decimal(15000),
          totalAmount: new Decimal(150000),
          createdAt: new Date(monthDate.getTime() + (o * 86400000))
        }
      });
    }

    // 2. Journal Entry (Consolidated Costs)
    const entry = await prisma.financeJournalEntry.create({
      data: {
        tenantId,
        ref: `HIST-${m}-${Date.now()}`,
        description: `Historical Expenses - ${label}`,
        status: "POSTED",
        postingDate: monthDate,
        fiscalPeriodId: fiscalPeriod.id,
        journalType: "NORMAL"
      }
    });

    await prisma.financeJournalLine.create({
      data: { tenantId, journalEntryId: entry.id, accountId: accountMap["5000"], accountCode: "5000", side: "DEBIT", amount: new Decimal(1500000), debit: new Decimal(1500000) }
    });
    await prisma.financeJournalLine.create({
      data: { tenantId, journalEntryId: entry.id, accountId: accountMap["6000"], accountCode: "6000", side: "DEBIT", amount: new Decimal(3500000), debit: new Decimal(3500000) }
    });
  }

  console.log("✅ TRIUMPH SEED COMPLETE.");
}

main().catch(e => { console.error(e); process.exit(1); });
