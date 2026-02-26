import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "comp-demo-a";

  const loc = await prisma.location.create({
    data: {
      tenantId,
      name: "HQ",
      code: "HQ-01",
      type: "HEADQUARTERS",
    },
  });

  const dep = await prisma.department.create({
    data: {
      tenantId,
      name: "IT Dept",
      code: "IT",
    },
  });

  const emp = await prisma.employee.create({
    data: {
      tenantId,
      employeeCode: "EMP-001",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      position: "Engineer",
      departmentId: dep.id,
      locationId: loc.id,
      hireDate: new Date(),
    },
  });

  console.log("Seeded employee with ID:", emp.id, "and code EMP-001");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
