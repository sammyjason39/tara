import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ take: 1 });
  console.log(
    "Companies:",
    companies.map((c) => c.id),
  );

  const employees = await prisma.employee.findMany({ take: 1 });
  console.log(
    "Employees:",
    employees.map((e) => ({ id: e.id, code: e.employeeCode })),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
