import type { Department } from "@/core/types/hr/department";
import { prisma } from "@/core/persistence/database/client";

export const departmentRepo = {
  /**
   * List all departments for a specific tenant
   */
  async list(tenantId: string): Promise<Department[]> {
    const departments = await prisma.department.findMany({
      where: {
        tenantId: tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Map DB tenantId back to tenantId for frontend compatibility
    return departments.map(d => ({
      ...d,
      tenantId: d.tenantId,
      status: d.status as "active" | "inactive",
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      deletedAt: d.deletedAt?.toISOString() || undefined,
    })) as Department[];
  },

  /**
   * Create a new department
   */
  async create(
    tenantId: string, 
    payload: Omit<Department, "tenantId" | "createdAt" | "updatedAt">
  ): Promise<Department> {
    const department = await prisma.department.create({
      data: {
        name: payload.name,
        code: payload.code,
        description: payload.description,
        status: payload.status,
        headId: payload.headId,
        tenantId: tenantId,
      },
    });

    return {
      ...department,
      tenantId: department.tenantId,
      status: department.status as "active" | "inactive",
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString(),
      deletedAt: department.deletedAt?.toISOString() || undefined,
    } as Department;
  },

  /**
   * Get a single department by ID
   */
  async findById(tenantId: string, id: string): Promise<Department | null> {
    const department = await prisma.department.findFirst({
      where: {
        id,
        tenantId: tenantId,
        deletedAt: null,
      },
    });

    if (!department) return null;

    return {
      ...department,
      tenantId: department.tenantId,
      status: department.status as "active" | "inactive",
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString(),
      deletedAt: department.deletedAt?.toISOString() || undefined,
    } as Department;
  },

  /**
   * Delete a department (Soft delete)
   */
  async delete(tenantId: string, id: string): Promise<void> {
    await prisma.department.updateMany({
      where: {
        id,
        tenantId: tenantId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  },
};
