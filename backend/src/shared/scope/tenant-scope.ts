import { UserRole } from "../roles";

/**
 * TenantScope value object.
 *
 * The validated set of identifiers used to filter every data-access query in
 * the five core operational modules (IT, Procurement, Sales, Marketing,
 * Payment) so that a caller only reads or writes records belonging to their own
 * tenant and permitted scope.
 *
 * Invariants enforced by the resolver (see {@link TenantScopeResolver}):
 * - `tenant_id` is ALWAYS sourced from the verified TenantContext, never from a
 *   client-supplied header or request body field (Requirements 2.1, 2.5).
 * - `tenant_id` and `company_id` are distinct identifiers; a `company_id` is
 *   never substituted by `tenant_id` (no `company_id = tenant_id` fallback)
 *   (Requirement 2.6).
 * - `company_id` / `location_id` / `branch_id` are only present once validated
 *   to belong to the caller's `tenant_id` (Requirement 2.7).
 */
export interface TenantScope {
  /** SaaS Tenant ID (Root level). Always sourced from the verified context. */
  tenant_id: string;
  /** Company ID (Legal Entity level), only when it belongs to `tenant_id`. */
  company_id?: string;
  /** Location ID (Physical location), only when it belongs to `tenant_id`. */
  location_id?: string;
  /** Branch ID (Operational level), only when it belongs to `tenant_id`. */
  branch_id?: string;
}

/** A scope filter the caller requested explicitly (e.g. via query params/body). */
export interface RequestedScope {
  company_id?: string;
  location_id?: string;
  branch_id?: string;
}

/**
 * Roles permitted to widen scope beyond their own context (cross-location /
 * cross-company / cross-branch), still validated against their `tenant_id`
 * (Requirement 3.4).
 */
export const PRIVILEGED_ROLES: ReadonlySet<string> = new Set<string>([
  UserRole.SUPERADMIN,
  UserRole.OWNER,
  UserRole.ADMIN,
]);

/**
 * Returns true when the supplied role may widen scope.
 * Unknown / missing roles are treated as non-privileged (least privilege).
 */
export function isPrivilegedRole(role?: string | null): boolean {
  return !!role && PRIVILEGED_ROLES.has(role);
}
