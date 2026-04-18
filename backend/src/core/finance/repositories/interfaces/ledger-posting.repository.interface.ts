import { LedgerPosting, LedgerPostingLine, LedgerIdempotency } from '../../domain/finance.interfaces';
import { LedgerPostingStatus } from '../../domain/finance.constants';
import { Prisma } from '@prisma/client';

export interface ILedgerPostingRepository {
  createPosting(tenant_id: string, company_id: string, data: Partial<LedgerPosting>, tx?: Prisma.TransactionClient): Promise<LedgerPosting>;
  createLines(postingId: string, lines: Partial<LedgerPostingLine>[], tx?: Prisma.TransactionClient): Promise<void>;
  updateStatus(tenant_id: string, company_id: string, postingId: string, status: LedgerPostingStatus, retryCount?: number, failureReason?: string): Promise<LedgerPosting>;
  findPending(tenant_id: string, company_id?: string): Promise<LedgerPosting[]>;
  claimPostings(tenant_id: string, company_id: string, batchSize: number): Promise<LedgerPosting[]>;
  findById(tenant_id: string, company_id: string, id: string): Promise<LedgerPosting | null>;
  getDeadLetterPostings(tenant_id: string, company_id: string): Promise<LedgerPosting[]>;
  findLines(postingId: string): Promise<LedgerPostingLine[]>;
  
  // Idempotency
  checkIdempotency(tenant_id: string, company_id: string, sourceEventId: string, tx?: Prisma.TransactionClient): Promise<boolean>;
  createIdempotency(tenant_id: string, company_id: string, sourceEventId: string, tx?: Prisma.TransactionClient): Promise<void>;
  findStuckProcessing(tenant_id: string, company_id: string, threshold: Date): Promise<LedgerPosting[]>;
  findByStatus(tenant_id: string, company_id: string, status: LedgerPostingStatus): Promise<LedgerPosting[]>;
}
