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

      // 2. Map User to Company as OWNER (upsert to guard against duplicate provision attempts)
      await tx.user_companies.upsert({
        where: {
          tenant_id_user_id: {
            tenant_id: data.tenant_id,
            user_id: data.user_id,
          },
        },
        update: {
          company_id: company.id,
          role: "OWNER",
          is_default: true,
          updated_at: new Date(),
        },
        create: {
          id: uuidv4(),
          updated_at: new Date(),
          user_id: data.user_id,
          tenant_id: data.tenant_id,
          company_id: company.id,
          role: "OWNER",
          is_default: true,
        },
      });

      // 3. Update User record to set primary company_id
      await tx.users.update({
        where: { id: data.user_id },
        data: { company_id: company.id },
      });

      // 4. Create/Upsert HQ Location with Geodata
      const hqCode = `HQ-${company.code}`;
      const location = await tx.locations.upsert({
        where: {
          tenant_id_code: {
            tenant_id: data.tenant_id,
            code: hqCode,
          },
        },
        update: {
          company_id: company.id,
          name: `${data.name} Headquarters`,
          address: data.address,
          country: data.country,
          currency: data.currency,
          latitude: data.latitude,
          longitude: data.longitude,
          google_place_id: data.google_place_id,
          formatted_address: data.formatted_address,
          geofence_radius: data.geofence_radius || 200,
          updated_at: new Date(),
        },
        create: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: data.tenant_id,
          company_id: company.id,
          name: `${data.name} Headquarters`,
          code: hqCode,
          type: "headquarters",
          address: data.address,
          country: data.country,
          currency: data.currency,
          latitude: data.latitude,
          longitude: data.longitude,
          google_place_id: data.google_place_id,
          formatted_address: data.formatted_address,
          geofence_radius: data.geofence_radius || 200,
        },
      });

      // 5. Link HQ Location back to Company as primary
      await tx.companies.update({
        where: { id: company.id },
        data: { primary_location_id: location.id },
      });

      // Create/Upsert Default Department
      const execCode = `EXEC-${company.code}`;
      const department = await tx.departments.upsert({
        where: {
          tenant_id_code: {
            tenant_id: data.tenant_id,
            code: execCode,
          },
        },
        update: {
          company_id: company.id,
          name: "Executive",
          updated_at: new Date(),
        },
        create: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: data.tenant_id,
          company_id: company.id,
          name: "Executive",
          code: execCode,
          status: "active",
        },
      });

      // Create/Upsert Employee Record for the User
      await tx.employees.upsert({
        where: {
          tenant_id_email: {
            tenant_id: data.tenant_id,
            email: data.user.email,
          },
        },
        update: {
          company_id: company.id,
          location_id: location.id,
          department_id: department.id,
          phone: data.user.phone,
          positions: "Owner / CEO",
          updated_at: new Date(),
        },
        create: {
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

      // Enable Core Suite Modules by Default (Upsert to prevent unique constraint violation)
      const coreModules = ["finance", "hr", "it", "procurement"];
      for (const moduleKey of coreModules) {
        await tx.admin_module_statuses.upsert({
          where: {
            tenant_id_module_key: {
              tenant_id: data.tenant_id,
              module_key: moduleKey,
            },
          },
          update: {
            company_id: company.id,
            enabled: true,
            updated_at: new Date(),
          },
          create: {
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
