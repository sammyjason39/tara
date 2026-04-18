import { Device } from "../entities/device.entity";
import { Setting } from "../entities/setting.entity";
import { RegisterDeviceDto } from "../dto/register-device.dto";
import { UpdateSettingDto } from "../dto/update-setting.dto";

export abstract class IITSettingsRepository {
  abstract getDevices(tenant_id: string, location_id?: string): Promise<Device[]>;
  abstract registerDevice(
    tenant_id: string,
    data: RegisterDeviceDto,
  ): Promise<Device>;
  abstract updateDeviceStatus(
    tenant_id: string,
    device_id: string,
    status: string,
  ): Promise<Device>;
  abstract getSettings(tenant_id: string, category?: string): Promise<Setting[]>;
  abstract getSetting(tenant_id: string, key: string): Promise<Setting | null>;
  abstract updateSetting(
    tenant_id: string,
    key: string,
    data: UpdateSettingDto,
  ): Promise<Setting>;
}
