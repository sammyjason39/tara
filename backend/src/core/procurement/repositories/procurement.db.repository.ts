import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import { v4 as uuidv4 } from "uuid";
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
import {
  SupplierMaster,
  ProcurementRequisition,
  ProcurementFinalPo,
  ProcurementRiskSignal,
  SupplierBranch,
  SupplierProduct,
  ProcurementDraftPo,
  ProcurementContract,
  ProcurementAuditEvent,
} from "@prisma/client";
import { IProcurementRepository } from "./procurement.repository.interface";

@Injectable()
export class ProcurementDbRepository extends IProcurementRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ─── AUDIT HELPERS ──────────────────────────────────────────────────────────

  async createAuditEvent(
    tenantId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    detail = "",
  ): Promise<any> {
    return this.prisma.procurementAuditEvent.create({
      data: {
        id: uuidv4(),
        tenantId, actorId, action, entityType, entityId, detail },
    });
  }

  async getAuditEvents(tenantId: string): Promise<any[]> {
    const events = await this.prisma.procurementAuditEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
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

  // ─── CATEGORIES ─────────────────────────────────────────────────────────────

  async getCategories(tenantId: string): Promise<any[]> {
    return this.prisma.procurementCategory.findMany({
      where: { tenantId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async upsertCategory(
    tenantId: string,
    data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto,
  ): Promise<any> {
    const categoryData = {
      name: (data as any).name!,
      description: (data as any).description,
      active: (data as any).active ?? true,
    };

    if ("id" in data && data.id) {
      return this.prisma.procurementCategory.update({
        where: { id: data.id, tenantId },
        data: categoryData,
      });
    } else {
      return this.prisma.procurementCategory.create({
        data: {
        id: uuidv4(),
        updatedAt: new Date(),
          ...categoryData,
          tenantId,
        },
      });
    }
  }

  async deleteCategory(tenantId: string, id: string): Promise<any> {
    return this.prisma.procurementCategory.update({
      where: { id, tenantId },
      data: { active: false },
    });
  }

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────────

  async getSuppliers(tenantId: string): Promise<Supplier[]> {
    const suppliers = await this.prisma.supplierMaster.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return suppliers.map((s: SupplierMaster) => ({
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      taxId: s.taxId || "",
      category: s.categories[0] || "General",
      categories: s.categories,
      branchCode: "HQ",
      complianceStatus: s.complianceStatus as any,
      globalRating: s.globalRating,
      riskTier: s.riskTier as any,
      rating: s.globalRating,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async createSupplier(tenantId: string, data: CreateSupplierDto): Promise<Supplier> {
    const created = await this.prisma.supplierMaster.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId,
        name: data.name,
        taxId: data.taxId,
        categories: [data.category],
        website: data.website,
        contactPerson: data.contactPerson,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        complianceStatus: "PENDING",
        globalRating: 70,
        riskTier: "MEDIUM",
      },
    });
    return {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      taxId: created.taxId || "",
      category: created.categories[0],
      branchCode: data.branchCode,
      complianceStatus: "PENDING" as any,
      rating: created.globalRating,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  // ─── SUPPLIER BRANCHES ────────────────────────────────────────────────────────

  async getSupplierBranches(tenantId: string): Promise<any[]> {
    const branches = await this.prisma.supplierBranch.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
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

  async createSupplierBranch(tenantId: string, data: CreateSupplierBranchDto): Promise<any> {
    const supplier = await this.prisma.supplierMaster.findUnique({
      where: { id: data.supplierId, tenantId },
    });
    if (!supplier) throw new NotFoundException("Supplier not found");

    const created = await this.prisma.supplierBranch.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId,
        supplierId: data.supplierId,
        branchCode: data.branchCode,
        branchName: data.branchName,
        location: data.location,
        fullAddress: data.fullAddress,
        contactPerson: data.contactPerson,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        leadTimeDays: data.leadTimeDays,
        localRating: 70,
        riskTier: "MEDIUM",
        active: data.active ?? true,
      },
    });
    return {
      id: created.id,
      tenantId: created.tenantId,
      supplierId: created.supplierId,
      branchCode: created.branchCode,
      branchName: created.branchName,
      location: created.location,
      leadTimeDays: created.leadTimeDays,
      localRating: created.localRating,
      riskTier: created.riskTier.toLowerCase(),
      active: created.active,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  // ─── SUPPLIER PRODUCTS ────────────────────────────────────────────────────────

  async getSupplierProducts(tenantId: string): Promise<any[]> {
    const products = await this.prisma.supplierProduct.findMany({
      where: { tenantId, active: true },
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

  async upsertSupplierProduct(tenantId: string, data: UpsertSupplierProductDto): Promise<any> {
    if (data.id) {
      const updated = await this.prisma.supplierProduct.update({
        where: { id: data.id, tenantId },
        data: {
          sku: data.sku,
          name: data.name,
          category: data.category,
          unitPrice: data.unitPrice,
          currency: data.currency || "IDR",
          qualityScore: data.qualityScore ?? 70,
          active: data.active ?? true,
        },
      });
      return { ...updated, unitPrice: Number(updated.unitPrice) };
    } else {
      const created = await this.prisma.supplierProduct.create({
        data: {
        id: uuidv4(),
        updatedAt: new Date(),
          tenantId,
          supplierId: data.supplierId,
          branchId: data.branchId,
          sku: data.sku,
          name: data.name,
          category: data.category,
          unitPrice: data.unitPrice,
          currency: data.currency || "IDR",
          qualityScore: data.qualityScore ?? 70,
          active: data.active ?? true,
        },
      });
      return { ...created, unitPrice: Number(created.unitPrice) };
    }
  }

  async getSupplierRecommendations(
    tenantId: string,
    params: { branchCode?: string; category?: string },
  ): Promise<any[]> {
    const products = await this.prisma.supplierProduct.findMany({
      where: {
        tenantId,
        category: params.category,
        active: true,
        supplierBranch: {
          active: true,
          ...(params.branchCode ? { branchCode: params.branchCode } : {}),
        },
      },
      include: { supplierMaster: true, supplierBranch: true },
      take: 10,
    });
    return products.map((p) => ({
      supplierId: p.supplierId,
      branchId: p.branchId,
      supplierName: (p as any).supplierMaster.name,
      branchName: (p as any).supplierBranch.branchName,
      branchCode: (p as any).supplierBranch.branchCode,
      category: p.category,
      score: p.qualityScore,
      riskTier: (p as any).supplierBranch.riskTier,
      unitPrice: Number(p.unitPrice),
      leadTimeDays: (p as any).supplierBranch.leadTimeDays,
    }));
  }

  // ─── REQUISITIONS ─────────────────────────────────────────────────────────────

  async getRequisitions(tenantId: string): Promise<Requisition[]> {
    const requisitions = await this.prisma.procurementRequisition.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return requisitions.map((r: ProcurementRequisition) => ({
      id: r.id,
      tenantId: r.tenantId,
      title: r.title,
      description: r.description,
      category: r.category,
      budgetClass: r.budgetClass as any,
      requesterDept: r.departmentId,
      branchCode: r.branchCode,
      amount: Number(r.amount),
      currency: r.currency as any,
      status: r.status as any,
      approvals: {} as any,
      contractRequired: false,
      createdBy: r.requesterId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createRequisition(tenantId: string, data: CreateRequisitionDto): Promise<Requisition> {
    const created = await this.prisma.procurementRequisition.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId,
        requesterId: data.createdBy || "system",
        departmentId: data.requesterDept,
        branchCode: data.branchCode,
        title: data.title,
        description: data.description,
        category: data.category || "General",
        budgetClass: "OPEX",
        amount: data.amount,
        currency: data.currency || "IDR",
        status: "PENDING_REQUESTER_HOD",
      },
    });
    return {
      id: created.id,
      tenantId: created.tenantId,
      title: created.title,
      description: created.description,
      category: created.category,
      budgetClass: created.budgetClass as any,
      requesterDept: created.departmentId,
      branchCode: created.branchCode,
      amount: Number(created.amount),
      currency: created.currency as any,
      status: created.status as any,
      approvals: {} as any,
      contractRequired: false,
      createdBy: created.requesterId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async approveRequesterHod(tenantId: string, requisitionId: string): Promise<Requisition> {
    const updated = await this.prisma.procurementRequisition.update({
      where: { id: requisitionId, tenantId },
      data: { status: "APPROVED_REQUESTER_HOD" },
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      budgetClass: updated.budgetClass as any,
      requesterDept: updated.departmentId,
      branchCode: updated.branchCode,
      amount: Number(updated.amount),
      currency: updated.currency as any,
      status: updated.status as any,
      approvals: {} as any,
      contractRequired: false,
      createdBy: updated.requesterId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async approveFinal(tenantId: string, requisitionId: string, data: ApproveFinalDto): Promise<Requisition> {
    const req = await this.prisma.procurementRequisition.findUnique({
      where: { id: requisitionId, tenantId },
    });
    if (!req) throw new NotFoundException("Requisition not found");

    // Progress status toward FINAL_APPROVED
    // For simplicity: each approver advances status; once all approved → FINAL_APPROVED
    const newStatus =
      data.approver === "FINANCE_HOD" ? "FINAL_APPROVED" : "FINAL_APPROVAL_PENDING";

    const updated = await this.prisma.procurementRequisition.update({
      where: { id: requisitionId, tenantId },
      data: { status: newStatus },
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      budgetClass: updated.budgetClass as any,
      requesterDept: updated.departmentId,
      branchCode: updated.branchCode,
      amount: Number(updated.amount),
      currency: updated.currency as any,
      status: updated.status as any,
      approvals: {} as any,
      contractRequired: false,
      createdBy: updated.requesterId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // ─── DRAFT PURCHASE ORDERS ────────────────────────────────────────────────────

  async getDraftPurchaseOrders(tenantId: string): Promise<any[]> {
    const drafts = await this.prisma.procurementDraftPo.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return drafts.map((d: ProcurementDraftPo) => ({
      id: d.id,
      tenantId: d.tenantId,
      requisitionId: d.requisitionId,
      branchCode: d.branchCode,
      supplierId: d.supplierId,
      supplierBranchId: d.supplierBranchId,
      contractType: d.contractType.toLowerCase(),
      status: d.status,
      quotedTotal: Number(d.quotedTotal),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async createDraftPurchaseOrder(tenantId: string, data: CreateDraftPoDto, createdBy: string): Promise<any> {
    const requisition = await this.prisma.procurementRequisition.findUnique({
      where: { id: data.requisitionId, tenantId },
    });
    if (!requisition) throw new NotFoundException("Requisition not found");

    const totalAmount = data.quotedTotal
      ?? data.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const draft = await this.prisma.procurementDraftPo.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId,
        requisitionId: data.requisitionId,
        branchCode: requisition.branchCode,
        supplierId: data.supplierId,
        supplierBranchId: data.supplierBranchId,
        contractType: data.contractType,
        status: "DRAFT",
        lineItems: data.lineItems as any,
        quotedTotal: totalAmount,
        createdBy,
      },
    });

    // Update requisition status
    await this.prisma.procurementRequisition.update({
      where: { id: data.requisitionId },
      data: { status: "DRAFT_PO_PREPARED" },
    });

    return {
      id: draft.id,
      tenantId: draft.tenantId,
      requisitionId: draft.requisitionId,
      branchCode: draft.branchCode,
      supplierId: draft.supplierId,
      supplierBranchId: draft.supplierBranchId,
      contractType: draft.contractType.toLowerCase(),
      status: draft.status,
      quotedTotal: Number(draft.quotedTotal),
      lineItems: data.lineItems,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }

  async approveDraftByProcurementHod(tenantId: string, draftPoId: string): Promise<any> {
    const draft = await this.prisma.procurementDraftPo.findUnique({
      where: { id: draftPoId, tenantId },
    });
    if (!draft) throw new NotFoundException("Draft PO not found");

    const updated = await this.prisma.procurementDraftPo.update({
      where: { id: draftPoId, tenantId },
      data: { status: "PROCUREMENT_HOD_APPROVED" },
    });

    await this.prisma.procurementRequisition.update({
      where: { id: draft.requisitionId },
      data: { status: "DRAFT_PO_APPROVED" },
    });

    return { ...updated, quotedTotal: Number(updated.quotedTotal), status: updated.status };
  }

  async confirmSupplierQuote(tenantId: string, draftPoId: string, data: ConfirmQuoteDto): Promise<any> {
    const draft = await this.prisma.procurementDraftPo.findUnique({
      where: { id: draftPoId, tenantId },
    });
    if (!draft) throw new NotFoundException("Draft PO not found");

    const updated = await this.prisma.procurementDraftPo.update({
      where: { id: draftPoId, tenantId },
      data: {
        status: "SUPPLIER_CONFIRMED",
        ...(data.quotedTotal != null ? { quotedTotal: data.quotedTotal } : {}),
      },
    });

    await this.prisma.procurementRequisition.update({
      where: { id: draft.requisitionId },
      data: { status: "SUPPLIER_CONFIRMED" },
    });

    return { ...updated, quotedTotal: Number(updated.quotedTotal) };
  }

  // ─── PURCHASE ORDERS (FINAL) ──────────────────────────────────────────────────

  async releasePurchaseOrder(tenantId: string, data: ReleasePoDto): Promise<PurchaseOrder> {
    const requisition = await this.prisma.procurementRequisition.findUnique({
      where: { id: data.requisitionId, tenantId },
    });
    if (!requisition) throw new NotFoundException("Requisition not found");

    const po = await this.prisma.procurementFinalPo.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId,
        requisitionId: requisition.id,
        draftPoId: "auto",
        supplierId: data.supplierId,
        supplierBranchId: "auto",
        branchCode: requisition.branchCode,
        totalAmount: data.totalAmount,
        status: "RELEASED",
      },
    });

    await this.prisma.procurementRequisition.update({
      where: { id: requisition.id },
      data: { status: "PO_RELEASED" },
    });

    // Cross-Module: create payable
    const supplier = await this.prisma.supplierMaster.findUnique({ where: { id: data.supplierId } });
    await this.prisma.payable.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId,
        vendorName: supplier?.name || "Unknown Supplier",
        amount: data.totalAmount,
        currency: requisition.currency || "IDR",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "RECEIVED",
      },
    });

    return {
      id: po.id,
      tenantId: po.tenantId,
      requisitionId: po.requisitionId,
      supplierId: po.supplierId,
      branchCode: po.branchCode,
      totalAmount: Number(po.totalAmount),
      status: "released" as any,
      issuedAt: po.issuedAt,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
    };
  }

  async getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    const pos = await this.prisma.procurementFinalPo.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return pos.map((po: ProcurementFinalPo) => ({
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

  // ─── RECEIPTS ─────────────────────────────────────────────────────────────────

  async createReceipt(tenantId: string, data: CreateReceiptDto, createdBy: string): Promise<any> {
    const finalPo = await this.prisma.procurementFinalPo.findUnique({
      where: { id: data.finalPoId, tenantId },
    });
    if (!finalPo) throw new NotFoundException("Final PO not found");

    // Update PO status to RECEIVED
    await this.prisma.procurementFinalPo.update({
      where: { id: data.finalPoId },
      data: { status: "RECEIVED" },
    });

    // Recalculate supplier rating based on receipt
    const qualityScore = (data.deliveryOnTime ? 25 : 0) + (data.quantityAccuracy * 0.5) + (data.qualityScore * 0.25) - (data.issueCount * 5) - (data.invoiceMismatch ? 10 : 0);
    const newRating = Math.max(0, Math.min(100, qualityScore));

    await this.prisma.supplierMaster.update({
      where: { id: finalPo.supplierId },
      data: { globalRating: Math.round(newRating) },
    });

    return {
      finalPoId: data.finalPoId,
      tenantId,
      deliveryOnTime: data.deliveryOnTime,
      quantityAccuracy: data.quantityAccuracy,
      qualityScore: data.qualityScore,
      issueCount: data.issueCount,
      invoiceMismatch: data.invoiceMismatch,
      calculatedRating: Math.round(newRating),
      createdAt: new Date(),
    };
  }

  // ─── CONTRACTS ────────────────────────────────────────────────────────────────

  async getContracts(tenantId: string): Promise<any[]> {
    const contracts = await this.prisma.procurementContract.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return contracts.map((c: ProcurementContract) => ({
      id: c.id,
      tenantId: c.tenantId,
      requisitionId: c.requisitionId,
      supplierId: c.supplierId,
      status: c.status,
      version: c.version,
      signedBySupplier: c.signedBySupplier,
      signedByProcHod: c.signedByProcHod,
      signedByFinanceHod: c.signedByFinanceHod,
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async createContract(tenantId: string, data: CreateContractDto, createdBy: string): Promise<any> {
    const existing = await this.prisma.procurementContract.findFirst({
      where: { tenantId, requisitionId: data.requisitionId },
    });

    if (existing) {
      // Increment version and reset
      const updated = await this.prisma.procurementContract.update({
        where: { id: existing.id },
        data: {
          supplierId: data.supplierId,
          status: "LEGAL_REVIEW",
          version: existing.version + 1,
          notes: data.notes || existing.notes,
          signedBySupplier: false,
          signedByProcHod: false,
          signedByFinanceHod: false,
        },
      });
      return { ...updated };
    }

    const created = await this.prisma.procurementContract.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId,
        requisitionId: data.requisitionId,
        supplierId: data.supplierId,
        status: "LEGAL_REVIEW",
        version: 1,
        notes: data.notes,
        signedBySupplier: false,
        signedByProcHod: false,
        signedByFinanceHod: false,
        attachmentIds: data.attachmentIds || [],
      },
    });

    await this.prisma.procurementRequisition.update({
      where: { id: data.requisitionId, tenantId },
      data: { status: "LEGAL_APPROVED" },
    }).catch(() => {}); // Non-fatal; requisition may not exist in edge cases

    return { ...created };
  }

  async approveLegalContract(tenantId: string, contractId: string): Promise<any> {
    const contract = await this.prisma.procurementContract.findUnique({
      where: { id: contractId, tenantId },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    const updated = await this.prisma.procurementContract.update({
      where: { id: contractId, tenantId },
      data: { status: "LEGAL_APPROVED" },
    });
    return { ...updated };
  }

  async signContract(tenantId: string, contractId: string, data: SignContractDto): Promise<any> {
    const contract = await this.prisma.procurementContract.findUnique({
      where: { id: contractId, tenantId },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    const signPatch: any = {};
    if (data.party === "SUPPLIER") signPatch.signedBySupplier = true;
    if (data.party === "PROCUREMENT_HOD") signPatch.signedByProcHod = true;
    if (data.party === "FINANCE_HOD") signPatch.signedByFinanceHod = true;

    const updated = await this.prisma.procurementContract.update({
      where: { id: contractId, tenantId },
      data: signPatch,
    });

    // If all three signed → status = SIGNED
    const allSigned = updated.signedBySupplier && updated.signedByProcHod && updated.signedByFinanceHod;
    const anySigned = updated.signedBySupplier || updated.signedByProcHod || updated.signedByFinanceHod;

    const finalStatus = allSigned ? "SIGNED" : anySigned ? "PARTIAL_SIGNED" : updated.status;
    const finalContract = await this.prisma.procurementContract.update({
      where: { id: contractId },
      data: { status: finalStatus },
    });

    return { ...finalContract };
  }

  // ─── RISK MANAGEMENT ──────────────────────────────────────────────────────────

  async getRiskSignals(tenantId: string): Promise<ProcurementRisk[]> {
    const risks = await this.prisma.procurementRiskSignal.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return risks.map((r: ProcurementRiskSignal) => ({
      id: r.id,
      tenantId: r.tenantId,
      code: r.code as any,
      severity: r.severity as any,
      status: r.status as any,
      entityId: r.entityId,
      detail: r.detail,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createRiskSignal(tenantId: string, data: CreateRiskSignalDto): Promise<any> {
    const existing = await this.prisma.procurementRiskSignal.findFirst({
      where: { tenantId, entityId: data.entityId, code: data.code, status: "OPEN" },
    });
    if (existing) return existing;

    return this.prisma.procurementRiskSignal.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId,
        code: data.code,
        severity: data.severity,
        status: "OPEN",
        entityId: data.entityId,
        detail: data.detail || "",
      },
    });
  }

  async updateRiskSignalStatus(tenantId: string, riskSignalId: string, status: string): Promise<any> {
    const signal = await this.prisma.procurementRiskSignal.findUnique({
      where: { id: riskSignalId, tenantId },
    });
    if (!signal) throw new NotFoundException("Risk signal not found");

    return this.prisma.procurementRiskSignal.update({
      where: { id: riskSignalId },
      data: { status },
    });
  }

  async runRiskScan(tenantId: string): Promise<ProcurementRisk[]> {
    const highAmountReqs = await this.prisma.procurementRequisition.findMany({
      where: { tenantId, amount: { gt: 1000000000 }, status: "PO_RELEASED" },
    });
    for (const req of highAmountReqs) {
      const existing = await this.prisma.procurementRiskSignal.findFirst({
        where: { tenantId, entityId: req.id, code: "PRICE_SPIKE", status: "OPEN" },
      });
      if (!existing) {
        await this.prisma.procurementRiskSignal.create({
          data: {
        id: uuidv4(),
        updatedAt: new Date(),
            tenantId,
            code: "PRICE_SPIKE",
            severity: "HIGH",
            status: "OPEN",
            entityId: req.id,
            detail: "Released PO amount exceeds threshold (> IDR 1B).",
          },
        });
      }
    }
    return this.getRiskSignals(tenantId);
  }

  // ─── PORTAL MESSAGES ──────────────────────────────────────────────────────────

  async getPortalMessages(tenantId: string): Promise<any[]> {
    const messages = await this.prisma.supplierPortalMessage.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return messages.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      supplierId: m.supplierId,
      supplierBranchId: m.supplierBranchId,
      direction: m.direction,
      type: m.type,
      relatedEntityId: m.relatedEntityId,
      content: m.content,
      attachmentName: m.attachmentName,
      createdBy: m.createdBy,
      createdAt: m.createdAt,
    }));
  }

  async createPortalMessage(tenantId: string, data: CreatePortalMessageDto, createdBy: string): Promise<any> {
    const created = await this.prisma.supplierPortalMessage.create({
      data: {
        id: uuidv4(),
        
        tenantId,
        supplierId: data.supplierId,
        supplierBranchId: data.supplierBranchId,
        direction: data.direction,
        type: data.type,
        content: data.content,
        attachmentName: data.attachmentName,
        createdBy,
      },
    });
    return {
      id: created.id,
      tenantId: created.tenantId,
      supplierId: created.supplierId,
      supplierBranchId: created.supplierBranchId,
      direction: created.direction,
      type: created.type,
      content: created.content,
      attachmentName: created.attachmentName,
      createdBy: created.createdBy,
      createdAt: created.createdAt,
    };
  }

  // ─── SPEND INSIGHTS ────────────────────────────────────────────────────────────

  async getSpendInsights(tenantId: string): Promise<any[]> {
    const requisitions = await this.prisma.procurementRequisition.findMany({
      where: { tenantId, status: "PO_RELEASED" },
    });
    const categories = Array.from(new Set(requisitions.map((r) => r.category)));
    return categories.map((cat) => {
      const catReqs = requisitions.filter((r) => r.category === cat);
      const totalSpend = catReqs.reduce((sum, r) => sum + Number(r.amount), 0);
      return {
        id: `${tenantId}-si-${cat}`,
        label: cat,
        category: "SPEND",
        value: String(totalSpend),
      };
    });
  }
}
