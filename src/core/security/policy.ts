import { Role, Roles } from "./roles";
import type { SessionContext } from "./session";

import type { StaffRecord } from "@/core/hr/hrTypes";
import type { WorkflowRequest } from "@/core/tools/workflows/workflowTypes";

import { resolveDepartment } from "@/core/org/departmentResolver";
import { WorkflowApprovalMatrix, WorkspaceMatrix } from "./roleMatrix";
import { getDelegatedRoles } from "./delegation";

/**
 * Workspaces represent major tenant domains.
 */
export type WorkspaceKey = "HR" | "FINANCE" | "WORKFLOW";

/**
 * ============================================================
 * Workspace Access Gate
 *
 * This controls whether the workspace even appears in UI.
 * ============================================================
 */
export function canAccessWorkspace(
  session: SessionContext,
  workspace: WorkspaceKey,
): boolean {
  /** SUPERADMIN always allowed */
  if (session.role === Roles.SUPERADMIN) return true;

  /** Workspace entry strictly controlled by matrix */
  return WorkspaceMatrix[workspace]?.includes(session.role) ?? false;
}

/**
 * ============================================================
 * Workflow Approval Engine
 *
 * Determines whether the session user can approve
 * a workflow request routed into a department pipeline.
 * ============================================================
 */
export function canApproveWorkflow(
  session: SessionContext,
  workflow: WorkflowRequest,
): boolean {
  /** SUPERADMIN bypass */
  if (session.role === Roles.SUPERADMIN) return true;

  /** Tenant boundary enforced */
  if (workflow.tenantId !== session.tenantId) return false;

  /** Resolve session department */
  const dept = resolveDepartment(session.departmentId)?.code;

  /** Delegation expansion */
  const delegatedRoles = getDelegatedRoles(session);
  const effectiveRoles = [session.role, ...delegatedRoles];

  /**
   * Global DEPT_HEAD can approve only inside own department
   */
  if (session.role === Roles.DEPT_HEAD) {
    return dept === workflow.destinationDept;
  }

  /**
   * Approval roles defined per destination pipeline
   */
  const allowedRoles =
    WorkflowApprovalMatrix[
      workflow.destinationDept as keyof typeof WorkflowApprovalMatrix
    ];

  if (!allowedRoles) return false;

  return effectiveRoles.some((role) => allowedRoles.includes(role));
}

/**
 * ============================================================
 * Role Classifier
 * ============================================================
 */
export function isStaffRole(role: Role) {
  return role.endsWith("_STAFF");
}

/**
 * ============================================================
 * Staff Record Visibility Policy
 *
 * Controls HR staff data access across roles.
 * ============================================================
 */
export function canViewStaffRecord(
  session: SessionContext,
  staff: StaffRecord,
): boolean {
  /** SUPERADMIN bypass */
  if (session.role === Roles.SUPERADMIN) return true;

  /** Tenant boundary enforced */
  if (staff.tenantId !== session.tenantId) return false;

  /** Tenant owners always see all */
  if (session.role === Roles.OWNER) return true;

  /** Company admins see all */
  if (session.role === Roles.COMPANY_ADMIN) return true;

  /** HR Admin sees all staff */
  if (session.role === Roles.HR_ADMIN) return true;

  /** Finance Admin sees staff for payroll + payments */
  if (session.role === Roles.FINANCE_ADMIN) return true;

  /**
   * Department heads see only their department staff
   */
  if (session.role === Roles.DEPT_HEAD) {
    return staff.departmentId === session.departmentId;
  }

  /**
   * Staff roles see only themselves
   */
  if (isStaffRole(session.role)) {
    return staff.userId === session.userId || staff.id === session.userId;
  }

  /** Default deny */
  return false;
}
