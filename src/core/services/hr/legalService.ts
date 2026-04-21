import { apiRequest } from "@/core/api/apiClient";
import type { ContractRecord } from "@/core/hr/legal/contractTypes";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { audit } from "@/core/logging/audit";
import { workflowService } from "./workflowService";

const ensureTenantAccess = (tenantId: string, actor: SessionContext) => {
  if (actor.role === Roles.SUPERADMIN) return;
  if (actor.tenantId !== tenantId) throw new Error("Tenant access denied");
};

export const legalService = {
  async listContracts(tenantId: string, actor: SessionContext): Promise<ContractRecord[]> {
    ensureTenantAccess(tenantId, actor);
    return apiRequest<ContractRecord[]>("/v1/hr/contracts", "GET", actor);
  },

  async getComplianceCases(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    // Note: Visa tracking is still missing backend support, keeping stubs for that part
    const contracts = await apiRequest<ContractRecord[]>("/v1/hr/contracts", "GET", actor);
    return {
      contracts,
      expiringVisas: [], // Missing backend support for now
      pendingRenewals: contracts.filter((item) => item.status === "draft").length,
    };
  },

  async createContract(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<ContractRecord, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): Promise<ContractRecord> {
    ensureTenantAccess(tenantId, actor);
    const record = await apiRequest<ContractRecord>("/v1/hr/contracts", "POST", actor, payload);
    
    workflowService.createRequest(tenantId, actor, {
      entityType: "CONTRACT",
      entityId: record.id,
      makerDept: actor.departmentId,
      destinationDept: "LEGAL",
      metadata: { title: record.title },
    });
    
    audit.log({
      tenantId,
      actorId: actor.userId,
      action: "legal.contract.create",
      entityType: "contract",
      entityId: record.id,
    });
    
    return record;
  },

  async markSigned(tenantId: string, actor: SessionContext, contractId: string) {
    ensureTenantAccess(tenantId, actor);
    const record = await apiRequest<ContractRecord>(`/hr/contracts/${contractId}`, "PATCH", actor, { status: "active" });
    
    if (record) {
      audit.log({
        tenantId,
        actorId: actor.userId,
        action: "legal.contract.sign",
        entityType: "contract",
        entityId: record.id,
      });
    }
    return record;
  },

  async requestRenewal(tenantId: string, actor: SessionContext, contractId: string) {
    ensureTenantAccess(tenantId, actor);
    const record = await apiRequest<ContractRecord>(`/hr/contracts/${contractId}`, "PATCH", actor, { status: "draft" });
    
    if (record) {
      workflowService.createRequest(tenantId, actor, {
        entityType: "CONTRACT",
        entityId: contractId,
        makerDept: actor.departmentId,
        destinationDept: "LEGAL",
        metadata: { contractId },
      });
      audit.log({
        tenantId,
        actorId: actor.userId,
        action: "legal.contract.renew",
        entityType: "contract",
        entityId: contractId,
      });
    }
    return record;
  },
};

