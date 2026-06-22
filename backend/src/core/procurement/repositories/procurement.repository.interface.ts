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

export abstract class IProcurementRepository {
  // Suppliers
  abstract getSuppliers( ctx: TenantScope): Promise<Supplier[]>;
  abstract createSupplier( ctx: TenantScope, data: CreateSupplierDto): Promise<Supplier>;

  // Supplier Branches
  abstract getSupplierBranches( ctx: TenantScope): Promise<any[]>;
  abstract createSupplierBranch( ctx: TenantScope, data: CreateSupplierBranchDto): Promise<any>;

  // Supplier Products
  abstract getSupplierProducts( ctx: TenantScope): Promise<any[]>;
  abstract upsertSupplierProduct( ctx: TenantScope, data: UpsertSupplierProductDto): Promise<any>;

  // Supplier Recommendations
  abstract getSupplierRecommendations( ctx: TenantScope, params: any): Promise<any[]>;

  // Categories
  abstract getCategories( ctx: TenantScope): Promise<any[]>;
  abstract upsertCategory( ctx: TenantScope, data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto): Promise<any>;
  abstract deleteCategory( ctx: TenantScope, id: string): Promise<any>;

  // Requisitions
  abstract getRequisitions( ctx: TenantScope): Promise<Requisition[]>;
  abstract createRequisition( ctx: TenantScope, data: CreateRequisitionDto): Promise<Requisition>;
  abstract approveRequesterHod( ctx: TenantScope, requisitionId: string, tx?: Prisma.TransactionClient): Promise<Requisition>;
  abstract approveFinal( ctx: TenantScope, requisitionId: string, data: ApproveFinalDto, tx?: Prisma.TransactionClient): Promise<Requisition>;

  // Draft POs
  abstract getDraftPurchaseOrders( ctx: TenantScope): Promise<any[]>;
  abstract createDraftPurchaseOrder( ctx: TenantScope, data: CreateDraftPoDto, createdBy: string): Promise<any>;
  abstract approveDraftByProcurementHod( ctx: TenantScope, draftPoId: string, tx?: Prisma.TransactionClient): Promise<any>;
  abstract confirmSupplierQuote( ctx: TenantScope, draftPoId: string, data: ConfirmQuoteDto, tx?: Prisma.TransactionClient): Promise<any>;

  // Purchase Orders (Final)
  abstract releasePurchaseOrder( ctx: TenantScope, data: ReleasePoDto, tx?: Prisma.TransactionClient): Promise<PurchaseOrder>;
  abstract getPurchaseOrders( ctx: TenantScope): Promise<PurchaseOrder[]>;

  // Receipts
  abstract createReceipt( ctx: TenantScope, data: CreateReceiptDto, createdBy: string, tx?: Prisma.TransactionClient): Promise<any>;

  // Contracts
  abstract getContracts( ctx: TenantScope): Promise<any[]>;
  abstract createContract( ctx: TenantScope, data: CreateContractDto, createdBy: string): Promise<any>;
  abstract approveLegalContract( ctx: TenantScope, contractId: string, tx?: Prisma.TransactionClient): Promise<any>;
  abstract signContract( ctx: TenantScope, contractId: string, data: SignContractDto, tx?: Prisma.TransactionClient): Promise<any>;

  // Risk Management
  abstract getRiskSignals( ctx: TenantScope): Promise<ProcurementRisk[]>;
  abstract runRiskScan( ctx: TenantScope): Promise<ProcurementRisk[]>;
  abstract createRiskSignal( ctx: TenantScope, data: CreateRiskSignalDto): Promise<any>;
  abstract updateRiskSignalStatus( ctx: TenantScope, riskSignalId: string, status: string): Promise<any>;

  // Portal Messages
  abstract getPortalMessages( ctx: TenantScope): Promise<any[]>;
  abstract createPortalMessage( ctx: TenantScope, data: CreatePortalMessageDto, createdBy: string): Promise<any>;

  // Audit Events
  abstract getAuditEvents( ctx: TenantScope): Promise<any[]>;
  abstract createAuditEvent( ctx: TenantScope, actor_id: string, action: string, entity_type: string, entity_id: string, detail?: string, tx?: Prisma.TransactionClient): Promise<any>;

  // Spend Insights
  abstract getSpendInsights( ctx: TenantScope): Promise<any[]>;
}
