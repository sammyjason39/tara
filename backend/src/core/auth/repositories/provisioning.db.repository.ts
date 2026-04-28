import { TenantContext } from "../../../gateway/tenant-context.interface";
import { MultiTenancyUtil } from "../../../shared/utils/multi-tenancy.util";
import { Injectable } from "@nestjs/common";
import { IProvisioningRepository } from "./provisioning.repository.interface";
import { PrismaService } from "../../../persistence/prisma.service";
import {
  ProvisioningData,
  ProvisioningResult,
} from "../entities/company-provisioning.entity";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class ProvisioningDbRepository implements IProvisioningRepository {
  constructor(private prisma: PrismaService) {}

  async provisionTenant(data: ProvisioningData): Promise<ProvisioningResult> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create Company linked to the EXISTING tenant
      const company = await tx.companies.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          name: data.name,
          tenant_id: data.tenant_id,
          code: `CMP-${Date.now().toString().slice(-6)}`,
          status: "active",
          country: data.country,
          currency: data.currency,
          industry: data.industry,
        },
      });

      // 2. Map User to Company as OWNER
      await tx.user_companies.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          user_id: data.user_id,
          tenant_id: data.tenant_id,
          company_id: company.id,
          role: "OWNER",
          is_default: true,
        },
      });

      // Create HQ Location
      const location = await tx.locations.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: data.tenant_id,
          company_id: company.id,
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
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: data.tenant_id,
          company_id: company.id,
          name: "Executive",
          code: "EXEC",
          status: "active",
        },
      });

      // Create Employee Record for the User
      await tx.employees.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: data.tenant_id,
          company_id: company.id,
          location_id: location.id,
          department_id: department.id,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          email: data.user.email,
          phone: data.user.phone,
          user_id: data.user_id,
          employee_code: `EMP-${Date.now().toString().slice(-4)}`,
          positions: "Owner / CEO",
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
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id: data.tenant_id,
            company_id: company.id,
            module_key: moduleKey,
            enabled: true,
            updated_by: "system",
          },
        });
      }

      return {
        tenant_id: data.tenant_id,
        company_name: company.name,
        location_id: location.id,
        department_id: department.id,
      };
    });
  }
}
