import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "comp-demo-a";
  const storeId = "sto-bali-demo"; 
  const locationId = "loc-bali-demo";
  const userId = "usr-superadmin-001";

  console.log(`🚀 Refining 6-Month Historical Data for: ${tenantId}`);

  // 1. Ensure Dependencies
  
  // A. Fiscal Period
  const fiscalYear = await prisma.financeFiscalYear.upsert({
    where: { tenantId_year: { tenantId, year: 2026 } },
    update: {},
    create: { tenantId, year: 2026, status: "OPEN", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") }
  });

  const fiscalPeriod = await prisma.financeFiscalPeriod.upsert({
    where: { tenantId_code: { tenantId, code: "2026-Q1" } },
    update: {},
    create: {
      tenantId,
      fiscalYearId: fiscalYear.id,
      code: "2026-Q1",
      name: "Q1 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
      status: "OPEN"
    }
  });

  // B. Accounts
  const accounts = [
    { id: "acc-rent-6300", name: "Rent Expense", type: "EXPENSE" },
    { id: "acc-util-6400", name: "Utility Expense", type: "EXPENSE" },
    { id: "acc-sales-4000", name: "Retail Sales", type: "REVENUE" },
  ];

  for (const acc of accounts) {
    await prisma.financeAccount.upsert({
      where: { id: acc.id },
      update: {},
      create: {
        id: acc.id,
        tenantId,
        code: acc.id.split("-").pop() || "9999",
        name: acc.name,
        type: acc.type as any,
        status: "ACTIVE",
        isFscEnabled: true,
      }
    });
  }

  // C. Payroll Run
  const payrollRun = await prisma.hrPayrollRun.upsert({
    where: { id: "pr-bali-q1" },
    update: {},
    create: {
      id: "pr-bali-q1",
      tenantId,
      name: "Q1 2026 Monthly Bulk",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-03-31"),
      status: "COMPLETED",
    }
  });

  // D. Supplier & Branch
  const supplier = await prisma.supplierMaster.upsert({
    where: { id: "sup-demo-001" },
    update: {},
    create: { id: "sup-demo-001", tenantId, name: "Global Supply Chain Co.", code: "GSCC" }
  });

  const supplierBranch = await prisma.supplierBranche.upsert({
    where: { id: "sup-br-demo-001" },
    update: {},
    create: { id: "sup-br-demo-001", tenantId, supplierId: supplier.id, name: "Jakarta Distribution Center", code: "JKT-DC" }
  });

  // E. Procurement Requisition & Draft PO (Required for Final PO)
  const requisition = await prisma.procurementRequisition.create({
    data: {
      tenantId,
      requesterId: userId,
      status: "APPROVED",
      totalAmount: new Decimal(150000),
      reason: "Historical Seed",
    }
  });

  const draftPo = await prisma.procurementDraftPo.create({
    data: {
      tenantId,
      requisitionId: requisition.id,
      supplierId: supplier.id,
      supplierBranchId: supplierBranch.id,
      status: "APPROVED",
      totalAmount: new Decimal(150000),
    }
  });

  const finalPo = await prisma.procurementFinalPo.upsert({
    where: { id: "po-demo-historical" },
    update: {},
    create: {
      id: "po-demo-historical",
      tenantId,
      requisitionId: requisition.id,
      draftPoId: draftPo.id,
      supplierId: supplier.id,
      supplierBranchId: supplierBranch.id,
      branchCode: "JKT-01",
      status: "RELEASED",
      totalAmount: new Decimal(150000),
    }
  });

  // 2. Generate Historical Business Data
  const customers = await prisma.retailCustomer.findMany({ where: { tenantId }, take: 40 });
  const employee = await prisma.employee.findFirst({ where: { tenantId } });

  if (!employee) {
     console.log("❌ No employee found. Please run seed-universal.ts first.");
     return;
  }

  const months = 6;
  const now = new Date();
  
  // Clear old data to avoid duplication errors during re-run
  await prisma.retailOrder.deleteMany({ where: { tenantId } });
  await prisma.procurementReceipt.deleteMany({ where: { tenantId } });
  await prisma.payrollLine.deleteMany({ where: { tenantId } });
  await prisma.financeJournalEntry.deleteMany({ where: { tenantId } });

  for (let m = 0; m < months; m++) {
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const monthLabel = currentMonthDate.toLocaleString('default', { month: 'short' });
    console.log(`   📅 Seeding ${monthLabel}...`);

    // A. Retail Orders
    const orderCount = 20 + Math.floor(Math.random() * 20);
    for (let o = 0; o < orderCount; o++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      await prisma.retailOrder.create({
        data: {
          tenantId,
          storeId,
          customerId: customer?.id,
          status: "paid",
          subtotal: new Decimal(225),
          tax: new Decimal(25),
          totalAmount: new Decimal(250),
          createdAt: new Date(currentMonthDate.getTime() + (o * 86400000)),
        },
      });
    }

    // B. Procurement
    await prisma.procurementReceipt.create({
      data: {
        tenantId,
        finalPoId: finalPo.id,
        supplierId: supplier.id,
        supplierBranchId: supplierBranch.id,
        receivedAt: currentMonthDate,
        createdAt: currentMonthDate,
      },
    });

    // C. Payroll
    await prisma.payrollLine.create({
      data: {
        tenantId,
        payrollRunId: payrollRun.id,
        employeeId: employee.id,
        grossPay: new Decimal(8500),
        netPay: new Decimal(7500),
        createdAt: currentMonthDate,
      },
    });

    // D. Opex
    const journalEntry = await prisma.financeJournalEntry.create({
      data: {
        tenantId,
        ref: `OPEX-${m}-${Date.now()}`,
        description: `Overhead - ${monthLabel}`,
        status: "POSTED",
        postingDate: currentMonthDate,
        journalType: "NORMAL",
        fiscalPeriodId: fiscalPeriod.id,
      },
    });

    await prisma.financeJournalLine.create({
      data: {
        tenantId,
        entryId: journalEntry.id,
        accountId: "acc-rent-6300",
        debitAmount: new Decimal(5000),
        creditAmount: new Decimal(0),
        description: "Rent Entry",
      },
    });
  }

  console.log("✅ Data Refinement Complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
