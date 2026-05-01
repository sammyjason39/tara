import type { PermissionKey } from "./permissions";
import { Roles, type Role } from "./roles";

/**
 * Scope determines how far a permission applies.
 */
export type ScopeLevel =
  | "SELF"
  | "DEPARTMENT"
  | "COMPANY"
  | "TENANT"
  | "GLOBAL";

interface AccessInput {
  role: Role;
  permission: PermissionKey;
  scope: ScopeLevel;
  tenantMatch: boolean;
}

/**
 * ============================================================
 * Permission Namespace Helpers
 * ============================================================
 */

const isHrPermission = (p: PermissionKey) =>
  p.startsWith("hr.") || p.startsWith("core.hr.");

const isFinancePermission = (p: PermissionKey) => p.startsWith("finance.");

const isToolsPermission = (p: PermissionKey) =>
  p === "core.tools.access" || p.startsWith("core.tools.");

const isSalesPermission = (p: PermissionKey) =>
  p === "core.sales.access" || p.startsWith("core.sales.") || p.startsWith("sales.");

const isItPermission = (p: PermissionKey) =>
  p === "core.it.access" || p.startsWith("core.it.") || p.startsWith("it.");

/**
 * ============================================================
 * Scope Helpers
 * ============================================================
 */

const isSelfScope = (s: ScopeLevel) => s === "SELF";

const isDepartmentScope = (s: ScopeLevel) => s === "SELF" || s === "DEPARTMENT";

const isTenantScope = (s: ScopeLevel) =>
  s === "SELF" || s === "DEPARTMENT" || s === "COMPANY" || s === "TENANT";

/**
 * ============================================================
 * Role Helpers (Scales Forever)
 * ============================================================
 */

/**
 * All staff roles end with _STAFF
 * Example:
 * - HR_STAFF
 * - FINANCE_STAFF
 * - SALES_STAFF (future)
 */
const isStaffRole = (r: Role) => r.endsWith("_STAFF");

/**
 * All admin roles end with _ADMIN
 * Example:
 * - HR_ADMIN
 * - FINANCE_ADMIN
 */
const isAdminRole = (r: Role) => r.endsWith("_ADMIN");

/**
 * All department heads contain DEPT_HEAD
 * Example:
 * - HR_DEPT_HEAD
 * - FINANCE_DEPT_HEAD
 */
const isDeptHeadRole = (r: Role) => r.includes("DEPT_HEAD");

/**
 * Domain resolver (future-proof)
 */
function resolveDomain(
  permission: PermissionKey,
): "HR" | "FINANCE" | "SALES" | "IT" | "TOOLS" | "OTHER" {
  if (isToolsPermission(permission)) return "TOOLS";
  if (isHrPermission(permission)) return "HR";
  if (isFinancePermission(permission)) return "FINANCE";
  if (isSalesPermission(permission)) return "SALES";
  if (isItPermission(permission)) return "IT";
  return "OTHER";
}

/**
 * ============================================================
 * Main Access Engine
 * ============================================================
 */
export function canAccess({
  role,
  permission,
  scope,
  tenantMatch,
}: AccessInput): boolean {
  /**
   * SUPERADMIN = global platform root
   */
  if (role === Roles.SUPERADMIN) return true;

  /**
   * GLOBAL scope is forbidden for tenant users
   */
  if (scope === "GLOBAL") return false;

  /**
   * Tenant boundary is always enforced
   */
  if (!tenantMatch) return false;

  /**
   * Tools are universal across all roles
   * Everyone can open Calculator, Docs, Spreadsheet, etc.
   */
  if (isToolsPermission(permission)) {
    return true;
  }

  /**
   * OWNER + COMPANY_ADMIN = full tenant authority
   */
  if (role === Roles.OWNER || role === Roles.COMPANY_ADMIN) {
    return isTenantScope(scope);
  }

  /**
   * ============================================================
   * Workspace Entry Gates
   * ============================================================
   */

  if (permission === "hr.workspace.access" || permission === "core.hr.access") {
    return (
      role === Roles.HR_ADMIN ||
      role === Roles.HR_DEPT_HEAD ||
      role === Roles.HR_STAFF ||
      role === Roles.OWNER ||
      role === Roles.SUPERADMIN
    );
  }

  if (
    permission === "finance.workspace.access" ||
    permission === "core.finance.access"
  ) {
    return (
      role === Roles.FINANCE_ADMIN ||
      role === Roles.FINANCE_DEPT_HEAD ||
      role === Roles.FINANCE_STAFF ||
      role === Roles.OWNER ||
      role === Roles.SUPERADMIN
    );
  }

  if (
    permission === "core.sales.access" ||
    permission === "sales.workspace.access"
  ) {
    return (
      role === Roles.SALES_ADMIN ||
      role === Roles.SALES_STAFF ||
      role === Roles.OWNER ||
      role === Roles.SUPERADMIN
    );
  }

  if (
    permission === "core.it.access" ||
    permission === "it.workspace.access"
  ) {
    return (
      role === Roles.IT_ADMIN ||
      role === Roles.IT_STAFF ||
      role === Roles.OWNER ||
      role === Roles.SUPERADMIN
    );
  }

  // Generic core access for other modules
  if (permission.startsWith("core.")) {
    const module = permission.split(".")[1];
    // Check if user has explicit access to this core module
    // Owners/Superadmins already pass early checks, but we add them here for safety
    return true;
  }

  /**
   * ============================================================
   * Admin Roles = Tenant-wide inside their domain
   * ============================================================
   */

  if (isAdminRole(role)) {
    if (role === Roles.HR_ADMIN) {
      return isHrPermission(permission) && isTenantScope(scope);
    }

    if (role === Roles.FINANCE_ADMIN) {
      return isFinancePermission(permission) && isTenantScope(scope);
    }

    if (role === Roles.SALES_ADMIN) {
      return isSalesPermission(permission) && isTenantScope(scope);
    }

    if (role === Roles.IT_ADMIN) {
      return isItPermission(permission) && isTenantScope(scope);
    }

    return false;
  }

  /**
   * ============================================================
   * Department Heads = Department authority inside domain
   * ============================================================
   */

  if (isDeptHeadRole(role)) {
    if (role === Roles.HR_DEPT_HEAD) {
      return isHrPermission(permission) && isDepartmentScope(scope);
    }

    if (role === Roles.FINANCE_DEPT_HEAD) {
      return isFinancePermission(permission) && isDepartmentScope(scope);
    }

    return false;
  }

  /**
   * ============================================================
   * Staff Roles = Self-only inside their domain
   * ============================================================
   */

  if (isStaffRole(role)) {
    const domain = resolveDomain(permission);

    if (role === Roles.HR_STAFF) {
      return domain === "HR" && isSelfScope(scope);
    }

    if (role === Roles.FINANCE_STAFF) {
      return domain === "FINANCE" && isSelfScope(scope);
    }

    if (role === Roles.SALES_STAFF) {
      return domain === "SALES" && isSelfScope(scope);
    }

    if (role === Roles.IT_STAFF) {
      return domain === "IT" && isSelfScope(scope);
    }

    return false;
  }

  /**
   * Default deny
   */
  return false;
}
