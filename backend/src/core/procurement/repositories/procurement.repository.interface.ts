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

export abstract class IProcurementRepository {
  // Suppliers
  abstract getSuppliers(tenantId: string): Promise<Supplier[]>;
  abstract createSupplier(tenantId: string, data: CreateSupplierDto): Promise<Supplier>;

  // Supplier Branches
  abstract getSupplierBranches(tenantId: string): Promise<any[]>;
  abstract createSupplierBranch(tenantId: string, data: CreateSupplierBranchDto): Promise<any>;

  // Supplier Products
  abstract getSupplierProducts(tenantId: string): Promise<any[]>;
  abstract upsertSupplierProduct(tenantId: string, data: UpsertSupplierProductDto): Promise<any>;

  // Supplier Recommendations
  abstract getSupplierRecommendations(tenantId: string, params: any): Promise<any[]>;

  // Categories
  abstract getCategories(tenantId: string): Promise<any[]>;
  abstract upsertCategory(tenantId: string, data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto): Promise<any>;
  abstract deleteCategory(tenantId: string, id: string): Promise<any>;

  // Requisitions
  abstract getRequisitions(tenantId: string): Promise<Requisition[]>;
  abstract createRequisition(tenantId: string, data: CreateRequisitionDto): Promise<Requisition>;
  abstract approveRequesterHod(tenantId: string, requisitionId: string): Promise<Requisition>;
  abstract approveFinal(tenantId: string, requisitionId: string, data: ApproveFinalDto): Promise<Requisition>;

  // Draft POs
  abstract getDraftPurchaseOrders(tenantId: string): Promise<any[]>;
  abstract createDraftPurchaseOrder(tenantId: string, data: CreateDraftPoDto, createdBy: string): Promise<any>;
  abstract approveDraftByProcurementHod(tenantId: string, draftPoId: string): Promise<any>;
  abstract confirmSupplierQuote(tenantId: string, draftPoId: string, data: ConfirmQuoteDto): Promise<any>;

  // Purchase Orders (Final)
  abstract releasePurchaseOrder(tenantId: string, data: ReleasePoDto): Promise<PurchaseOrder>;
  abstract getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]>;

  // Receipts
  abstract createReceipt(tenantId: string, data: CreateReceiptDto, createdBy: string): Promise<any>;

  // Contracts
  abstract getContracts(tenantId: string): Promise<any[]>;
  abstract createContract(tenantId: string, data: CreateContractDto, createdBy: string): Promise<any>;
  abstract approveLegalContract(tenantId: string, contractId: string): Promise<any>;
  abstract signContract(tenantId: string, contractId: string, data: SignContractDto): Promise<any>;

  // Risk Management
  abstract getRiskSignals(tenantId: string): Promise<ProcurementRisk[]>;
  abstract runRiskScan(tenantId: string): Promise<ProcurementRisk[]>;
  abstract createRiskSignal(tenantId: string, data: CreateRiskSignalDto): Promise<any>;
  abstract updateRiskSignalStatus(tenantId: string, riskSignalId: string, status: string): Promise<any>;

  // Portal Messages
  abstract getPortalMessages(tenantId: string): Promise<any[]>;
  abstract createPortalMessage(tenantId: string, data: CreatePortalMessageDto, createdBy: string): Promise<any>;

  // Audit Events
  abstract getAuditEvents(tenantId: string): Promise<any[]>;
  abstract createAuditEvent(tenantId: string, actorId: string, action: string, entityType: string, entityId: string, detail?: string): Promise<any>;

  // Spend Insights
  abstract getSpendInsights(tenantId: string): Promise<any[]>;
}
