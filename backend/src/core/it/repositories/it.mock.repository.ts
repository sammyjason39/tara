import { CreateProvisioningRequestDto } from "../dto/create-provisioning-request.dto";
import { ProvisioningRequest } from "../entities/provisioning-request.entity";
import { SystemHealth } from "../entities/system-health.entity";
import { Device, DeviceEvent } from "../entities/device.entity";
import { CreateDeviceDto, CreateDeviceEventDto } from "../dto/device.dto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { IITRepository } from "./it.repository.interface";

@Injectable()
export class ITMockRepository extends IITRepository {
  private readonly provisioningRequests: ProvisioningRequest[] = [];
  private readonly healthChecks: SystemHealth[] = [];
  private readonly devices: Device[] = [];
  private readonly deviceEvents: DeviceEvent[] = [];

  constructor() {
    super();
    this.seed("tenant-001");
    this.seed("tenant-002");
  }

  private seed(tenant_id: string): void {
    this.provisioningRequests.push({
      id: `${tenant_id}-prov-1`,
      tenant_id,
      supplierId: `${tenant_id}-supplier-1`,
      supplierBranchId: `${tenant_id}-supplier-1-jkt`,
      scope: "full_portal",
      priority: "MEDIUM",
      description: "Initial automated onboarding for new supplier admin.",
      reason: "Initial supplier onboarding",
      status: "requested",
      requested_by: "procurement-admin",
      created_at: new Date(),
      updated_at: new Date(),
    });
    this.healthChecks.push(
      {
        id: `${tenant_id}-health-1`,
        tenant_id,
        component: "identity",
        status: "healthy",
        latencyMs: 42,
        checkedAt: new Date(),
      },
      {
        id: `${tenant_id}-health-2`,
        tenant_id,
        component: "database",
        status: "healthy",
        latencyMs: 55,
        checkedAt: new Date(),
      },
      {
        id: `${tenant_id}-health-3`,
        tenant_id,
        component: "integrations",
        status: "degraded",
        latencyMs: 210,
        checkedAt: new Date(),
      },
    );
  }

  async getProvisioningRequests(
    tenant_id: string,
  ): Promise<ProvisioningRequest[]> {
    return this.provisioningRequests.filter(
      (item) => item.tenant_id === tenant_id,
    );
  }

  async createProvisioningRequest(
    tenant_id: string,
    dto: CreateProvisioningRequestDto,
  ): Promise<ProvisioningRequest> {
    const created: ProvisioningRequest = {
      id: `${tenant_id}-prov-${this.provisioningRequests.length + 1}`,
      tenant_id,
      supplierId: dto.supplierId,
      supplierBranchId: dto.supplierBranchId,
      scope: dto.scope,
      priority: dto.priority || "MEDIUM",
      description: dto.description,
      reason: dto.reason,
      status: "requested",
      requested_by: dto.requested_by || "system",
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.provisioningRequests.push(created);
    return created;
  }

  async markProvisioned(
    tenant_id: string,
    request_id: string,
    provisionedBy: string,
  ): Promise<ProvisioningRequest> {
    const request = this.provisioningRequests.find(
      (item) => item.tenant_id === tenant_id && item.id === request_id,
    );
    if (!request)
      throw new NotFoundException("Provisioning request not found.");
    request.status = "provisioned";
    request.provisionedBy = provisionedBy;
    request.updated_at = new Date();
    return request;
  }

  async updateProvisioningRequest(
    tenant_id: string,
    request_id: string,
    dto: Partial<CreateProvisioningRequestDto>,
  ): Promise<ProvisioningRequest> {
    const request = this.provisioningRequests.find(
      (item) => item.tenant_id === tenant_id && item.id === request_id,
    );
    if (!request)
      throw new NotFoundException("Provisioning request not found.");
    if (dto.employee_id !== undefined) request.employee_id = dto.employee_id;
    if (dto.supplierId !== undefined) request.supplierId = dto.supplierId;
    if (dto.supplierBranchId !== undefined)
      request.supplierBranchId = dto.supplierBranchId;
    if (dto.scope !== undefined) request.scope = dto.scope;
    if (dto.reason !== undefined) request.reason = dto.reason;
    request.updated_at = new Date();
    return request;
  }

  async deleteProvisioningRequest(
    tenant_id: string,
    request_id: string,
  ): Promise<void> {
    const index = this.provisioningRequests.findIndex(
      (item) => item.tenant_id === tenant_id && item.id === request_id,
    );
    if (index === -1)
      throw new NotFoundException("Provisioning request not found.");
    this.provisioningRequests.splice(index, 1);
  }

  async getSystemHealth(tenant_id: string): Promise<SystemHealth[]> {
    return this.healthChecks.filter((item) => item.tenant_id === tenant_id);
  }

  async getProvisioningStats(tenant_id: string): Promise<any> {
    const requests = this.provisioningRequests.filter((r) => r.tenant_id === tenant_id);
    return {
      total: requests.length,
      requested: requests.filter((r) => r.status === "requested").length,
      provisioned: requests.filter((r) => r.status === "provisioned").length,
    };
  }

  async getAuditLogs(tenant_id: string, request_id?: string): Promise<any[]> {
    return []; // Mock return
  }

  // Devices (NEW)
  async getDevices(tenant_id: string): Promise<Device[]> {
    return this.devices.filter((d) => d.tenant_id === tenant_id);
  }

  async createDevice(tenant_id: string, dto: CreateDeviceDto): Promise<Device> {
    const created: Device = {
      id: `dev-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id,
      name: dto.name,
      type: dto.type,
      connection: dto.connection,
      status: "ONLINE",
      location_id: dto.location_id,
      owner_id: dto.owner_id,
      metadata: dto.metadata || {},
      created_at: new Date(),
    };
    this.devices.push(created);
    return created;
  }

  async updateDevice(
    tenant_id: string,
    device_id: string,
    dto: Partial<CreateDeviceDto>,
  ): Promise<Device> {
    const device = this.devices.find((d) => d.id === device_id && d.tenant_id === tenant_id);
    if (!device) throw new NotFoundException("Device not found");
    Object.assign(device, dto);
    return device;
  }

  async getDevice(tenant_id: string, device_id: string): Promise<Device | null> {
    return this.devices.find((d) => d.id === device_id && d.tenant_id === tenant_id) || null;
  }

  // Device Events (NEW)
  async getDeviceEvents(tenant_id: string): Promise<DeviceEvent[]> {
    return this.deviceEvents.filter((e) => e.tenant_id === tenant_id);
  }

  async createDeviceEvent(
    tenant_id: string,
    dto: CreateDeviceEventDto,
  ): Promise<DeviceEvent> {
    const created: DeviceEvent = {
      id: `evt-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id,
      device_id: dto.device_id,
      event_type: dto.event_type,
      payload: dto.payload,
      processed: dto.processed || false,
      created_at: new Date(),
    };
    this.deviceEvents.push(created);
    return created;
  }

}
