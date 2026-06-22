import { TenantScope } from "../../shared/scope/tenant-scope";
import { Injectable } from "@nestjs/common";
import { CreateRequisitionDto } from "./dto/create-requisition.dto";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { CreateSupplierBranchDto } from "./dto/create-supplier-branch.dto";
import { CreateDraftPoDto } from "./dto/create-draft-po.dto";
import { ConfirmQuoteDto } from "./dto/confirm-quote.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { SignContractDto } from "./dto/sign-contract.dto";
import { ApproveFinalDto } from "./dto/approve-final.dto";
import { CreatePortalMessageDto } from "./dto/create-portal-message.dto";
import { CreateReceiptDto } from "./dto/create-receipt.dto";
import { UpsertSupplierProductDto } from "./dto/upsert-supplier-product.dto";
import { CreateRiskSignalDto } from "./dto/create-risk-signal.dto";
import { CreateProcurementCategoryDto } from "./dto/create-procurement-category.dto";
import { UpdateProcurementCategoryDto } from "./dto/update-procurement-category.dto";
import { ReleasePoDto } from "./dto/release-po.dto";
import { IProcurementRepository } from "./repositories/procurement.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { EventBusService } from "../../shared/events/event-bus.service";
import { PrismaService } from "../../persistence/prisma.service";
import { AtomicOperationService } from "../shared/atomic";

/**
 * Procurement service (Phase 2).
 *
 * Every method receives a validated {@link TenantScope} resolved by the
 * controller from the verified `TenantContext` (Requirements 2.1, 2.2, 2.5),
 * never a raw client-supplied tenant id. The actor `user_id` is passed
 * separately and is always sourced from `TenantContext.user_id` in the
 * controller (Requirement 2.10) — there is no header/`"system"` fallback at the
 * controller boundary. Scoped reads and writes are filtered by the scope's
 * `tenant_id` (and any permitted company/location/branch) in the repository.
 */
@Injectable()
export class ProcurementService {
  constructor(
    private readonly repository: IProcurementRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly atomic: AtomicOperationService,
  ) {}

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────────

  async getSuppliers(scope: TenantScope) {
    return this.repository.getSuppliers(scope);
  }

  async createSupplier(scope: TenantScope, data: CreateSupplierDto, user_id?: string) {
    const supplier = await this.repository.createSupplier(scope, data);
    await this.repository.createAuditEvent(scope, user_id || "system", "supplier.created", "SUPPLIER", supplier.id, supplier.name);
    if (user_id) {
      await this.auditService.log({ tenant_id: scope.tenant_id , user_id, module: "procurement", action: "CREATE", entity_type: "SUPPLIER", entity_id: supplier.id, metadata: { name: data.name, category: data.category } });
    }
    return supplier;
  }

  // ─── SUPPLIER BRANCHES ────────────────────────────────────────────────────────

  async getSupplierBranches(scope: TenantScope) {
    return this.repository.getSupplierBranches(scope);
  }

  async createSupplierBranch(scope: TenantScope, data: CreateSupplierBranchDto, user_id?: string) {
    const branch = await this.repository.createSupplierBranch(scope, data);
    await this.repository.createAuditEvent(scope, user_id || "system", "supplier_branch.created", "SUPPLIER_BRANCH", branch.id, branch.branchName);
    if (user_id) {
      await this.auditService.log({ tenant_id: scope.tenant_id , user_id, module: "procurement", action: "CREATE", entity_type: "SUPPLIER_BRANCH", entity_id: branch.id, metadata: { branchCode: data.branchCode, supplierId: data.supplierId } });
    }
    return branch;
  }

  // ─── SUPPLIER PRODUCTS ────────────────────────────────────────────────────────

  async getSupplierProducts(scope: TenantScope) {
    return this.repository.getSupplierProducts(scope);
  }

  async upsertSupplierProduct(scope: TenantScope, data: UpsertSupplierProductDto, user_id?: string) {
    const product = await this.repository.upsertSupplierProduct(scope, data);
    await this.repository.createAuditEvent(scope, user_id || "system", "supplier_product.upserted", "SUPPLIER_BRANCH", product.id, data.name);
    return product;
  }

  async getSupplierRecommendations(scope: TenantScope, params: any) {
    return this.repository.getSupplierRecommendations(scope, params);
  }

  // ─── CATEGORIES ───────────────────────────────────────────────────────────────

  async getCategories(scope: TenantScope) {
    return this.repository.getCategories(scope);
  }

  async upsertCategory(scope: TenantScope, user_id: string, data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto) {
    const category = await this.repository.upsertCategory(scope, data);
    await this.auditService.log({ tenant_id: scope.tenant_id ,
      user_id,
      module: "procurement",
      action: "UPSERT",
      entity_type: "PROCUREMENT_CATEGORY",
      entity_id: category.id,
      metadata: { name: (data as any).name },
    });
    return category;
  }

  async deleteCategory(scope: TenantScope, user_id: string, id: string) {
    await this.repository.deleteCategory(scope, id);
    await this.auditService.log({ tenant_id: scope.tenant_id ,
      user_id,
      module: "procurement",
      action: "DELETE",
      entity_type: "PROCUREMENT_CATEGORY",
      entity_id: id,
      metadata: {},
    });
    return { success: true };
  }

  // ─── REQUISITIONS ─────────────────────────────────────────────────────────────

  async getRequisitions(scope: TenantScope) {
    return this.repository.getRequisitions(scope);
  }

  async createRequisition(scope: TenantScope, data: CreateRequisitionDto, user_id?: string) {
    const requisition = await this.repository.createRequisition(scope, data);
    await this.repository.createAuditEvent(scope, user_id || "system", "requisition.created", "REQUISITION", requisition.id, requisition.title);
    if (user_id) {
      await this.auditService.log({ tenant_id: scope.tenant_id , user_id, module: "procurement", action: "CREATE", entity_type: "REQUISITION", entity_id: requisition.id, metadata: { title: data.title, amount: data.amount, requesterDept: data.requesterDept } });
    }
    return requisition;
  }

  /**
   * Advance a requisition through requester-HOD approval within a single
   * Atomic_Operation (Requirements 9.2, 4.6). The transition is validated
   * against the requisition's CURRENT state inside the transaction before any
   * write; an illegal transition is rejected with a 400 naming the current and
   * target state, leaving the status unchanged (Requirements 9.3, 4.7). The
   * Audit_Trail entry, the procurement audit event, and the Integration_Log
   * outbox event all enrol in the same transaction so they commit or roll back
   * together with the transition (Requirements 4.4, 6.5, 6.6).
   */
  async approveRequesterHod(scope: TenantScope, requisitionId: string, user_id?: string) {
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const requisition = await this.repository.approveRequesterHod(scope, requisitionId, tx);
      await this.repository.createAuditEvent(scope, user_id || "system", "requisition.requester_hod_approved", "REQUISITION", requisitionId, "HOD approval granted", tx);
      if (user_id) {
        await audit({ tenant_id: scope.tenant_id, user_id, module: "procurement", action: "APPROVE_HOD", entity_type: "REQUISITION", entity_id: requisitionId, after_state: { status: requisition.status } });
      }
      await outbox({ tenant_id: scope.tenant_id, type: "procurement.requisition.requester_hod_approved.v1", payload: { requisition_id: requisitionId, status: requisition.status, actor_user_id: user_id ?? null }, company_id: scope.company_id });
      return requisition;
    });
  }

  async approveFinal(scope: TenantScope, requisitionId: string, data: ApproveFinalDto, user_id?: string) {
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const requisition = await this.repository.approveFinal(scope, requisitionId, data, tx);
      await this.repository.createAuditEvent(scope, user_id || "system", `requisition.final_approved.${data.approver.toLowerCase()}`, "REQUISITION", requisitionId, `Final approval by ${data.approver}`, tx);
      if (user_id) {
        await audit({ tenant_id: scope.tenant_id, user_id, module: "procurement", action: "APPROVE_FINAL", entity_type: "REQUISITION", entity_id: requisitionId, metadata: { approver: data.approver }, after_state: { status: requisition.status } });
      }
      await outbox({ tenant_id: scope.tenant_id, type: "procurement.requisition.final_approved.v1", payload: { requisition_id: requisitionId, status: requisition.status, approver: data.approver, actor_user_id: user_id ?? null }, company_id: scope.company_id });
      return requisition;
    });
  }

  // ─── DRAFT PURCHASE ORDERS ────────────────────────────────────────────────────

  async getDraftPurchaseOrders(scope: TenantScope) {
    return this.repository.getDraftPurchaseOrders(scope);
  }

  async createDraftPurchaseOrder(scope: TenantScope, data: CreateDraftPoDto, user_id?: string) {
    const draft = await this.repository.createDraftPurchaseOrder(scope, data, user_id || "system");
    await this.repository.createAuditEvent(scope, user_id || "system", "draft_po.created", "DRAFT_PO", draft.id, `Draft PO for requisition ${data.requisitionId}`);
    if (user_id) {
      await this.auditService.log({ tenant_id: scope.tenant_id, user_id, module: "procurement", action: "CREATE", entity_type: "DRAFT_PO", entity_id: draft.id, metadata: { requisitionId: data.requisitionId, supplierId: data.supplierId } });
    }
    return draft;
  }

  async approveDraftByProcurementHod(scope: TenantScope, draftPoId: string, user_id?: string) {
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const draft = await this.repository.approveDraftByProcurementHod(scope, draftPoId, tx);
      await this.repository.createAuditEvent(scope, user_id || "system", "draft_po.procurement_hod_approved", "DRAFT_PO", draftPoId, "Procurement HOD approved draft PO", tx);
      if (user_id) {
        await audit({ tenant_id: scope.tenant_id, user_id, module: "procurement", action: "APPROVE_DRAFT_PO", entity_type: "DRAFT_PO", entity_id: draftPoId, after_state: { status: draft.status } });
      }
      await outbox({ tenant_id: scope.tenant_id, type: "procurement.draft_po.procurement_hod_approved.v1", payload: { draft_po_id: draftPoId, status: draft.status, actor_user_id: user_id ?? null }, company_id: scope.company_id });
      return draft;
    });
  }

  async confirmSupplierQuote(scope: TenantScope, draftPoId: string, data: ConfirmQuoteDto, user_id?: string) {
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const draft = await this.repository.confirmSupplierQuote(scope, draftPoId, data, tx);
      await this.repository.createAuditEvent(scope, user_id || "system", "draft_po.quote_confirmed", "DRAFT_PO", draftPoId, `Quote ref: ${data.quoteReference}`, tx);
      if (user_id) {
        await audit({ tenant_id: scope.tenant_id, user_id, module: "procurement", action: "CONFIRM_QUOTE", entity_type: "DRAFT_PO", entity_id: draftPoId, metadata: { quoteReference: data.quoteReference }, after_state: { status: draft.status } });
      }
      await outbox({ tenant_id: scope.tenant_id, type: "procurement.draft_po.quote_confirmed.v1", payload: { draft_po_id: draftPoId, status: draft.status, quote_reference: data.quoteReference ?? null, actor_user_id: user_id ?? null }, company_id: scope.company_id });
      return draft;
    });
  }

  // ─── PURCHASE ORDERS (FINAL) ──────────────────────────────────────────────────

  async releasePurchaseOrder(scope: TenantScope, data: ReleasePoDto, user_id?: string) {
    // PO release + Finance Payable_Record + audit + Integration_Log event all
    // enrol in one Atomic_Operation so they commit together or roll back
    // together; if the Payable_Record fails, the release is rolled back and the
    // PO remains pre-release (Requirements 6.3, 6.4, 9.4, 9.10).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const po = await this.repository.releasePurchaseOrder(scope, data, tx);
      await this.repository.createAuditEvent(scope, user_id || "system", "po.released", "FINAL_PO", po.id, `PO released for requisition ${data.requisitionId}`, tx);
      if (user_id) {
        await audit({ tenant_id: scope.tenant_id, user_id, module: "procurement", action: "RELEASE", entity_type: "PURCHASE_ORDER", entity_id: po.id, metadata: { requisitionId: data.requisitionId, supplierId: po.supplierId }, after_state: { status: po.status } });
      }
      await outbox({ tenant_id: scope.tenant_id, type: "procurement.po.released.v1", payload: { purchase_order_id: po.id, requisition_id: data.requisitionId, supplier_id: po.supplierId, status: po.status, actor_user_id: user_id ?? null }, company_id: scope.company_id });
      return po;
    });
  }

  async getPurchaseOrders(scope: TenantScope) {
    return this.repository.getPurchaseOrders(scope);
  }

  // ─── RECEIPTS ─────────────────────────────────────────────────────────────────

  async createReceipt(scope: TenantScope, data: CreateReceiptDto, user_id?: string) {
    // The receipt persistence, the inventory intake, and the supplier-rating
    // recalculation all enrol in ONE Atomic_Operation so all three commit or
    // none persist (Requirements 9.5, 4.1, 4.2). A receipt whose quantity
    // exceeds the outstanding ordered quantity is rejected with a 400 inside the
    // transaction before any write, leaving the database unchanged (Req 9.6).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const receipt = await this.repository.createReceipt(scope, data, user_id || "system", tx);
      await this.repository.createAuditEvent(scope, user_id || "system", "receipt.recorded", "FINAL_PO", data.finalPoId, `Goods receipt. Delivery on time: ${data.deliveryOnTime}. Issues: ${data.issueCount}`, tx);
      if (user_id) {
        await audit({ tenant_id: scope.tenant_id, user_id, module: "procurement", action: "RECORD_RECEIPT", entity_type: "GOODS_RECEIPT", entity_id: receipt.id, metadata: { finalPoId: data.finalPoId, calculatedRating: receipt.calculatedRating } });
      }
      await outbox({ tenant_id: scope.tenant_id, type: "procurement.receipt.recorded.v1", payload: { receipt_id: receipt.id, final_po_id: data.finalPoId, supplier_id: receipt.supplierId, calculated_rating: receipt.calculatedRating, actor_user_id: user_id ?? null }, company_id: scope.company_id });
      return receipt;
    });
  }

  async processReceipt(scope: TenantScope,
    finalPoId: string,
    data: {
      location_id: string;
      items: Array<{ sku: string; quantity: number; unitCost?: number }>;
      receiptType?: "FULL" | "PARTIAL";
    },
    user_id?: string,
  ) {
    // 1. Update the finalPO status
    const status = data.receiptType === "PARTIAL" ? "PARTIALLY_RECEIVED" : "RECEIVED";
    await this.prisma.procurement_final_pos.update({
      where: { id: finalPoId, tenant_id: scope.tenant_id },
      data: { status },
    });

    // 2. Emit PO_RECEIVED to trigger Inventory Intake
    await this.eventBus.publish({
      event_type: "PO_RECEIVED",
      tenant_id: scope.tenant_id,
      entity_id: finalPoId,
      entity_type: "FINAL_PO",
      source_module: "procurement",
      payload: {
        finalPoId,
        location_id: data.location_id,
        items: data.items,
        receiptType: data.receiptType || "FULL",
      },
      user_id,
    });

    // 3. Audit Log
    await this.auditService.log({
      tenant_id: scope.tenant_id,
      user_id: user_id || "system",
      module: "PROCUREMENT",
      action: "PROCUREMENT_RECEIPT",
      entity_type: "FINAL_PO",
      entity_id: finalPoId,
      metadata: {
        location_id: data.location_id,
        itemCount: data.items?.length || 0,
        receiptType: data.receiptType || "FULL",
      },
    });

    return {
      success: true,
      message: `${data.receiptType || 'FULL'} procurement receipt published`,
    };
  }

  // ─── CONTRACTS ────────────────────────────────────────────────────────────────

  async getContracts(scope: TenantScope) {
    return this.repository.getContracts(scope);
  }

  async createContract(scope: TenantScope, data: CreateContractDto, user_id?: string) {
    const contract = await this.repository.createContract(scope, data, user_id || "system");
    await this.repository.createAuditEvent(scope, user_id || "system", "contract.created", "CONTRACT", contract.id, `Contract for requisition ${data.requisitionId}`);
    if (user_id) {
      await this.auditService.log({ tenant_id: scope.tenant_id, user_id, module: "procurement", action: "CREATE", entity_type: "CONTRACT", entity_id: contract.id, metadata: { requisitionId: data.requisitionId, supplierId: data.supplierId } });
    }
    return contract;
  }

  async approveLegalContract(scope: TenantScope, contractId: string, user_id?: string) {
    // The legal-approval transition, its Audit_Trail entry, the procurement
    // audit event, and the Integration_Log outbox event all enrol in one
    // Atomic_Operation; the transition is validated against the contract's
    // current state inside the transaction (Requirement 9.7).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const contract = await this.repository.approveLegalContract(scope, contractId, tx);
      await audit({
        tenant_id: scope.tenant_id,
        user_id: user_id || "system",
        module: "PROCUREMENT",
        action: "LEGAL_CONTRACT_APPROVED",
        entity_type: "CONTRACT",
        entity_id: contractId,
        after_state: { status: contract.status },
        metadata: { approver_id: user_id, timestamp: new Date().toISOString() },
      });
      await this.repository.createAuditEvent(scope, user_id || "system", "contract.legal_approved", "CONTRACT", contractId, `Legal team approval granted by ${user_id || "system"}`, tx);
      await outbox({ tenant_id: scope.tenant_id, type: "procurement.contract.legal_approved.v1", payload: { contract_id: contractId, status: contract.status, actor_user_id: user_id ?? null }, company_id: scope.company_id });
      return contract;
    });
  }

  async recordSupplierVetting(scope: TenantScope, supplierId: string, user_id: string, results: any) {
    // Record vetting in repository (if method exists, else use prisma)
    const log = await this.auditService.log({ tenant_id: scope.tenant_id ,
      user_id,
      module: "PROCUREMENT",
      action: "SUPPLIER_VETTING_RECORDED",
      entity_type: "SUPPLIER",
      entity_id: supplierId,
      metadata: {
        vetting_results: results,
        status: results.status || "COMPLETED",
      },
    });

    await this.repository.createAuditEvent(scope, user_id, "supplier.vetting_completed", "SUPPLIER", supplierId, `Vetting status: ${results.status}`);
    return { success: true, log_id: log.id };
  }

  async signContract(scope: TenantScope, contractId: string, data: SignContractDto, user_id?: string) {
    // The signature transition, its audit event, and the Integration_Log outbox
    // event all enrol in one Atomic_Operation; the transition is validated
    // against the contract's current state inside the transaction (Req 9.7).
    return this.atomic.run(async ({ tx, audit, outbox }) => {
      const contract = await this.repository.signContract(scope, contractId, data, tx);
      await this.repository.createAuditEvent(scope, user_id || "system", `contract.signed.${data.party.toLowerCase()}`, "CONTRACT", contractId, `Signed by ${data.party}`, tx);
      if (user_id) {
        await audit({ tenant_id: scope.tenant_id, user_id, module: "PROCUREMENT", action: "SIGN_CONTRACT", entity_type: "CONTRACT", entity_id: contractId, metadata: { party: data.party }, after_state: { status: contract.status } });
      }
      await outbox({ tenant_id: scope.tenant_id, type: "procurement.contract.signed.v1", payload: { contract_id: contractId, party: data.party, status: contract.status, actor_user_id: user_id ?? null }, company_id: scope.company_id });
      return contract;
    });
  }

  // ─── RISK MANAGEMENT ──────────────────────────────────────────────────────────

  async getRiskSignals(scope: TenantScope) {
    return this.repository.getRiskSignals(scope);
  }

  async createRiskSignal(scope: TenantScope, data: CreateRiskSignalDto, user_id?: string) {
    const signal = await this.repository.createRiskSignal(scope, data);
    await this.repository.createAuditEvent(scope, user_id || "system", "risk_signal.created", "RISK_SIGNAL", signal.id, `${data.code} on entity ${data.entity_id}`);
    return signal;
  }

  async updateRiskSignalStatus(scope: TenantScope, riskSignalId: string, status: string, user_id?: string) {
    const signal = await this.repository.updateRiskSignalStatus(scope, riskSignalId, status);
    await this.repository.createAuditEvent(scope, user_id || "system", "risk_signal.status_updated", "RISK_SIGNAL", riskSignalId, `Status changed to ${status}`);
    return signal;
  }

  async runRiskScan(scope: TenantScope, user_id?: string) {
    const results = await this.repository.runRiskScan(scope);
    await this.repository.createAuditEvent(scope, user_id || "system", "risk_scan.executed", "RISK_SIGNAL", "risk-engine", `Scan found ${results.length} signals`);
    if (user_id) {
      await this.auditService.log({ tenant_id: scope.tenant_id, user_id, module: "procurement", action: "RUN_RISK_SCAN", entity_type: "SYSTEM", entity_id: "risk-engine", metadata: { signalsFound: results.length } });
    }
    return results;
  }

  // ─── PORTAL MESSAGES ──────────────────────────────────────────────────────────

  async getPortalMessages(scope: TenantScope) {
    return this.repository.getPortalMessages(scope);
  }

  async createPortalMessage(scope: TenantScope, data: CreatePortalMessageDto, user_id?: string) {
    const message = await this.repository.createPortalMessage(scope, data, user_id || "system");
    await this.repository.createAuditEvent(scope, user_id || "system", "portal_message.sent", "PORTAL", message.id, `${data.type} message to supplier ${data.supplierId}`);
    return message;
  }

  // ─── AUDIT EVENTS ─────────────────────────────────────────────────────────────

  async getAuditEvents(scope: TenantScope) {
    return this.repository.getAuditEvents(scope);
  }

  async createAuditEventDirect(scope: TenantScope, data: any, user_id?: string) {
    return this.repository.createAuditEvent(
      scope,
      data.actor_id || user_id || "system",
      data.action,
      data.entity_type,
      data.entity_id,
      data.detail || "",
    );
  }

  // ─── SPEND INSIGHTS ────────────────────────────────────────────────────────────

  async getSpendInsights(scope: TenantScope) {
    return this.repository.getSpendInsights(scope);
  }
}
