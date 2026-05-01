import { Injectable, NotFoundException } from "@nestjs/common";
import {
  it_provisioning_requests as ItProvisioningRequest,
  it_system_health as ItSystemHealth,
  it_devices as PrismaDevice,
  it_device_events as PrismaDeviceEvent,
} from "@prisma/client";
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
    tenant_id: string,
  ): Promise<ProvisioningRequest[]> {
    const requests = await this.prisma.it_provisioning_requests.findMany({
      where: { tenant_id: tenant_id },
    });

    return requests.map((r: ItProvisioningRequest) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      employee_id: r.employee_id || undefined,
      supplierId: r.supplier_id || undefined,
      supplierBranchId: r.supplier_branch_id || undefined,
      scope: (r.scope as any) || "full_portal",
      priority: (r as any).priority || "MEDIUM",
      description: (r as any).description || undefined,
      reason: r.reason || "",
      status: r.status.toLowerCase() as any,
      requested_by: r.requested_by,
      provisionedBy: r.provisioned_by || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async createProvisioningRequest(
    tenant_id: string,
    dto: CreateProvisioningRequestDto,
  ): Promise<ProvisioningRequest> {
    let finalEmployeeId = dto.employee_id;
    let fallbackReason = dto.reason || "";

    if (finalEmployeeId && finalEmployeeId.startsWith("EMP-")) {
      const emp = await this.prisma.employees.findUnique({
        where: {
          tenant_id_employee_code: { tenant_id: tenant_id, employee_code: finalEmployeeId },
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
      const sup = await this.prisma.supplier_masters.findFirst({
        where: { tenant_id: tenant_id, id: { startsWith: finalSupplierId } }, // Mock loose match
      });
      if (!sup)
        throw new NotFoundException(`Supplier ${finalSupplierId} not found`);
      finalSupplierId = sup.id;
    }

    const created = await this.prisma.it_provisioning_requests.create({
      data: {
        
        updated_at: new Date(),
        tenant_id: tenant_id,
        employee_id: finalEmployeeId,
        supplier_id: finalSupplierId,
        supplier_branch_id: dto.supplierBranchId,
        scope: dto.scope,
        priority: dto.priority || "MEDIUM",
        description: dto.description,
        reason: fallbackReason,
        status: "REQUESTED",
        requested_by: "system", // In real app, this would be from auth
      },
    });

    return {
      id: created.id,
      tenant_id: created.tenant_id,
      employee_id: created.employee_id || undefined,
      supplierId: created.supplier_id || undefined,
      supplierBranchId: created.supplier_branch_id || undefined,
      scope: (created.scope as any) || "full_portal",
      priority: created.priority || "MEDIUM",
      description: created.description || undefined,
      reason: created.reason || "",
      status: "requested",
      requested_by: created.requested_by,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  async markProvisioned(
    tenant_id: string,
    request_id: string,
    provisionedBy: string,
  ): Promise<ProvisioningRequest> {
    const updated = await this.prisma.it_provisioning_requests.update({
      where: { id: request_id, tenant_id: tenant_id },
      data: {
        status: "PROVISIONED",
        provisioned_by: provisionedBy,
      },
    });

    return {
      id: updated.id,
      tenant_id: updated.tenant_id,
      employee_id: updated.employee_id || undefined,
      supplierId: updated.supplier_id || undefined,
      supplierBranchId: updated.supplier_branch_id || undefined,
      scope: (updated.scope as any) || "full_portal",
      priority: updated.priority || "MEDIUM",
      description: updated.description || undefined,
      reason: updated.reason || "",
      status: "provisioned",
      requested_by: updated.requested_by,
      provisionedBy: updated.provisioned_by || undefined,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async updateProvisioningRequest(
    tenant_id: string,
    request_id: string,
    dto: Partial<CreateProvisioningRequestDto>,
  ): Promise<ProvisioningRequest> {
    let finalEmployeeId = dto.employee_id;
    let fallbackReason = dto.reason;

    if (finalEmployeeId && finalEmployeeId.startsWith("EMP-")) {
      const emp = await this.prisma.employees.findUnique({
        where: {
          tenant_id_employee_code: { tenant_id: tenant_id, employee_code: finalEmployeeId },
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
    if (finalEmployeeId !== dto.employee_id) {
      updateData.employee_id = finalEmployeeId;
      updateData.reason = fallbackReason;
    }

    const updated = await this.prisma.it_provisioning_requests.update({
      where: { id: request_id, tenant_id: tenant_id },
      data: updateData,
    });
    return {
      id: updated.id,
      tenant_id: updated.tenant_id,
      employee_id: updated.employee_id || undefined,
      supplierId: updated.supplier_id || undefined,
      supplierBranchId: updated.supplier_branch_id || undefined,
      scope: (updated.scope as any) || "full_portal",
      priority: updated.priority || "MEDIUM",
      description: updated.description || undefined,
      reason: updated.reason || "",
      status: updated.status.toLowerCase() as any,
      requested_by: updated.requested_by,
      provisionedBy: updated.provisioned_by || undefined,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async deleteProvisioningRequest(
    tenant_id: string,
    request_id: string,
  ): Promise<void> {
    await this.prisma.it_provisioning_requests.delete({
      where: { id: request_id, tenant_id: tenant_id },
    });
  }

  // Devices (NEW)
  async getDevices(tenant_id: string): Promise<Device[]> {
    const devices = await this.prisma.it_devices.findMany({
      where: { tenant_id: tenant_id },
    });
    return devices.map((d: any) => this.mapToDevice(d));
  }

  async createDevice(tenant_id: string, dto: CreateDeviceDto): Promise<Device> {
    const created = await this.prisma.it_devices.create({
      data: {
        
        
        tenant_id: tenant_id,
        name: dto.name,
        type: dto.type,
        connection: dto.connection,
        location_id: dto.location_id,
        owner_id: dto.owner_id,
        status: "ONLINE",
        metadata: dto.metadata || {},
      },
    });
    return this.mapToDevice(created);
  }

  async updateDevice(
    tenant_id: string,
    device_id: string,
    dto: Partial<CreateDeviceDto>,
  ): Promise<Device> {
    const updated = await this.prisma.it_devices.update({
      where: { id: device_id, tenant_id: tenant_id },
      data: dto as any,
    });
    return this.mapToDevice(updated);
  }

  async getDevice(tenant_id: string, device_id: string): Promise<Device | null> {
    const device = await this.prisma.it_devices.findUnique({
      where: { id: device_id, tenant_id: tenant_id },
    });
    return device ? this.mapToDevice(device) : null;
  }

  // Device Events (NEW)
  async getDeviceEvents(tenant_id: string): Promise<DeviceEvent[]> {
    const events = await this.prisma.it_device_events.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    return events.map((e: any) => this.mapToDeviceEvent(e));
  }

  async createDeviceEvent(
    tenant_id: string,
    dto: CreateDeviceEventDto,
  ): Promise<DeviceEvent> {
    const created = await this.prisma.it_device_events.create({
      data: {
        
        
        tenant_id: tenant_id,
        device_id: dto.device_id,
        event_type: dto.event_type,
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
      tenant_id: r.tenant_id,
      name: r.name,
      type: r.type,
      connection: r.connection,
      status: r.status,
      location_id: r.location_id || undefined,
      owner_id: r.owner_id || undefined,
      metadata: r.metadata,
      created_at: r.created_at,
    };
  }

  private mapToDeviceEvent(r: PrismaDeviceEvent): DeviceEvent {
    return {
      id: r.id,
      tenant_id: r.tenant_id,
      device_id: r.device_id,
      event_type: r.event_type,
      payload: r.payload,
      processed: r.processed,
      created_at: r.created_at,
    };
  }

  async getSystemHealth(tenant_id: string): Promise<SystemHealth[]> {
    const health = await this.prisma.it_system_health.findMany({
      where: { tenant_id: tenant_id },
    });
    return health.map(h => ({
      id: h.id,
      tenant_id: h.tenant_id,
      component: h.component as any,
      status: h.status as any,
      latencyMs: h.latency_ms,
      checkedAt: h.checked_at,
    }));
  }

  async getProvisioningStats(tenant_id: string): Promise<any> {
    const counts = await this.prisma.it_provisioning_requests.groupBy({
      by: ['status'],
      where: { tenant_id: tenant_id },
      _count: true,
    });
    return counts;
  }

  async getAuditLogs(tenant_id: string, request_id?: string): Promise<any[]> {
    return []; // Placeholder for now
  }

  async getOverview(tenant_id: string): Promise<any> {
    const [health, nodes, updates] = await Promise.all([
      this.prisma.it_system_health.findMany({ where: { tenant_id } }),
      this.prisma.it_devices.count({ where: { tenant_id } }),
      this.prisma.it_provisioning_requests.count({ where: { tenant_id, status: 'REQUESTED' } }),
    ]);

    const healthyCount = health.filter(h => h.status === 'HEALTHY').length;
    const healthScore = health.length > 0 ? Math.round((healthyCount / health.length) * 100) : 100;

    return {
      healthScore: `${healthScore}%`,
      activeNodes: nodes,
      pendingUpdates: updates,
    };
  }
}
