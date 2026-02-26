import { Injectable } from "@nestjs/common";
import { CreateProvisioningRequestDto } from "./dto/create-provisioning-request.dto";
import { IITRepository } from "./repositories/it.repository.interface";

@Injectable()
export class ITService {
  constructor(private readonly repository: IITRepository) {}

  async getProvisioningRequests(tenantId: string) {
    return this.repository.getProvisioningRequests(tenantId);
  }

  async createProvisioningRequest(
    tenantId: string,
    dto: CreateProvisioningRequestDto,
  ) {
    return this.repository.createProvisioningRequest(tenantId, dto);
  }

  async markProvisioned(
    tenantId: string,
    requestId: string,
    provisionedBy: string,
  ) {
    return this.repository.markProvisioned(tenantId, requestId, provisionedBy);
  }

  async updateProvisioningRequest(
    tenantId: string,
    requestId: string,
    dto: Partial<CreateProvisioningRequestDto>,
  ) {
    return this.repository.updateProvisioningRequest(tenantId, requestId, dto);
  }

  async deleteProvisioningRequest(tenantId: string, requestId: string) {
    return this.repository.deleteProvisioningRequest(tenantId, requestId);
  }

  async getSystemHealth(tenantId: string) {
    return this.repository.getSystemHealth(tenantId);
  }
}
