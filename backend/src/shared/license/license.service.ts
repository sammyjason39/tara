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
  async verifyLicense(tenantId: string, moduleCode: string): Promise<boolean> {
    const license = await this.prisma.moduleLicense.findUnique({
      where: {
        tenantId_moduleCode: { tenantId, moduleCode },
      },
    });

    if (!license) {
      throw new ForbiddenException(`No license found for module: ${moduleCode}`);
    }

    if (!license.isEnabled) {
      throw new ForbiddenException(`Module ${moduleCode} is disabled for this organization`);
    }

    if (license.status !== 'active') {
      throw new ForbiddenException(`License for ${moduleCode} is not active (Status: ${license.status})`);
    }

    if (license.endDate && new Date() > license.endDate) {
      throw new ForbiddenException(`License for ${moduleCode} has expired`);
    }

    return true;
  }

  /**
   * Get all active licenses for a tenant.
   */
  async getTenantLicenses(tenantId: string) {
    return this.prisma.moduleLicense.findMany({
      where: { tenantId, status: 'active' },
      include: {
        moduleDefinition: true,
      },
    });
  }

  /**
   * Get license details for a specific module.
   */
  async getLicense(tenantId: string, moduleCode: string) {
    const license = await this.prisma.moduleLicense.findUnique({
      where: {
        tenantId_moduleCode: { tenantId, moduleCode },
      },
      include: {
        moduleDefinition: true,
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
  async toggleModule(tenantId: string, moduleCode: string, enabled: boolean, userId: string) {
    const license = await this.prisma.moduleLicense.update({
      where: {
        tenantId_moduleCode: { tenantId, moduleCode },
      },
      data: {
        isEnabled: enabled,
      },
    });

    // Audit the action
    await this.prisma.moduleLicenseLog.create({
      data: {
        id: uuidv4(),
        
        licenseId: license.id,
        tenantId,
        action: enabled ? 'ENABLE_MODULE' : 'DISABLE_MODULE',
        performedBy: userId,
        notes: `Module ${moduleCode} ${enabled ? 'enabled' : 'disabled'} by user`,
      },
    });

    return license;
  }
}
