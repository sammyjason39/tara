import { attendanceRepo } from "@/core/repositories/hr/attendanceRepo";
import { payrollRepo } from "@/core/repositories/hr/payrollRepo";
import { contractRepo } from "@/core/repositories/hr/contractRepo";
import { employeeRepo } from "@/core/repositories/hr/employeeRepo";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { audit } from "@/core/logging/audit";
import { workflowService } from "./workflowService";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) throw new Error("Tenant access denied");
};

export const analyticsService = {
  getWorkforceInsights(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    const employees = employeeRepo.list(tenantId);
    const attendance = attendanceRepo.list(tenantId);
    const payrollRuns = payrollRepo.listRuns(tenantId);
    const contracts = contractRepo.list(tenantId);

    const absent = attendance.filter((item) => item.status === "absent").length;
    const late = attendance.filter((item) => item.status === "late").length;
    const riskIndex = employees.length ? Math.round(((absent + late) / employees.length) * 100) : 0;
    const payrollDrafts = payrollRuns.filter((run) => run.status !== "approved").length;
    const expiringContracts = contracts.filter((contract) => contract.status !== "signed").length;

    return {
      absenteeismRisk: riskIndex,
      turnoverExposure: Math.min(100, expiringContracts * 10),
      payrollForecast: payrollDrafts * 120000,
      complianceRisk: Math.min(100, expiringContracts * 12),
    };
  },

  listMetrics(tenantId: string, actor: SessionContext) {
    const insights = this.getWorkforceInsights(tenantId, actor);
    return [
      { id: "absenteeism", label: "Absenteeism risk", value: insights.absenteeismRisk },
      { id: "turnover", label: "Turnover exposure", value: insights.turnoverExposure },
      { id: "payroll", label: "Payroll cost forecast", value: insights.payrollForecast },
      { id: "compliance", label: "Compliance risk score", value: insights.complianceRisk },
    ];
  },

  generateReport(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    const reportId = `${tenantId}-report-${Date.now()}`;
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "insight.report.generate",
      entityType: "insight_report",
      entityId: reportId,
    });
    return reportId;
  },

  shareReport(tenantId: string, actor: SessionContext, reportId: string) {
    ensureTenantAccess(tenantId, actor);
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "insight.report.share",
      entityType: "insight_report",
      entityId: reportId,
    });
  },

  routeInsight(tenantId: string, actor: SessionContext, reportId: string) {
    ensureTenantAccess(tenantId, actor);
    const request = workflowService.createRequest(tenantId, actor, {
      entityType: "PERFORMANCE",
      entityId: reportId,
      makerDept: actor.departmentId,
      destinationDept: "HR",
      metadata: { reportId },
    });
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "insight.route.flowgate",
      entityType: "workflow",
      entityId: request.id,
    });
    return request;
  },
};
