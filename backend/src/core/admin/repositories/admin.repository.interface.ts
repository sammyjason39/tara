import { CreateAdminRequestDto } from "../dto/create-admin-request.dto";
import { ToggleModuleDto } from "../dto/toggle-module.dto";
import { AdminAuditEvent } from "../entities/admin-audit.entity";
import { AdminModuleStatus } from "../entities/admin-module.entity";
import { AdminRequest } from "../entities/admin-request.entity";

export abstract class IAdminRepository {
  abstract getModuleStatuses(tenant_id: string): Promise<AdminModuleStatus[]>;
  abstract toggleModule(
    tenant_id: string,
    dto: ToggleModuleDto,
  ): Promise<AdminModuleStatus>;
  abstract getRequests(tenant_id: string): Promise<AdminRequest[]>;
  abstract createRequest(
    tenant_id: string,
    dto: CreateAdminRequestDto,
  ): Promise<AdminRequest>;
  abstract resolveRequest(
    tenant_id: string,
    request_id: string,
    resolvedBy: string,
  ): Promise<AdminRequest>;
  abstract getAuditEvents(tenant_id: string): Promise<AdminAuditEvent[]>;
  abstract getStuckEvents(tenant_id: string, staleSince: Date): Promise<any[]>;
  abstract retryEvent(tenant_id: string, event_id: string): Promise<any>;
  abstract getSyncStatus(tenant_id: string): Promise<any>;
  abstract getIotDevices(tenant_id: string): Promise<any[]>;
}
