

/**
 * Structural scope input accepted by {@link MultiTenancyUtil.getScope}.
 *
 * Both the verified {@link TenantContext} and the resolved `TenantScope` value
 * object (`{ tenant_id, company_id?, location_id?, branch_id? }`) satisfy this
 * shape, so the same scoping helper can build a Prisma `where` clause from
 * either. This lets the core operational modules pass a resolved `TenantScope`
 * straight through their service/repository layers without re-deriving scope
 * from raw context.
 */
export interface ScopeLike {
  tenant_id: string;
  company_id?: string;
  branch_id?: string;
  ecommerce_id?: string;
  location_id?: string;
}

/**
 * Multi-Tenancy Utility
 * Provides helpers for scoping queries based on TenantContext
 */
export class MultiTenancyUtil {
  /**
   * Returns a Prisma 'where' object scoped to the current context
   * @param context The current tenant context or resolved tenant scope
   * @param extra Extra filters to merge
   * @param options Scoping options (e.g. exclude branch)
   */
  static getScope(
    context: ScopeLike,
    extra: any = {},
    options: { excludeBranch?: boolean; excludeEcommerce?: boolean } = {},
  ) {
    const scope: any = {
      tenant_id: context.tenant_id,
    };

    if (context.branch_id && !options.excludeBranch) {
      scope.branch_id = context.branch_id;
    }

    if (context.location_id && !options.excludeBranch) {
      scope.location_id = context.location_id;
    }

    if (context.ecommerce_id && !options.excludeEcommerce) {
      scope.ecommerce_id = context.ecommerce_id;
    }

    return {
      ...scope,
      ...extra,
    };
  }

  /**
   * Standardizes creation data with multi-tenancy IDs.
   *
   * Accepts any {@link ScopeLike} input (the verified `TenantContext` or a
   * resolved `TenantScope`), so the core operational modules can persist using
   * a scope resolved from the verified context rather than a raw context.
   */
  static wrapCreate(context: ScopeLike, data: any) {
    return {
      ...data,
      tenant_id: context.tenant_id,
      branch_id: context.branch_id || data.branch_id,
      ecommerce_id: context.ecommerce_id || data.ecommerce_id,
    };
  }
}
