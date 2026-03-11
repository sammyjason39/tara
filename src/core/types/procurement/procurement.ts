export type SupplierComplianceStatus = "PENDING" | "VERIFIED" | "EXPIRED";
export type RiskTier = "LOW" | "MEDIUM" | "HIGH";

export type RequisitionStatus =
  | "DRAFT"
  | "PENDING_REQUESTER_HOD"
  | "APPROVED_REQUESTER_HOD"
  | "DRAFT_PO_PREPARED"
  | "DRAFT_PO_APPROVED"
  | "SUPPLIER_CONFIRMED"
  | "LEGAL_APPROVED"
  | "FINAL_APPROVAL_PENDING"
  | "FINAL_APPROVED"
  | "PO_RELEASED"
  | "REJECTED";

export type DraftPoStatus =
  | "DRAFT"
  | "PROCUREMENT_HOD_APPROVED"
  | "SUPPLIER_CONFIRMED"
  | "READY_FOR_RELEASE"
  | "REJECTED";

export type ContractStatus =
  | "DRAFT"
  | "LEGAL_REVIEW"
  | "LEGAL_APPROVED"
  | "PARTIAL_SIGNED"
  | "SIGNED"
  | "REJECTED";

export type FinalPoStatus = "RELEASED" | "DELIVERING" | "RECEIVED" | "CLOSED";

export type RiskSignalStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export type ApprovalSet = {
  requesterHod: boolean;
  procurementHodDraft: boolean;
  legal: boolean;
  financeHod: boolean;
  requesterHodFinal: boolean;
  procurementHodFinal: boolean;
};

export type SupplierMaster = {
  id: string;
  tenantId: string;
  name: string;
  taxId: string;
  complianceStatus: SupplierComplianceStatus;
  globalRating: number;
  riskTier: RiskTier;
  categories: string[];
  website?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierBranch = {
  id: string;
  tenantId: string;
  supplierId: string;
  branchCode: string;
  branchName: string;
  location: string;
  leadTimeDays: number;
  localRating: number;
  riskTier: RiskTier;
  active: boolean;
  fullAddress?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierProduct = {
  id: string;
  tenantId: string;
  supplierId: string;
  branchId: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  currency: "IDR" | "USD";
  qualityScore: number;
  active: boolean;
  updatedAt: string;
};

export type Requisition = {
  id: string;
  tenantId: string;
  requesterId: string;
  requesterDept: string;
  branchCode: string;
  title: string;
  description: string;
  category: string;
  budgetClass: "OPEX" | "CAPEX" | "EMERGENCY";
  amount: number;
  currency: "IDR" | "USD";
  status: RequisitionStatus;
  approvals: ApprovalSet;
  supplierId?: string;
  supplierBranchId?: string;
  contractRequired: boolean;
  linkedDraftPoId?: string;
  linkedContractId?: string;
  linkedFinalPoId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PoLineItem = {
  id: string;
  productSku: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  total: number;
};

export type DraftPurchaseOrder = {
  id: string;
  tenantId: string;
  requisitionId: string;
  branchCode: string;
  supplierId: string;
  supplierBranchId: string;
  contractType: "BLANKET" | "SPOT" | "SERVICE";
  status: DraftPoStatus;
  lineItems: PoLineItem[];
  quotedTotal: number;
  quoteReference?: string;
  quoteNotes?: string;
  quoteAttachment?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type FinalPurchaseOrder = {
  id: string;
  tenantId: string;
  requisitionId: string;
  draftPoId: string;
  supplierId: string;
  supplierBranchId: string;
  branchCode: string;
  status: FinalPoStatus;
  totalAmount: number;
  issuedAt: string;
  expectedDeliveryDate?: string;
  financeCommitmentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContractRecord = {
  id: string;
  tenantId: string;
  requisitionId: string;
  supplierId: string;
  status: ContractStatus;
  legalReviewedBy?: string;
  version: number;
  signedBySupplier: boolean;
  signedByProcurementHod: boolean;
  signedByFinanceHod: boolean;
  notes?: string;
  attachmentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ReceiptRecord = {
  id: string;
  tenantId: string;
  finalPoId: string;
  supplierId: string;
  supplierBranchId: string;
  receivedAt: string;
  deliveryOnTime: boolean;
  quantityAccuracy: number;
  qualityScore: number;
  issueCount: number;
  invoiceMismatch: boolean;
  createdAt: string;
};

export type SupplierPortalMessage = {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierBranchId: string;
  direction: "INBOUND" | "OUTBOUND";
  type: "QUOTE" | "INVOICE" | "DELIVERY_PROOF" | "DISPUTE" | "GENERAL";
  relatedEntityId?: string;
  content: string;
  attachmentName?: string;
  createdBy: string;
  createdAt: string;
};

export type RatingLog = {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierBranchId: string;
  supplierScore: number;
  productScore: number;
  riskTier: RiskTier;
  inputs: {
    deliveryTimeliness: number;
    quantityAccuracy: number;
    productQuality: number;
    contractCompliance: number;
    pricingStability: number;
    issuePenalty: number;
    invoiceMismatchPenalty: number;
  };
  createdAt: string;
};

export type RiskSignal = {
  id: string;
  tenantId: string;
  code: "PRICE_SPIKE" | "DUPLICATE_INVOICE_PATTERN" | "APPROVAL_BYPASS_RISK" | "SUPPLIER_RISK";
  severity: RiskTier;
  status: RiskSignalStatus;
  entityId: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
};

export type LegalHandoffStatus = "PENDING_LEGAL_ACK" | "ACKNOWLEDGED" | "CONTRACT_ACCEPTED";

export type LegalContractHandoff = {
  id: string;
  tenantId: string;
  requisitionId: string;
  contractId: string;
  supplierId: string;
  requestedBy: string;
  status: LegalHandoffStatus;
  notes?: string;
  workflowRequestId?: string;
  acknowledgedBy?: string;
  acceptedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type GoodsReceiptSyncStatus = "PENDING_RECEIPT" | "SYNCED" | "MISMATCH_REPORTED";

export type GoodsReceiptSyncRecord = {
  id: string;
  tenantId: string;
  finalPoId: string;
  requisitionId: string;
  supplierId: string;
  supplierBranchId: string;
  branchCode: string;
  expectedDeliveryDate?: string;
  status: GoodsReceiptSyncStatus;
  issueCount: number;
  invoiceMismatch: boolean;
  requestedBy: string;
  syncedBy?: string;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierAccessProvisioningStatus = "REQUESTED" | "PROVISIONED" | "REVOKED";

export type SupplierAccessProvisioning = {
  id: string;
  tenantId: string;
  supplierId: string;
  supplierBranchId: string;
  requestedBy: string;
  portalScope: "QUOTE" | "INVOICE" | "DELIVERY_PROOF" | "FULL_PORTAL";
  reason: string;
  status: SupplierAccessProvisioningStatus;
  approvedBy?: string;
  provisionedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProcurementAuditEvent = {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType:
    | "SUPPLIER"
    | "SUPPLIER_BRANCH"
    | "REQUISITION"
    | "DRAFT_PO"
    | "FINAL_PO"
    | "CONTRACT"
    | "RATING"
    | "RISK_SIGNAL"
    | "PORTAL";
  entityId: string;
  detail: string;
  createdAt: string;
};

export type SupplierRecommendation = {
  supplierId: string;
  supplierName: string;
  supplierBranchId: string;
  branchName: string;
  score: number;
  riskTier: RiskTier;
  unitPrice?: number;
  leadTimeDays: number;
};

export type ProcurementSpendInsight = {
  id: string;
  label: string;
  category: "SPEND" | "APPROVAL" | "SUPPLIER" | "RISK" | "PROCESS" | "PERFORMANCE";
  value: string;
};
