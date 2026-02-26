import type { PayrollRun, PayrollRunStatus, PayrollLine } from "@/core/types/hr/payroll";
import { prisma } from "@/core/persistence/database/client";

/**
 * Mapping helper for Payroll Run
 */
const mapToRun = (db: any): PayrollRun => ({
  id: db.id,
  tenantId: db.tenantId,
  periodStart: db.periodStart.toISOString().split('T')[0],
  periodEnd: db.periodEnd.toISOString().split('T')[0],
  status: db.status as PayrollRunStatus,
  totalEmployees: db.totalEmployees,
  totalGrossPay: Number(db.totalGrossPay),
  totalNetPay: Number(db.totalNetPay),
  approvalId: db.approvalId || undefined,
  approvedBy: db.approvedBy || undefined,
  exportedAt: db.exportedAt?.toISOString(),
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
} as PayrollRun);

export const payrollRepo = {
  /**
   * List all payroll runs for a tenant
   */
  async listRuns(tenantId: string): Promise<PayrollRun[]> {
    const runs = await prisma.payrollRun.findMany({
      where: {
        tenantId: tenantId,
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    return runs.map(mapToRun);
  },

  /**
   * Get a specific payroll run by ID
   */
  async getRun(tenantId: string, runId: string): Promise<PayrollRun | undefined> {
    const run = await prisma.payrollRun.findFirst({
      where: {
        id: runId,
        tenantId: tenantId,
      },
    });

    return run ? mapToRun(run) : undefined;
  },

  /**
   * Create a new payroll run
   */
  async createRun(
    tenantId: string,
    payload: Omit<PayrollRun, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): Promise<PayrollRun> {
    const run = await prisma.payrollRun.create({
      data: {
        tenantId: tenantId,
        periodStart: new Date(payload.periodStart),
        periodEnd: new Date(payload.periodEnd),
        status: payload.status,
        totalEmployees: payload.totalEmployees,
        totalGrossPay: payload.totalGrossPay,
        totalNetPay: payload.totalNetPay,
        approvalId: payload.approvalId,
        approvedBy: payload.approvedBy,
        exportedAt: payload.exportedAt ? new Date(payload.exportedAt) : undefined,
      },
    });

    return mapToRun(run);
  },

  /**
   * Update an existing payroll run
   */
  async updateRun(
    tenantId: string, 
    runId: string, 
    patch: Partial<PayrollRun>
  ): Promise<PayrollRun | null> {
    const data: any = {};
    if (patch.status) data.status = patch.status;
    if (patch.periodStart) data.periodStart = new Date(patch.periodStart);
    if (patch.periodEnd) data.periodEnd = new Date(patch.periodEnd);
    if (patch.totalEmployees !== undefined) data.totalEmployees = patch.totalEmployees;
    if (patch.totalGrossPay !== undefined) data.totalGrossPay = patch.totalGrossPay;
    if (patch.totalNetPay !== undefined) data.totalNetPay = patch.totalNetPay;
    if (patch.approvalId) data.approvalId = patch.approvalId;
    if (patch.approvedBy) data.approvedBy = patch.approvedBy;
    if (patch.exportedAt) data.exportedAt = new Date(patch.exportedAt);

    const updated = await prisma.payrollRun.update({
      where: {
        id: runId,
        tenantId: tenantId,
      },
      data,
    });

    return mapToRun(updated);
  },
};