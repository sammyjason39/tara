import { Injectable, NotFoundException } from '@nestjs/common';
import { ITDevice, ITSetting } from '@prisma/client';
import { PrismaService } from '../../../persistence/prisma.service';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { UpdateSettingDto } from '../dto/update-setting.dto';
import { Device } from '../entities/device.entity';
import { Setting } from '../entities/setting.entity';
import { IITSettingsRepository } from './it-settings.repository.interface';

@Injectable()
export class ITSettingsDbRepository extends IITSettingsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getDevices(tenantId: string, locationId?: string): Promise<Device[]> {
    const devices = await this.prisma.iTDevice.findMany({
      where: {
        tenantId: tenantId,
        ...(locationId ? { locationId } : {}),
      },
    });

    return devices.map((d: ITDevice) => ({
      id: d.id,
      tenantId: d.tenantId,
      locationId: d.locationId || '',
      deviceType: d.deviceType as any,
      deviceName: d.deviceName,
      ipAddress: d.ipAddress || undefined,
      macAddress: d.macAddress || undefined,
      status: d.status.toLowerCase() as any,
      lastSeen: d.lastSeen,
      metadata: (d.metadata as any) || {},
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async registerDevice(tenantId: string, data: RegisterDeviceDto): Promise<Device> {
    const created = await this.prisma.iTDevice.create({
      data: {
        tenantId: tenantId,
        locationId: data.locationId,
        deviceType: data.deviceType,
        deviceName: data.deviceName,
        ipAddress: data.ipAddress,
        macAddress: data.macAddress,
        status: 'active',
        lastSeen: new Date(),
      },
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      locationId: created.locationId || '',
      deviceType: created.deviceType as any,
      deviceName: created.deviceName,
      ipAddress: created.ipAddress || undefined,
      macAddress: created.macAddress || undefined,
      status: 'online',
      lastSeen: created.lastSeen,
      metadata: (created.metadata as any) || {},
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async updateDeviceStatus(tenantId: string, deviceId: string, status: string): Promise<Device> {
    const updated = await this.prisma.iTDevice.update({
      where: { id: deviceId, tenantId: tenantId },
      data: { status, lastSeen: new Date() },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      locationId: updated.locationId || '',
      deviceType: updated.deviceType as any,
      deviceName: updated.deviceName,
      ipAddress: updated.ipAddress || undefined,
      macAddress: updated.macAddress || undefined,
      status: updated.status.toLowerCase() as any,
      lastSeen: updated.lastSeen,
      metadata: (updated.metadata as any) || {},
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async getSettings(tenantId: string, category?: string): Promise<Setting[]> {
    const settings = await this.prisma.iTSetting.findMany({
      where: {
        tenantId: tenantId,
        ...(category ? { category } : {}),
      },
    });

    return settings.map((s: ITSetting) => ({
      id: s.id,
      tenantId: s.tenantId,
      key: s.key,
      value: s.value,
      category: s.category as any,
      isPublic: s.isPublic,
      description: s.description || undefined,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async getSetting(tenantId: string, key: string): Promise<Setting | null> {
    const setting = await this.prisma.iTSetting.findUnique({
      where: { tenantId_key: { tenantId: tenantId, key } },
    });

    if (!setting) return null;

    return {
      id: setting.id,
      tenantId: setting.tenantId,
      key: setting.key,
      value: setting.value,
      category: setting.category as any,
      isPublic: setting.isPublic,
      description: setting.description || undefined,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }

  async updateSetting(tenantId: string, key: string, data: UpdateSettingDto): Promise<Setting> {
    const updated = await this.prisma.iTSetting.upsert({
      where: { tenantId_key: { tenantId: tenantId, key } },
      update: {
        value: data.value,
        category: data.category,
        isPublic: data.isPublic,
        description: data.description,
      },
      create: {
        tenantId: tenantId,
        key,
        value: data.value,
        category: data.category || 'general',
        isPublic: data.isPublic || false,
        description: data.description,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      key: updated.key,
      value: updated.value,
      category: updated.category as any,
      isPublic: updated.isPublic,
      description: updated.description || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
