import { TenantContext } from '../../../gateway/tenant-context.interface';

export interface OrgProfileDto {
  name: string;
  legal_entity?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  last_updated_at?: string;
}

export interface TenantPreferencesDto {
  procurement_mode?: 'DIRECT' | 'BIDDING';
  require_refund_approval?: boolean;
  dual_control_roles?: boolean;
  last_updated_at?: string;
}

export interface ISettingsRepository {
  getProfile(tenant_id: string): Promise<any>;
  updateProfile(tenant_id: string, data: OrgProfileDto): Promise<any>;
  getPreferences(tenant_id: string): Promise<any>;
  updatePreferences(tenant_id: string, data: TenantPreferencesDto): Promise<any>;
}
