import { Injectable, Logger } from '@nestjs/common';
import { SettingsDbRepository } from './repositories/settings.db.repository';
import { AuditService } from '../../shared/audit/audit.service';
import { OrgProfileDto, TenantPreferencesDto } from './interfaces/settings.repository.interface';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly repository: SettingsDbRepository,
    private readonly audit: AuditService,
  ) {}

  async getProfile(tenant_id: string) {
    return this.repository.getProfile(tenant_id);
  }

  async updateProfile(tenant_id: string, data: OrgProfileDto, user_id: string) {
    const before = await this.repository.getProfile(tenant_id);
    const result = await this.repository.updateProfile(tenant_id, data);
    
    // Audit Logging
    await this.audit.log({
      tenant_id,
      user_id,
      module: 'CORE',
      action: 'UPDATE_ORG_PROFILE',
      entity_type: 'COMPANY',
      entity_id: tenant_id,
      changes: data,
      before_state: before,
      after_state: result,
      severity: 'CRITICAL',
    });

    return result;
  }

  async getPreferences(tenant_id: string) {
    return this.repository.getPreferences(tenant_id);
  }

  async updatePreferences(tenant_id: string, data: TenantPreferencesDto, user_id: string) {
    const before = await this.repository.getPreferences(tenant_id);
    const result = await this.repository.updatePreferences(tenant_id, data);

    // Audit Logging
    await this.audit.log({
      tenant_id,
      user_id,
      module: 'CORE',
      action: 'UPDATE_TENANT_PREFERENCES',
      entity_type: 'TENANT_SETTING',
      entity_id: tenant_id,
      changes: data,
      before_state: before,
      after_state: result,
      severity: 'INFO',
    });

    return result;
  }

  async getChildCompanies(tenant_id: string) {
    return this.repository.getChildCompanies(tenant_id);
  }

  async getLocations(tenant_id: string) {
    return this.repository.getLocations(tenant_id);
  }

  async createChildCompany(tenant_id: string, data: any, user_id: string) {
    this.logger.log(`Creating child company for parent tenant: ${tenant_id}`);
    
    const result = await this.repository.createChildCompany(tenant_id, data, user_id);

    await this.audit.log({
      tenant_id,
      user_id,
      module: 'CORE',
      action: 'CREATE_CHILD_COMPANY',
      entity_type: 'COMPANY',
      entity_id: result.id,
      metadata: { name: result.name, code: result.code },
      severity: 'CRITICAL',
    });

    return result;
  }
}
