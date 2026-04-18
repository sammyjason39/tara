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
  abstract getSuppliers(tenant_id: string): Promise<Supplier[]>;
  abstract createSupplier(tenant_id: string, data: CreateSupplierDto): Promise<Supplier>;

  // Supplier Branches
  abstract getSupplierBranches(tenant_id: string): Promise<any[]>;
  abstract createSupplierBranch(tenant_id: string, data: CreateSupplierBranchDto): Promise<any>;

  // Supplier Products
  abstract getSupplierProducts(tenant_id: string): Promise<any[]>;
  abstract upsertSupplierProduct(tenant_id: string, data: UpsertSupplierProductDto): Promise<any>;

  // Supplier Recommendations
  abstract getSupplierRecommendations(tenant_id: string, params: any): Promise<any[]>;

  // Categories
  abstract getCategories(tenant_id: string): Promise<any[]>;
  abstract upsertCategory(tenant_id: string, data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto): Promise<any>;
  abstract deleteCategory(tenant_id: string, id: string): Promise<any>;

  // Requisitions
  abstract getRequisitions(tenant_id: string): Promise<Requisition[]>;
  abstract createRequisition(tenant_id: string, data: CreateRequisitionDto): Promise<Requisition>;
  abstract approveRequesterHod(tenant_id: string, requisitionId: string): Promise<Requisition>;
  abstract approveFinal(tenant_id: string, requisitionId: string, data: ApproveFinalDto): Promise<Requisition>;

  // Draft POs
  abstract getDraftPurchaseOrders(tenant_id: string): Promise<any[]>;
  abstract createDraftPurchaseOrder(tenant_id: string, data: CreateDraftPoDto, createdBy: string): Promise<any>;
  abstract approveDraftByProcurementHod(tenant_id: string, draftPoId: string): Promise<any>;
  abstract confirmSupplierQuote(tenant_id: string, draftPoId: string, data: ConfirmQuoteDto): Promise<any>;

  // Purchase Orders (Final)
  abstract releasePurchaseOrder(tenant_id: string, data: ReleasePoDto): Promise<PurchaseOrder>;
  abstract getPurchaseOrders(tenant_id: string): Promise<PurchaseOrder[]>;

  // Receipts
  abstract createReceipt(tenant_id: string, data: CreateReceiptDto, createdBy: string): Promise<any>;

  // Contracts
  abstract getContracts(tenant_id: string): Promise<any[]>;
  abstract createContract(tenant_id: string, data: CreateContractDto, createdBy: string): Promise<any>;
  abstract approveLegalContract(tenant_id: string, contractId: string): Promise<any>;
  abstract signContract(tenant_id: string, contractId: string, data: SignContractDto): Promise<any>;

  // Risk Management
  abstract getRiskSignals(tenant_id: string): Promise<ProcurementRisk[]>;
  abstract runRiskScan(tenant_id: string): Promise<ProcurementRisk[]>;
  abstract createRiskSignal(tenant_id: string, data: CreateRiskSignalDto): Promise<any>;
  abstract updateRiskSignalStatus(tenant_id: string, riskSignalId: string, status: string): Promise<any>;

  // Portal Messages
  abstract getPortalMessages(tenant_id: string): Promise<any[]>;
  abstract createPortalMessage(tenant_id: string, data: CreatePortalMessageDto, createdBy: string): Promise<any>;

  // Audit Events
  abstract getAuditEvents(tenant_id: string): Promise<any[]>;
  abstract createAuditEvent(tenant_id: string, actor_id: string, action: string, entity_type: string, entity_id: string, detail?: string): Promise<any>;

  // Spend Insights
  abstract getSpendInsights(tenant_id: string): Promise<any[]>;
}
