import { prisma } from "@/core/persistence/database/client";
import type { ProcurementRepository } from "@/core/repositories/procurement/procurementRepository";
import type {
  ContractRecord,
  DraftPurchaseOrder,
  FinalPurchaseOrder,
  ProcurementAuditEvent,
  RatingLog,
  ReceiptRecord,
  Requisition,
  RiskSignal,
  SupplierBranch,
  SupplierMaster,
  SupplierPortalMessage,
  SupplierProduct,
  PoLineItem
} from "@/core/types/procurement/procurement";

// Mapping functions
const mapSupplierMaster = (db: any): SupplierMaster => ({
  id: db.id,
  tenantId: db.tenantId,
  name: db.name,
  taxId: db.taxId || "",
  complianceStatus: db.complianceStatus as any,
  globalRating: db.globalRating,
  riskTier: db.riskTier as any,
  categories: db.categories,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapSupplierBranch = (db: any): SupplierBranch => ({
  id: db.id,
  tenantId: db.tenantId,
  supplierId: db.supplierId,
  branchCode: db.branchCode,
  branchName: db.branchName,
  location: db.location,
  leadTimeDays: db.leadTimeDays,
  localRating: db.localRating,
  riskTier: db.riskTier as any,
  active: db.active,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapSupplierProduct = (db: any): SupplierProduct => ({
  id: db.id,
  tenantId: db.tenantId,
  supplierId: db.supplierId,
  branchId: db.branchId,
  sku: db.sku,
  name: db.name,
  category: db.category,
  unitPrice: Number(db.unitPrice),
  currency: db.currency as any,
  qualityScore: db.qualityScore,
  active: db.active,
  updatedAt: db.updatedAt.toISOString(),
});

const mapRequisition = (db: any): Requisition => ({
  id: db.id,
  tenantId: db.tenantId,
  requesterId: db.requesterId,
  requesterDept: db.departmentId, 
  branchCode: db.branchCode,
  title: db.title,
  description: db.description,
  category: db.category,
  budgetClass: db.budgetClass as any,
  amount: Number(db.amount),
  currency: db.currency as any,
  status: db.status as any,
  approvals: db.approvals as any,
  supplierId: db.supplierId || undefined,
  supplierBranchId: db.supplierBranchId || undefined,
  contractRequired: db.contractRequired,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapDraftPO = (db: any): DraftPurchaseOrder => ({
  id: db.id,
  tenantId: db.tenantId,
  requisitionId: db.requisitionId,
  branchCode: db.branchCode,
  supplierId: db.supplierId,
  supplierBranchId: db.supplierBranchId,
  contractType: db.contractType as any,
  status: db.status as any,
  lineItems: db.lineItems as unknown as PoLineItem[],
  quotedTotal: Number(db.quotedTotal),
  quoteReference: db.quoteReference || undefined,
  quoteNotes: db.quoteNotes || undefined,
  quoteAttachment: db.quoteAttachment || undefined,
  createdBy: db.createdBy,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapFinalPO = (db: any): FinalPurchaseOrder => ({
  id: db.id,
  tenantId: db.tenantId,
  requisitionId: db.requisitionId,
  draftPoId: db.draftPoId,
  supplierId: db.supplierId,
  supplierBranchId: db.supplierBranchId,
  branchCode: db.branchCode,
  status: db.status as any,
  totalAmount: Number(db.totalAmount),
  issuedAt: db.issuedAt.toISOString(),
  expectedDeliveryDate: db.expectedDeliveryDate?.toISOString(),
  financeCommitmentId: db.financeCommitmentId || undefined,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapContract = (db: any): ContractRecord => ({
  id: db.id,
  tenantId: db.tenantId,
  requisitionId: db.requisitionId,
  supplierId: db.supplierId,
  status: db.status as any,
  legalReviewedBy: db.legalReviewedBy || undefined,
  version: db.version,
  signedBySupplier: db.signedBySupplier,
  signedByProcurementHod: db.signedByProcurementHod,
  signedByFinanceHod: db.signedByFinanceHod,
  notes: db.notes || undefined,
  attachmentIds: db.attachmentIds,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapReceipt = (db: any): ReceiptRecord => ({
  id: db.id,
  tenantId: db.tenantId,
  finalPoId: db.finalPoId,
  supplierId: db.supplierId,
  supplierBranchId: db.supplierBranchId,
  receivedAt: db.receivedAt.toISOString(),
  deliveryOnTime: db.deliveryOnTime,
  quantityAccuracy: db.quantityAccuracy,
  qualityScore: db.qualityScore,
  issueCount: db.issueCount,
  invoiceMismatch: db.invoiceMismatch,
  createdAt: db.createdAt.toISOString(),
});

const mapRatingLog = (db: any): RatingLog => ({
  id: db.id,
  tenantId: db.tenantId,
  supplierId: db.supplierId,
  supplierBranchId: db.supplierBranchId,
  supplierScore: db.supplierScore,
  productScore: db.productScore,
  riskTier: db.riskTier as any,
  inputs: db.inputs as any,
  createdAt: db.createdAt.toISOString(),
});

const mapRiskSignal = (db: any): RiskSignal => ({
  id: db.id,
  tenantId: db.tenantId,
  code: db.code as any,
  severity: db.severity as any,
  status: db.status as any,
  entityId: db.entityId,
  detail: db.detail,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapPortalMessage = (db: any): SupplierPortalMessage => ({
  id: db.id,
  tenantId: db.tenantId,
  supplierId: db.supplierId,
  supplierBranchId: db.supplierBranchId,
  direction: db.direction as any,
  type: db.type as any,
  relatedEntityId: db.relatedEntityId || undefined,
  content: db.content,
  attachmentName: db.attachmentName || undefined,
  createdBy: db.createdBy,
  createdAt: db.createdAt.toISOString(),
});

const mapAuditEvent = (db: any): ProcurementAuditEvent => ({
  id: db.id,
  tenantId: db.tenantId,
  actorId: db.actorId,
  action: db.action,
  entityType: db.entityType as any,
  entityId: db.entityId,
  detail: db.detail,
  createdAt: db.createdAt.toISOString(),
});

export const procurementRepo: ProcurementRepository = {
  async listSupplierMasters(tenantId) {
    const items = await prisma.supplierMaster.findMany({
      where: { tenantId: tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapSupplierMaster);
  },
  async createSupplierMaster(tenantId, payload) {
    const item = await prisma.supplierMaster.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        name: payload.name,
        taxId: payload.taxId,
        complianceStatus: payload.complianceStatus,
        globalRating: payload.globalRating,
        riskTier: payload.riskTier,
        categories: payload.categories,
      },
    });
    return mapSupplierMaster(item);
  },
  async updateSupplierMaster(tenantId, id, patch) {
    const item = await prisma.supplierMaster.update({
      where: { id, tenantId: tenantId },
      data: {
        name: patch.name,
        taxId: patch.taxId,
        complianceStatus: patch.complianceStatus,
        globalRating: patch.globalRating,
        riskTier: patch.riskTier,
        categories: patch.categories,
      },
    });
    return mapSupplierMaster(item);
  },

  async listSupplierBranches(tenantId) {
    const items = await prisma.supplierBranch.findMany({
      where: { tenantId: tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapSupplierBranch);
  },
  async createSupplierBranch(tenantId, payload) {
    const item = await prisma.supplierBranch.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        supplierId: payload.supplierId,
        branchCode: payload.branchCode,
        branchName: payload.branchName,
        location: payload.location,
        leadTimeDays: payload.leadTimeDays,
        localRating: payload.localRating,
        riskTier: payload.riskTier,
        active: payload.active,
      },
    });
    return mapSupplierBranch(item);
  },
  async updateSupplierBranch(tenantId, id, patch) {
    const item = await prisma.supplierBranch.update({
      where: { id, tenantId: tenantId },
      data: {
        branchCode: patch.branchCode,
        branchName: patch.branchName,
        location: patch.location,
        leadTimeDays: patch.leadTimeDays,
        localRating: patch.localRating,
        riskTier: patch.riskTier,
        active: patch.active,
      },
    });
    return mapSupplierBranch(item);
  },

  async listSupplierProducts(tenantId) {
    const items = await prisma.supplierProduct.findMany({
      where: { tenantId: tenantId },
      orderBy: { updatedAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapSupplierProduct);
  },
  async upsertSupplierProduct(tenantId, payload) {
    const item = await prisma.supplierProduct.upsert({
      where: { id: payload.id },
      create: {
        id: payload.id,
        tenantId: tenantId,
        supplierId: payload.supplierId,
        branchId: payload.branchId,
        sku: payload.sku,
        name: payload.name,
        category: payload.category,
        unitPrice: payload.unitPrice,
        currency: payload.currency,
        qualityScore: payload.qualityScore,
        active: payload.active,
      },
      update: {
        sku: payload.sku,
        name: payload.name,
        category: payload.category,
        unitPrice: payload.unitPrice,
        currency: payload.currency,
        qualityScore: payload.qualityScore,
        active: payload.active,
      },
    });
    return mapSupplierProduct(item);
  },

  async listRequisitions(tenantId) {
    const items = await prisma.procurementRequisition.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapRequisition);
  },
  async createRequisition(tenantId, payload) {
    const item = await prisma.procurementRequisition.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        requesterId: payload.requesterId,
        departmentId: payload.requesterDept,
        branchCode: payload.branchCode,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        budgetClass: payload.budgetClass,
        amount: payload.amount,
        currency: payload.currency,
        status: payload.status,
        approvals: payload.approvals as any,
        supplierId: payload.supplierId,
        supplierBranchId: payload.supplierBranchId,
        contractRequired: payload.contractRequired,
      },
    });
    return mapRequisition(item);
  },
  async updateRequisition(tenantId, id, patch) {
    const item = await prisma.procurementRequisition.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        approvals: patch.approvals as any,
        supplierId: patch.supplierId,
        supplierBranchId: patch.supplierBranchId,
        contractRequired: patch.contractRequired,
      },
    });
    return mapRequisition(item);
  },

  async listDraftPurchaseOrders(tenantId) {
    const items = await prisma.procurementDraftPO.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapDraftPO);
  },
  async createDraftPurchaseOrder(tenantId, payload) {
    const item = await prisma.procurementDraftPO.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        requisitionId: payload.requisitionId,
        branchCode: payload.branchCode,
        supplierId: payload.supplierId,
        supplierBranchId: payload.supplierBranchId,
        contractType: payload.contractType,
        status: payload.status,
        lineItems: payload.lineItems as any,
        quotedTotal: payload.quotedTotal,
        quoteReference: payload.quoteReference,
        quoteNotes: payload.quoteNotes,
        quoteAttachment: payload.quoteAttachment,
        createdBy: payload.createdBy,
      },
    });
    return mapDraftPO(item);
  },
  async updateDraftPurchaseOrder(tenantId, id, patch) {
    const item = await prisma.procurementDraftPO.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        lineItems: patch.lineItems as any,
        quotedTotal: patch.quotedTotal,
        quoteReference: patch.quoteReference,
        quoteNotes: patch.quoteNotes,
        quoteAttachment: patch.quoteAttachment,
      },
    });
    return mapDraftPO(item);
  },

  async listFinalPurchaseOrders(tenantId) {
    const items = await prisma.procurementFinalPO.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapFinalPO);
  },
  async createFinalPurchaseOrder(tenantId, payload) {
    const item = await prisma.procurementFinalPO.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        requisitionId: payload.requisitionId,
        draftPoId: payload.draftPoId,
        supplierId: payload.supplierId,
        supplierBranchId: payload.supplierBranchId,
        branchCode: payload.branchCode,
        status: payload.status,
        totalAmount: payload.totalAmount,
        issuedAt: new Date(payload.issuedAt),
        expectedDeliveryDate: payload.expectedDeliveryDate ? new Date(payload.expectedDeliveryDate) : null,
        financeCommitmentId: payload.financeCommitmentId,
      },
    });
    return mapFinalPO(item);
  },
  async updateFinalPurchaseOrder(tenantId, id, patch) {
    const item = await prisma.procurementFinalPO.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        expectedDeliveryDate: patch.expectedDeliveryDate ? new Date(patch.expectedDeliveryDate) : undefined,
        financeCommitmentId: patch.financeCommitmentId,
      },
    });
    return mapFinalPO(item);
  },

  async listContracts(tenantId) {
    const items = await prisma.procurementContract.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapContract);
  },
  async createContract(tenantId, payload) {
    const item = await prisma.procurementContract.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        requisitionId: payload.requisitionId,
        supplierId: payload.supplierId,
        status: payload.status,
        legalReviewedBy: payload.legalReviewedBy,
        version: payload.version,
        signedBySupplier: payload.signedBySupplier,
        signedByProcurementHod: payload.signedByProcurementHod,
        signedByFinanceHod: payload.signedByFinanceHod,
        notes: payload.notes,
        attachmentIds: payload.attachmentIds,
      },
    });
    return mapContract(item);
  },
  async updateContract(tenantId, id, patch) {
    const item = await prisma.procurementContract.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        legalReviewedBy: patch.legalReviewedBy,
        version: patch.version,
        signedBySupplier: patch.signedBySupplier,
        signedByProcurementHod: patch.signedByProcurementHod,
        signedByFinanceHod: patch.signedByFinanceHod,
        notes: patch.notes,
        attachmentIds: patch.attachmentIds,
      },
    });
    return mapContract(item);
  },

  async listReceipts(tenantId) {
    const items = await prisma.procurementReceipt.findMany({
      where: { tenantId: tenantId },
      orderBy: { receivedAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapReceipt);
  },
  async createReceipt(tenantId, payload) {
    const item = await prisma.procurementReceipt.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        finalPoId: payload.finalPoId,
        supplierId: payload.supplierId,
        supplierBranchId: payload.supplierBranchId,
        receivedAt: new Date(payload.receivedAt),
        deliveryOnTime: payload.deliveryOnTime,
        quantityAccuracy: payload.quantityAccuracy,
        qualityScore: payload.qualityScore,
        issueCount: payload.issueCount,
        invoiceMismatch: payload.invoiceMismatch,
      },
    });
    return mapReceipt(item);
  },

  async listRatingLogs(tenantId) {
    const items = await prisma.procurementRatingLog.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapRatingLog);
  },
  async createRatingLog(tenantId, payload) {
    const item = await prisma.procurementRatingLog.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        supplierId: payload.supplierId,
        supplierBranchId: payload.supplierBranchId,
        supplierScore: payload.supplierScore,
        productScore: payload.productScore,
        riskTier: payload.riskTier,
        inputs: payload.inputs as any,
      },
    });
    return mapRatingLog(item);
  },

  async listRiskSignals(tenantId) {
    const items = await prisma.procurementRiskSignal.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapRiskSignal);
  },
  async createRiskSignal(tenantId, payload) {
    const item = await prisma.procurementRiskSignal.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        code: payload.code,
        severity: payload.severity,
        status: payload.status,
        entityId: payload.entityId,
        detail: payload.detail,
      },
    });
    return mapRiskSignal(item);
  },
  async updateRiskSignal(tenantId, id, patch) {
    const item = await prisma.procurementRiskSignal.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        detail: patch.detail,
      },
    });
    return mapRiskSignal(item);
  },

  async listPortalMessages(tenantId) {
    const items = await prisma.supplierPortalMessage.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapPortalMessage);
  },
  async createPortalMessage(tenantId, payload) {
    const item = await prisma.supplierPortalMessage.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        supplierId: payload.supplierId,
        supplierBranchId: payload.supplierBranchId,
        direction: payload.direction,
        type: payload.type,
        relatedEntityId: payload.relatedEntityId,
        content: payload.content,
        attachmentName: payload.attachmentName,
        createdBy: payload.createdBy,
      },
    });
    return mapPortalMessage(item);
  },

  async listAuditEvents(tenantId) {
    const items = await prisma.procurementAuditEvent.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapAuditEvent);
  },
  async createAuditEvent(tenantId, payload) {
    const item = await prisma.procurementAuditEvent.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        actorId: payload.actorId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        detail: payload.detail,
      },
    });
    return mapAuditEvent(item);
  },
};
