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

@Injectable()
export class ProcurementService {
  constructor(
    private readonly repository: IProcurementRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────────

  async getSuppliers(tenant_id: string) {
    return this.repository.getSuppliers(tenant_id);
  }

  async createSupplier(tenant_id: string, data: CreateSupplierDto, user_id?: string) {
    const supplier = await this.repository.createSupplier(tenant_id, data);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "supplier.created", "SUPPLIER", supplier.id, supplier.name);
    if (user_id) {
      await this.auditService.log({ tenant_id, user_id, module: "procurement", action: "CREATE", entity_type: "SUPPLIER", entity_id: supplier.id, metadata: { name: data.name, category: data.category } });
    }
    return supplier;
  }

  // ─── SUPPLIER BRANCHES ────────────────────────────────────────────────────────

  async getSupplierBranches(tenant_id: string) {
    return this.repository.getSupplierBranches(tenant_id);
  }

  async createSupplierBranch(tenant_id: string, data: CreateSupplierBranchDto, user_id?: string) {
    const branch = await this.repository.createSupplierBranch(tenant_id, data);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "supplier_branch.created", "SUPPLIER_BRANCH", branch.id, branch.branchName);
    if (user_id) {
      await this.auditService.log({ tenant_id, user_id, module: "procurement", action: "CREATE", entity_type: "SUPPLIER_BRANCH", entity_id: branch.id, metadata: { branchCode: data.branchCode, supplierId: data.supplierId } });
    }
    return branch;
  }

  // ─── SUPPLIER PRODUCTS ────────────────────────────────────────────────────────

  async getSupplierProducts(tenant_id: string) {
    return this.repository.getSupplierProducts(tenant_id);
  }

  async upsertSupplierProduct(tenant_id: string, data: UpsertSupplierProductDto, user_id?: string) {
    const product = await this.repository.upsertSupplierProduct(tenant_id, data);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "supplier_product.upserted", "SUPPLIER_BRANCH", product.id, data.name);
    return product;
  }

  async getSupplierRecommendations(tenant_id: string, params: any) {
    return this.repository.getSupplierRecommendations(tenant_id, params);
  }

  // ─── CATEGORIES ───────────────────────────────────────────────────────────────

  async getCategories(tenant_id: string) {
    return this.repository.getCategories(tenant_id);
  }

  async upsertCategory(tenant_id: string, user_id: string, data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto) {
    const category = await this.repository.upsertCategory(tenant_id, data);
    await this.auditService.log({
      tenant_id,
      user_id,
      module: "procurement",
      action: "UPSERT",
      entity_type: "PROCUREMENT_CATEGORY",
      entity_id: category.id,
      metadata: { name: (data as any).name },
    });
    return category;
  }

  async deleteCategory(tenant_id: string, user_id: string, id: string) {
    await this.repository.deleteCategory(tenant_id, id);
    await this.auditService.log({
      tenant_id,
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

  async getRequisitions(tenant_id: string) {
    return this.repository.getRequisitions(tenant_id);
  }

  async createRequisition(tenant_id: string, data: CreateRequisitionDto, user_id?: string) {
    const requisition = await this.repository.createRequisition(tenant_id, data);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "requisition.created", "REQUISITION", requisition.id, requisition.title);
    if (user_id) {
      await this.auditService.log({ tenant_id, user_id, module: "procurement", action: "CREATE", entity_type: "REQUISITION", entity_id: requisition.id, metadata: { title: data.title, amount: data.amount, requesterDept: data.requesterDept } });
    }
    return requisition;
  }

  async approveRequesterHod(tenant_id: string, requisitionId: string, user_id?: string) {
    const requisition = await this.repository.approveRequesterHod(tenant_id, requisitionId);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "requisition.requester_hod_approved", "REQUISITION", requisitionId, "HOD approval granted");
    if (user_id) {
      await this.auditService.log({ tenant_id, user_id, module: "procurement", action: "APPROVE_HOD", entity_type: "REQUISITION", entity_id: requisitionId });
    }
    return requisition;
  }

  async approveFinal(tenant_id: string, requisitionId: string, data: ApproveFinalDto, user_id?: string) {
    const requisition = await this.repository.approveFinal(tenant_id, requisitionId, data);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", `requisition.final_approved.${data.approver.toLowerCase()}`, "REQUISITION", requisitionId, `Final approval by ${data.approver}`);
    return requisition;
  }

  // ─── DRAFT PURCHASE ORDERS ────────────────────────────────────────────────────

  async getDraftPurchaseOrders(tenant_id: string) {
    return this.repository.getDraftPurchaseOrders(tenant_id);
  }

  async createDraftPurchaseOrder(tenant_id: string, data: CreateDraftPoDto, user_id?: string) {
    const draft = await this.repository.createDraftPurchaseOrder(tenant_id, data, user_id || "system");
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "draft_po.created", "DRAFT_PO", draft.id, `Draft PO for requisition ${data.requisitionId}`);
    if (user_id) {
      await this.auditService.log({ tenant_id, user_id, module: "procurement", action: "CREATE", entity_type: "DRAFT_PO", entity_id: draft.id, metadata: { requisitionId: data.requisitionId, supplierId: data.supplierId } });
    }
    return draft;
  }

  async approveDraftByProcurementHod(tenant_id: string, draftPoId: string, user_id?: string) {
    const draft = await this.repository.approveDraftByProcurementHod(tenant_id, draftPoId);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "draft_po.procurement_hod_approved", "DRAFT_PO", draftPoId, "Procurement HOD approved draft PO");
    return draft;
  }

  async confirmSupplierQuote(tenant_id: string, draftPoId: string, data: ConfirmQuoteDto, user_id?: string) {
    const draft = await this.repository.confirmSupplierQuote(tenant_id, draftPoId, data);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "draft_po.quote_confirmed", "DRAFT_PO", draftPoId, `Quote ref: ${data.quoteReference}`);
    return draft;
  }

  // ─── PURCHASE ORDERS (FINAL) ──────────────────────────────────────────────────

  async releasePurchaseOrder(tenant_id: string, data: ReleasePoDto, user_id?: string) {
    const po = await this.repository.releasePurchaseOrder(tenant_id, data);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "po.released", "FINAL_PO", po.id, `PO released for requisition ${data.requisitionId}`);
    if (user_id) {
      await this.auditService.log({ tenant_id, user_id, module: "procurement", action: "RELEASE", entity_type: "PURCHASE_ORDER", entity_id: po.id, metadata: { requisitionId: data.requisitionId, supplierId: po.supplierId } });
    }
    return po;
  }

  async getPurchaseOrders(tenant_id: string) {
    return this.repository.getPurchaseOrders(tenant_id);
  }

  // ─── RECEIPTS ─────────────────────────────────────────────────────────────────

  async createReceipt(tenant_id: string, data: CreateReceiptDto, user_id?: string) {
    const receipt = await this.repository.createReceipt(tenant_id, data, user_id || "system");
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "receipt.recorded", "FINAL_PO", data.finalPoId, `Goods receipt. Delivery on time: ${data.deliveryOnTime}. Issues: ${data.issueCount}`);
    return receipt;
  }

  async processReceipt(
    tenant_id: string,
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
      where: { id: finalPoId, tenant_id: tenant_id },
      data: { status },
    });

    // 2. Emit PO_RECEIVED to trigger Inventory Intake
    await this.eventBus.publish({
      event_type: "PO_RECEIVED",
      tenant_id: tenant_id,
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
      tenant_id,
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

  async getContracts(tenant_id: string) {
    return this.repository.getContracts(tenant_id);
  }

  async createContract(tenant_id: string, data: CreateContractDto, user_id?: string) {
    const contract = await this.repository.createContract(tenant_id, data, user_id || "system");
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "contract.created", "CONTRACT", contract.id, `Contract for requisition ${data.requisitionId}`);
    if (user_id) {
      await this.auditService.log({ tenant_id, user_id, module: "procurement", action: "CREATE", entity_type: "CONTRACT", entity_id: contract.id, metadata: { requisitionId: data.requisitionId, supplierId: data.supplierId } });
    }
    return contract;
  }

  async approveLegalContract(tenant_id: string, contractId: string, user_id?: string) {
    const contract = await this.repository.approveLegalContract(tenant_id, contractId);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "contract.legal_approved", "CONTRACT", contractId, "Legal team approved the contract");
    return contract;
  }

  async signContract(tenant_id: string, contractId: string, data: SignContractDto, user_id?: string) {
    const contract = await this.repository.signContract(tenant_id, contractId, data);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", `contract.signed.${data.party.toLowerCase()}`, "CONTRACT", contractId, `Signed by ${data.party}`);
    return contract;
  }

  // ─── RISK MANAGEMENT ──────────────────────────────────────────────────────────

  async getRiskSignals(tenant_id: string) {
    return this.repository.getRiskSignals(tenant_id);
  }

  async createRiskSignal(tenant_id: string, data: CreateRiskSignalDto, user_id?: string) {
    const signal = await this.repository.createRiskSignal(tenant_id, data);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "risk_signal.created", "RISK_SIGNAL", signal.id, `${data.code} on entity ${data.entity_id}`);
    return signal;
  }

  async updateRiskSignalStatus(tenant_id: string, riskSignalId: string, status: string, user_id?: string) {
    const signal = await this.repository.updateRiskSignalStatus(tenant_id, riskSignalId, status);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "risk_signal.status_updated", "RISK_SIGNAL", riskSignalId, `Status changed to ${status}`);
    return signal;
  }

  async runRiskScan(tenant_id: string, user_id?: string) {
    const results = await this.repository.runRiskScan(tenant_id);
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "risk_scan.executed", "RISK_SIGNAL", "risk-engine", `Scan found ${results.length} signals`);
    if (user_id) {
      await this.auditService.log({ tenant_id, user_id, module: "procurement", action: "RUN_RISK_SCAN", entity_type: "SYSTEM", entity_id: "risk-engine", metadata: { signalsFound: results.length } });
    }
    return results;
  }

  // ─── PORTAL MESSAGES ──────────────────────────────────────────────────────────

  async getPortalMessages(tenant_id: string) {
    return this.repository.getPortalMessages(tenant_id);
  }

  async createPortalMessage(tenant_id: string, data: CreatePortalMessageDto, user_id?: string) {
    const message = await this.repository.createPortalMessage(tenant_id, data, user_id || "system");
    await this.repository.createAuditEvent(tenant_id, user_id || "system", "portal_message.sent", "PORTAL", message.id, `${data.type} message to supplier ${data.supplierId}`);
    return message;
  }

  // ─── AUDIT EVENTS ─────────────────────────────────────────────────────────────

  async getAuditEvents(tenant_id: string) {
    return this.repository.getAuditEvents(tenant_id);
  }

  async createAuditEventDirect(tenant_id: string, data: any, user_id?: string) {
    return this.repository.createAuditEvent(
      tenant_id,
      data.actor_id || user_id || "system",
      data.action,
      data.entity_type,
      data.entity_id,
      data.detail || "",
    );
  }

  // ─── SPEND INSIGHTS ────────────────────────────────────────────────────────────

  async getSpendInsights(tenant_id: string) {
    return this.repository.getSpendInsights(tenant_id);
  }
}
