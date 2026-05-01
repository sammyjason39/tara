import { Injectable } from "@nestjs/common";
import { CreateProvisioningRequestDto } from "./dto/create-provisioning-request.dto";
import { IITRepository } from "./repositories/it.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { EventBusService } from "../../shared/events/event-bus.service";
import { CreateDeviceDto, CreateDeviceEventDto } from "./dto/device.dto";

@Injectable()
export class ITService {
  constructor(
    private readonly repository: IITRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async getProvisioningRequests(tenant_id: string) {
    return this.repository.getProvisioningRequests(tenant_id);
  }

  async createProvisioningRequest(
    tenant_id: string,
    dto: CreateProvisioningRequestDto,
    user_id?: string,
  ) {
    const request = await this.repository.createProvisioningRequest(
      tenant_id,
      dto,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it",
        action: "CREATE",
        entity_type: "PROVISIONING_REQUEST",
        entity_id: request.id,
        metadata: { ...dto },
      });
    }
    return request;
  }

  async markProvisioned(
    tenant_id: string,
    request_id: string,
    provisionedBy: string,
    user_id?: string,
  ) {
    const request = await this.repository.markProvisioned(
      tenant_id,
      request_id,
      provisionedBy,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it",
        action: "PROVISION",
        entity_type: "PROVISIONING_REQUEST",
        entity_id: request_id,
        metadata: { provisionedBy },
      });
    }
    return request;
  }

  async updateProvisioningRequest(
    tenant_id: string,
    request_id: string,
    dto: Partial<CreateProvisioningRequestDto>,
    user_id?: string,
  ) {
    const request = await this.repository.updateProvisioningRequest(
      tenant_id,
      request_id,
      dto,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it",
        action: "UPDATE",
        entity_type: "PROVISIONING_REQUEST",
        entity_id: request_id,
        metadata: { ...dto },
      });
    }
    return request;
  }

  async deleteProvisioningRequest(
    tenant_id: string,
    request_id: string,
    user_id?: string,
  ) {
    await this.repository.deleteProvisioningRequest(tenant_id, request_id);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it",
        action: "DELETE",
        entity_type: "PROVISIONING_REQUEST",
        entity_id: request_id,
      });
    }
  }

  // Devices (NEW)
  async getDevices(tenant_id: string) {
    return this.repository.getDevices(tenant_id);
  }

  async createDevice(tenant_id: string, dto: CreateDeviceDto, user_id?: string) {
    const device = await this.repository.createDevice(tenant_id, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it",
        action: "CREATE",
        entity_type: "DEVICE",
        entity_id: device.id,
        metadata: { ...dto },
      });
    }
    return device;
  }

  async updateDevice(
    tenant_id: string,
    device_id: string,
    dto: Partial<CreateDeviceDto>,
    user_id?: string,
  ) {
    const device = await this.repository.updateDevice(tenant_id, device_id, dto);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it",
        action: "UPDATE",
        entity_type: "DEVICE",
        entity_id: device_id,
        metadata: { ...dto },
      });
    }
    return device;
  }

  // Device Events (NEW)
  async getDeviceEvents(tenant_id: string) {
    return this.repository.getDeviceEvents(tenant_id);
  }

  async createDeviceEvent(tenant_id: string, dto: CreateDeviceEventDto) {
    const event = await this.repository.createDeviceEvent(tenant_id, dto);

    // Publish to EventBus for Inventory/Retail to consume
    await this.eventBus.publish({
      event_type: "DEVICE_EVENT_CREATED",
      tenant_id: event.tenant_id,
      entity_id: event.id,
      entity_type: "DEVICE_EVENT",
      source_module: "it",
      payload: event.payload,
    });

    return event;
  }

  // Misc
  async getSystemHealth(tenant_id: string) {
    return this.repository.getSystemHealth(tenant_id);
  }

  async getMonitoringStats(tenant_id: string) {
    return this.repository.getProvisioningStats(tenant_id);
  }

  async getAuditLogs(tenant_id: string, request_id?: string) {
    return this.repository.getAuditLogs(tenant_id, request_id);
  }

  async getOverview(tenant_id: string) {
    return this.repository.getOverview(tenant_id);
  }
}
