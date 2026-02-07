import { employeeRepo } from "@/core/repositories/hr/employeeRepo";
import { attendanceRepo } from "@/core/repositories/hr/attendanceRepo";
import { payrollRepo } from "@/core/repositories/hr/payrollRepo";
import { contractRepo } from "@/core/repositories/hr/contractRepo";
import { performanceRepo } from "@/core/repositories/hr/performanceRepo";
import { trainingRepo } from "@/core/repositories/hr/trainingRepo";
import { leaveRepo } from "@/core/repositories/hr/leaveRepo";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { listWorkflows } from "@/core/tools/workflows/workflowEngine";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) {
    throw new Error("Tenant access denied");
  }
};

export const peopleService = {
  getEmployee360(tenantId: string, employeeId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    const employee = employeeRepo.getById(tenantId, employeeId);
    if (!employee) return null;
    if (actor.role !== Roles.SUPERADMIN && actor.tenantId !== tenantId) return null;
    if (actor.role === Roles.STAFF && employee.userId !== actor.userId && employee.id !== actor.userId) {
      return null;
    }
    if (actor.role === Roles.DEPT_HEAD && employee.departmentId !== actor.departmentId) {
      return null;
    }
    const attendance = attendanceRepo.list(tenantId).filter((record) => record.employeeId === employeeId);
    const payrollRuns = payrollRepo.listRuns(tenantId);
    const contracts = contractRepo.list(tenantId).filter((contract) => contract.employeeId === employeeId);
    const reviews = performanceRepo.listReviews(tenantId).filter((review) => review.employeeId === employeeId);
    const cycles = performanceRepo.listCycles(tenantId);
    const trainings = trainingRepo.listAssignments(tenantId).filter((item) => item.employeeId === employeeId);
    const leaves = leaveRepo.list(tenantId).filter((req) => req.employeeId === employeeId);
    const workflows = listWorkflows(tenantId).filter((flow) => flow.entityId === employeeId);

    return {
      employee,
      attendance,
      payrollRuns,
      contracts,
      reviews,
      cycles,
      trainings,
      leaves,
      workflows,
    };
  },
};
