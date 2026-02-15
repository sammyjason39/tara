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
    // 1. Try primary tenant first (by ID or potentially userId)
    let employee = employeeRepo.getById(tenantId, employeeId);
    let effectiveTenantId = tenantId;

    // Fallback: Check if employeeId is actually a userId in the current tenant
    if (!employee) {
      const allEmployees = employeeRepo.list(tenantId);
      employee = allEmployees.find(e => e.userId === employeeId);
      if (employee) {
        console.log(`[peopleService] Found employee by userId: ${employeeId}`);
      }
    }

    console.log(`[peopleService] Lookup: ${employeeId} in ${tenantId}. Found: ${!!employee}`);

    // 2. Superadmin Fallback: Discovery from ID
    if (!employee && actor.role === Roles.SUPERADMIN) {
      console.log(`[peopleService] Superadmin Discovery for ${employeeId}`);
      const parts = employeeId.split("-emp");
      if (parts.length > 1) {
        const discoveredTenant = parts[0];
        console.log(`[peopleService] Attempting discovered tenant: ${discoveredTenant}`);
        employee = employeeRepo.getById(discoveredTenant, employeeId);
        if (employee) {
          effectiveTenantId = discoveredTenant;
          console.log(`[peopleService] Found in discovered tenant: ${discoveredTenant}`);
        } else {
          console.log(`[peopleService] Not found in discovered tenant`);
        }
      } else {
        console.log(`[peopleService] Split failed. Parts: ${JSON.stringify(parts)}`);
      }
    }

    if (!employee) return null;

    // 3. Authorization Checks
    ensureTenantAccess(effectiveTenantId, actor);

    // Bypass restrictive role checks for Superadmins
    if (actor.role !== Roles.SUPERADMIN) {
      // Strict tenant boundary for non-superadmins
      if (actor.tenantId !== effectiveTenantId) return null;

      if (actor.role === Roles.HR_STAFF && employee.userId !== actor.userId && employee.id !== actor.userId) {
        return null;
      }
      if (actor.role === Roles.DEPT_HEAD && employee.departmentId !== actor.departmentId) {
        return null;
      }
    }

    const attendance = attendanceRepo.listRecords(effectiveTenantId).filter((record) => record.employeeId === employeeId);
    const payrollRuns = payrollRepo.listRuns(effectiveTenantId);
    const contracts = contractRepo.list(effectiveTenantId).filter((contract) => contract.employeeId === employeeId);
    const reviews = performanceRepo.listReviews(effectiveTenantId).filter((review) => review.employeeId === employeeId);
    const cycles = performanceRepo.listCycles(effectiveTenantId);
    const trainings = trainingRepo.listAssignments(effectiveTenantId).filter((item) => item.employeeId === employeeId);
    const leaves = leaveRepo.list(effectiveTenantId).filter((req) => req.employeeId === employeeId);
    const workflows = listWorkflows(effectiveTenantId).filter((flow) => flow.entityId === employeeId);

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
