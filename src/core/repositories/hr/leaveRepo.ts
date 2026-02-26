import type { LeaveRequest, LeaveStatus, LeaveType } from "@/core/types/hr/leave";
import { prisma } from "@/core/persistence/database/client";

/**
 * Mapping helper for Leave Request
 */
const mapToLeave = (db: any): LeaveRequest => ({
  id: db.id,
  tenantId: db.tenantId,
  employeeId: db.employeeId,
  departmentId: db.departmentId || undefined,
  type: db.type as LeaveType,
  status: db.status as LeaveStatus,
  startDate: db.startDate.toISOString().split('T')[0],
  endDate: db.endDate.toISOString().split('T')[0],
  reason: db.reason || undefined,
  approverId: db.approvedBy || undefined,
  approvalId: db.approvalId || undefined,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as LeaveRequest);

export const leaveRepo = {
  /**
   * List all leave requests for a tenant
   */
  async list(tenantId: string): Promise<LeaveRequest[]> {
    const list = await prisma.leaveRequest.findMany({
      where: {
        tenantId: tenantId,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return list.map(mapToLeave);
  },

  /**
   * Create a new leave request
   */
  async create(
    tenantId: string,
    payload: Omit<LeaveRequest, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): Promise<LeaveRequest> {
    const record = await prisma.leaveRequest.create({
      data: {
        tenantId: tenantId,
        employeeId: payload.employeeId,
        departmentId: payload.departmentId,
        type: payload.type,
        status: payload.status,
        startDate: new Date(payload.startDate),
        endDate: new Date(payload.endDate),
        reason: payload.reason,
        approvedBy: payload.approverId,
        approvalId: payload.approvalId,
      },
    });

    return mapToLeave(record);
  },

  /**
   * Update an existing leave request
   */
  async update(
    tenantId: string, 
    leaveId: string, 
    patch: Partial<LeaveRequest>
  ): Promise<LeaveRequest | null> {
    const data: any = {};
    if (patch.status) data.status = patch.status;
    if (patch.type) data.type = patch.type;
    if (patch.startDate) data.startDate = new Date(patch.startDate);
    if (patch.endDate) data.endDate = new Date(patch.endDate);
    if (patch.reason) data.reason = patch.reason;
    if (patch.approverId) data.approvedBy = patch.approverId;
    if (patch.approvalId) data.approvalId = patch.approvalId;

    const updated = await prisma.leaveRequest.update({
      where: {
        id: leaveId,
        tenantId: tenantId,
      },
      data,
    });

    return mapToLeave(updated);
  },
};