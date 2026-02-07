import { listWorkflows } from "@/core/tools/workflows/workflowEngine";
import { contractRepo } from "@/core/repositories/hr/contractRepo";
import { payrollRepo } from "@/core/repositories/hr/payrollRepo";
import { attendanceRepo } from "@/core/repositories/hr/attendanceRepo";
import { trainingRepo } from "@/core/repositories/hr/trainingRepo";
import { employeeRepo } from "@/core/repositories/hr/employeeRepo";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";

export type PulseItem = {
  id: string;
  title: string;
  status: string;
  urgency: number;
  owner: string;
  nextAction: string;
  source: string;
  entityId?: string;
};

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) {
    throw new Error("Tenant access denied");
  }
};

export const hrWorkstreamService = {
  getPulseItems(tenantId: string, actor: SessionContext): PulseItem[] {
    ensureTenantAccess(tenantId, actor);
    const workflows = listWorkflows(tenantId);
    const contracts = contractRepo.list(tenantId).filter((item) => item.status !== "active");
    const payrollRuns = payrollRepo.listRuns(tenantId).filter((run) => run.status !== "approved");
    const attendance = attendanceRepo.list(tenantId).filter((record) => record.status !== "on_time");
    const trainings = trainingRepo.listAssignments(tenantId).filter((item) => item.status !== "completed");
    const employeeMap = new Map(
      employeeRepo.list(tenantId).map((employee) => [employee.id, employee.departmentId]),
    );

    const workflowItems: PulseItem[] = workflows.slice(0, 6).map((flow) => ({
      id: flow.id,
      title: `Approval needed: ${flow.entityType}`,
      status: flow.status,
      urgency: flow.status === "PENDING" ? 80 : 40,
      owner: flow.destinationDept,
      nextAction: "Review in FlowGate",
      source: "FlowGate",
      entityId: flow.entityId,
    }));

    const contractItems: PulseItem[] = contracts.slice(0, 4).map((contract) => ({
      id: contract.id,
      title: `${contract.title} pending signature`,
      status: contract.status,
      urgency: 65,
      owner: contract.departmentId ?? "HR",
      nextAction: "Route to LexBoard",
      source: "LexBoard",
      entityId: contract.id,
    }));

    const payrollItems: PulseItem[] = payrollRuns.slice(0, 4).map((run) => ({
      id: run.id,
      title: `Payroll run ${run.periodStart} - ${run.periodEnd}`,
      status: run.status,
      urgency: run.status === "draft" ? 70 : 55,
      owner: "Payroll Ops",
      nextAction: "Open PayCycle Studio",
      source: "PayCycle Studio",
      entityId: run.id,
    }));

    const attendanceItems: PulseItem[] = attendance.slice(0, 4).map((record) => ({
      id: record.id,
      title: `Attendance anomaly: ${record.employeeId}`,
      status: record.status,
      urgency: record.status === "absent" ? 85 : 60,
      owner: employeeMap.get(record.employeeId) ?? "HR",
      nextAction: "Review in Attendance",
      source: "Attendance",
      entityId: record.employeeId,
    }));

    const trainingItems: PulseItem[] = trainings.slice(0, 4).map((assignment) => ({
      id: assignment.id,
      title: `Training incomplete: ${assignment.employeeId}`,
      status: assignment.status,
      urgency: 50,
      owner: employeeMap.get(assignment.employeeId) ?? "HR",
      nextAction: "Open SkillTrack",
      source: "SkillTrack",
      entityId: assignment.employeeId,
    }));

    return [
      ...workflowItems,
      ...contractItems,
      ...payrollItems,
      ...attendanceItems,
      ...trainingItems,
    ];
  },
};
