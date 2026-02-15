import { Injectable } from '@nestjs/common';
import { CreateAdminRequestDto } from './dto/create-admin-request.dto';
import { ToggleModuleDto } from './dto/toggle-module.dto';
import { IAdminRepository } from './repositories/admin.repository.interface';

@Injectable()
export class AdminService {
  constructor(private readonly repository: IAdminRepository) {}

  async getModuleStatuses(tenantId: string) {
    return this.repository.getModuleStatuses(tenantId);
  }

  async toggleModule(tenantId: string, dto: ToggleModuleDto) {
    return this.repository.toggleModule(tenantId, dto);
  }

  async getRequests(tenantId: string) {
    return this.repository.getRequests(tenantId);
  }

  async createRequest(tenantId: string, dto: CreateAdminRequestDto) {
    return this.repository.createRequest(tenantId, dto);
  }

  async resolveRequest(tenantId: string, requestId: string, resolvedBy: string) {
    return this.repository.resolveRequest(tenantId, requestId, resolvedBy);
  }

  async getAuditEvents(tenantId: string) {
    return this.repository.getAuditEvents(tenantId);
  }
}

