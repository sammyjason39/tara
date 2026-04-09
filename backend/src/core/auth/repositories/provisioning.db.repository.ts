import { Injectable } from "@nestjs/common";
import { IProvisioningRepository } from "./provisioning.repository.interface";
import { PrismaService } from "../../../persistence/prisma.service";
import {
  ProvisioningData,
  ProvisioningResult,
} from "../entities/company-provisioning.entity";

@Injectable()
export class ProvisioningDbRepository implements IProvisioningRepository {
  constructor(private prisma: PrismaService) {}

  async provisionTenant(data: ProvisioningData): Promise<ProvisioningResult> {
    return await this.prisma.$transaction(async (tx) => {
      // Create Company
      const company = await tx.company.create({
        data: {
        id: 'dz1ew011',
        updatedAt: new Date(),
          name: data.name,
          code: `CMP-${Date.now().toString().slice(-6)}`,
          status: "active",
          country: data.country,
          currency: data.currency,
          industry: data.industry,
        },
      });

      // Map User to Company as OWNER
      await tx.userCompany.create({
        data: {
        id: 'dv0bhsgk',
        updatedAt: new Date(),
          userId: data.userId,
          tenantId: company.id,
          role: "OWNER",
          isDefault: true,
        },
      });

      // Create HQ Location
      const location = await tx.location.create({
        data: {
        id: 'c74b543z',
        updatedAt: new Date(),
          tenantId: company.id,
          name: "Headquarters",
          code: "HQ",
          type: "headquarters",
          address: data.address,
          country: data.country,
          currency: data.currency,
        },
      });

      // Create Default Department
      const department = await tx.department.create({
        data: {
        id: '4utnd1ir',
        updatedAt: new Date(),
          tenantId: company.id,
          name: "Executive",
          code: "EXEC",
          status: "active",
        },
      });

      // Create Employee Record for the User
      await tx.employee.create({
        data: {
        id: 'xmle2x2e',
        updatedAt: new Date(),
          tenantId: company.id,
          locationId: location.id,
          departmentId: department.id,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          phone: data.user.phone,
          userId: data.userId,
          employeeCode: `EMP-${Date.now().toString().slice(-4)}`,
          position: "Owner / CEO",
          employmentType: "full_time",
          hireDate: new Date(),
          status: "active",
        },
      });

      // Enable Core Modules by Default
      const coreModules = ["finance", "hr", "it", "retail", "procurement"];
      for (const moduleKey of coreModules) {
        await tx.adminModuleStatus.create({
          data: {
        id: '2w2swik9',
        updatedAt: new Date(),
            tenantId: company.id,
            moduleKey,
            enabled: true,
            updatedBy: "system",
          },
        });
      }

      return {
        tenantId: company.id,
        companyName: company.name,
        locationId: location.id,
        departmentId: department.id,
      };
    });
  }
}
