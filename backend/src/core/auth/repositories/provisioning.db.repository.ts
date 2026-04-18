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
      const company = await tx.companies.create({
        data: {
        id: 'dz1ew011',
        updated_at: new Date(),
          name: data.name,
          code: `CMP-${Date.now().toString().slice(-6)}`,
          status: "active",
          country: data.country,
          currency: data.currency,
          industry: data.industry,
        },
      });

      // Map User to Company as OWNER
      await tx.user_companies.create({
        data: {
        id: 'dv0bhsgk',
        updated_at: new Date(),
          user_id: data.user_id,
          tenant_id: company.id,
          role: "OWNER",
          is_default: true,
        },
      });

      // Create HQ Location
      const location = await tx.locations.create({
        data: {
        id: 'c74b543z',
        updated_at: new Date(),
          tenant_id: company.id,
          name: "Headquarters",
          code: "HQ",
          type: "headquarters",
          address: data.address,
          country: data.country,
          currency: data.currency,
        },
      });

      // Create Default Department
      const department = await tx.departments.create({
        data: {
        id: '4utnd1ir',
        updated_at: new Date(),
          tenant_id: company.id,
          name: "Executive",
          code: "EXEC",
          status: "active",
        },
      });

      // Create Employee Record for the User
      await tx.employees.create({
        data: {
        id: 'xmle2x2e',
        updated_at: new Date(),
          tenant_id: company.id,
          location_id: location.id,
          department_id: department.id,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          email: data.user.email,
          phone: data.user.phone,
          user_id: data.user_id,
          employee_code: `EMP-${Date.now().toString().slice(-4)}`,
          position: "Owner / CEO",
          employment_type: "full_time",
          hire_date: new Date(),
          status: "active",
        },
      });

      // Enable Core Modules by Default
      const coreModules = ["finance", "hr", "it", "retail", "procurement"];
      for (const moduleKey of coreModules) {
        await tx.admin_module_statuses.create({
          data: {
        id: '2w2swik9',
        updated_at: new Date(),
            tenant_id: company.id,
            module_key: moduleKey,
            enabled: true,
            updated_by: "system",
          },
        });
      }

      return {
        tenant_id: company.id,
        company_name: company.name,
        location_id: location.id,
        departmentId: department.id,
      };
    });
  }
}
