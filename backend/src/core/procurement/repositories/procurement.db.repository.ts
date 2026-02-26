import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { CreateRequisitionDto } from '../dto/create-requisition.dto';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { ReleasePoDto } from '../dto/release-po.dto';
import { ProcurementRisk } from '../entities/procurement-risk.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { Requisition } from '../entities/requisition.entity';
import { Supplier } from '../entities/supplier.entity';
import {
  SupplierMaster,
  ProcurementRequisition,
  ProcurementFinalPO,
  ProcurementRiskSignal,
  SupplierBranch,
  SupplierProduct,
  ProcurementDraftPO,
  ProcurementContract,
  ProcurementAuditEvent,
} from '@prisma/client';
import { IProcurementRepository } from './procurement.repository.interface';

@Injectable()
export class ProcurementDbRepository extends IProcurementRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSupplierRecommendations(
    tenantId: string,
    criteria: any,
  ): Promise<any[]> {
    return [];
  }

  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    const suppliers = await this.prisma.supplierMaster.findMany({
      where: { tenantId: tenantId, deletedAt: null },
    });

    return suppliers.map((s: SupplierMaster) => ({
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      taxId: s.taxId || '',
      category: s.categories[0] || 'General',
      branchCode: 'JKT',
      complianceStatus: s.complianceStatus.toLowerCase() as any,
      rating: s.globalRating,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async createSupplier(tenantId: string, data: CreateSupplierDto): Promise<Supplier> {
    const created = await this.prisma.supplierMaster.create({
      data: {
        tenantId: tenantId,
        name: data.name,
        taxId: data.taxId,
        categories: [data.category],
        complianceStatus: 'PENDING',
        globalRating: 70,
        riskTier: 'MEDIUM',
      },
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      taxId: created.taxId || '',
      category: created.categories[0],
      branchCode: data.branchCode,
      complianceStatus: 'pending',
      rating: created.globalRating,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async getRequisitions(tenantId: string): Promise<Requisition[]> {
    const requisitions = await this.prisma.procurementRequisition.findMany({
      where: { tenantId: tenantId },
    });

    return requisitions.map((r: ProcurementRequisition) => ({
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      requesterDept: r.departmentId,
      branchCode: r.branchCode,
      amount: Number(r.amount),
      currency: r.currency as any,
      status: r.status.toLowerCase() as any,
      createdBy: r.requesterId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createRequisition(tenantId: string, data: CreateRequisitionDto): Promise<Requisition> {
    const created = await this.prisma.procurementRequisition.create({
      data: {
        tenantId: tenantId,
        requesterId: data.createdBy || 'system',
        departmentId: data.requesterDept,
        branchCode: data.branchCode,
        title: data.title,
        description: data.title,
        category: 'General',
        budgetClass: 'OPEX',
        amount: data.amount,
        currency: data.currency || 'IDR',
        status: 'PENDING_REQUESTER_HOD',
      },
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      title: created.title,
      requesterDept: created.departmentId,
      branchCode: created.branchCode,
      amount: Number(created.amount),
      currency: created.currency as any,
      status: 'pending_requester_hod',
      createdBy: created.requesterId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async approveRequesterHod(tenantId: string, requisitionId: string): Promise<Requisition> {
    const updated = await this.prisma.procurementRequisition.update({
      where: { id: requisitionId, tenantId: tenantId },
      data: { status: 'APPROVED_REQUESTER_HOD' },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      title: updated.title,
      requesterDept: updated.departmentId,
      branchCode: updated.branchCode,
      amount: Number(updated.amount),
      currency: updated.currency as any,
      status: 'approved_requester_hod',
      createdBy: updated.requesterId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async releasePurchaseOrder(tenantId: string, data: ReleasePoDto): Promise<PurchaseOrder> {
    const requisition = await this.prisma.procurementRequisition.findUnique({
      where: { id: data.requisitionId, tenantId: tenantId },
    });

    if (!requisition) throw new NotFoundException('Requisition not found');

    const po = await this.prisma.procurementFinalPO.create({
      data: {
        tenantId: tenantId,
        requisitionId: requisition.id,
        draftPoId: 'placeholder',
        supplierId: data.supplierId,
        supplierBranchId: 'placeholder',
        branchCode: requisition.branchCode,
        totalAmount: data.totalAmount,
        status: 'RELEASED',
      },
    });

    await this.prisma.procurementRequisition.update({
      where: { id: requisition.id },
      data: { status: 'PO_RELEASED' },
    });

    return {
      id: po.id,
      tenantId: po.tenantId,
      requisitionId: po.requisitionId,
      supplierId: po.supplierId,
      branchCode: po.branchCode,
      totalAmount: Number(po.totalAmount),
      status: 'released',
      issuedAt: po.issuedAt,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
    };
  }

  async getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    const pos = await this.prisma.procurementFinalPO.findMany({
      where: { tenantId: tenantId },
    });

    return pos.map((po: ProcurementFinalPO) => ({
      id: po.id,
      tenantId: po.tenantId,
      requisitionId: po.requisitionId,
      supplierId: po.supplierId,
      branchCode: po.branchCode,
      totalAmount: Number(po.totalAmount),
      status: po.status.toLowerCase() as any,
      issuedAt: po.issuedAt,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
    }));
  }

  async getRiskSignals(tenantId: string): Promise<ProcurementRisk[]> {
    const risks = await this.prisma.procurementRiskSignal.findMany({
      where: { tenantId: tenantId },
    });

    return risks.map((r: ProcurementRiskSignal) => ({
      id: r.id,
      tenantId: r.tenantId,
      code: r.code.toLowerCase() as any,
      severity: r.severity.toLowerCase() as any,
      status: r.status.toLowerCase() as any,
      entityId: r.entityId,
      detail: r.detail,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async runRiskScan(tenantId: string): Promise<ProcurementRisk[]> {
    const highAmountReqs = await this.prisma.procurementRequisition.findMany({
      where: {
        tenantId: tenantId,
        amount: { gt: 1000000000 },
        status: 'PO_RELEASED',
      },
    });

    for (const req of highAmountReqs) {
      const existing = await this.prisma.procurementRiskSignal.findFirst({
        where: { tenantId: tenantId, entityId: req.id, code: 'PRICE_SPIKE' },
      });

      if (!existing) {
        await this.prisma.procurementRiskSignal.create({
          data: {
            tenantId: tenantId,
            code: 'PRICE_SPIKE',
            severity: 'HIGH',
            status: 'OPEN',
            entityId: req.id,
            detail: 'Released PO has high spend spike.',
          },
        });
      }
    }

    return this.getRiskSignals(tenantId);
  }

  async getSupplierBranches(tenantId: string): Promise<any[]> {
    const branches = await this.prisma.supplierBranch.findMany({
      where: { tenantId: tenantId, deletedAt: null },
    });
    return branches.map((b: SupplierBranch) => ({
      id: b.id,
      tenantId: b.tenantId,
      supplierId: b.supplierId,
      branchCode: b.branchCode,
      branchName: b.branchName,
      location: b.location,
      leadTimeDays: b.leadTimeDays,
      localRating: b.localRating,
      riskTier: b.riskTier.toLowerCase(),
      active: b.active,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
  }

  async getSupplierProducts(tenantId: string): Promise<any[]> {
    const products = await this.prisma.supplierProduct.findMany({
      where: { tenantId: tenantId, active: true },
    });
    return products.map((p: SupplierProduct) => ({
      id: p.id,
      tenantId: p.tenantId,
      supplierId: p.supplierId,
      branchId: p.branchId,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unitPrice: Number(p.unitPrice),
      currency: p.currency,
      qualityScore: p.qualityScore,
      active: p.active,
      updatedAt: p.updatedAt,
    }));
  }

  async getDraftPurchaseOrders(tenantId: string): Promise<any[]> {
    const drafts = await this.prisma.procurementDraftPO.findMany({
      where: { tenantId: tenantId },
    });
    return drafts.map((d: ProcurementDraftPO) => ({
      id: d.id,
      tenantId: d.tenantId,
      requisitionId: d.requisitionId,
      branchCode: d.branchCode,
      supplierId: d.supplierId,
      supplierBranchId: d.supplierBranchId,
      contractType: d.contractType.toLowerCase(),
      status: d.status.toLowerCase(),
      quotedTotal: Number(d.quotedTotal),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async getContracts(tenantId: string): Promise<any[]> {
    const contracts = await this.prisma.procurementContract.findMany({
      where: { tenantId: tenantId },
    });
    return contracts.map((c: ProcurementContract) => ({
      id: c.id,
      tenantId: c.tenantId,
      requisitionId: c.requisitionId,
      supplierId: c.supplierId,
      status: c.status.toLowerCase(),
      version: c.version,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async getAuditEvents(tenantId: string): Promise<any[]> {
    const events = await this.prisma.procurementAuditEvent.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return events.map((e: ProcurementAuditEvent) => ({
      id: e.id,
      tenantId: e.tenantId,
      actorId: e.actorId,
      action: e.action,
      entityType: e.entityType.toLowerCase(),
      entityId: e.entityId,
      detail: e.detail,
      createdAt: e.createdAt,
    }));
  }

  async getSpendInsights(tenantId: string): Promise<any[]> {
    const requisitions = await this.prisma.procurementRequisition.findMany({
      where: { tenantId: tenantId, status: 'PO_RELEASED' },
    });

    const categories = Array.from(new Set(requisitions.map((r: ProcurementRequisition) => r.category)));
    const insights = categories.map((cat) => {
      const catReqs = requisitions.filter((r: ProcurementRequisition) => r.category === cat);
      const totalSpend = catReqs.reduce((sum: number, r: ProcurementRequisition) => sum + Number(r.amount), 0);
      return {
        category: cat,
        totalSpend,
        count: catReqs.length,
        avgValue: totalSpend > 0 ? totalSpend / catReqs.length : 0,
      };
    });

    return insights;
  }
}
