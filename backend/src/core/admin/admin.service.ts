import { Injectable } from "@nestjs/common";
import { CreateAdminRequestDto, AdminRequestType } from "./dto/create-admin-request.dto";
import { ToggleModuleDto } from "./dto/toggle-module.dto";
import { IAdminRepository } from "./repositories/admin.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import * as jwt from "jsonwebtoken";

@Injectable()
export class AdminService {
  private readonly jwtSecret = process.env.JWT_SECRET || "dev-secret-key-do-not-use-in-prod";

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

  async getStuckEvents(tenant_id: string) {
    // Stale = PENDING and older than 5 mins, or FAILED
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.repository.getStuckEvents(tenant_id, fiveMinutesAgo);
  }

  async retryEvent(tenant_id: string, event_id: string, actor_id?: string) {
    const result = await this.repository.retryEvent(tenant_id, event_id);
    if (actor_id) {
      await this.auditService.log({
        tenant_id,
        user_id: actor_id,
        module: "admin",
        action: "RETRY_EVENT",
        entity_type: "OUTBOX_EVENT",
        entity_id: event_id,
      });
    }
    return result;
  }

  async getSyncStatus(tenant_id: string) {
    return this.repository.getSyncStatus(tenant_id);
  }

  async getIotDevices(tenant_id: string) {
    return this.repository.getIotDevices(tenant_id);
  }

  async createInvitation(
    tenant_id: string,
    dto: { email: string; role: string; justification?: string },
    actor_id: string,
  ) {
    // 1. Generate Link Token
    const token = (jwt.sign as any)(
      { 
        email: dto.email, 
        role: dto.role, 
        tenant_id,
        type: AdminRequestType.INVITATION
      }, 
      this.jwtSecret, 
      { expiresIn: "7d" }
    );

    const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/invite?token=${token}`;

    // 2. Persist as an Admin Request for Audit/Tracking
    const request = await this.repository.createRequest(tenant_id, {
      type: AdminRequestType.INVITATION,
      title: `Admin Invitation: ${dto.email}`,
      detail: `Invited as ${dto.role}. Justification: ${dto.justification || "N/A"}. Link: ${magicLink}`,
    });

    // 3. Log Audit
    await this.auditService.log({
      tenant_id,
      user_id: actor_id,
      module: "admin",
      action: "INVITE",
      entity_type: "ADMIN_INVITATION",
      entity_id: request.id,
      metadata: { email: dto.email, role: dto.role, token_preview: token.substring(0, 10) + "..." },
    });

    return { 
      success: true, 
      magic_link: magicLink, 
      request_id: request.id 
    };
  }
}
