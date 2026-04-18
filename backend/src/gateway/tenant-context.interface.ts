/**
 * Tenant Context Interface
 * Represents the multi-tenant context extracted from request headers
 */
export interface TenantContext {
  /**
   * SaaS Tenant ID
   * Required for all operations
   */
  tenant_id: string;

  /**
   * Company ID (Legal Entity)
   * Required for finance/HR operations
   */
  company_id: string;

  /**
   * Location ID (optional)
   * Used for location-specific operations
   */
  location_id?: string;

  /**
   * User ID (optional, from x-actor-id)
   */
  user_id?: string;

  /**
   * User Role (optional, from x-user-role)
   */
  role?: string;
}
