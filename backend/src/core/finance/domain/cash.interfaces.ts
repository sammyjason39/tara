export enum BankAccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CREDIT_CARD = 'CREDIT_CARD',
  OTHER = 'OTHER',
}

export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
}

export interface BankAccount {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  accountNumber: string;
  currency: string;
  accountType: BankAccountType;
  glAccountId: string; // Linked GL account
  currentBalance: number;
}

export interface CashTransaction {
  id: string;
  tenant_id: string;
  company_id: string;
  bankAccountId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  referenceEventId?: string; // e.g., AR Payment ID or AP Bill ID
  status: 'POSTED' | 'RECONCILED' | 'FAILED';
  transactionDate: Date;
  description: string;
}

export interface BankReconciliation {
  id: string;
  bankAccountId: string;
  statementDate: Date;
  statementBalance: number;
  ledgerBalance: number;
  difference: number;
  status: 'DRAFT' | 'COMPLETED';
}
