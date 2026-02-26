import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import { IAdminRepository } from "./admin.repository.interface";
import { ToggleModuleDto } from "../dto/toggle-module.dto";
import { CreateAdminRequestDto } from "../dto/create-admin-request.dto";
import { AdminModuleStatus } from "../entities/admin-module.entity";
import { AdminRequest } from "../entities/admin-request.entity";
import { AdminAuditEvent } from "../entities/admin-audit.entity";

@Injectable()
export class AdminPrismaRepository extends IAdminRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getModuleStatuses(tenantId: string): Promise<AdminModuleStatus[]> {
    const statuses = await this.prisma.adminModuleStatus.findMany({
      where: { tenantId },
    });
    return statuses as AdminModuleStatus[];
  }

  async toggleModule(
    tenantId: string,
    dto: ToggleModuleDto,
  ): Promise<AdminModuleStatus> {
    const updated = await this.prisma.adminModuleStatus.update({
      where: { tenantId_moduleKey: { tenantId, moduleKey: dto.moduleKey } },
      data: {
        enabled: dto.enabled,
        updatedBy: dto.updatedBy,
        updatedAt: new Date(),
      },
    });
    // Record audit event
    await this.prisma.adminAuditEvent.create({
      data: {
        tenantId,
        action: "admin.module.toggle",
        entityType: "module",
        entityId: dto.moduleKey,
        actorId: dto.updatedBy || "system",
      },
    });
    return updated as AdminModuleStatus;
  }

  async getRequests(tenantId: string): Promise<AdminRequest[]> {
    const requests = await this.prisma.adminRequest.findMany({
      where: { tenantId },
    });
    return requests as AdminRequest[];
  }

  async createRequest(
    tenantId: string,
    dto: CreateAdminRequestDto,
  ): Promise<AdminRequest> {
    const created = await this.prisma.adminRequest.create({
      data: {
        tenantId,
        type: dto.type,
        title: dto.title,
        detail: dto.detail,
        status: "open",
        requestedBy: dto.requestedBy || "system",
      },
    });
    // Audit
    await this.prisma.adminAuditEvent.create({
      data: {
        tenantId,
        action: "admin.request.create",
        entityType: "admin_request",
        entityId: created.id,
        actorId: dto.requestedBy || "system",
      },
    });
    return created as AdminRequest;
  }

  async resolveRequest(
    tenantId: string,
    requestId: string,
    resolvedBy: string,
  ): Promise<AdminRequest> {
    const resolved = await this.prisma.adminRequest.update({
      where: { id: requestId },
      data: { status: "resolved", resolvedBy, updatedAt: new Date() },
    });
    await this.prisma.adminAuditEvent.create({
      data: {
        tenantId,
        action: "admin.request.resolve",
        entityType: "admin_request",
        entityId: requestId,
        actorId: resolvedBy,
      },
    });
    return resolved as AdminRequest;
  }

  async getAuditEvents(tenantId: string): Promise<AdminAuditEvent[]> {
    return this.prisma.adminAuditEvent.findMany({ where: { tenantId } });
  }
}
