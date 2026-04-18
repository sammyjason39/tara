import { Injectable } from "@nestjs/common";
import { IITSettingsRepository } from "./repositories/it-settings.repository.interface";
import { Device } from "./entities/device.entity";
import { Setting } from "./entities/setting.entity";
import { RegisterDeviceDto } from "./dto/register-device.dto";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { AuditService } from "../../shared/audit/audit.service";

@Injectable()
export class ITSettingsService {
  constructor(
    private readonly repository: IITSettingsRepository,
    private readonly auditService: AuditService,
  ) {}

  async getDevices(tenant_id: string, location_id?: string): Promise<Device[]> {
    return this.repository.getDevices(tenant_id, location_id);
  }

  async registerDevice(
    tenant_id: string,
    data: RegisterDeviceDto,
    user_id?: string,
  ): Promise<Device> {
    const device = await this.repository.registerDevice(tenant_id, data);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it-settings",
        action: "REGISTER",
        entity_type: "DEVICE",
        entity_id: device.id,
        metadata: { name: data.deviceName, type: data.deviceType },
      });
    }
    return device;
  }

  async updateDeviceStatus(
    tenant_id: string,
    device_id: string,
    status: string,
    user_id?: string,
  ): Promise<Device> {
    const device = await this.repository.updateDeviceStatus(
      tenant_id,
      device_id,
      status,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it-settings",
        action: "UPDATE_STATUS",
        entity_type: "DEVICE",
        entity_id: device_id,
        metadata: { status },
      });
    }
    return device;
  }

  async getSettings(tenant_id: string, category?: string): Promise<Setting[]> {
    return this.repository.getSettings(tenant_id, category);
  }

  async getSetting(tenant_id: string, key: string): Promise<Setting | null> {
    return this.repository.getSetting(tenant_id, key);
  }

  async updateSetting(
    tenant_id: string,
    key: string,
    data: UpdateSettingDto,
    user_id?: string,
  ): Promise<Setting> {
    const setting = await this.repository.updateSetting(tenant_id, key, data);
    if (user_id) {
      await this.auditService.log({
        tenant_id,
        user_id,
        module: "it-settings",
        action: "UPDATE",
        entity_type: "SETTING",
        entity_id: key,
        metadata: { value: data.value, category: data.category },
      });
    }
    return setting;
  }
}
