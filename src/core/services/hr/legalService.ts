import { listContracts as listLegalContracts, createContract, updateContract } from "@/core/hr/legal/contractRegistry";
import { getExpiringVisas } from "@/core/hr/legal/visaTracker";
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
  listContracts(tenantId: string, actor: SessionContext): ContractRecord[] {
    ensureTenantAccess(tenantId, actor);
    return listLegalContracts(tenantId);
  },

  getComplianceCases(tenantId: string, actor: SessionContext) {
    ensureTenantAccess(tenantId, actor);
    const contracts = listLegalContracts(tenantId);
    const expiringVisas = getExpiringVisas(tenantId, 30);
    return {
      contracts,
      expiringVisas,
      pendingRenewals: contracts.filter((item) => item.status === "draft").length,
    };
  },

  createContract(
    tenantId: string,
    actor: SessionContext,
    payload: Omit<ContractRecord, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ) {
    ensureTenantAccess(tenantId, actor);
    const record = createContract(tenantId, payload);
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

  markSigned(tenantId: string, actor: SessionContext, contractId: string) {
    ensureTenantAccess(tenantId, actor);
    const record = updateContract(tenantId, contractId, { status: "active" });
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

  requestRenewal(tenantId: string, actor: SessionContext, contractId: string) {
    ensureTenantAccess(tenantId, actor);
    const record = updateContract(tenantId, contractId, { status: "draft" });
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
