import { createPayrollRun, listPayrollRuns, updatePayrollRun, generatePayslip } from "@/core/hr/payroll/engine";
import type { PayrollRun, Payslip, PayrollComponent } from "@/core/hr/payroll/types";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { audit } from "@/core/logging/audit";
import { workflowService } from "./workflowService";
import { exportPayrollToFinance } from "@/core/services/payrollBridge";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) throw new Error("Tenant access denied");
};

const ensureFinanceAccess = (actor: SessionContext) => {
  if (
    ([
      Roles.SUPERADMIN,
      Roles.OWNER,
      Roles.COMPANY_ADMIN,
      Roles.FINANCE_ADMIN,
    ] as readonly string[]).includes(actor.role)
  ) {
    return;
  }
  throw new Error("Finance approval required");
};

export const payrollService = {
  prepareCycle(tenantId: string, actor: SessionContext, periodStart: string, periodEnd: string): PayrollRun {
    ensureTenantAccess(tenantId, actor);
    const run = createPayrollRun(tenantId, periodStart, periodEnd);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "payroll.run.create",
      entityType: "payroll_run",
      entityId: run.id,
      after: { periodStart, periodEnd },
    });
    return run;
  },

  lockAttendance(tenantId: string, actor: SessionContext, periodStart: string, periodEnd: string) {
    ensureTenantAccess(tenantId, actor);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "payroll.attendance.lock",
      entityType: "attendance",
      entityId: `${periodStart}:${periodEnd}`,
    });
  },

  runVarianceCheck(tenantId: string, actor: SessionContext, runId: string) {
    ensureTenantAccess(tenantId, actor);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "payroll.variance.check",
      entityType: "payroll_run",
      entityId: runId,
    });
    return { runId, varianceScore: Math.floor(Math.random() * 20) };
  },

  listRuns(tenantId: string, actor: SessionContext): PayrollRun[] {
    ensureTenantAccess(tenantId, actor);
    return listPayrollRuns(tenantId);
  },

  submitForApproval(tenantId: string, actor: SessionContext, runId: string) {
    ensureTenantAccess(tenantId, actor);
    const request = workflowService.createRequest(tenantId, actor, {
      entityType: "PAYROLL",
      entityId: runId,
      makerDept: actor.departmentId,
      destinationDept: "FINANCE",
      metadata: { runId },
    });
    const updated = updatePayrollRun(tenantId, runId, { status: "pending", workflowId: request.id });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "payroll.run.submit",
      entityType: "payroll_run",
      entityId: runId,
      after: { workflowId: request.id },
    });
    return updated;
  },

  approveRun(tenantId: string, actor: SessionContext, runId: string) {
    ensureTenantAccess(tenantId, actor);
    ensureFinanceAccess(actor);
    const updated = updatePayrollRun(tenantId, runId, { status: "approved" });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "payroll.run.approve",
      entityType: "payroll_run",
      entityId: runId,
    });
    return updated;
  },

  exportJournal(tenantId: string, actor: SessionContext, runId: string) {
    ensureTenantAccess(tenantId, actor);
    ensureFinanceAccess(actor);
    const payload = exportPayrollToFinance(tenantId, runId);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "payroll.export.finance",
      entityType: "payroll_run",
      entityId: runId,
    });
    return payload;
  },

  generatePayslip(
    tenantId: string,
    actor: SessionContext,
    employeeId: string,
    periodStart: string,
    periodEnd: string,
    components: PayrollComponent[],
  ): Payslip {
    ensureTenantAccess(tenantId, actor);
    const payslip = generatePayslip(tenantId, employeeId, periodStart, periodEnd, components);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "payroll.payslip.generate",
      entityType: "payslip",
      entityId: payslip.id,
    });
    return payslip;
  },
};
