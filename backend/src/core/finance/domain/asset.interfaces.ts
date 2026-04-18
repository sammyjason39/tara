import { Prisma } from '@prisma/client';

export enum AssetType {
  EQUIPMENT = 'EQUIPMENT',
  VEHICLE = 'VEHICLE',
  BUILDING = 'BUILDING',
  SOFTWARE = 'SOFTWARE',
  OTHER = 'OTHER',
}

export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE',
}

export type AssetStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'DISPOSED'
  | 'FULLY_DEPRECIATED'
  | 'PENDING_APPROVAL'
  | 'APPROVED_FOR_CAPITALIZATION'
  | 'WRITTEN_OFF'
  | 'TRANSFERRED';

export interface AssetCategory {
  id: string;
  tenant_id: string;
  company_id: string;
  code?: string;
  name: string;
  description?: string;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  usefulLifeMonths: number;
  defaultAssetAccountId: string;
  defaultAccumulatedDepreciationAccountId: string;
  defaultDepreciationExpenseAccountId: string;
  is_active?: boolean;
  // Legacy fields
  assetClass?: string;
}

export interface AssetBookValue {
  assetId: string;
  grossCost: Prisma.Decimal;
  accumulatedDepreciation: Prisma.Decimal;
  netBookValue: Prisma.Decimal;
  updated_at: Date;
}

export interface Asset {
  id: string;
  tenant_id: string;
  company_id: string;
  branch_id: string;
  category_id: string;
  name: string;
  acquisitionCost: Prisma.Decimal;
  acquisitionDate: Date;
  usefulLifeMonths: number;
  residualValue: Prisma.Decimal;
  currency: string;
  status: AssetStatus;
  depreciationMethod: DepreciationMethod;
  lastDepreciationDate?: Date;

  // Legacy fields for backward compatibility
  description?: string;
  assetClass?: string;
  location?: string;
  department?: string;
  usefulLifeYears?: number;
  accumulatedDepreciation?: Prisma.Decimal;
  carryingValue?: Prisma.Decimal;
  revaluationReserve?: Prisma.Decimal;
  serialNumber?: string;
  vendor?: string;
  warrantyExpiry?: string;
  assetType?: AssetType;
}

export interface AssetTransaction {
  id: string;
  assetId: string;
  type: 'ACQUISITION' | 'DEPRECIATION' | 'REVALUATION' | 'DISPOSAL' | 'TRANSFER';
  amount: Prisma.Decimal;
  currency: string;
  transactionDate: Date;
  sourceEventId: string;
  partialDisposalPercentage?: Prisma.Decimal;
  fromBranchId?: string;
  toBranchId?: string;
}

export interface DepreciationRun {
  id: string;
  runDate: Date;
  assetsProcessed: number;
  totalDepreciationPosted: Prisma.Decimal;
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
}

export interface DepreciationSchedule {
  id: string;
  assetId: string;
  periodDate: Date;
  amount: Prisma.Decimal;
  status: 'PENDING' | 'POSTED' | 'FAILED';
}
