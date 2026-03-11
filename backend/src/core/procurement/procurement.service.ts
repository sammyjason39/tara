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

@Injectable()
export class ProcurementService {
  constructor(
    private readonly repository: IProcurementRepository,
    private readonly auditService: AuditService,
  ) {}

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────────

  async getSuppliers(tenantId: string) {
    return this.repository.getSuppliers(tenantId);
  }

  async createSupplier(tenantId: string, data: CreateSupplierDto, userId?: string) {
    const supplier = await this.repository.createSupplier(tenantId, data);
    await this.repository.createAuditEvent(tenantId, userId || "system", "supplier.created", "SUPPLIER", supplier.id, supplier.name);
    if (userId) {
      await this.auditService.log({ tenantId, userId, module: "procurement", action: "CREATE", entityType: "SUPPLIER", entityId: supplier.id, metadata: { name: data.name, category: data.category } });
    }
    return supplier;
  }

  // ─── SUPPLIER BRANCHES ────────────────────────────────────────────────────────

  async getSupplierBranches(tenantId: string) {
    return this.repository.getSupplierBranches(tenantId);
  }

  async createSupplierBranch(tenantId: string, data: CreateSupplierBranchDto, userId?: string) {
    const branch = await this.repository.createSupplierBranch(tenantId, data);
    await this.repository.createAuditEvent(tenantId, userId || "system", "supplier_branch.created", "SUPPLIER_BRANCH", branch.id, branch.branchName);
    if (userId) {
      await this.auditService.log({ tenantId, userId, module: "procurement", action: "CREATE", entityType: "SUPPLIER_BRANCH", entityId: branch.id, metadata: { branchCode: data.branchCode, supplierId: data.supplierId } });
    }
    return branch;
  }

  // ─── SUPPLIER PRODUCTS ────────────────────────────────────────────────────────

  async getSupplierProducts(tenantId: string) {
    return this.repository.getSupplierProducts(tenantId);
  }

  async upsertSupplierProduct(tenantId: string, data: UpsertSupplierProductDto, userId?: string) {
    const product = await this.repository.upsertSupplierProduct(tenantId, data);
    await this.repository.createAuditEvent(tenantId, userId || "system", "supplier_product.upserted", "SUPPLIER_BRANCH", product.id, data.name);
    return product;
  }

  async getSupplierRecommendations(tenantId: string, params: any) {
    return this.repository.getSupplierRecommendations(tenantId, params);
  }

  // ─── CATEGORIES ───────────────────────────────────────────────────────────────

  async getCategories(tenantId: string) {
    return this.repository.getCategories(tenantId);
  }

  async upsertCategory(tenantId: string, userId: string, data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto) {
    const category = await this.repository.upsertCategory(tenantId, data);
    await this.auditService.log({
      tenantId,
      userId,
      module: "procurement",
      action: "UPSERT",
      entityType: "PROCUREMENT_CATEGORY",
      entityId: category.id,
      metadata: { name: (data as any).name },
    });
    return category;
  }

  async deleteCategory(tenantId: string, userId: string, id: string) {
    await this.repository.deleteCategory(tenantId, id);
    await this.auditService.log({
      tenantId,
      userId,
      module: "procurement",
      action: "DELETE",
      entityType: "PROCUREMENT_CATEGORY",
      entityId: id,
      metadata: {},
    });
    return { success: true };
  }

  // ─── REQUISITIONS ─────────────────────────────────────────────────────────────

  async getRequisitions(tenantId: string) {
    return this.repository.getRequisitions(tenantId);
  }

  async createRequisition(tenantId: string, data: CreateRequisitionDto, userId?: string) {
    const requisition = await this.repository.createRequisition(tenantId, data);
    await this.repository.createAuditEvent(tenantId, userId || "system", "requisition.created", "REQUISITION", requisition.id, requisition.title);
    if (userId) {
      await this.auditService.log({ tenantId, userId, module: "procurement", action: "CREATE", entityType: "REQUISITION", entityId: requisition.id, metadata: { title: data.title, amount: data.amount, requesterDept: data.requesterDept } });
    }
    return requisition;
  }

  async approveRequesterHod(tenantId: string, requisitionId: string, userId?: string) {
    const requisition = await this.repository.approveRequesterHod(tenantId, requisitionId);
    await this.repository.createAuditEvent(tenantId, userId || "system", "requisition.requester_hod_approved", "REQUISITION", requisitionId, "HOD approval granted");
    if (userId) {
      await this.auditService.log({ tenantId, userId, module: "procurement", action: "APPROVE_HOD", entityType: "REQUISITION", entityId: requisitionId });
    }
    return requisition;
  }

  async approveFinal(tenantId: string, requisitionId: string, data: ApproveFinalDto, userId?: string) {
    const requisition = await this.repository.approveFinal(tenantId, requisitionId, data);
    await this.repository.createAuditEvent(tenantId, userId || "system", `requisition.final_approved.${data.approver.toLowerCase()}`, "REQUISITION", requisitionId, `Final approval by ${data.approver}`);
    return requisition;
  }

  // ─── DRAFT PURCHASE ORDERS ────────────────────────────────────────────────────

  async getDraftPurchaseOrders(tenantId: string) {
    return this.repository.getDraftPurchaseOrders(tenantId);
  }

  async createDraftPurchaseOrder(tenantId: string, data: CreateDraftPoDto, userId?: string) {
    const draft = await this.repository.createDraftPurchaseOrder(tenantId, data, userId || "system");
    await this.repository.createAuditEvent(tenantId, userId || "system", "draft_po.created", "DRAFT_PO", draft.id, `Draft PO for requisition ${data.requisitionId}`);
    if (userId) {
      await this.auditService.log({ tenantId, userId, module: "procurement", action: "CREATE", entityType: "DRAFT_PO", entityId: draft.id, metadata: { requisitionId: data.requisitionId, supplierId: data.supplierId } });
    }
    return draft;
  }

  async approveDraftByProcurementHod(tenantId: string, draftPoId: string, userId?: string) {
    const draft = await this.repository.approveDraftByProcurementHod(tenantId, draftPoId);
    await this.repository.createAuditEvent(tenantId, userId || "system", "draft_po.procurement_hod_approved", "DRAFT_PO", draftPoId, "Procurement HOD approved draft PO");
    return draft;
  }

  async confirmSupplierQuote(tenantId: string, draftPoId: string, data: ConfirmQuoteDto, userId?: string) {
    const draft = await this.repository.confirmSupplierQuote(tenantId, draftPoId, data);
    await this.repository.createAuditEvent(tenantId, userId || "system", "draft_po.quote_confirmed", "DRAFT_PO", draftPoId, `Quote ref: ${data.quoteReference}`);
    return draft;
  }

  // ─── PURCHASE ORDERS (FINAL) ──────────────────────────────────────────────────

  async releasePurchaseOrder(tenantId: string, data: ReleasePoDto, userId?: string) {
    const po = await this.repository.releasePurchaseOrder(tenantId, data);
    await this.repository.createAuditEvent(tenantId, userId || "system", "po.released", "FINAL_PO", po.id, `PO released for requisition ${data.requisitionId}`);
    if (userId) {
      await this.auditService.log({ tenantId, userId, module: "procurement", action: "RELEASE", entityType: "PURCHASE_ORDER", entityId: po.id, metadata: { requisitionId: data.requisitionId, supplierId: po.supplierId } });
    }
    return po;
  }

  async getPurchaseOrders(tenantId: string) {
    return this.repository.getPurchaseOrders(tenantId);
  }

  // ─── RECEIPTS ─────────────────────────────────────────────────────────────────

  async createReceipt(tenantId: string, data: CreateReceiptDto, userId?: string) {
    const receipt = await this.repository.createReceipt(tenantId, data, userId || "system");
    await this.repository.createAuditEvent(tenantId, userId || "system", "receipt.recorded", "FINAL_PO", data.finalPoId, `Goods receipt. Delivery on time: ${data.deliveryOnTime}. Issues: ${data.issueCount}`);
    return receipt;
  }

  // ─── CONTRACTS ────────────────────────────────────────────────────────────────

  async getContracts(tenantId: string) {
    return this.repository.getContracts(tenantId);
  }

  async createContract(tenantId: string, data: CreateContractDto, userId?: string) {
    const contract = await this.repository.createContract(tenantId, data, userId || "system");
    await this.repository.createAuditEvent(tenantId, userId || "system", "contract.created", "CONTRACT", contract.id, `Contract for requisition ${data.requisitionId}`);
    if (userId) {
      await this.auditService.log({ tenantId, userId, module: "procurement", action: "CREATE", entityType: "CONTRACT", entityId: contract.id, metadata: { requisitionId: data.requisitionId, supplierId: data.supplierId } });
    }
    return contract;
  }

  async approveLegalContract(tenantId: string, contractId: string, userId?: string) {
    const contract = await this.repository.approveLegalContract(tenantId, contractId);
    await this.repository.createAuditEvent(tenantId, userId || "system", "contract.legal_approved", "CONTRACT", contractId, "Legal team approved the contract");
    return contract;
  }

  async signContract(tenantId: string, contractId: string, data: SignContractDto, userId?: string) {
    const contract = await this.repository.signContract(tenantId, contractId, data);
    await this.repository.createAuditEvent(tenantId, userId || "system", `contract.signed.${data.party.toLowerCase()}`, "CONTRACT", contractId, `Signed by ${data.party}`);
    return contract;
  }

  // ─── RISK MANAGEMENT ──────────────────────────────────────────────────────────

  async getRiskSignals(tenantId: string) {
    return this.repository.getRiskSignals(tenantId);
  }

  async createRiskSignal(tenantId: string, data: CreateRiskSignalDto, userId?: string) {
    const signal = await this.repository.createRiskSignal(tenantId, data);
    await this.repository.createAuditEvent(tenantId, userId || "system", "risk_signal.created", "RISK_SIGNAL", signal.id, `${data.code} on entity ${data.entityId}`);
    return signal;
  }

  async updateRiskSignalStatus(tenantId: string, riskSignalId: string, status: string, userId?: string) {
    const signal = await this.repository.updateRiskSignalStatus(tenantId, riskSignalId, status);
    await this.repository.createAuditEvent(tenantId, userId || "system", "risk_signal.status_updated", "RISK_SIGNAL", riskSignalId, `Status changed to ${status}`);
    return signal;
  }

  async runRiskScan(tenantId: string, userId?: string) {
    const results = await this.repository.runRiskScan(tenantId);
    await this.repository.createAuditEvent(tenantId, userId || "system", "risk_scan.executed", "RISK_SIGNAL", "risk-engine", `Scan found ${results.length} signals`);
    if (userId) {
      await this.auditService.log({ tenantId, userId, module: "procurement", action: "RUN_RISK_SCAN", entityType: "SYSTEM", entityId: "risk-engine", metadata: { signalsFound: results.length } });
    }
    return results;
  }

  // ─── PORTAL MESSAGES ──────────────────────────────────────────────────────────

  async getPortalMessages(tenantId: string) {
    return this.repository.getPortalMessages(tenantId);
  }

  async createPortalMessage(tenantId: string, data: CreatePortalMessageDto, userId?: string) {
    const message = await this.repository.createPortalMessage(tenantId, data, userId || "system");
    await this.repository.createAuditEvent(tenantId, userId || "system", "portal_message.sent", "PORTAL", message.id, `${data.type} message to supplier ${data.supplierId}`);
    return message;
  }

  // ─── AUDIT EVENTS ─────────────────────────────────────────────────────────────

  async getAuditEvents(tenantId: string) {
    return this.repository.getAuditEvents(tenantId);
  }

  async createAuditEventDirect(tenantId: string, data: any, userId?: string) {
    return this.repository.createAuditEvent(
      tenantId,
      data.actorId || userId || "system",
      data.action,
      data.entityType,
      data.entityId,
      data.detail || "",
    );
  }

  // ─── SPEND INSIGHTS ────────────────────────────────────────────────────────────

  async getSpendInsights(tenantId: string) {
    return this.repository.getSpendInsights(tenantId);
  }
}
