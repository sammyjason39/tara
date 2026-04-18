import { Prisma } from '@prisma/client';

export enum RevRecStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export interface RecognitionPeriod {
  date: Date;
  amount: Prisma.Decimal;
  status: 'PENDING' | 'POSTED' | 'FAILED';
  journalId?: string;
}

export interface RevRecSchedule {
  id: string;
  tenant_id: string;
  company_id: string;
  contractId: string;
  total_amount: Prisma.Decimal;
  currency: string;
  start_date: Date;
  end_date: Date;
  status: RevRecStatus;
  deferredAccountId: string;
  revenueAccountId: string;
  periods: RecognitionPeriod[];
}

export interface RecognitionEvent {
  id: string;
  scheduleId: string;
  tenant_id: string;
  company_id: string;
  amount: Prisma.Decimal;
  currency: string;
  periodDate: Date;
  status: 'DRAFT' | 'POSTED' | 'FAILED';
}
