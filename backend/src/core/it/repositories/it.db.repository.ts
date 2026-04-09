import { Injectable, NotFoundException } from "@nestjs/common";
import type { ItProvisioningRequest, ItSystemHealth, ItDevice as PrismaDevice, ItDeviceEvent as PrismaDeviceEvent } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../persistence/prisma.service";
import { CreateProvisioningRequestDto } from "../dto/create-provisioning-request.dto";
import { ProvisioningRequest } from "../entities/provisioning-request.entity";
import { SystemHealth } from "../entities/system-health.entity";
import { Device, DeviceEvent } from "../entities/device.entity";
import { CreateDeviceDto, CreateDeviceEventDto } from "../dto/device.dto";
import { IITRepository } from "./it.repository.interface";

@Injectable()
export class ITDbRepository extends IITRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getProvisioningRequests(
    tenantId: string,
  ): Promise<ProvisioningRequest[]> {
    const requests = await this.prisma.itProvisioningRequest.findMany({
      where: { tenantId: tenantId },
    });

    return requests.map((r: ItProvisioningRequest) => ({
      id: r.id,
      tenantId: r.tenantId,
      employeeId: r.employeeId || undefined,
      supplierId: r.supplierId || undefined,
      supplierBranchId: r.supplierBranchId || undefined,
      scope: (r.scope as any) || "full_portal",
      priority: (r as any).priority || "MEDIUM",
      description: (r as any).description || undefined,
      reason: r.reason || "",
      status: r.status.toLowerCase() as any,
      requestedBy: r.requestedBy,
      provisionedBy: r.provisionedBy || undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createProvisioningRequest(
    tenantId: string,
    dto: CreateProvisioningRequestDto,
  ): Promise<ProvisioningRequest> {
    let finalEmployeeId = dto.employeeId;
    let fallbackReason = dto.reason || "";

    if (finalEmployeeId && finalEmployeeId.startsWith("EMP-")) {
      const emp = await this.prisma.employee.findUnique({
        where: {
          tenantId_employeeCode: { tenantId, employeeCode: finalEmployeeId },
        },
      });
      if (emp) {
        finalEmployeeId = emp.id;
      } else {
        // Graceful fallback for brand-new accounts where the Employee record isn't in DB yet
        fallbackReason = `[RequestedFor: ${finalEmployeeId}] ` + fallbackReason;
        finalEmployeeId = undefined as any;
      }
    }

    let finalSupplierId = dto.supplierId;
    if (finalSupplierId && finalSupplierId.startsWith("SUP-")) {
      const sup = await this.prisma.supplierMaster.findFirst({
        where: { tenantId, id: { startsWith: finalSupplierId } }, // Mock loose match
      });
      if (!sup)
        throw new NotFoundException(`Supplier ${finalSupplierId} not found`);
      finalSupplierId = sup.id;
    }

    const created = await this.prisma.itProvisioningRequest.create({
      data: {
        
        updatedAt: new Date(),
        tenantId: tenantId,
        employeeId: finalEmployeeId,
        supplierId: finalSupplierId,
        supplierBranchId: dto.supplierBranchId,
        scope: dto.scope,
        priority: dto.priority || "MEDIUM",
        description: dto.description,
        reason: fallbackReason,
        status: "REQUESTED",
        requestedBy: "system", // In real app, this would be from auth
      },
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      employeeId: created.employeeId || undefined,
      supplierId: created.supplierId || undefined,
      supplierBranchId: created.supplierBranchId || undefined,
      scope: (created.scope as any) || "full_portal",
      priority: created.priority || "MEDIUM",
      description: created.description || undefined,
      reason: created.reason || "",
      status: "requested",
      requestedBy: created.requestedBy,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async markProvisioned(
    tenantId: string,
    requestId: string,
    provisionedBy: string,
  ): Promise<ProvisioningRequest> {
    const updated = await this.prisma.itProvisioningRequest.update({
      where: { id: requestId, tenantId: tenantId },
      data: {
        status: "PROVISIONED",
        provisionedBy,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      employeeId: updated.employeeId || undefined,
      supplierId: updated.supplierId || undefined,
      supplierBranchId: updated.supplierBranchId || undefined,
      scope: (updated.scope as any) || "full_portal",
      priority: updated.priority || "MEDIUM",
      description: updated.description || undefined,
      reason: updated.reason || "",
      status: "provisioned",
      requestedBy: updated.requestedBy,
      provisionedBy: updated.provisionedBy || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updateProvisioningRequest(
    tenantId: string,
    requestId: string,
    dto: Partial<CreateProvisioningRequestDto>,
  ): Promise<ProvisioningRequest> {
    let finalEmployeeId = dto.employeeId;
    let fallbackReason = dto.reason;

    if (finalEmployeeId && finalEmployeeId.startsWith("EMP-")) {
      const emp = await this.prisma.employee.findUnique({
        where: {
          tenantId_employeeCode: { tenantId, employeeCode: finalEmployeeId },
        },
      });
      if (emp) {
        finalEmployeeId = emp.id;
      } else {
        // Fallback for non-existent employees in update
        fallbackReason =
          `[RequestedFor: ${finalEmployeeId}] ` + (fallbackReason || "");
        finalEmployeeId = undefined as any;
      }
    }

    // Determine final data
    const updateData: any = { ...dto };
    if (finalEmployeeId !== dto.employeeId) {
      updateData.employeeId = finalEmployeeId;
      updateData.reason = fallbackReason;
    }

    const updated = await this.prisma.itProvisioningRequest.update({
      where: { id: requestId, tenantId: tenantId },
      data: updateData,
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      employeeId: updated.employeeId || undefined,
      supplierId: updated.supplierId || undefined,
      supplierBranchId: updated.supplierBranchId || undefined,
      scope: (updated.scope as any) || "full_portal",
      priority: updated.priority || "MEDIUM",
      description: updated.description || undefined,
      reason: updated.reason || "",
      status: updated.status.toLowerCase() as any,
      requestedBy: updated.requestedBy,
      provisionedBy: updated.provisionedBy || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteProvisioningRequest(
    tenantId: string,
    requestId: string,
  ): Promise<void> {
    await this.prisma.itProvisioningRequest.delete({
      where: { id: requestId, tenantId: tenantId },
    });
  }

  // Devices (NEW)
  async getDevices(tenantId: string): Promise<Device[]> {
    const devices = await this.prisma.itDevice.findMany({
      where: { tenantId },
    });
    return devices.map((d: any) => this.mapToDevice(d));
  }

  async createDevice(tenantId: string, dto: CreateDeviceDto): Promise<Device> {
    const created = await this.prisma.itDevice.create({
      data: {
        
        
        tenantId,
        name: dto.name,
        type: dto.type,
        connection: dto.connection,
        locationId: dto.locationId,
        ownerId: dto.ownerId,
        status: "ONLINE",
        metadata: dto.metadata || {},
      },
    });
    return this.mapToDevice(created);
  }

  async updateDevice(
    tenantId: string,
    deviceId: string,
    dto: Partial<CreateDeviceDto>,
  ): Promise<Device> {
    const updated = await this.prisma.itDevice.update({
      where: { id: deviceId, tenantId },
      data: dto as any,
    });
    return this.mapToDevice(updated);
  }

  async getDevice(tenantId: string, deviceId: string): Promise<Device | null> {
    const device = await this.prisma.itDevice.findUnique({
      where: { id: deviceId, tenantId },
    });
    return device ? this.mapToDevice(device) : null;
  }

  // Device Events (NEW)
  async getDeviceEvents(tenantId: string): Promise<DeviceEvent[]> {
    const events = await this.prisma.itDeviceEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return events.map((e: any) => this.mapToDeviceEvent(e));
  }

  async createDeviceEvent(
    tenantId: string,
    dto: CreateDeviceEventDto,
  ): Promise<DeviceEvent> {
    const created = await this.prisma.itDeviceEvent.create({
      data: {
        
        
        tenantId,
        deviceId: dto.deviceId,
        eventType: dto.eventType,
        payload: dto.payload,
        processed: dto.processed || false,
      },
    });
    return this.mapToDeviceEvent(created);
  }

  // Helpers
  private mapToDevice(r: PrismaDevice): Device {
    return {
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      type: r.type,
      connection: r.connection,
      status: r.status,
      locationId: r.locationId || undefined,
      ownerId: r.ownerId || undefined,
      metadata: r.metadata,
      createdAt: r.createdAt,
    };
  }

  private mapToDeviceEvent(r: PrismaDeviceEvent): DeviceEvent {
    return {
      id: r.id,
      tenantId: r.tenantId,
      deviceId: r.deviceId,
      eventType: r.eventType,
      payload: r.payload,
      processed: r.processed,
      createdAt: r.createdAt,
    };
  }

  async getSystemHealth(tenantId: string): Promise<SystemHealth[]> {
    const health = await this.prisma.itSystemHealth.findMany({
      where: { tenantId },
    });
    return health.map(h => ({
      id: h.id,
      tenantId: h.tenantId,
      component: h.component as any,
      status: h.status as any,
      latencyMs: h.latencyMs,
      checkedAt: h.checkedAt,
    }));
  }

  async getProvisioningStats(tenantId: string): Promise<any> {
    const counts = await this.prisma.itProvisioningRequest.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });
    return counts;
  }

  async getAuditLogs(tenantId: string, requestId?: string): Promise<any[]> {
    return []; // Placeholder for now
  }
}
