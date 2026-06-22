import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { RequestedScope, TenantScope, isPrivilegedRole } from "./tenant-scope";

/**
 * Intermediate result of intent resolution, before ownership validation.
 * Exposed for unit testing of the pure decision logic.
 */
export interface ScopeIntent {
  tenant_id: string;
  /** The company filter the caller will be scoped to, if any (pre-validation). */
  company_id?: string;
  /** The location filter the caller will be scoped to, if any (pre-validation). */
  location_id?: string;
  /** The branch filter the caller will be scoped to, if any (pre-validation). */
  branch_id?: string;
}

/**
 * Computes the *intended* scope from a verified context and an optional
 * requested filter, WITHOUT touching the database.
 *
 * Rules:
 * - `tenant_id` is always taken from the context; any client-supplied
 *   `tenant_id` is ignored (Requirements 2.1, 2.5).
 * - A `company_id` that equals `tenant_id` is dropped: `tenant_id` and
 *   `company_id` are distinct identifiers and the tenant id is never used as a
 *   company-scope fallback (Requirement 2.6).
 * - Privileged callers (SUPERADMIN / OWNER / ADMIN) may widen scope using the
 *   requested filters; their requested values fall back to their context values
 *   (Requirement 3.4).
 * - Non-privileged callers are forced to their context scope. Any requested
 *   filter that differs from their context value is a widening attempt and is
 *   rejected with a ForbiddenException (Requirements 2.4, 2.8).
 *
 * Ownership against `tenant_id` is validated separately (see
 * {@link TenantScopeResolver.resolve}).
 */
export function computeScopeIntent(
  ctx: TenantContext,
  requested?: RequestedScope,
): ScopeIntent {
  if (!ctx || !ctx.tenant_id) {
    throw new ForbiddenException("Tenant context is missing or invalid.");
  }

  const tenant_id = ctx.tenant_id;
  const privileged = isPrivilegedRole(ctx.role);

  let company_id: string | undefined;
  let location_id: string | undefined;
  let branch_id: string | undefined;

  if (privileged) {
    // Privileged roles may widen scope; honor the requested filter, otherwise
    // fall back to the caller's own context scope.
    company_id = requested?.company_id ?? ctx.company_id ?? undefined;
    location_id = requested?.location_id ?? ctx.location_id ?? undefined;
    branch_id = requested?.branch_id ?? ctx.branch_id ?? undefined;
  } else {
    // Non-privileged roles are pinned to their context scope. A requested filter
    // that tries to reach outside the context scope is rejected outright.
    assertNoWidening("company", requested?.company_id, ctx.company_id);
    assertNoWidening("location", requested?.location_id, ctx.location_id);
    assertNoWidening("branch", requested?.branch_id, ctx.branch_id);

    company_id = ctx.company_id ?? undefined;
    location_id = ctx.location_id ?? undefined;
    branch_id = ctx.branch_id ?? undefined;
  }

  // Distinct-identifier rule: never use tenant_id as a company-scope filter.
  if (company_id && company_id === tenant_id) {
    company_id = undefined;
  }

  return { tenant_id, company_id, location_id, branch_id };
}

/**
 * Rejects a non-privileged caller's attempt to widen scope: a requested scope id
 * that differs from (or is supplied without) the caller's context value.
 */
function assertNoWidening(
  kind: "company" | "location" | "branch",
  requested?: string,
  context?: string,
): void {
  if (requested && requested !== context) {
    throw new ForbiddenException(
      `You are not permitted to access the requested ${kind}.`,
    );
  }
}

/**
 * Resolves the effective, validated {@link TenantScope} for a core-module
 * request.
 *
 * This is the single shared primitive every IT / Procurement / Sales /
 * Marketing / Payment controller and service uses to build its query `where`
 * clauses, ensuring tenant isolation is applied uniformly.
 *
 * Validates: Requirements 2.1, 2.4, 2.5, 2.6, 2.7, 2.8
 */
@Injectable()
export class TenantScopeResolver {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the effective scope for a request.
   *
   * @param ctx       The verified tenant context (authoritative caller identity).
   * @param requested Optional explicitly requested company/location/branch
   *                  filters (e.g. from query params or body).
   * @throws ForbiddenException when a requested company/location/branch does not
   *         belong to the caller's `tenant_id`, or when a non-privileged caller
   *         attempts to widen scope beyond their context.
   * @throws BadRequestException when the tenant context carries no usable
   *         `tenant_id`.
   */
  async resolve(
    ctx: TenantContext,
    requested?: RequestedScope,
  ): Promise<TenantScope> {
    const intent = computeScopeIntent(ctx, requested);

    if (!intent.tenant_id || typeof intent.tenant_id !== "string") {
      throw new BadRequestException("A valid tenant_id could not be resolved.");
    }

    if (intent.company_id) {
      const ok = await this.companyBelongsToTenant(
        intent.company_id,
        intent.tenant_id,
      );
      if (!ok) {
        throw new ForbiddenException(
          "The requested company does not belong to your tenant.",
        );
      }
    }

    if (intent.location_id) {
      const ok = await this.locationBelongsToTenant(
        intent.location_id,
        intent.tenant_id,
      );
      if (!ok) {
        throw new ForbiddenException(
          "The requested location does not belong to your tenant.",
        );
      }
    }

    if (intent.branch_id) {
      const ok = await this.branchBelongsToTenant(
        intent.branch_id,
        intent.tenant_id,
      );
      if (!ok) {
        throw new ForbiddenException(
          "The requested branch does not belong to your tenant.",
        );
      }
    }

    const scope: TenantScope = { tenant_id: intent.tenant_id };
    if (intent.company_id) scope.company_id = intent.company_id;
    if (intent.location_id) scope.location_id = intent.location_id;
    if (intent.branch_id) scope.branch_id = intent.branch_id;
    return scope;
  }

  /**
   * A company belongs to a tenant when a `companies` row exists whose `id`
   * matches `company_id` and whose `tenant_id` matches the caller's tenant.
   */
  private async companyBelongsToTenant(
    company_id: string,
    tenant_id: string,
  ): Promise<boolean> {
    const company = await this.prisma.companies.findFirst({
      where: { id: company_id, tenant_id },
      select: { id: true },
    });
    return !!company;
  }

  /**
   * A location belongs to a tenant when a `locations` row exists whose `id`
   * matches `location_id` and whose `tenant_id` matches the caller's tenant.
   */
  private async locationBelongsToTenant(
    location_id: string,
    tenant_id: string,
  ): Promise<boolean> {
    const location = await this.prisma.locations.findFirst({
      where: { id: location_id, tenant_id },
      select: { id: true },
    });
    return !!location;
  }

  /**
   * A branch belongs to a tenant when a `locations` row (the operational-level
   * location table that carries `tenant_id`) exists whose `id` matches
   * `branch_id` and whose `tenant_id` matches the caller's tenant. The platform
   * models the operational "branch" level as a `locations` row, so branch
   * ownership is validated against the same tenant-scoped table.
   */
  private async branchBelongsToTenant(
    branch_id: string,
    tenant_id: string,
  ): Promise<boolean> {
    const branch = await this.prisma.locations.findFirst({
      where: { id: branch_id, tenant_id },
      select: { id: true },
    });
    return !!branch;
  }
}
