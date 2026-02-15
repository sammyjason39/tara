import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProvisioningRequestDto } from '../dto/create-provisioning-request.dto';
import { ProvisioningRequest } from '../entities/provisioning-request.entity';
import { SystemHealth } from '../entities/system-health.entity';
import { IITRepository } from './it.repository.interface';

@Injectable()
export class ITMockRepository extends IITRepository {
  private readonly provisioningRequests: ProvisioningRequest[] = [];
  private readonly healthChecks: SystemHealth[] = [];

  constructor() {
    super();
    this.seed('tenant-001');
    this.seed('tenant-002');
  }

  private seed(tenantId: string): void {
    this.provisioningRequests.push({
      id: `${tenantId}-prov-1`,
      tenantId,
      supplierId: `${tenantId}-supplier-1`,
      supplierBranchId: `${tenantId}-supplier-1-jkt`,
      scope: 'full_portal',
      reason: 'Initial supplier onboarding',
      status: 'requested',
      requestedBy: 'procurement-admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.healthChecks.push(
      {
        id: `${tenantId}-health-1`,
        tenantId,
        component: 'identity',
        status: 'healthy',
        latencyMs: 42,
        checkedAt: new Date(),
      },
      {
        id: `${tenantId}-health-2`,
        tenantId,
        component: 'database',
        status: 'healthy',
        latencyMs: 55,
        checkedAt: new Date(),
      },
      {
        id: `${tenantId}-health-3`,
        tenantId,
        component: 'integrations',
        status: 'degraded',
        latencyMs: 210,
        checkedAt: new Date(),
      },
    );
  }

  async getProvisioningRequests(tenantId: string): Promise<ProvisioningRequest[]> {
    return this.provisioningRequests.filter((item) => item.tenantId === tenantId);
  }

  async createProvisioningRequest(
    tenantId: string,
    dto: CreateProvisioningRequestDto,
  ): Promise<ProvisioningRequest> {
    const created: ProvisioningRequest = {
      id: `${tenantId}-prov-${this.provisioningRequests.length + 1}`,
      tenantId,
      supplierId: dto.supplierId,
      supplierBranchId: dto.supplierBranchId,
      scope: dto.scope,
      reason: dto.reason,
      status: 'requested',
      requestedBy: dto.requestedBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.provisioningRequests.push(created);
    return created;
  }

  async markProvisioned(
    tenantId: string,
    requestId: string,
    provisionedBy: string,
  ): Promise<ProvisioningRequest> {
    const request = this.provisioningRequests.find(
      (item) => item.tenantId === tenantId && item.id === requestId,
    );
    if (!request) throw new NotFoundException('Provisioning request not found.');
    request.status = 'provisioned';
    request.provisionedBy = provisionedBy;
    request.updatedAt = new Date();
    return request;
  }

  async getSystemHealth(tenantId: string): Promise<SystemHealth[]> {
    return this.healthChecks.filter((item) => item.tenantId === tenantId);
  }
}

