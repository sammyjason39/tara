import { v4 as uuidv4 } from 'uuid';
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class LicenseService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify if a tenant has an active and enabled license for a module.
   * Throws ForbiddenException if license is missing, disabled, or expired.
   */
  async verifyLicense(tenant_id: string, moduleCode: string): Promise<boolean> {
    const license = await this.prisma.module_licenses.findUnique({
      where: {
        tenant_id_module_code: { tenant_id: tenant_id, module_code: moduleCode },
      },
    });

    if (!license) {
      throw new ForbiddenException(`No license found for module: ${moduleCode}`);
    }

    if (!license.is_enabled) {
      throw new ForbiddenException(`Module ${moduleCode} is disabled for this organization`);
    }

    if (license.status !== 'active') {
      throw new ForbiddenException(`License for ${moduleCode} is not active (Status: ${license.status})`);
    }

    if (license.end_date && new Date() > license.end_date) {
      throw new ForbiddenException(`License for ${moduleCode} has expired`);
    }

    return true;
  }

  /**
   * Get all active licenses for a tenant.
   */
  async getTenantLicenses(tenant_id: string) {
    return this.prisma.module_licenses.findMany({
      where: { tenant_id: tenant_id, status: 'active' },
      include: {
        module_definitions: true,
      },
    });
  }

  /**
   * Get active licenses for a tenant with pagination.
   */
  async getTenantLicensesPaginated(tenant_id: string, pagination: { page: number; pageSize: number }) {
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [data, totalCount] = await Promise.all([
      this.prisma.module_licenses.findMany({
        where: { tenant_id: tenant_id, status: 'active' },
        include: { module_definitions: true },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.module_licenses.count({
        where: { tenant_id: tenant_id, status: 'active' },
      }),
    ]);

    return {
      data,
      totalCount,
      currentPage: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    };
  }

  /**
   * Get license details for a specific module.
   */
  async getLicense(tenant_id: string, moduleCode: string) {
    const license = await this.prisma.module_licenses.findUnique({
      where: {
        tenant_id_module_code: { tenant_id: tenant_id, module_code: moduleCode },
      },
      include: {
        module_definitions: true,
      },
    });

    if (!license) {
      throw new NotFoundException(`License not found for module: ${moduleCode}`);
    }

    return license;
  }

  /**
   * Toggle a module's enabled status.
   */
  async toggleModule(tenant_id: string, moduleCode: string, enabled: boolean, user_id: string) {
    const license = await this.prisma.module_licenses.update({
      where: {
        tenant_id_module_code: { tenant_id: tenant_id, module_code: moduleCode },
      },
      data: {
        is_enabled: enabled,
      },
    });

    // Audit the action
    await this.prisma.module_license_logs.create({
      data: {
          updated_at: new Date(),
        id: uuidv4(),
        
        license_id: license.id,
        tenant_id: tenant_id,
        action: enabled ? 'ENABLE_MODULE' : 'DISABLE_MODULE',
        performed_by: user_id,
        notes: `Module ${moduleCode} ${enabled ? 'enabled' : 'disabled'} by user`,
      },
    });

    return license;
  }
}
