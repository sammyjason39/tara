import { CreateAdminRequestDto } from '../dto/create-admin-request.dto';
import { ToggleModuleDto } from '../dto/toggle-module.dto';
import { AdminAuditEvent } from '../entities/admin-audit.entity';
import { AdminModuleStatus } from '../entities/admin-module.entity';
import { AdminRequest } from '../entities/admin-request.entity';

export abstract class IAdminRepository {
  abstract getModuleStatuses(tenantId: string): Promise<AdminModuleStatus[]>;
  abstract toggleModule(tenantId: string, dto: ToggleModuleDto): Promise<AdminModuleStatus>;
  abstract getRequests(tenantId: string): Promise<AdminRequest[]>;
  abstract createRequest(tenantId: string, dto: CreateAdminRequestDto): Promise<AdminRequest>;
  abstract resolveRequest(
    tenantId: string,
    requestId: string,
    resolvedBy: string,
  ): Promise<AdminRequest>;
  abstract getAuditEvents(tenantId: string): Promise<AdminAuditEvent[]>;
}

