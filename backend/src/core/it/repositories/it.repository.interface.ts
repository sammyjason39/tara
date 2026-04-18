import { CreateProvisioningRequestDto } from "../dto/create-provisioning-request.dto";
import { ProvisioningRequest } from "../entities/provisioning-request.entity";
import { SystemHealth } from "../entities/system-health.entity";
import { Device, DeviceEvent } from "../entities/device.entity";
import { CreateDeviceDto, CreateDeviceEventDto } from "../dto/device.dto";

export abstract class IITRepository {
  // Provisioning
  abstract getProvisioningRequests(
    tenant_id: string,
  ): Promise<ProvisioningRequest[]>;
  abstract createProvisioningRequest(
    tenant_id: string,
    dto: CreateProvisioningRequestDto,
  ): Promise<ProvisioningRequest>;
  abstract markProvisioned(
    tenant_id: string,
    request_id: string,
    provisionedBy: string,
  ): Promise<ProvisioningRequest>;
  abstract updateProvisioningRequest(
    tenant_id: string,
    request_id: string,
    dto: Partial<CreateProvisioningRequestDto>,
  ): Promise<ProvisioningRequest>;
  abstract deleteProvisioningRequest(
    tenant_id: string,
    request_id: string,
  ): Promise<void>;

  // Devices (NEW)
  abstract getDevices(tenant_id: string): Promise<Device[]>;
  abstract createDevice(tenant_id: string, dto: CreateDeviceDto): Promise<Device>;
  abstract updateDevice(
    tenant_id: string,
    device_id: string,
    dto: Partial<CreateDeviceDto>,
  ): Promise<Device>;
  abstract getDevice(tenant_id: string, device_id: string): Promise<Device | null>;

  // Device Events (NEW)
  abstract getDeviceEvents(tenant_id: string): Promise<DeviceEvent[]>;
  abstract createDeviceEvent(
    tenant_id: string,
    dto: CreateDeviceEventDto,
  ): Promise<DeviceEvent>;

  // Misc
  abstract getSystemHealth(tenant_id: string): Promise<SystemHealth[]>;
  abstract getProvisioningStats(tenant_id: string): Promise<any>;
  abstract getAuditLogs(tenant_id: string, request_id?: string): Promise<any[]>;
}
