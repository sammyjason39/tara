import { CreateProvisioningRequestDto } from '../dto/create-provisioning-request.dto';
import { ProvisioningRequest } from '../entities/provisioning-request.entity';
import { SystemHealth } from '../entities/system-health.entity';

export abstract class IITRepository {
  abstract getProvisioningRequests(tenantId: string): Promise<ProvisioningRequest[]>;
  abstract createProvisioningRequest(
    tenantId: string,
    dto: CreateProvisioningRequestDto,
  ): Promise<ProvisioningRequest>;
  abstract markProvisioned(
    tenantId: string,
    requestId: string,
    provisionedBy: string,
  ): Promise<ProvisioningRequest>;
  abstract getSystemHealth(tenantId: string): Promise<SystemHealth[]>;
}

