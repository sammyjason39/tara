import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { ReleasePoDto } from '../dto/release-po.dto';
import { ProcurementRisk } from '../entities/procurement-risk.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { Requisition } from '../entities/requisition.entity';
import { Supplier } from '../entities/supplier.entity';
import { IProcurementRepository } from './procurement.repository.interface';

@Injectable()
export class ProcurementMockRepository extends IProcurementRepository {
  private readonly suppliers: Supplier[] = [];
  private readonly requisitions: Requisition[] = [];
  private readonly purchaseOrders: PurchaseOrder[] = [];
  private readonly risks: ProcurementRisk[] = [];

  constructor() {
    super();
    this.seed('tenant-001');
    this.seed('tenant-002');
  }

  private seed(tenantId: string): void {
    this.suppliers.push({
      id: `${tenantId}-sup-1`,
      tenantId,
      name: 'Nusantara Industrial Supply',
      taxId: 'NPWP-01.234.567.8-091.000',
      category: 'machinery',
      branchCode: 'JKT',
      complianceStatus: 'verified',
      rating: 88,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.requisitions.push({
      id: `${tenantId}-req-1`,
      tenantId,
      title: 'Packaging line motor replacement',
      requesterDept: 'operations',
      branchCode: 'JKT',
      amount: 310000000,
      currency: 'IDR',
      status: 'pending_requester_hod',
      createdBy: 'user-demo',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

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
      complianceStatus: 'pending',
      rating: 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.suppliers.push(created);
    return created;
  }

  async getRequisitions(tenantId: string): Promise<Requisition[]> {
    return this.requisitions.filter((item) => item.tenantId === tenantId);
  }

  async createRequisition(tenantId: string, data: CreateRequisitionDto): Promise<Requisition> {
    const created: Requisition = {
      id: `${tenantId}-req-${this.requisitions.length + 1}`,
      tenantId,
      title: data.title,
      requesterDept: data.requesterDept,
      branchCode: data.branchCode.toUpperCase(),
      amount: data.amount,
      currency: data.currency || 'IDR',
      status: 'pending_requester_hod',
      createdBy: data.createdBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.requisitions.push(created);
    if (created.amount > 1000000000) {
      this.risks.push({
        id: `${tenantId}-risk-${this.risks.length + 1}`,
        tenantId,
        code: 'price_spike',
        severity: 'high',
        status: 'open',
        entityId: created.id,
        detail: 'Requisition amount exceeds OPEX control threshold.',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return created;
  }

  async approveRequesterHod(tenantId: string, requisitionId: string): Promise<Requisition> {
    const requisition = this.requisitions.find(
      (item) => item.tenantId === tenantId && item.id === requisitionId,
    );
    if (!requisition) throw new NotFoundException('Requisition not found');
    requisition.status = 'approved_requester_hod';
    requisition.updatedAt = new Date();
    return requisition;
  }

  async releasePurchaseOrder(tenantId: string, data: ReleasePoDto): Promise<PurchaseOrder> {
    const requisition = this.requisitions.find(
      (item) => item.tenantId === tenantId && item.id === data.requisitionId,
    );
    if (!requisition) throw new NotFoundException('Requisition not found');
    if (requisition.status !== 'approved_requester_hod' && requisition.status !== 'final_approved') {
      throw new BadRequestException('Requisition is not approved for PO release.');
    }

    const supplier = this.suppliers.find((item) => item.tenantId === tenantId && item.id === data.supplierId);
    if (!supplier) throw new NotFoundException('Supplier not found');

    const po: PurchaseOrder = {
      id: `${tenantId}-po-${this.purchaseOrders.length + 1}`,
      tenantId,
      requisitionId: requisition.id,
      supplierId: supplier.id,
      branchCode: requisition.branchCode,
      totalAmount: data.totalAmount,
      status: 'released',
      issuedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.purchaseOrders.push(po);
    requisition.status = 'po_released';
    requisition.updatedAt = new Date();
    return po;
  }

  async getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    return this.purchaseOrders.filter((item) => item.tenantId === tenantId);
  }

  async getRiskSignals(tenantId: string): Promise<ProcurementRisk[]> {
    return this.risks.filter((item) => item.tenantId === tenantId);
  }

  async runRiskScan(tenantId: string): Promise<ProcurementRisk[]> {
    const tenantReqs = this.requisitions.filter((item) => item.tenantId === tenantId);
    tenantReqs.forEach((req) => {
      if (req.status === 'po_released' && req.amount > 2000000000) {
        const exists = this.risks.some(
          (risk) => risk.tenantId === tenantId && risk.entityId === req.id && risk.code === 'price_spike',
        );
        if (!exists) {
          this.risks.push({
            id: `${tenantId}-risk-${this.risks.length + 1}`,
            tenantId,
            code: 'price_spike',
            severity: 'high',
            status: 'open',
            entityId: req.id,
            detail: 'Released PO has high spend spike.',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    });
    return this.getRiskSignals(tenantId);
  }
}

