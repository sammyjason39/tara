import type { Role } from "./roles";
import { Roles } from "./roles";

/**
 * ============================================================
 * WorkspaceMatrix
 *
 * Defines who can ENTER each workspace.
 * This is the FIRST gate before permissions.
 *
 * If a role is missing here → workspace UI is hidden.
 * ============================================================
 */
export const WorkspaceMatrix: Record<string, Role[]> = {
  /**
   * HR Workspace
   * Staff cannot enter HR admin workspace directly.
   */
  HR: [
    Roles.HR_DEPT_HEAD,
    Roles.HR_ADMIN,

    Roles.COMPANY_ADMIN,
    Roles.OWNER,
    Roles.SUPERADMIN,
  ],

  /**
   * Finance Workspace
   * Finance staff MUST enter finance workspace,
   * otherwise all finance pages appear locked.
   */
  FINANCE: [
    Roles.FINANCE_STAFF,
    Roles.FINANCE_DEPT_HEAD,
    Roles.FINANCE_ADMIN,

    Roles.COMPANY_ADMIN,
    Roles.OWNER,
    Roles.SUPERADMIN,
  ],

  /**
   * Workflow Workspace
   * Shared operational workspace across departments.
   */
  WORKFLOW: [
    Roles.DEPT_HEAD,

    Roles.HR_DEPT_HEAD,
    Roles.FINANCE_DEPT_HEAD,

    Roles.HR_ADMIN,
    Roles.FINANCE_ADMIN,

    Roles.COMPANY_ADMIN,
    Roles.OWNER,
    Roles.SUPERADMIN,
  ],
};

/**
 * ============================================================
 * WorkflowApprovalMatrix
 *
 * Defines who can APPROVE workflows routed
 * into each destination pipeline.
 *
 * Approval is stricter than workspace entry.
 * ============================================================
 */
export const WorkflowApprovalMatrix: Record<string, Role[]> = {
  /**
   * HR approvals are limited to HR leadership.
   */
  HR: [
    Roles.HR_DEPT_HEAD,
    Roles.HR_ADMIN,

    Roles.COMPANY_ADMIN,
    Roles.OWNER,
    Roles.SUPERADMIN,
  ],

  /**
   * Finance approvals include finance staff
   * for low-level approvals (configurable later).
   */
  FINANCE: [
    Roles.FINANCE_STAFF,
    Roles.FINANCE_DEPT_HEAD,
    Roles.FINANCE_ADMIN,

    Roles.COMPANY_ADMIN,
    Roles.OWNER,
    Roles.SUPERADMIN,
  ],

  /**
   * Operations approvals (future shared pipeline)
   */
  OPERATIONS: [
    Roles.DEPT_HEAD,

    Roles.COMPANY_ADMIN,
    Roles.OWNER,
    Roles.SUPERADMIN,
  ],

  /**
   * Reserved enterprise pipelines
   */
  LEGAL: [Roles.COMPANY_ADMIN, Roles.OWNER, Roles.SUPERADMIN],
  PROCUREMENT: [Roles.COMPANY_ADMIN, Roles.OWNER, Roles.SUPERADMIN],
  IT: [Roles.COMPANY_ADMIN, Roles.OWNER, Roles.SUPERADMIN],
  ADMIN: [Roles.COMPANY_ADMIN, Roles.OWNER, Roles.SUPERADMIN],
};
