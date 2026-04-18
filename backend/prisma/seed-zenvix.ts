import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Zenvix Personal Seeder...");

  const tenantId = "zenvix";
  const branchId = "loc-ubud";

  // 1. Create Company
  await prisma.company.upsert({
    where: { id: tenantId },
    update: { name: "Zenvix", code: "ZENVIX", status: "active", industry: "retail" },
    create: {
      id: tenantId,
      name: "Zenvix",
      code: "ZENVIX",
      status: "active",
      industry: "retail",
    },
  });
  console.log("✅ Company 'Zenvix' created.");

  // 2. Create Users
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash("admin1234", salt);
  const ownerPassword = await bcrypt.hash("hansel8891", salt);

  const users = [
    {
      id: "usr-superadmin",
      email: "superadmin@zenvix.id",
      password_hash: adminPassword,
      first_name: "Super",
      last_name: "Admin",
      tenant_id: tenantId,
    },
    {
      id: "usr-hansel",
      email: "hansel@zenvix.id",
      password_hash: ownerPassword,
      first_name: "Hansel",
      last_name: "Owner",
      tenant_id: tenantId,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { first_name: u.first_name, last_name: u.last_name, password_hash: u.password_hash },
      create: u,
    });
  }
  console.log("✅ Users seeded.");

  // 3. Create Roles (UserCompany)
  await prisma.userCompany.upsert({
    where: { user_id_tenant_id: { user_id: "usr-superadmin", tenant_id: tenantId } },
    update: { role: "SUPERADMIN" },
    create: {
      id: "uc-superadmin",
      user_id: "usr-superadmin",
      tenant_id: tenantId,
      role: "SUPERADMIN",
    },
  });

  await prisma.userCompany.upsert({
    where: { user_id_tenant_id: { user_id: "usr-hansel", tenant_id: tenantId } },
    update: { role: "OWNER" },
    create: {
      id: "uc-hansel",
      user_id: "usr-hansel",
      tenant_id: tenantId,
      role: "OWNER",
    },
  });
  console.log("✅ Roles assigned.");

  // 4. Create Location
  await prisma.location.upsert({
    where: { id: branchId },
    update: { name: "Ubud - Bali", code: "UBD-001", tenant_id: tenantId },
    create: {
      id: branchId,
      tenant_id: tenantId,
      name: "Ubud - Bali",
      code: "UBD-001",
      type: "branch",
    },
  });
  console.log("✅ Location 'Ubud - Bali' created.");

  // 5. Create Departments
  const departments = [
    { id: "dept-ret", name: "Retail Operations", code: "RET" },
    { id: "dept-fin", name: "Finance & Accounting", code: "FIN" },
    { id: "dept-hr", name: "Human Resources", code: "HR" },
    { id: "dept-it", name: "IT & Systems", code: "IT" },
  ];

  for (const d of departments) {
    await prisma.department.upsert({
      where: { tenant_id_code: { tenant_id: tenantId, code: d.code } },
      update: { name: d.name },
      create: {
        id: d.id,
        tenant_id: tenantId,
        name: d.name,
        code: d.code,
        status: "active",
      },
    });
  }
  console.log("✅ Departments seeded.");

  // 6. Active Fiscal Period
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);

  await prisma.accountingPeriod.upsert({
    where: { tenant_id_name: { tenant_id: tenantId, name: `FY-${now.getFullYear()}` } },
    update: { status: "ACTIVE" },
    create: {
      id: `per-${now.getFullYear()}`,
      tenant_id: tenantId,
      name: `FY-${now.getFullYear()}`,
      start_date: startOfYear,
      end_date: endOfYear,
      status: "ACTIVE",
    },
  });
  console.log("✅ Fiscal Period 2026 created.");

  // 7. Chart of Accounts & Mappings
  const accounts = [
    { id: "ACC-4000", code: "4000", name: "Sales Revenue", type: "REVENUE" },
    { id: "ACC-1001", code: "1001", name: "Cash on Hand", type: "ASSET" },
  ];

  for (const acc of accounts) {
    await (prisma as any).financeChartOfAccount.upsert({
      where: { tenant_id_code: { tenant_id: tenantId, code: acc.code } },
      update: { name: acc.name },
      create: {
        id: acc.id,
        tenant_id: tenantId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        status: "ACTIVE",
      },
    });
  }

  await (prisma as any).financeSystemMapping.upsert({
    where: { tenant_id_system_code: { tenant_id: tenantId, system_code: "RETAIL_SALES" } },
    update: { account_id: "ACC-4000" },
    create: {
      tenant_id: tenantId,
      system_code: "RETAIL_SALES",
      account_id: "ACC-4000",
      status: "ACTIVE",
    },
  });

  await (prisma as any).financeSystemMapping.upsert({
    where: { tenant_id_system_code: { tenant_id: tenantId, system_code: "RETAIL_CASH" } },
    update: { account_id: "ACC-1001" },
    create: {
      tenant_id: tenantId,
      system_code: "RETAIL_CASH",
      account_id: "ACC-1001",
      status: "ACTIVE",
    },
  });
  console.log("✅ Finance mappings completed.");

  // 8. Admin Module Statuses (All Active)
  const modules = ["finance", "hr", "it", "retail", "sales", "procurement"];
  for (const m of modules) {
    await (prisma as any).adminModuleStatus.upsert({
      where: { tenant_id_module_key: { tenant_id: tenantId, module_key: m } },
      update: { enabled: true },
      create: {
        id: uuidv4(),
        tenant_id: tenantId,
        module_key: m,
        enabled: true,
        updated_by: "system",
      },
    });
  }

  console.log("✅ All modules activated.");

  console.log("✨ Zenvix Personal Seeding Finished!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
