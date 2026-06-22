import { NotFoundException } from "@nestjs/common";

/**
 * Composite-key / tenant-scoped read discipline for the core modules
 * (Requirements 1.4, 4.5).
 *
 * Single-key `findUnique({ where: { id } })` lookups cannot express a
 * Tenant_Scope and therefore either reject a valid scoped `where` clause or
 * leak a record owned by another tenant. The design mandates that every
 * composite-key read use `findFirst({ where: { id, tenant_id, ... } })` so that
 * a record outside the caller's Tenant_Scope resolves to `null` and surfaces as
 * a 404 — never as cross-tenant leakage.
 *
 * These helpers make that discipline reusable across the five modules without
 * each repository hand-rolling the null check.
 */

/**
 * A minimal structural type for a Prisma model delegate that exposes
 * `findFirst`. Kept structural (rather than importing a concrete delegate) so
 * the helper works for every core model.
 */
export interface FindFirstDelegate<TRecord, TArgs> {
  findFirst(args: TArgs): Promise<TRecord | null>;
}

/**
 * Builds a tenant-scoped composite-key `where` clause.
 *
 * `tenant_id` is always included; any additional scope keys (company_id,
 * location_id, branch_id) supplied are merged in. The returned object is the
 * `where` clause for a `findFirst` call.
 */
export function scopedWhere<TScope extends { tenant_id: string }>(
  id: string,
  scope: TScope,
): { id: string } & TScope {
  return { id, ...scope };
}

/**
 * Performs a tenant-scoped composite-key read via `findFirst` and returns the
 * record, or `null` when no record matches within the Tenant_Scope.
 *
 * Use this for "may-not-exist" reads where the caller wants to branch on
 * absence rather than receive a 404.
 */
export async function findScoped<
  TRecord,
  TScope extends { tenant_id: string },
>(
  delegate: FindFirstDelegate<TRecord, { where: { id: string } & TScope }>,
  id: string,
  scope: TScope,
): Promise<TRecord | null> {
  return delegate.findFirst({ where: scopedWhere(id, scope) });
}

/**
 * Performs a tenant-scoped composite-key read and throws a {@link NotFoundException}
 * when the record does not exist within the caller's Tenant_Scope.
 *
 * The not-found message names only the resource type and the requested id, and
 * never includes field values of any resource outside the caller's Tenant_Scope
 * (Requirement 1.4). Because the `where` clause is scoped by `tenant_id`, a
 * cross-tenant id is indistinguishable from a missing id: both yield 404.
 */
export async function findScopedOrThrow<
  TRecord,
  TScope extends { tenant_id: string },
>(
  delegate: FindFirstDelegate<TRecord, { where: { id: string } & TScope }>,
  id: string,
  scope: TScope,
  resourceType: string,
): Promise<TRecord> {
  const record = await findScoped(delegate, id, scope);
  if (!record) {
    throw new NotFoundException(`${resourceType} '${id}' was not found.`);
  }
  return record;
}
