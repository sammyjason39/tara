import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { ReleasePoDto } from '../dto/release-po.dto';
import { ProcurementRisk } from '../entities/procurement-risk.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { Requisition } from '../entities/requisition.entity';
import { Supplier } from '../entities/supplier.entity';

export abstract class IProcurementRepository {
  abstract getSuppliers(tenantId: string): Promise<Supplier[]>;
  abstract createSupplier(tenantId: string, data: CreateSupplierDto): Promise<Supplier>;
  abstract getRequisitions(tenantId: string): Promise<Requisition[]>;
  abstract createRequisition(tenantId: string, data: CreateRequisitionDto): Promise<Requisition>;
  abstract approveRequesterHod(tenantId: string, requisitionId: string): Promise<Requisition>;
  abstract releasePurchaseOrder(tenantId: string, data: ReleasePoDto): Promise<PurchaseOrder>;
  abstract getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]>;
  abstract getRiskSignals(tenantId: string): Promise<ProcurementRisk[]>;
  abstract runRiskScan(tenantId: string): Promise<ProcurementRisk[]>;
}

