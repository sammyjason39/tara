import { PostingSide } from '../domain/finance.constants';

export interface JournalDraftLine {
  accountId: string;
  side: PostingSide;
  amount: number; // In Transaction Currency
  baseAmount: number; // In Base Currency (converted via exchangeRate)
  dimensionBranchId?: string;
  dimensionDepartmentId?: string;
  dimensionProjectId?: string;
  dimensionChannelId?: string;
}

export interface JournalDraft {
  draftId: string;
  request_id: string;
  tenant_id: string;
  company_id: string;
  fiscalPeriodId: string;
  transactionCurrency: string;
  baseCurrency: string;
  exchangeRate: number;
  lines: JournalDraftLine[];
  totalDebitBase: number;
  totalCreditBase: number;
  created_at: Date;
}
