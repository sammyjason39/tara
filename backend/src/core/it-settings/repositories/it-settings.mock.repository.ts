import { Injectable, NotFoundException } from '@nestjs/common';
import { IITSettingsRepository } from './it-settings.repository.interface';
import { Device } from '../entities/device.entity';
import { Setting } from '../entities/setting.entity';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { UpdateSettingDto } from '../dto/update-setting.dto';

@Injectable()
export class ITSettingsMockRepository extends IITSettingsRepository {
  private devices: Device[] = [];
  private settings: Setting[] = [];

  constructor() {
    super();
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Tenant 001 devices
    this.devices.push(
      {
        id: 'tenant-001-dev-1',
        tenantId: 'tenant-001',
        locationId: 'location-001',
        deviceType: 'pos',
        deviceName: 'POS Terminal 1',
        ipAddress: '192.168.1.101',
        macAddress: '00:1B:44:11:3A:B7',
        status: 'online',
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tenant-001-dev-2',
        tenantId: 'tenant-001',
        locationId: 'location-001',
        deviceType: 'biometric',
        deviceName: 'Fingerprint Scanner',
        ipAddress: '192.168.1.102',
        status: 'online',
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    // Tenant 002 devices
    this.devices.push(
      {
        id: 'tenant-002-dev-1',
        tenantId: 'tenant-002',
        locationId: 'location-002',
        deviceType: 'pos',
        deviceName: 'Store POS 1',
        ipAddress: '192.168.2.101',
        status: 'online',
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tenant-002-dev-2',
        tenantId: 'tenant-002',
        locationId: 'location-002',
        deviceType: 'pos',
        deviceName: 'Store POS 2',
        ipAddress: '192.168.2.102',
        status: 'online',
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tenant-002-dev-3',
        tenantId: 'tenant-002',
        locationId: 'location-003',
        deviceType: 'pos',
        deviceName: 'Store 2 POS',
        ipAddress: '192.168.3.101',
        status: 'offline',
        lastSeen: new Date(Date.now() - 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    // Tenant 001 settings
    this.settings.push(
      {
        id: 'tenant-001-set-1',
        tenantId: 'tenant-001',
        key: 'company.timezone',
        value: 'America/New_York',
        category: 'general',
        isPublic: true,
        description: 'Company timezone',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tenant-001-set-2',
        tenantId: 'tenant-001',
        key: 'company.currency',
        value: 'USD',
        category: 'finance',
        isPublic: true,
        description: 'Default currency',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    // Tenant 002 settings
    this.settings.push(
      {
        id: 'tenant-002-set-1',
        tenantId: 'tenant-002',
        key: 'company.timezone',
        value: 'Asia/Singapore',
        category: 'general',
        isPublic: true,
        description: 'Company timezone',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'tenant-002-set-2',
        tenantId: 'tenant-002',
        key: 'company.currency',
        value: 'SGD',
        category: 'finance',
        isPublic: true,
        description: 'Default currency',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );
    // Tenant comp-demo-a settings
    this.settings.push(
      {
        id: 'comp-demo-a-set-1',
        tenantId: 'comp-demo-a',
        key: 'company.timezone',
        value: 'Asia/Jakarta',
        category: 'general',
        isPublic: true,
        description: 'Company timezone',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    // Tenant comp-demo-a devices
    this.devices.push(
      {
        id: 'comp-demo-a-dev-1',
        tenantId: 'comp-demo-a',
        locationId: 'loc-demo-1',
        deviceType: 'pos',
        deviceName: 'HQ POS Terminal',
        ipAddress: '192.168.1.100',
        macAddress: '00:1B:44:11:3A:AA',
        status: 'online',
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  async getDevices(tenantId: string, locationId?: string): Promise<Device[]> {
    let devices = this.devices.filter(dev => dev.tenantId === tenantId);
    if (locationId) {
      devices = devices.filter(dev => dev.locationId === locationId);
    }
    return devices;
  }

  async registerDevice(tenantId: string, data: RegisterDeviceDto): Promise<Device> {
    const device: Device = {
      id: `${tenantId}-dev-${this.devices.length + 1}`,
      tenantId,
      locationId: data.locationId,
      deviceType: data.deviceType as any,
      deviceName: data.deviceName,
      ipAddress: data.ipAddress,
      macAddress: data.macAddress,
      status: 'online',
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.devices.push(device);
    return device;
  }

  async updateDeviceStatus(tenantId: string, deviceId: string, status: string): Promise<Device> {
    const index = this.devices.findIndex(dev => dev.tenantId === tenantId && dev.id === deviceId);
    if (index === -1) {
      throw new NotFoundException('Device not found');
    }
    this.devices[index].status = status as any;
    this.devices[index].lastSeen = new Date();
    this.devices[index].updatedAt = new Date();
    return this.devices[index];
  }

  async getSettings(tenantId: string, category?: string): Promise<Setting[]> {
    let settings = this.settings.filter(set => set.tenantId === tenantId);
    if (category) {
      settings = settings.filter(set => set.category === category);
    }
    return settings;
  }

  async getSetting(tenantId: string, key: string): Promise<Setting | null> {
    const setting = this.settings.find(set => set.tenantId === tenantId && set.key === key);
    return setting || null;
  }

  async updateSetting(tenantId: string, key: string, data: UpdateSettingDto): Promise<Setting> {
    const index = this.settings.findIndex(set => set.tenantId === tenantId && set.key === key);
    
    if (index === -1) {
      // Create new setting
      const setting: Setting = {
        id: `${tenantId}-set-${this.settings.length + 1}`,
        tenantId,
        key,
        value: data.value,
        category: data.category as any || 'general',
        isPublic: data.isPublic ?? true,
        description: data.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.settings.push(setting);
      return setting;
    }

    // Update existing setting
    this.settings[index] = {
      ...this.settings[index],
      value: data.value,
      category: data.category as any || this.settings[index].category,
      isPublic: data.isPublic ?? this.settings[index].isPublic,
      description: data.description || this.settings[index].description,
      updatedAt: new Date(),
    };
    return this.settings[index];
  }
}
