import { Injectable } from '@nestjs/common';
import { ISettingsRepository, OrgProfileDto, TenantPreferencesDto } from '../interfaces/settings.repository.interface';

@Injectable()
export class SettingsMockRepository implements ISettingsRepository {
  private mockProfile: any = {
    id: 'mock-tenant',
    name: 'Zenvix Enterprises (Mock)',
    code: 'ZNVX',
    country: 'US',
    currency: 'USD',
    industry: 'retail',
    created_at: new Date()
  };

  private mockPreferences: any = {
    tenant_id: 'mock-tenant',
    procurement_mode: 'DIRECT'
  };

  async getProfile(tenant_id: string): Promise<any> {
    return { ...this.mockProfile, id: tenant_id };
  }

  async updateProfile(tenant_id: string, data: OrgProfileDto): Promise<any> {
    this.mockProfile = { ...this.mockProfile, ...data, id: tenant_id };
    return this.mockProfile;
  }

  async getPreferences(tenant_id: string): Promise<any> {
    return { ...this.mockPreferences, tenant_id };
  }

  async updatePreferences(tenant_id: string, data: TenantPreferencesDto): Promise<any> {
    this.mockPreferences = { ...this.mockPreferences, ...data, tenant_id };
    return this.mockPreferences;
  }
}
