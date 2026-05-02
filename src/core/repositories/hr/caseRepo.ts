import type { HRCase, CaseType, CaseStatus } from "@/core/types/hr/case";
import { prisma } from "@/core/persistence/database/client";
// Re-triggering IDE type check with standardized naming

/**
 * Mapping helper for HR Case
 */
const mapToCase = (db: any): HRCase => ({
  id: db.id,
  tenantId: db.tenantId,
  title: db.title,
  type: db.type as CaseType,
  status: db.status as CaseStatus,
  employeeId: db.employeeId,
  departmentId: db.departmentId || undefined,
  ownerId: db.ownerId || undefined,
  priority: db.priority as any,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as HRCase);

export const caseRepo = {
  /**
   * List all cases for a tenant
   */
  async list(tenantId: string): Promise<HRCase[]> {
    const list = await prisma.hRCase.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(list) ? list : []).map(mapToCase);
  },

  /**
   * Get a single case
   */
  async get(tenantId: string, caseId: string): Promise<HRCase | undefined> {
    const record = await prisma.hRCase.findFirst({
      where: { id: caseId, tenantId: tenantId },
    });
    return record ? mapToCase(record) : undefined;
  },

  /**
   * Create a new case
   */
  async create(
    tenantId: string, 
    payload: Omit<HRCase, "id" | "tenantId" | "createdAt" | "updatedAt">
  ): Promise<HRCase> {
    const record = await prisma.hRCase.create({
      data: {
        tenantId: tenantId,
        employeeId: payload.employeeId,
        departmentId: payload.departmentId,
        title: payload.title,
        type: payload.type,
        status: payload.status,
        priority: payload.priority,
        ownerId: payload.ownerId,
      },
    });
    return mapToCase(record);
  },

  /**
   * Update an existing case
   */
  async update(
    tenantId: string, 
    caseId: string, 
    patch: Partial<HRCase>
  ): Promise<HRCase | undefined> {
    const data: any = {};
    if (patch.title) data.title = patch.title;
    if (patch.status) data.status = patch.status;
    if (patch.priority) data.priority = patch.priority;
    if (patch.ownerId) data.ownerId = patch.ownerId;

    const updated = await prisma.hRCase.update({
      where: {
        id: caseId,
        tenantId: tenantId,
      },
      data,
    });

    return mapToCase(updated);
  },
};
