/**
 * Tenant Context Interface
 * Represents the multi-tenant context extracted from request headers.
 * Supports the hierarchical structure: Tenant > Company > Branch > Ecommerce.
 */
export interface TenantContext {
  /**
   * SaaS Tenant ID (Root level)
   */
  tenant_id: string;

  /**
   * Company ID (Legal Entity level)
   */
  company_id: string;

  /**
   * Branch ID (Operational level)
   */
  branch_id?: string;

  /**
   * Ecommerce ID (Digital channel level)
   */
  ecommerce_id?: string;

  /**
   * Location ID (Physical location, often maps to Branch)
   */
  location_id?: string;

  /**
   * User ID (from x-actor-id)
   */
  user_id?: string;

  /**
   * User Role (from x-user-role)
   */
  role?: string;
  
  /**
   * JV Mirror Mode flag
   */
  is_jv_read_only?: boolean;
}
