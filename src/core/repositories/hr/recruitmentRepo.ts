import type { RecruitmentRequisition, RecruitmentStatus } from "@/core/types/hr/recruitment";
import { prisma } from "@/core/persistence/database/client";

/**
 * Mapping helper for Recruitment Requisition
 */
const mapToReq = (db: any): RecruitmentRequisition => ({
  id: db.id,
  tenantId: db.tenantId,
  title: db.title,
  departmentId: db.departmentId || undefined,
  status: db.status as RecruitmentStatus,
  openings: db.openings,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as RecruitmentRequisition);

export const recruitmentRepo = {
  /**
   * List all requisitions for a tenant
   */
  async list(tenantId: string): Promise<RecruitmentRequisition[]> {
    const list = await prisma.jobRequisition.findMany({
      where: {
        tenantId: tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return list.map(mapToReq);
  },

  /**
   * Create a new requisition
   */
  async create(
    tenantId: string,
    payload: Omit<RecruitmentRequisition, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): Promise<RecruitmentRequisition> {
    const record = await prisma.jobRequisition.create({
      data: {
        tenantId: tenantId,
        title: payload.title,
        departmentId: payload.departmentId,
        status: payload.status,
        openings: payload.openings,
      },
    });

    return mapToReq(record);
  },

  /**
   * Update an existing requisition
   */
  async update(
    tenantId: string, 
    requisitionId: string, 
    patch: Partial<RecruitmentRequisition>
  ): Promise<RecruitmentRequisition | null> {
    const data: any = {};
    if (patch.title) data.title = patch.title;
    if (patch.status) data.status = patch.status;
    if (patch.openings !== undefined) data.openings = patch.openings;
    if (patch.departmentId) data.departmentId = patch.departmentId;

    const updated = await prisma.jobRequisition.update({
      where: {
        id: requisitionId,
        tenantId: tenantId,
      },
      data,
    });

    return mapToReq(updated);
  },
};
