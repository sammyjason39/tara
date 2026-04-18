import { Injectable } from "@nestjs/common";
import { CreateAdminRequestDto } from "./dto/create-admin-request.dto";
import { ToggleModuleDto } from "./dto/toggle-module.dto";
import { IAdminRepository } from "./repositories/admin.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly repository: IAdminRepository,
    private readonly auditService: AuditService,
  ) {}

  async getModuleStatuses(tenant_id: string) {
    return this.repository.getModuleStatuses(tenant_id);
  }

  async toggleModule(tenant_id: string, dto: ToggleModuleDto, actor_id?: string) {
    const result = await this.repository.toggleModule(tenant_id, dto);
    if (actor_id) {
      await this.auditService.log({
        tenant_id,
        user_id: actor_id,
        module: "admin",
        action: "TOGGLE_MODULE",
        entity_type: "MODULE",
        entity_id: dto.moduleKey,
        metadata: { status: dto.enabled ? "enabled" : "disabled" },
      });
    }
    return result;
  }

  async getRequests(tenant_id: string) {
    return this.repository.getRequests(tenant_id);
  }

  async createRequest(
    tenant_id: string,
    dto: CreateAdminRequestDto,
    actor_id?: string,
  ) {
    const request = await this.repository.createRequest(tenant_id, dto);
    if (actor_id) {
      await this.auditService.log({
        tenant_id,
        user_id: actor_id,
        module: "admin",
        action: "CREATE",
        entity_type: "ADMIN_REQUEST",
        entity_id: request.id,
        metadata: { type: dto.type, title: dto.title },
      });
    }
    return request;
  }

  async resolveRequest(
    tenant_id: string,
    request_id: string,
    resolvedBy: string,
  ) {
    const request = await this.repository.resolveRequest(
      tenant_id,
      request_id,
      resolvedBy,
    );
    await this.auditService.log({
      tenant_id,
      user_id: resolvedBy,
      module: "admin",
      action: "RESOLVE",
      entity_type: "ADMIN_REQUEST",
      entity_id: request_id,
    });
    return request;
  }

  async getAuditEvents(tenant_id: string) {
    return this.repository.getAuditEvents(tenant_id);
  }
}
