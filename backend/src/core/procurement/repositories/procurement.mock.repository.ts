import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { TenantScope } from "../../../shared/scope/tenant-scope";
import { CreateRequisitionDto } from "../dto/create-requisition.dto";
import { CreateSupplierDto } from "../dto/create-supplier.dto";
import { CreateSupplierBranchDto } from "../dto/create-supplier-branch.dto";
import { CreateDraftPoDto } from "../dto/create-draft-po.dto";
import { ConfirmQuoteDto } from "../dto/confirm-quote.dto";
import { CreateContractDto } from "../dto/create-contract.dto";
import { SignContractDto } from "../dto/sign-contract.dto";
import { ApproveFinalDto } from "../dto/approve-final.dto";
import { CreatePortalMessageDto } from "../dto/create-portal-message.dto";
import { CreateReceiptDto } from "../dto/create-receipt.dto";
import { UpsertSupplierProductDto } from "../dto/upsert-supplier-product.dto";
import { CreateRiskSignalDto } from "../dto/create-risk-signal.dto";
import { CreateProcurementCategoryDto } from "../dto/create-procurement-category.dto";
import { UpdateProcurementCategoryDto } from "../dto/update-procurement-category.dto";
import { ReleasePoDto } from "../dto/release-po.dto";
import { ProcurementRisk } from "../entities/procurement-risk.entity";
import { PurchaseOrder } from "../entities/purchase-order.entity";
import { Requisition } from "../entities/requisition.entity";
import { Supplier } from "../entities/supplier.entity";
import { IProcurementRepository } from "./procurement.repository.interface";

@Injectable()
export class ProcurementMockRepository extends IProcurementRepository {
  private readonly suppliers: Supplier[] = [];
  private readonly requisitions: Requisition[] = [];
  private readonly purchaseOrders: PurchaseOrder[] = [];
  private categories: any[] = [];
  private readonly risks: ProcurementRisk[] = [];

  constructor() {
    super();
    this.seed("tenant-001");
    this.seed("tenant-002");
  }

  private seed(tenant_id: string): void {
    this.suppliers.push({
      id: `${tenant_id}-sup-1`,
      tenant_id,
      name: "Nusantara Industrial Supply",
      taxId: "NPWP-01.234.567.8-091.000",
      category: "machinery",
      branchCode: "JKT",
      complianceStatus: "verified",
      rating: 88,
      created_at: new Date(),
      updated_at: new Date(),
    });
    this.requisitions.push({
      id: `${tenant_id}-req-1`,
      tenant_id,
      title: "Packaging line motor replacement",
      description: "Emergency replacement of motor for line 3",
      category: "Machinery",
      budgetClass: "OPEX",
      requesterDept: "operations",
      branchCode: "JKT",
      amount: 310000000,
      currency: "IDR",
      status: "PENDING_REQUESTER_HOD",
      approvals: {},
      contractRequired: false,
      createdBy: "user-demo",
      created_at: new Date(),
      updated_at: new Date(),
    });
    this.categories.push({
      id: `${tenant_id}-cat-1`,
      tenant_id,
      name: "Machinery",
      description: "Heavy industrial equipment",
      active: true,
    });
  }

  async getSuppliers(ctx: TenantScope): Promise<Supplier[]> {
    return this.suppliers.filter((item) => item.tenant_id === ctx.tenant_id);
  }

  async createSupplier(ctx: TenantScope, data: CreateSupplierDto): Promise<Supplier> {
    const created: Supplier = {
      id: `${ctx.tenant_id}-sup-${this.suppliers.length + 1}`,
      tenant_id: ctx.tenant_id,
      name: data.name,
      taxId: data.taxId,
      category: data.category,
      branchCode: data.branchCode.toUpperCase(),
      complianceStatus: "pending",
      rating: 70,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.suppliers.push(created);
    return created;
  }

  async getSupplierBranches(ctx: TenantScope): Promise<any[]> {
    return [];
  }

  async createSupplierBranch(ctx: TenantScope, data: CreateSupplierBranchDto): Promise<any> {
    return { id: "mock-branch-id", ...data, localRating: 70, riskTier: "medium", created_at: new Date() };
  }

  async getSupplierProducts(ctx: TenantScope): Promise<any[]> {
    return [];
  }

  async upsertSupplierProduct(ctx: TenantScope, data: UpsertSupplierProductDto): Promise<any> {
    return { id: data.id || "mock-product-id", ...data, created_at: new Date() };
  }

  async getSupplierRecommendations(ctx: TenantScope, params: any): Promise<any[]> {
    const recommendations = [];
    const filtered = this.suppliers.filter(
      (s) => s.tenant_id === ctx.tenant_id && s.category === params.category,
    );
    for (const supplier of filtered) {
      recommendations.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        matchScore: supplier.rating,
        reasons: ["High compliance rating", "In selected category"],
      });
    }
    return recommendations;
  }

  async getRequisitions(ctx: TenantScope): Promise<Requisition[]> {
    return this.requisitions.filter((item) => item.tenant_id === ctx.tenant_id);
  }

  async createRequisition(ctx: TenantScope, data: CreateRequisitionDto): Promise<Requisition> {
    const created: Requisition = {
      id: `${ctx.tenant_id}-req-${this.requisitions.length + 1}`,
      tenant_id: ctx.tenant_id,
      title: data.title,
      description: data.description,
      category: data.category || "General",
      budgetClass: "OPEX",
      requesterDept: data.requesterDept,
      branchCode: data.branchCode.toUpperCase(),
      amount: data.amount,
      currency: data.currency || "IDR",
      status: "PENDING_REQUESTER_HOD",
      approvals: {},
      contractRequired: false,
      createdBy: data.createdBy || "system",
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.requisitions.push(created);
    return created;
  }

  async approveRequesterHod(ctx: TenantScope, requisitionId: string, _tx?: Prisma.TransactionClient): Promise<Requisition> {
    const requisition = this.requisitions.find(
      (item) => item.tenant_id === ctx.tenant_id && item.id === requisitionId,
    );
    if (!requisition) throw new NotFoundException("Requisition not found");
    if (requisition.status !== "PENDING_REQUESTER_HOD") {
      throw new BadRequestException(
        `Invalid Procurement_Workflow transition for requisition '${requisitionId}': ` +
          `cannot transition from '${requisition.status}' to 'APPROVED_REQUESTER_HOD'.`,
      );
    }
    requisition.status = "APPROVED_REQUESTER_HOD";
    requisition.updated_at = new Date();
    return requisition;
  }

  async approveFinal(ctx: TenantScope, requisitionId: string, data: ApproveFinalDto, _tx?: Prisma.TransactionClient): Promise<Requisition> {
    const requisition = this.requisitions.find(
      (item) => item.tenant_id === ctx.tenant_id && item.id === requisitionId,
    );
    if (!requisition) throw new NotFoundException("Requisition not found");
    const target = data.approver === "FINANCE_HOD" ? "FINAL_APPROVED" : "FINAL_APPROVAL_PENDING";
    if (!["APPROVED_REQUESTER_HOD", "FINAL_APPROVAL_PENDING"].includes(requisition.status as string)) {
      throw new BadRequestException(
        `Invalid Procurement_Workflow transition for requisition '${requisitionId}': ` +
          `cannot transition from '${requisition.status}' to '${target}'.`,
      );
    }
    requisition.status = target as Requisition["status"];
    requisition.updated_at = new Date();
    return requisition;
  }

  async getDraftPurchaseOrders(ctx: TenantScope): Promise<any[]> {
    return [];
  }

  async createDraftPurchaseOrder(ctx: TenantScope, data: CreateDraftPoDto, createdBy: string): Promise<any> {
    return { id: "mock-draft-id", ...data, status: "DRAFT", created_at: new Date() };
  }

  async approveDraftByProcurementHod(ctx: TenantScope, draftPoId: string, _tx?: Prisma.TransactionClient): Promise<any> {
    return { id: draftPoId, status: "PROCUREMENT_HOD_APPROVED", updated_at: new Date() };
  }

  async confirmSupplierQuote(ctx: TenantScope, draftPoId: string, data: ConfirmQuoteDto, _tx?: Prisma.TransactionClient): Promise<any> {
    return { id: draftPoId, status: "SUPPLIER_CONFIRMED", ...data, updated_at: new Date() };
  }

  async releasePurchaseOrder(ctx: TenantScope, data: ReleasePoDto, _tx?: Prisma.TransactionClient): Promise<PurchaseOrder> {
    const po: PurchaseOrder = {
      id: `${ctx.tenant_id}-po-${this.purchaseOrders.length + 1}`,
      tenant_id: ctx.tenant_id,
      requisitionId: data.requisitionId,
      supplierId: data.supplierId,
      branchCode: "HQ",
      total_amount: data.total_amount,
      status: "released",
      issuedAt: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.purchaseOrders.push(po);
    return po;
  }

  async getPurchaseOrders(ctx: TenantScope): Promise<PurchaseOrder[]> {
    return this.purchaseOrders.filter((item) => item.tenant_id === ctx.tenant_id);
  }

  async createReceipt(ctx: TenantScope, data: CreateReceiptDto, createdBy: string, _tx?: any): Promise<any> {
    return { id: "mock-receipt-id", ...data, created_at: new Date() };
  }

  async getContracts(ctx: TenantScope): Promise<any[]> {
    return [];
  }

  async createContract(ctx: TenantScope, data: CreateContractDto, createdBy: string): Promise<any> {
    return { id: "mock-contract-id", ...data, status: "LEGAL_REVIEW", version: 1, created_at: new Date() };
  }

  async approveLegalContract(ctx: TenantScope, contractId: string, _tx?: any): Promise<any> {
    return { id: contractId, status: "LEGAL_APPROVED", updated_at: new Date() };
  }

  async signContract(ctx: TenantScope, contractId: string, data: SignContractDto, _tx?: any): Promise<any> {
    return { id: contractId, status: "SIGNED", party: data.party, updated_at: new Date() };
  }

  async getRiskSignals(ctx: TenantScope): Promise<ProcurementRisk[]> {
    return this.risks.filter((item) => item.tenant_id === ctx.tenant_id);
  }

  async runRiskScan(ctx: TenantScope): Promise<ProcurementRisk[]> {
    return this.getRiskSignals(ctx);
  }

  async createRiskSignal(ctx: TenantScope, data: CreateRiskSignalDto): Promise<any> {
    const risk: ProcurementRisk = {
      id: `${ctx.tenant_id}-risk-${this.risks.length + 1}`,
      tenant_id: ctx.tenant_id,
      code: data.code as any,
      severity: data.severity as any,
      status: "open",
      entity_id: data.entity_id,
      detail: data.detail || "",
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.risks.push(risk);
    return risk;
  }

  async updateRiskSignalStatus(ctx: TenantScope, riskSignalId: string, status: string): Promise<any> {
    return { id: riskSignalId, status, updated_at: new Date() };
  }

  async getPortalMessages(ctx: TenantScope): Promise<any[]> {
    return [];
  }

  async createPortalMessage(ctx: TenantScope, data: CreatePortalMessageDto, createdBy: string): Promise<any> {
    return { id: "mock-portal-msg-id", ...data, created_at: new Date() };
  }

  async getAuditEvents(ctx: TenantScope): Promise<any[]> {
    return [];
  }

  async createAuditEvent(ctx: TenantScope, actor_id: string, action: string, entity_type: string, entity_id: string, detail?: string, _tx?: Prisma.TransactionClient): Promise<any> {
    return { id: "mock-audit-id", tenant_id: ctx.tenant_id, actor_id, action, entity_type, entity_id, detail, created_at: new Date() };
  }

  async getSpendInsights(ctx: TenantScope): Promise<any[]> {
    return [];
  }

  async getCategories(ctx: TenantScope): Promise<any[]> {
    return this.categories.filter((c) => c.tenant_id === ctx.tenant_id && c.active);
  }

  async upsertCategory(
    ctx: TenantScope,
    data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto,
  ): Promise<any> {
    if ("id" in data && data.id) {
      const idx = this.categories.findIndex((c) => c.id === data.id);
      if (idx !== -1) {
        this.categories[idx] = { ...this.categories[idx], ...data };
        return this.categories[idx];
      }
    }
    const created = {
      id: `cat-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: ctx.tenant_id,
      ...(data as any),
      active: (data as any).active ?? true,
    };
    this.categories.push(created);
    return created;
  }

  async deleteCategory(ctx: TenantScope, id: string): Promise<any> {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.categories[idx].active = false;
    }
    return { success: true };
  }
}
