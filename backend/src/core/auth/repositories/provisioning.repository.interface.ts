import {
  ProvisioningData,
  ProvisioningResult,
} from "../entities/company-provisioning.entity";

export interface IProvisioningRepository {
  provisionTenant(data: ProvisioningData): Promise<ProvisioningResult>;
}

export const IProvisioningRepository = Symbol("IProvisioningRepository");
