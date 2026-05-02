import { TenantContext } from '../../gateway/tenant-context.interface';

/**
 * Multi-Tenancy Utility
 * Provides helpers for scoping queries based on TenantContext
 */
export class MultiTenancyUtil {
  /**
   * Returns a Prisma 'where' object scoped to the current context
   * @param context The current tenant context
   * @param extra Extra filters to merge
   * @param options Scoping options (e.g. exclude branch)
   */
  static getScope(
    context: TenantContext,
    extra: any = {},
    options: { excludeBranch?: boolean; excludeEcommerce?: boolean } = {},
  ) {
    const scope: any = {
      tenant_id: context.tenant_id,
    };

    if (context.branch_id && !options.excludeBranch) {
      scope.branch_id = context.branch_id;
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
   * Standardizes creation data with multi-tenancy IDs
   */
  static wrapCreate(context: TenantContext, data: any) {
    return {
      ...data,
      tenant_id: context.tenant_id,
      branch_id: context.branch_id || data.branch_id,
      ecommerce_id: context.ecommerce_id || data.ecommerce_id,
    };
  }
}
