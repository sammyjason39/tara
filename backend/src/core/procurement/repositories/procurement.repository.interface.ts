import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { ReleasePoDto } from '../dto/release-po.dto';
import { ProcurementRisk } from '../entities/procurement-risk.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { Requisition } from '../entities/requisition.entity';
import { Supplier } from '../entities/supplier.entity';

export abstract class IProcurementRepository {
  // Suppliers
  abstract getSuppliers(tenantId: string): Promise<Supplier[]>;
  abstract createSupplier(tenantId: string, data: CreateSupplierDto): Promise<Supplier>;
  
  // Requisitions
  abstract getRequisitions(tenantId: string): Promise<Requisition[]>;
  abstract createRequisition(tenantId: string, data: CreateRequisitionDto): Promise<Requisition>;
  abstract approveRequesterHod(tenantId: string, requisitionId: string): Promise<Requisition>;
  
  // Purchase Orders
  abstract releasePurchaseOrder(tenantId: string, data: ReleasePoDto): Promise<PurchaseOrder>;
  abstract getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]>;
  
  // Risk Management
  abstract getRiskSignals(tenantId: string): Promise<ProcurementRisk[]>;
  abstract runRiskScan(tenantId: string): Promise<ProcurementRisk[]>;

  // Additional methods for full migration
  abstract getSupplierBranches(tenantId: string): Promise<any[]>;
  abstract getSupplierProducts(tenantId: string): Promise<any[]>;
  abstract getSupplierRecommendations(tenantId: string, params: any): Promise<any[]>;
  abstract getDraftPurchaseOrders(tenantId: string): Promise<any[]>;
  abstract getContracts(tenantId: string): Promise<any[]>;
  abstract getAuditEvents(tenantId: string): Promise<any[]>;
  abstract getSpendInsights(tenantId: string): Promise<any[]>;
}
