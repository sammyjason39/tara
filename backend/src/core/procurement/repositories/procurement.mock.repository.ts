import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
  private finalPOs: any[] = [];
  private categories: any[] = [];
  private readonly risks: ProcurementRisk[] = [];

  constructor() {
    super();
    this.seed("tenant-001");
    this.seed("tenant-002");
  }

  private seed(tenantId: string): void {
    this.suppliers.push({
      id: `${tenantId}-sup-1`,
      tenantId,
      name: "Nusantara Industrial Supply",
      taxId: "NPWP-01.234.567.8-091.000",
      category: "machinery",
      branchCode: "JKT",
      complianceStatus: "verified",
      rating: 88,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.requisitions.push({
      id: `${tenantId}-req-1`,
      tenantId,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.categories.push({
      id: `${tenantId}-cat-1`,
      tenantId,
      name: "Machinery",
      description: "Heavy industrial equipment",
      active: true,
    });
    this.categories.push({
      id: `${tenantId}-cat-2`,
      tenantId,
      name: "Office Supplies",
      description: "General office consumables",
      active: true,
    });
  }

  // Suppliers
  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    return this.suppliers.filter((item) => item.tenantId === tenantId);
  }

  async createSupplier(tenantId: string, data: CreateSupplierDto): Promise<Supplier> {
    const created: Supplier = {
      id: `${tenantId}-sup-${this.suppliers.length + 1}`,
      tenantId,
      name: data.name,
      taxId: data.taxId,
      category: data.category,
      branchCode: data.branchCode.toUpperCase(),
      complianceStatus: "pending",
      rating: 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.suppliers.push(created);
    return created;
  }

  // Supplier Branches
  async getSupplierBranches(tenantId: string): Promise<any[]> {
    return [];
  }

  async createSupplierBranch(tenantId: string, data: CreateSupplierBranchDto): Promise<any> {
    return { id: "mock-branch-id", ...data, localRating: 70, riskTier: "medium", createdAt: new Date() };
  }

  // Supplier Products
  async getSupplierProducts(tenantId: string): Promise<any[]> {
    return [];
  }

  async upsertSupplierProduct(tenantId: string, data: UpsertSupplierProductDto): Promise<any> {
    return { id: data.id || "mock-product-id", ...data, createdAt: new Date() };
  }

  // Supplier Recommendations
  async getSupplierRecommendations(tenantId: string, params: any): Promise<any[]> {
    const recommendations = [];
    const filtered = this.suppliers.filter(
      (s) => s.tenantId === tenantId && s.category === params.category,
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

  // Requisitions
  async getRequisitions(tenantId: string): Promise<Requisition[]> {
    return this.requisitions.filter((item) => item.tenantId === tenantId);
  }

  async createRequisition(tenantId: string, data: CreateRequisitionDto): Promise<Requisition> {
    const created: Requisition = {
      id: `${tenantId}-req-${this.requisitions.length + 1}`,
      tenantId,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.requisitions.push(created);
    return created;
  }

  async approveRequesterHod(tenantId: string, requisitionId: string): Promise<Requisition> {
    const requisition = this.requisitions.find(
      (item) => item.tenantId === tenantId && item.id === requisitionId,
    );
    if (!requisition) throw new NotFoundException("Requisition not found");
    requisition.status = "APPROVED_REQUESTER_HOD";
    requisition.updatedAt = new Date();
    return requisition;
  }

  async approveFinal(tenantId: string, requisitionId: string, data: ApproveFinalDto): Promise<Requisition> {
    const requisition = this.requisitions.find(
      (item) => item.tenantId === tenantId && item.id === requisitionId,
    );
    if (!requisition) throw new NotFoundException("Requisition not found");
    requisition.status = "FINAL_APPROVED";
    requisition.updatedAt = new Date();
    return requisition;
  }

  // Draft POs
  async getDraftPurchaseOrders(tenantId: string): Promise<any[]> {
    return [];
  }

  async createDraftPurchaseOrder(tenantId: string, data: CreateDraftPoDto, createdBy: string): Promise<any> {
    return { id: "mock-draft-id", ...data, status: "DRAFT", createdAt: new Date() };
  }

  async approveDraftByProcurementHod(tenantId: string, draftPoId: string): Promise<any> {
    return { id: draftPoId, status: "PROCUREMENT_HOD_APPROVED", updatedAt: new Date() };
  }

  async confirmSupplierQuote(tenantId: string, draftPoId: string, data: ConfirmQuoteDto): Promise<any> {
    return { id: draftPoId, status: "SUPPLIER_CONFIRMED", ...data, updatedAt: new Date() };
  }

  // Purchase Orders (Final)
  async releasePurchaseOrder(tenantId: string, data: ReleasePoDto): Promise<PurchaseOrder> {
    const po: PurchaseOrder = {
      id: `${tenantId}-po-${this.purchaseOrders.length + 1}`,
      tenantId,
      requisitionId: data.requisitionId,
      supplierId: data.supplierId,
      branchCode: "HQ",
      totalAmount: data.totalAmount,
      status: "released",
      issuedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.purchaseOrders.push(po);
    return po;
  }

  async getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    return this.purchaseOrders.filter((item) => item.tenantId === tenantId);
  }

  // Receipts
  async createReceipt(tenantId: string, data: CreateReceiptDto, createdBy: string): Promise<any> {
    return { id: "mock-receipt-id", ...data, createdAt: new Date() };
  }

  // Contracts
  async getContracts(tenantId: string): Promise<any[]> {
    return [];
  }

  async createContract(tenantId: string, data: CreateContractDto, createdBy: string): Promise<any> {
    return { id: "mock-contract-id", ...data, status: "LEGAL_REVIEW", version: 1, createdAt: new Date() };
  }

  async approveLegalContract(tenantId: string, contractId: string): Promise<any> {
    return { id: contractId, status: "LEGAL_APPROVED", updatedAt: new Date() };
  }

  async signContract(tenantId: string, contractId: string, data: SignContractDto): Promise<any> {
    return { id: contractId, status: "SIGNED", party: data.party, updatedAt: new Date() };
  }

  // Risk Management
  async getRiskSignals(tenantId: string): Promise<ProcurementRisk[]> {
    return this.risks.filter((item) => item.tenantId === tenantId);
  }

  async runRiskScan(tenantId: string): Promise<ProcurementRisk[]> {
    return this.getRiskSignals(tenantId);
  }

  async createRiskSignal(tenantId: string, data: CreateRiskSignalDto): Promise<any> {
    const risk: ProcurementRisk = {
      id: `${tenantId}-risk-${this.risks.length + 1}`,
      tenantId,
      code: data.code as any,
      severity: data.severity as any,
      status: "open",
      entityId: data.entityId,
      detail: data.detail || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.risks.push(risk);
    return risk;
  }

  async updateRiskSignalStatus(tenantId: string, riskSignalId: string, status: string): Promise<any> {
    return { id: riskSignalId, status, updatedAt: new Date() };
  }

  // Portal Messages
  async getPortalMessages(tenantId: string): Promise<any[]> {
    return [];
  }

  async createPortalMessage(tenantId: string, data: CreatePortalMessageDto, createdBy: string): Promise<any> {
    return { id: "mock-portal-msg-id", ...data, createdAt: new Date() };
  }

  // Audit Events
  async getAuditEvents(tenantId: string): Promise<any[]> {
    return [];
  }

  async createAuditEvent(tenantId: string, actorId: string, action: string, entityType: string, entityId: string, detail?: string): Promise<any> {
    return { id: "mock-audit-id", tenantId, actorId, action, entityType, entityId, detail, createdAt: new Date() };
  }

  // Spend Insights
  async getSpendInsights(tenantId: string): Promise<any[]> {
    return [];
  }

  async getCategories(tenantId: string): Promise<any[]> {
    return this.categories.filter((c) => c.tenantId === tenantId && c.active);
  }

  async upsertCategory(
    tenantId: string,
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
      tenantId,
      ...(data as any),
      active: (data as any).active ?? true,
    };
    this.categories.push(created);
    return created;
  }

  async deleteCategory(tenantId: string, id: string): Promise<any> {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.categories[idx].active = false;
    }
    return { success: true };
  }
}
