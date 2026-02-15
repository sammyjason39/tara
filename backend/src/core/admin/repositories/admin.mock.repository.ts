import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAdminRequestDto } from '../dto/create-admin-request.dto';
import { ToggleModuleDto } from '../dto/toggle-module.dto';
import { AdminAuditEvent } from '../entities/admin-audit.entity';
import { AdminModuleStatus } from '../entities/admin-module.entity';
import { AdminRequest } from '../entities/admin-request.entity';
import { IAdminRepository } from './admin.repository.interface';

@Injectable()
export class AdminMockRepository extends IAdminRepository {
  private readonly modules: AdminModuleStatus[] = [];
  private readonly requests: AdminRequest[] = [];
  private readonly audit: AdminAuditEvent[] = [];

  constructor() {
    super();
    this.seed('tenant-001');
    this.seed('tenant-002');
  }

  private seed(tenantId: string): void {
    const keys: Array<AdminModuleStatus['moduleKey']> = [
      'finance',
      'hr',
      'inventory',
      'procurement',
      'admin',
      'it',
    ];
    keys.forEach((moduleKey, index) => {
      this.modules.push({
        id: `${tenantId}-mod-${index + 1}`,
        tenantId,
        moduleKey,
        enabled: true,
        updatedBy: 'system',
        updatedAt: new Date(),
      });
    });
    this.requests.push({
      id: `${tenantId}-admreq-1`,
      tenantId,
      type: 'module_toggle',
      title: 'Enable procurement risk dashboard',
      detail: 'Request to activate advanced procurement governance features.',
      status: 'open',
      requestedBy: 'owner-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async getModuleStatuses(tenantId: string): Promise<AdminModuleStatus[]> {
    return this.modules.filter((item) => item.tenantId === tenantId);
  }

  async toggleModule(tenantId: string, dto: ToggleModuleDto): Promise<AdminModuleStatus> {
    const module = this.modules.find(
      (item) => item.tenantId === tenantId && item.moduleKey === dto.moduleKey,
    );
    if (!module) throw new NotFoundException('Module status not found.');
    module.enabled = dto.enabled;
    module.updatedBy = dto.updatedBy || 'system';
    module.updatedAt = new Date();
    this.audit.push({
      id: `${tenantId}-aud-${this.audit.length + 1}`,
      tenantId,
      action: 'admin.module.toggle',
      entityType: 'module',
      entityId: module.moduleKey,
      actorId: module.updatedBy,
      createdAt: new Date(),
    });
    return module;
  }

  async getRequests(tenantId: string): Promise<AdminRequest[]> {
    return this.requests.filter((item) => item.tenantId === tenantId);
  }

  async createRequest(tenantId: string, dto: CreateAdminRequestDto): Promise<AdminRequest> {
    const created: AdminRequest = {
      id: `${tenantId}-admreq-${this.requests.length + 1}`,
      tenantId,
      type: dto.type,
      title: dto.title,
      detail: dto.detail,
      status: 'open',
      requestedBy: dto.requestedBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.requests.push(created);
    return created;
  }

  async resolveRequest(tenantId: string, requestId: string, resolvedBy: string): Promise<AdminRequest> {
    const request = this.requests.find((item) => item.tenantId === tenantId && item.id === requestId);
    if (!request) throw new NotFoundException('Admin request not found.');
    request.status = 'resolved';
    request.resolvedBy = resolvedBy;
    request.updatedAt = new Date();
    this.audit.push({
      id: `${tenantId}-aud-${this.audit.length + 1}`,
      tenantId,
      action: 'admin.request.resolve',
      entityType: 'admin_request',
      entityId: request.id,
      actorId: resolvedBy,
      createdAt: new Date(),
    });
    return request;
  }

  async getAuditEvents(tenantId: string): Promise<AdminAuditEvent[]> {
    return this.audit.filter((item) => item.tenantId === tenantId);
  }
}

