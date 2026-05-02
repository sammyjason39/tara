import type { Employee, EmploymentStatus, EmploymentType } from "@/core/types/hr/employee";
import { prisma } from "@/core/persistence/database/client";

/**
 * Mapping helper to convert Prisma Employee with relations to Frontend Employee type
 */
const mapToEmployee = (db: any): Employee => ({
  id: db.id,
  tenantId: db.tenantId,
  userId: db.userId || undefined,
  employeeCode: db.employeeCode,
  firstName: db.firstName,
  lastName: db.lastName,
  fullName: `${db.firstName} ${db.lastName}`,
  email: db.email,
  phone: db.phone || undefined,
  departmentId: db.departmentId,
  managerId: db.managerId || undefined,
  roleTitle: db.position,
  location: db.location?.name || "Unknown",
  locationId: db.locationId,
  status: db.status as EmploymentStatus,
  employmentType: (db.employmentType || "full_time") as EmploymentType,
  baseSalary: db.baseSalary ? Number(db.baseSalary) : undefined,
  hourlyRate: db.hourlyRate ? Number(db.hourlyRate) : undefined,
  hireDate: db.hireDate.toISOString().split('T')[0],
  terminationDate: db.terminationDate?.toISOString().split('T')[0],
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as Employee);

export const employeeRepo = {
  /**
   * List all employees for a specific tenant
   */
  async list(tenantId: string): Promise<Employee[]> {
    const employees = await prisma.employee.findMany({
      where: {
        tenantId: tenantId,
        deletedAt: null,
      },
      include: {
        location: true,
        department: true,
      },
      orderBy: {
        lastName: 'asc',
      },
    });

    return (Array.isArray(employees) ? employees : []).map(mapToEmployee);
  },

  /**
   * Get employee by ID
   */
  async getById(tenantId: string, employeeId: string): Promise<Employee | undefined> {
    const dbEmployee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        tenantId: tenantId,
        deletedAt: null,
      },
      include: {
        location: true,
        department: true,
      },
    });

    return dbEmployee ? mapToEmployee(dbEmployee) : undefined;
  },

  /**
   * Get employee by ID (Global/Superadmin)
   */
  async getGlobal(employeeId: string): Promise<Employee | undefined> {
    const dbEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        location: true,
        department: true,
      },
    });

    return dbEmployee ? mapToEmployee(dbEmployee) : undefined;
  },

  /**
   * Create a new employee
   */
  async create(
    tenantId: string, 
    payload: Omit<Employee, "id" | "tenantId" | "createdAt" | "updatedAt" | "fullName">
  ): Promise<Employee> {
    // If location is provided as a string (name), we might need to find the ID
    // But for now, we assume the UI provides locationId if we expanded the interface
    // Fallback to a default location if necessary
    let locId = (payload as any).locationId;
    if (!locId) {
      const firstLoc = await prisma.location.findFirst({ where: { tenantId: tenantId } });
      locId = firstLoc?.id || "loc-default";
    }

    const employee = await prisma.employee.create({
      data: {
        tenantId: tenantId,
        locationId: locId,
        departmentId: payload.departmentId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        userId: payload.userId,
        managerId: payload.managerId,
        position: payload.roleTitle,
        employeeCode: payload.employeeCode,
        employmentType: payload.employmentType,
        baseSalary: payload.baseSalary,
        hourlyRate: payload.hourlyRate,
        hireDate: new Date(payload.hireDate),
        status: payload.status,
      },
      include: {
        location: true,
        department: true,
      },
    });

    return mapToEmployee(employee);
  },

  /**
   * Update an employee
   */
  async update(
    tenantId: string, 
    employeeId: string, 
    patch: Partial<Employee>
  ): Promise<Employee | null> {
    const data: any = {};
    if (patch.firstName) data.firstName = patch.firstName;
    if (patch.lastName) data.lastName = patch.lastName;
    if (patch.email) data.email = patch.email;
    if (patch.phone) data.phone = patch.phone;
    if (patch.userId) data.userId = patch.userId;
    if (patch.managerId) data.managerId = patch.managerId;
    if (patch.roleTitle) data.position = patch.roleTitle;
    if (patch.employeeCode) data.employeeCode = patch.employeeCode;
    if (patch.status) data.status = patch.status;
    if (patch.employmentType) data.employmentType = patch.employmentType;
    if (patch.baseSalary !== undefined) data.baseSalary = patch.baseSalary;
    if (patch.hourlyRate !== undefined) data.hourlyRate = patch.hourlyRate;
    if (patch.hireDate) data.hireDate = new Date(patch.hireDate);
    if (patch.terminationDate) data.terminationDate = new Date(patch.terminationDate);
    if (patch.departmentId) data.departmentId = patch.departmentId;
    if ((patch as any).locationId) data.locationId = (patch as any).locationId;

    const employee = await prisma.employee.update({
      where: {
        id: employeeId,
      },
      data,
      include: {
        location: true,
        department: true,
      },
    });

    return mapToEmployee(employee);
  },

  /**
   * Delete an employee (Soft Delete)
   */
  async delete(tenantId: string, employeeId: string): Promise<void> {
    await prisma.employee.update({
      where: {
        id: employeeId,
        tenantId: tenantId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  },
};
