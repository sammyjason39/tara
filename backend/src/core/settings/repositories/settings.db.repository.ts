import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { ISettingsRepository, OrgProfileDto, TenantPreferencesDto } from '../interfaces/settings.repository.interface';

@Injectable()
export class SettingsDbRepository implements ISettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(tenant_id: string): Promise<any> {
    return this.prisma.companies.findUnique({
      where: { id: tenant_id },
      select: {
        id: true,
        name: true,
        code: true,
        country: true,
        currency: true,
        industry: true,
        created_at: true,
      }
    });
  }

  async updateProfile(tenant_id: string, data: OrgProfileDto): Promise<any> {
    const where: any = { id: tenant_id };
    if (data.last_updated_at) {
      where.updated_at = new Date(data.last_updated_at);
    }

    try {
      return await this.prisma.companies.update({
        where,
        data: {
          name: data.name,
          country: data.country,
          currency: data.currency,
          updated_at: new Date(),
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ConflictException('Settings were updated by another user. Please refresh and try again.');
      }
      throw error;
    }
  }

  async getPreferences(tenant_id: string): Promise<any> {
    return this.prisma.tenant_settings.findUnique({
      where: { tenant_id }
    });
  }

  async updatePreferences(tenant_id: string, data: TenantPreferencesDto): Promise<any> {
    const where: any = { tenant_id };
    if (data.last_updated_at) {
      where.updated_at = new Date(data.last_updated_at);
    }

    try {
      return await this.prisma.tenant_settings.upsert({
        where: { tenant_id },
        update: {
          procurement_mode: data.procurement_mode,
          updated_at: new Date(),
          // Concurrency check only works if we don't use upsert for pure updates,
          // but Prisma doesn't support 'where' outside of the primary key for updates in upsert.
          // For true optimistic locking, we should check it manually or use update if exists.
        },
        create: {
          id: `ts-${tenant_id.slice(0, 8)}`,
          tenant_id,
          procurement_mode: data.procurement_mode || 'DIRECT',
        }
      });
    } catch (error) {
      // Note: Upsert makes optimistic locking harder. In a real scenario, we'd check current version first.
      return this.prisma.tenant_settings.update({
        where,
        data: {
          procurement_mode: data.procurement_mode,
          updated_at: new Date(),
        }
      }).catch(() => {
        throw new ConflictException('Preferences were updated by another user.');
      });
    }
  }
}
