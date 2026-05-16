import { TenantContext } from "../../../gateway/tenant-context.interface";
import { MultiTenancyUtil } from "../../../shared/utils/multi-tenancy.util";
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
  supplier_masters as SupplierMaster,
  procurement_requisitions as ProcurementRequisition,
  procurement_final_pos as ProcurementFinalPo,
  procurement_risk_signals as ProcurementRiskSignal,
  supplier_branches as SupplierBranch,
  supplier_products as SupplierProduct,
  procurement_draft_pos as ProcurementDraftPo,
  procurement_contracts as ProcurementContract,
  procurement_audit_events as ProcurementAuditEvent,
} from "@prisma/client";
import { IProcurementRepository } from "./procurement.repository.interface";

@Injectable()
export class ProcurementDbRepository extends IProcurementRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ─── AUDIT HELPERS ──────────────────────────────────────────────────────────

  async createAuditEvent(ctx: TenantContext,
    actor_id: string,
    action: string,
    entity_type: string,
    entity_id: string,
    detail = "",
  ): Promise<any> {
    return this.prisma.procurement_audit_events.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        actor_id: actor_id,
        action,
        entity_type: entity_type,
        entity_id: entity_id,
        detail,
      },
    });
  }

  async getAuditEvents(ctx: TenantContext): Promise<any[]> {
    const events = await this.prisma.procurement_audit_events.findMany({
      where: MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
      orderBy: { created_at: "desc" },
      take: 200,
    });
    return events.map((e: any) => ({
      id: e.id,
      tenant_id: e.tenant_id,
      actor_id: e.actor_id,
      action: e.action,
      entity_type: e.entity_type.toLowerCase(),
      entity_id: e.entity_id,
      detail: e.detail,
      created_at: e.created_at,
    }));
  }

  // ─── CATEGORIES ─────────────────────────────────────────────────────────────

  async getCategories(ctx: TenantContext): Promise<any[]> {
    return this.prisma.procurement_categories.findMany({
      where: { ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }), active: true },
      orderBy: { name: "asc" },
    });
  }

  async upsertCategory(ctx: TenantContext,
    data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto,
  ): Promise<any> {
    const categoryData = {
      name: (data as any).name!,
      description: (data as any).description,
      active: (data as any).active ?? true,
    };

    if ("id" in data && data.id) {
      return this.prisma.procurement_categories.update({
        where: { id: data.id, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
        data: categoryData,
      });
    } else {
      return this.prisma.procurement_categories.create({
        data: {
        id: uuidv4(),
        updated_at: new Date(),
          ...categoryData,
          ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        },
      });
    }
  }

  async deleteCategory(ctx: TenantContext, id: string): Promise<any> {
    return this.prisma.procurement_categories.update({
      where: { id, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { active: false },
    });
  }

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────────

  async getSuppliers(ctx: TenantContext): Promise<Supplier[]> {
    const suppliers = await this.prisma.supplier_masters.findMany({
      where: { ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }), deleted_at: null },
      orderBy: { created_at: "desc" },
    });
    return suppliers.map((s: any) => ({
      id: s.id,
      tenant_id: s.tenant_id,
      name: s.name,
      taxId: s.tax_id || "",
      category: s.categories[0] || "General",
      categories: s.categories,
      branchCode: "HQ",
      complianceStatus: s.compliance_status as any,
      globalRating: s.global_rating,
      riskTier: s.risk_tier as any,
      rating: s.global_rating,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
  }

  async createSupplier(ctx: TenantContext, data: CreateSupplierDto): Promise<Supplier> {
    const created = await this.prisma.supplier_masters.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        name: data.name,
        tax_id: data.taxId,
        categories: [data.category],
        website: data.website,
        contact_person: data.contactPerson,
        contact_email: data.contact_email,
        contact_phone: data.contactPhone,
        address: data.address,
        compliance_status: "PENDING",
        global_rating: 70,
        risk_tier: "MEDIUM",
      },
    });
    return {
      id: created.id,
      tenant_id: created.tenant_id,
      name: created.name,
      taxId: created.tax_id || "",
      category: created.categories[0],
      branchCode: data.branchCode,
      complianceStatus: "PENDING" as any,
      rating: created.global_rating,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  // ─── SUPPLIER BRANCHES ────────────────────────────────────────────────────────

  async getSupplierBranches(ctx: TenantContext): Promise<any[]> {
    const branches = await this.prisma.supplier_branches.findMany({
      where: { ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }), deleted_at: null },
      orderBy: { created_at: "desc" },
    });
    return branches.map((b: any) => ({
      id: b.id,
      tenant_id: b.tenant_id,
      supplierId: b.supplier_id,
      branchCode: b.branch_code,
      branchName: b.branch_name,
      location: b.location,
      leadTimeDays: b.lead_time_days,
      localRating: b.local_rating,
      riskTier: b.risk_tier.toLowerCase(),
      active: b.active,
      created_at: b.created_at,
      updated_at: b.updated_at,
    }));
  }

  async createSupplierBranch(ctx: TenantContext, data: CreateSupplierBranchDto): Promise<any> {
    const supplier = await this.prisma.supplier_masters.findUnique({
      where: { id: data.supplierId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
    });
    if (!supplier) throw new NotFoundException("Supplier not found");

    const created = await this.prisma.supplier_branches.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        supplier_id: data.supplierId,
        branch_code: data.branchCode,
        branch_name: data.branchName,
        location: JSON.stringify(data),
        full_address: data.fullAddress,
        contact_person: data.contactPerson,
        contact_email: data.contact_email,
        contact_phone: data.contactPhone,
        lead_time_days: data.leadTimeDays,
        local_rating: 70,
        risk_tier: "MEDIUM",
        active: data.active ?? true,
      },
    });
    return {
      id: created.id,
      tenant_id: created.tenant_id,
      supplierId: created.supplier_id,
      branchCode: created.branch_code,
      branchName: created.branch_name,
      locations: created,
      leadTimeDays: created.lead_time_days,
      localRating: created.local_rating,
      riskTier: created.risk_tier.toLowerCase(),
      active: created.active,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  // ─── SUPPLIER PRODUCTS ────────────────────────────────────────────────────────

  async getSupplierProducts(ctx: TenantContext): Promise<any[]> {
    const products = await this.prisma.supplier_products.findMany({
      where: { ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }), active: true },
    });
    return products.map((p: SupplierProduct) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      supplierId: p.supplier_id,
      branch_id: p.branch_id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit_price: Number(p.unit_price),
      currency: p.currency,
      quality_score: p.quality_score,
      active: p.active,
      updated_at: p.updated_at,
    }));
  }

  async upsertSupplierProduct(ctx: TenantContext, data: UpsertSupplierProductDto): Promise<any> {
    if (data.id) {
      const updated = await this.prisma.supplier_products.update({
        where: { id: data.id, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
        data: {
          sku: data.sku,
          name: data.name,
          category: data.category,
          unit_price: data.unit_price,
          currency: data.currency || "IDR",
          quality_score: data.qualityScore ?? 70,
          active: data.active ?? true,
        },
      });
      return { ...updated, unit_price: Number(updated.unit_price) };
    } else {
      const created = await this.prisma.supplier_products.create({
        data: {
        id: uuidv4(),
        updated_at: new Date(),
          ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
          supplier_id: data.supplierId,
          branch_id: data.branch_id,
          sku: data.sku,
          name: data.name,
          category: data.category,
          unit_price: data.unit_price,
          currency: data.currency || "IDR",
          quality_score: data.qualityScore ?? 70,
          active: data.active ?? true,
        },
      });
      return { ...created, unit_price: Number(created.unit_price) };
    }
  }

  async getSupplierRecommendations(ctx: TenantContext,
    params: { branchCode?: string; category?: string },
  ): Promise<any[]> {
    const products = await this.prisma.supplier_products.findMany({
      where: {
        ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        category: params.category,
        active: true,
        supplier_branches: {
          active: true,
          ...(params.branchCode ? { branch_code: params.branchCode } : {}),
        },
      },
      include: { supplier_masters: true, supplier_branches: true },
      take: 10,
    });
    return products.map((p) => ({
      supplierId: p.supplier_id,
      branch_id: p.branch_id,
      supplierName: p.supplier_masters?.name || "Unknown Supplier",
      branchName: p.supplier_branches?.branch_name || "Unknown Branch",
      branchCode: p.supplier_branches?.branch_code || "N/A",
      category: p.category,
      score: p.quality_score,
      riskTier: p.supplier_branches?.risk_tier || "LOW",
      unit_price: Number(p.unit_price),
      leadTimeDays: p.supplier_branches?.lead_time_days || 0,
    }));
  }

  // ─── REQUISITIONS ─────────────────────────────────────────────────────────────

  async getRequisitions(ctx: TenantContext): Promise<Requisition[]> {
    const requisitions = await this.prisma.procurement_requisitions.findMany({
      where: MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
      orderBy: { created_at: "desc" },
    });
    return (requisitions as any[]).map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      title: r.title,
      description: r.description,
      category: r.category,
      budgetClass: r.budget_class as any,
      requesterDept: r.department_id,
      branchCode: r.branch_code,
      amount: Number(r.amount),
      currency: r.currency as any,
      status: r.status as any,
      approvals: {} as any,
      contractRequired: false,
      createdBy: r.requester_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async createRequisition(ctx: TenantContext, data: CreateRequisitionDto): Promise<Requisition> {
    const created = await this.prisma.procurement_requisitions.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        requester_id: data.createdBy || "system",
        department_id: data.requesterDept,
        branch_code: data.branchCode,
        title: data.title,
        description: data.description,
        category: data.category || "General",
        budget_class: "OPEX",
        amount: data.amount,
        currency: data.currency || "IDR",
        status: "PENDING_REQUESTER_HOD",
      },
    });
    return {
      id: created.id,
      tenant_id: created.tenant_id,
      title: created.title,
      description: created.description,
      category: created.category,
      budgetClass: created.budget_class as any,
      requesterDept: created.department_id,
      branchCode: created.branch_code,
      amount: Number(created.amount),
      currency: created.currency as any,
      status: created.status as any,
      approvals: {} as any,
      contractRequired: false,
      createdBy: created.requester_id,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  async approveRequesterHod(ctx: TenantContext, requisitionId: string): Promise<Requisition> {
    const updated = await this.prisma.procurement_requisitions.update({
      where: { id: requisitionId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: "APPROVED_REQUESTER_HOD" },
    });
    return {
      id: updated.id,
      tenant_id: updated.tenant_id,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      budgetClass: updated.budget_class as any,
      requesterDept: updated.department_id,
      branchCode: updated.branch_code,
      amount: Number(updated.amount),
      currency: updated.currency as any,
      status: updated.status as any,
      approvals: {} as any,
      contractRequired: false,
      createdBy: updated.requester_id,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async approveFinal(ctx: TenantContext, requisitionId: string, data: ApproveFinalDto): Promise<Requisition> {
    const req = await this.prisma.procurement_requisitions.findUnique({
      where: { id: requisitionId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
    });
    if (!req) throw new NotFoundException("Requisition not found");

    // Progress status toward FINAL_APPROVED
    // For simplicity: each approver advances status; once all approved → FINAL_APPROVED
    const newStatus =
      data.approver === "FINANCE_HOD" ? "FINAL_APPROVED" : "FINAL_APPROVAL_PENDING";

    const updated = await this.prisma.procurement_requisitions.update({
      where: { id: requisitionId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: newStatus },
    });
    return {
      id: updated.id,
      tenant_id: updated.tenant_id,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      budgetClass: updated.budget_class as any,
      requesterDept: updated.department_id,
      branchCode: updated.branch_code,
      amount: Number(updated.amount),
      currency: updated.currency as any,
      status: updated.status as any,
      approvals: {} as any,
      contractRequired: false,
      createdBy: updated.requester_id,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  // ─── DRAFT PURCHASE ORDERS ────────────────────────────────────────────────────

  async getDraftPurchaseOrders(ctx: TenantContext): Promise<any[]> {
    const drafts = await this.prisma.procurement_draft_pos.findMany({
      where: MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
      orderBy: { created_at: "desc" },
    });
    return (drafts as any[]).map((d) => ({
      id: d.id,
      tenant_id: d.tenant_id,
      requisitionId: d.requisition_id,
      branchCode: d.branch_code,
      supplierId: d.supplier_id,
      supplierBranchId: d.supplier_branch_id,
      contractType: d.contract_type?.toLowerCase(),
      status: d.status,
      quotedTotal: Number(d.quoted_total),
      created_at: d.created_at,
      updated_at: d.updated_at,
    }));
  }

  async createDraftPurchaseOrder(ctx: TenantContext, data: CreateDraftPoDto, createdBy: string): Promise<any> {
    const requisition = await this.prisma.procurement_requisitions.findUnique({
      where: { id: data.requisitionId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
    });
    if (!requisition) throw new NotFoundException("Requisition not found");

    const total_amount = data.quotedTotal
      ?? data.lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    const draft = await this.prisma.procurement_draft_pos.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        requisition_id: data.requisitionId,
        branch_code: requisition.branch_code,
        supplier_id: data.supplierId,
        supplier_branch_id: data.supplierBranchId,
        contract_type: data.contractType,
        status: "DRAFT",
        line_items: data.lineItems as any,
        quoted_total: total_amount,
        created_by: createdBy,
      },
    });

    // Update requisition status
    await this.prisma.procurement_requisitions.update({
      where: { id: data.requisitionId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: "DRAFT_PO_PREPARED" },
    });

    return {
      id: draft.id,
      tenant_id: draft.tenant_id,
      requisitionId: draft.requisition_id,
      branchCode: draft.branch_code,
      supplierId: draft.supplier_id,
      supplierBranchId: draft.supplier_branch_id,
      contractType: draft.contract_type?.toLowerCase(),
      status: draft.status,
      quotedTotal: Number(draft.quoted_total),
      lineItems: data.lineItems,
      created_at: draft.created_at,
      updated_at: draft.updated_at,
    };
  }

  async approveDraftByProcurementHod(ctx: TenantContext, draftPoId: string): Promise<any> {
    const draft = await this.prisma.procurement_draft_pos.findUnique({
      where: { id: draftPoId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
    });
    if (!draft) throw new NotFoundException("Draft PO not found");

    const updated = await this.prisma.procurement_draft_pos.update({
      where: { id: draftPoId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: "PROCUREMENT_HOD_APPROVED" },
    });

    await this.prisma.procurement_requisitions.update({
      where: { id: draft.requisition_id, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: "DRAFT_PO_APPROVED" },
    });

    return { ...updated, quotedTotal: Number(updated.quoted_total), status: updated.status };
  }

  async confirmSupplierQuote(ctx: TenantContext, draftPoId: string, data: ConfirmQuoteDto): Promise<any> {
    const draft = await this.prisma.procurement_draft_pos.findUnique({
      where: { id: draftPoId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
    });
    if (!draft) throw new NotFoundException("Draft PO not found");

    const updated = await this.prisma.procurement_draft_pos.update({
      where: { id: draftPoId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: {
        status: "SUPPLIER_CONFIRMED",
        ...(data.quotedTotal != null ? { quotedTotal: data.quotedTotal } : {}),
      },
    });

    await this.prisma.procurement_requisitions.update({
      where: { id: draft.requisition_id, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: "SUPPLIER_CONFIRMED" },
    });

    return { ...updated, quotedTotal: Number(updated.quoted_total) };
  }

  // ─── PURCHASE ORDERS (FINAL) ──────────────────────────────────────────────────

  async releasePurchaseOrder(ctx: TenantContext, data: ReleasePoDto): Promise<PurchaseOrder> {
    const requisition = await this.prisma.procurement_requisitions.findUnique({
      where: { id: data.requisitionId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
    });
    if (!requisition) throw new NotFoundException("Requisition not found");

    const po = await this.prisma.procurement_final_pos.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        requisition_id: requisition.id,
        draft_po_id: "auto",
        supplier_id: data.supplierId,
        supplier_branch_id: (data as any).supplierBranchId || "auto",
        branch_code: requisition.branch_code,
        total_amount: data.total_amount,
        status: "RELEASED",
      },
    });

    await this.prisma.procurement_requisitions.update({
      where: { id: requisition.id, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: "PO_RELEASED" },
    });

    // Cross-Module: create payable
    const supplier = await this.prisma.supplier_masters.findUnique({ where: { id: data.supplierId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) } });
    await this.prisma.payables.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        vendor_name: supplier?.name || "Unknown Supplier",
        amount: data.total_amount,
        currency: requisition.currency || "IDR",
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "RECEIVED",
      },
    });

    return {
      id: po.id,
      tenant_id: po.tenant_id,
      requisitionId: po.requisition_id,
      supplierId: po.supplier_id,
      branchCode: po.branch_code,
      total_amount: Number(po.total_amount),
      status: "released" as any,
      issuedAt: po.issued_at,
      created_at: po.created_at,
      updated_at: po.updated_at,
    };
  }

  async getPurchaseOrders(ctx: TenantContext): Promise<PurchaseOrder[]> {
    const pos = await this.prisma.procurement_final_pos.findMany({
      where: MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
      orderBy: { created_at: "desc" },
    });
    return (pos as any[]).map((po) => ({
      id: po.id,
      tenant_id: po.tenant_id,
      requisitionId: po.requisition_id,
      supplierId: po.supplier_id,
      branchCode: po.branch_code,
      total_amount: Number(po.total_amount),
      status: po.status.toLowerCase() as any,
      issuedAt: po.issued_at,
      created_at: po.created_at,
      updated_at: po.updated_at,
    }));
  }

  // ─── RECEIPTS ─────────────────────────────────────────────────────────────────

  async createReceipt(ctx: TenantContext, data: CreateReceiptDto, createdBy: string): Promise<any> {
    const finalPo = await this.prisma.procurement_final_pos.findUnique({
      where: { id: data.finalPoId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
    });
    if (!finalPo) throw new NotFoundException("Final PO not found");

    // Update PO status to RECEIVED
    await this.prisma.procurement_final_pos.update({
      where: { id: data.finalPoId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: "RECEIVED" },
    });

    // Recalculate supplier rating based on receipt
    const qualityScore = (data.deliveryOnTime ? 25 : 0) + (data.quantityAccuracy * 0.5) + (data.qualityScore * 0.25) - (data.issueCount * 5) - (data.invoiceMismatch ? 10 : 0);
    const newRating = Math.max(0, Math.min(100, qualityScore));

    await this.prisma.supplier_masters.update({
      where: { id: finalPo.supplier_id, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { global_rating: Math.round(newRating) },
    });

    return {
      finalPoId: data.finalPoId,
      tenant_id: ctx.tenant_id,
      deliveryOnTime: data.deliveryOnTime,
      quantityAccuracy: data.quantityAccuracy,
      quality_score: data.qualityScore,
      issueCount: data.issueCount,
      invoiceMismatch: data.invoiceMismatch,
      calculatedRating: Math.round(newRating),
      created_at: new Date(),
    };
  }

  // ─── CONTRACTS ────────────────────────────────────────────────────────────────

  async getContracts(ctx: TenantContext): Promise<any[]> {
    const contracts = await this.prisma.procurement_contracts.findMany({
      where: MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
      orderBy: { created_at: "desc" },
    });
    return (contracts as any[]).map((c) => ({
      id: c.id,
      tenant_id: c.tenant_id,
      requisitionId: c.requisition_id,
      supplierId: c.supplier_id,
      status: c.status,
      version: c.version,
      signedBySupplier: c.signed_by_supplier,
      signedByProcHod: c.signed_by_proc_hod,
      signedByFinanceHod: c.signed_by_finance_hod,
      notes: c.notes,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  }

  async createContract(ctx: TenantContext, data: CreateContractDto, createdBy: string): Promise<any> {
    const existing = await this.prisma.procurement_contracts.findFirst({
      where: { ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }), requisition_id: data.requisitionId },
    });

    if (existing) {
      // Increment version and reset
      const updated = await this.prisma.procurement_contracts.update({
        where: { id: existing.id, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
        data: {
          supplier_id: data.supplierId,
          status: "LEGAL_REVIEW",
          version: existing.version + 1,
          notes: data.notes || existing.notes,
          signed_by_supplier: false,
          signed_by_proc_hod: false,
          signed_by_finance_hod: false,
        },
      });
      return { ...updated };
    }

    const created = await this.prisma.procurement_contracts.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }),
        requisition_id: data.requisitionId,
        supplier_id: data.supplierId,
        status: "LEGAL_REVIEW",
        version: 1,
        notes: data.notes,
        signed_by_supplier: false,
        signed_by_proc_hod: false,
        signed_by_finance_hod: false,
        attachment_ids: data.attachmentIds || [],
      },
    });

    await this.prisma.procurement_requisitions.update({
      where: { id: data.requisitionId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: "LEGAL_APPROVED" },
    }).catch(() => {}); // Non-fatal; requisition may not exist in edge cases

    return { ...created };
  }

  async approveLegalContract(ctx: TenantContext, contractId: string): Promise<any> {
    const contract = await this.prisma.procurement_contracts.findUnique({
      where: { id: contractId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    const updated = await this.prisma.procurement_contracts.update({
      where: { id: contractId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: "LEGAL_APPROVED" },
    });
    return { ...updated };
  }

  async signContract(ctx: TenantContext, contractId: string, data: SignContractDto): Promise<any> {
    const contract = await this.prisma.procurement_contracts.findUnique({
      where: { id: contractId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
    });
    if (!contract) throw new NotFoundException("Contract not found");

    const signPatch: any = {};
    if (data.party === "SUPPLIER") signPatch.signed_by_supplier = true;
    if (data.party === "PROCUREMENT_HOD") signPatch.signed_by_proc_hod = true;
    if (data.party === "FINANCE_HOD") signPatch.signed_by_finance_hod = true;

    const updated = await this.prisma.procurement_contracts.update({
      where: { id: contractId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: signPatch,
    });

    // If all three signed → status = SIGNED
    const allSigned = updated.signed_by_supplier && updated.signed_by_proc_hod && updated.signed_by_finance_hod;
    const anySigned = updated.signed_by_supplier || updated.signed_by_proc_hod || updated.signed_by_finance_hod;

    const finalStatus = allSigned ? "SIGNED" : anySigned ? "PARTIAL_SIGNED" : updated.status;
    const finalContract = await this.prisma.procurement_contracts.update({
      where: { id: contractId, ...MultiTenancyUtil.getScope(ctx, {}, { excludeBranch: true }) },
      data: { status: finalStatus },
    });

    return { ...finalContract };
  }

  // ─── RISK MANAGEMENT ──────────────────────────────────────────────────────────

  async getRiskSignals(ctx: TenantContext): Promise<ProcurementRisk[]> {
    const signals = await this.prisma.procurement_risk_signals.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return (signals as any[]).map((s) => ({
      id: s.id,
      tenant_id: s.tenant_id,
      code: s.code as any,
      severity: s.severity as any,
      status: s.status as any,
      entity_id: s.entity_id,
      detail: s.detail,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
  }

  async runRiskScan(ctx: TenantContext): Promise<ProcurementRisk[]> {
    // Fake logic for sweep
    return this.getRiskSignals(ctx);
  }

  async createRiskSignal(ctx: TenantContext, data: CreateRiskSignalDto): Promise<any> {
    return this.prisma.procurement_risk_signals.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        code: data.code,
        severity: data.severity,
        entity_id: data.entity_id,
        detail: data.detail || "",
        status: "OPEN",
      },
    });
  }

  async updateRiskSignalStatus(ctx: TenantContext, riskSignalId: string, status: string): Promise<any> {
    return this.prisma.procurement_risk_signals.update({
      where: { id: riskSignalId, ...MultiTenancyUtil.getScope(ctx) },
      data: { status },
    });
  }

  // ─── PORTAL MESSAGES ──────────────────────────────────────────────────────────

  async getPortalMessages(ctx: TenantContext): Promise<any[]> {
    const messages = await this.prisma.supplier_portal_messages.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return messages;
  }

  async createPortalMessage(ctx: TenantContext, data: CreatePortalMessageDto, createdBy: string): Promise<any> {
    return this.prisma.supplier_portal_messages.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        ...MultiTenancyUtil.getScope(ctx),
        supplier_id: data.supplierId,
        supplier_branch_id: data.supplierBranchId,
        direction: data.direction,
        type: data.type,
        content: data.content,
        created_by: createdBy,
      },
    });
  }

  // ─── SPEND INSIGHTS ──────────────────────────────────────────────────────────

  async getSpendInsights(ctx: TenantContext): Promise<any[]> {
    // Aggregate by category
    const items = await this.prisma.procurement_requisitions.groupBy({
      by: ["category"],
      where: { ...MultiTenancyUtil.getScope(ctx), status: "PO_RELEASED" },
      _sum: { amount: true },
      _count: { id: true },
    });
    return items.map((i) => ({
      category: i.category,
      totalSpend: Number(i._sum.amount),
      requisitionCount: i._count.id,
    }));
  }
}
