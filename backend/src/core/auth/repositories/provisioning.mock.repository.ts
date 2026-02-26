import { Injectable } from "@nestjs/common";
import { IProvisioningRepository } from "./provisioning.repository.interface";
import {
  ProvisioningData,
  ProvisioningResult,
} from "../entities/company-provisioning.entity";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class ProvisioningMockRepository implements IProvisioningRepository {
  async provisionTenant(data: ProvisioningData): Promise<ProvisioningResult> {
    console.log("[MockProvisioning] Provisioning tenant for:", data.name);

    return {
      tenantId: uuidv4(),
      companyName: data.name,
      locationId: uuidv4(),
      departmentId: uuidv4(),
    };
  }
}
