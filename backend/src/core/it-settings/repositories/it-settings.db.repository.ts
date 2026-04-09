import { Injectable, NotFoundException } from "@nestjs/common";
import { ItDevice as PrismaDevice, ItSettings as PrismaITSetting } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../../persistence/prisma.service";
import { RegisterDeviceDto } from "../dto/register-device.dto";
import { UpdateSettingDto } from "../dto/update-setting.dto";
import { Device } from "../entities/device.entity";
import { Setting } from "../entities/setting.entity";
import { IITSettingsRepository } from "./it-settings.repository.interface";

@Injectable()
export class ITSettingsDbRepository extends IITSettingsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getDevices(tenantId: string, locationId?: string): Promise<Device[]> {
    const devices = await this.prisma.itDevice.findMany({
      where: {
        tenantId: tenantId,
        ...(locationId ? { locationId } : {}),
      },
    });

    return devices.map((d: PrismaDevice) => ({
      id: d.id,
      tenantId: d.tenantId,
      locationId: d.locationId || "",
      deviceType: d.type as any,
      deviceName: d.name,
      ipAddress: (d.metadata as any)?.ipAddress || undefined,
      macAddress: (d.metadata as any)?.macAddress || undefined,
      status: d.status.toLowerCase() as any,
      lastSeen: d.createdAt, // d.updatedAt might be better, but d.createdAt is safe
      metadata: (d.metadata as any) || {},
      createdAt: d.createdAt,
      updatedAt: d.createdAt,
    }));
  }

  async registerDevice(
    tenantId: string,
    data: RegisterDeviceDto,
  ): Promise<Device> {
    const created = await this.prisma.itDevice.create({
      data: {
        id: uuidv4(),

        tenantId: tenantId,
        locationId: data.locationId,
        type: data.deviceType,
        name: data.deviceName,
        connection: "LAN",
        status: "ONLINE",
        metadata: {
          ipAddress: data.ipAddress,
          macAddress: data.macAddress,
        },
      },
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      locationId: created.locationId || "",
      deviceType: created.type as any,
      deviceName: created.name,
      ipAddress: (created.metadata as any)?.ipAddress || undefined,
      macAddress: (created.metadata as any)?.macAddress || undefined,
      status: "online",
      lastSeen: created.createdAt,
      metadata: (created.metadata as any) || {},
      createdAt: created.createdAt,
      updatedAt: created.createdAt,
    };
  }

  async updateDeviceStatus(
    tenantId: string,
    deviceId: string,
    status: string,
  ): Promise<Device> {
    const updated = await this.prisma.itDevice.update({
      where: { id: deviceId, tenantId: tenantId },
      data: { status },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      locationId: updated.locationId || "",
      deviceType: updated.type as any,
      deviceName: updated.name,
      ipAddress: (updated.metadata as any)?.ipAddress || undefined,
      macAddress: (updated.metadata as any)?.macAddress || undefined,
      status: updated.status.toLowerCase() as any,
      lastSeen: updated.createdAt,
      metadata: (updated.metadata as any) || {},
      createdAt: updated.createdAt,
      updatedAt: updated.createdAt,
    };
  }

  async getSettings(tenantId: string, category?: string): Promise<Setting[]> {
    const settings = await this.prisma.itSettings.findMany({
      where: {
        tenantId: tenantId,
        ...(category ? { category } : {}),
      },
    });

    return settings.map((s: PrismaITSetting) => ({
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
    const setting = await this.prisma.itSettings.findUnique({
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

  async updateSetting(
    tenantId: string,
    key: string,
    data: UpdateSettingDto,
  ): Promise<Setting> {
    const updated = await this.prisma.itSettings.upsert({
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
        category: data.category || "general",
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
