export type AssetClass =
  | "LAND"
  | "BUILDING"
  | "MACHINERY"
  | "VEHICLE"
  | "FURNITURE"
  | "EQUIPMENT"
  | "SOFTWARE"
  | "OTHER";

export type DepreciationMethod =
  | "STRAIGHT_LINE"
  | "DECLINING_BALANCE"
  | "UNIT_OF_PRODUCTION";

export type AssetStatus =
  | "PENDING_CAPEX_APPROVAL"
  | "APPROVED_FOR_CAPITALIZATION"
  | "ACTIVE"
  | "INACTIVE"
  | "IMPAIRED"
  | "DISPOSED";

export type CapexApproverStage = "HOD" | "CFO";

export type CapexStatus =
  | "PENDING"
  | "PENDING_HOD_APPROVAL"
  | "PENDING_CFO_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CAPITALIZED";

export type DisposalType = "SALE" | "WRITE_OFF" | "RETIREMENT";

export interface FixedAsset {
  id: string;
  tenantId: string;
  description: string;
  assetClass: AssetClass;
  location: string;
  department: string;
  acquisitionDate: string;
  acquisitionCost: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  residualValue: number;
  status: AssetStatus;
  capexRequestId?: string;
  capitalizationDate?: string;
  accumulatedDepreciation: number;
  carryingValue: number;
  revaluationReserve: number;
  createdAt: string;
  updatedAt: string;
}

export interface CapexRequest {
  id: string;
  tenantId: string;
  assetDescription: string;
  requestedAmount: number;
  department: string;
  projectCode?: string;
  requestedBy: string;
  status: CapexStatus;
  approvedBy: string[];
  requiredApprovals?: CapexApproverStage[];
  currentApprovalStage?: CapexApproverStage;
  hodApprovedBy?: string;
  hodApprovedAt?: string;
  cfoApprovedBy?: string;
  cfoApprovedAt?: string;
  budgetMatched: boolean;
  assetId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDepreciationEntry {
  id: string;
  tenantId: string;
  assetId: string;
  postingDate: string;
  method: DepreciationMethod;
  amount: number;
  annualizedAmount: number;
  accumulatedDepreciation: number;
  carryingValue: number;
  approvedBy?: string;
  createdAt: string;
}

export interface AssetImpairmentEvent {
  id: string;
  tenantId: string;
  assetId: string;
  impairmentAmount: number;
  reason: string;
  attachmentDocumentIds: string[];
  journalEntryId: string;
  approvedBy: string;
  createdAt: string;
}

export interface AssetRevaluationEvent {
  id: string;
  tenantId: string;
  assetId: string;
  revaluedAmount: number;
  reason: string;
  attachmentDocumentIds: string[];
  journalEntryId: string;
  approvedBy: string;
  createdAt: string;
}

export interface AssetDisposalEvent {
  id: string;
  tenantId: string;
  assetId: string;
  disposalType: DisposalType;
  proceeds: number;
  gainLoss: number;
  attachmentDocumentIds: string[];
  journalEntryId: string;
  approvedBy: string;
  createdAt: string;
}

export type AssetEvent =
  | ({ type: "IMPAIRMENT" } & AssetImpairmentEvent)
  | ({ type: "REVALUATION" } & AssetRevaluationEvent)
  | ({ type: "DISPOSAL" } & AssetDisposalEvent);

export interface AssetAuditPack {
  assetId: string;
  tenantId: string;
  generatedAt: string;
  capexRequest?: CapexRequest;
  depreciationEntries: AssetDepreciationEntry[];
  events: AssetEvent[];
  evidence: string[];
  checksum: string;
  signature: string;
  // ... (previous content)
  signatureVersion: "v1";
}

export type Asset = FixedAsset;

export interface AssetCapexInput {
  assetDescription: string;
  requestedAmount: number;
  department: string;
  justification?: string;
  projectCode?: string;
  location?: string;
  acquisitionDate?: string;
  usefulLifeYears?: number;
  residualValue?: number;
  depreciationMethod?: DepreciationMethod;
  assetClass?: AssetClass;
}

export interface AssetAuditPackArtifact {
  id: string;
  url: string;
  generatedAt: string;
}

export interface FinanceCapexBudgetRow {
  department: string;
  allocatedBudget: number;
  committedBudget: number;
  availableBudget: number;
  fiscalYear: string;
}

export interface ScheduledDepreciationRunResult {
  runId: string;
  postedEntries: number;
  skippedAssetIds: string[];
  periodStart: string;
  periodEnd: string;
  postingDate: string;
}

export interface FinanceAlert {
  id: string;
  message: string;
  title?: string;
  description?: string;
  action?: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  read: boolean;
}
