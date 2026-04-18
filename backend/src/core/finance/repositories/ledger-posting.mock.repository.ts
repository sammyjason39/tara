import { Injectable } from '@nestjs/common';
import { LedgerPosting, LedgerPostingLine } from '../domain/finance.interfaces';
import { ILedgerPostingRepository } from './interfaces/ledger-posting.repository.interface';
import { LedgerPostingStatus } from '../domain/finance.constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class LedgerPostingMockRepository implements ILedgerPostingRepository {
  /** Per-tenant-company postings. Key: `${tenant_id}:${company_id}` */
  private postings: Map<string, LedgerPosting[]> = new Map();
  private postingLines: Map<string, LedgerPostingLine[]> = new Map();
  /** Per-tenant-company idempotency. Key: `${tenant_id}:${company_id}` */
  private idempotency: Map<string, string[]> = new Map();

  async createPosting(tenant_id: string, company_id: string, data: Partial<LedgerPosting>): Promise<LedgerPosting> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.postings.get(scopeKey) || [];
    const newPosting: LedgerPosting = {
      id: Math.random().toString(36).substr(2, 9),
      tenant_id,
      company_id,
      sourceEventId: data.sourceEventId || '',
      event_type: data.event_type || '',
      status: data.status || LedgerPostingStatus.PENDING,
      sequenceKey: data.sequenceKey,
      sequenceNumber: data.sequenceNumber,
      retryCount: 0,
      maxRetryAttempts: data.maxRetryAttempts || 3,
      failureReason: undefined,
      failedAt: undefined,
      payload: data.payload || {},
      created_at: new Date(),
      updated_at: new Date(),
    };
    list.push(newPosting);
    this.postings.set(scopeKey, list);
    return newPosting;
  }

  async createLines(postingId: string, lines: Partial<LedgerPostingLine>[]): Promise<void> {
    const list = this.postingLines.get(postingId) || [];
    const newLines = lines.map(l => ({
      id: Math.random().toString(36).substr(2, 9),
      ledgerPostingId: postingId,
      accountId: l.accountId || '',
      side: l.side!,
      amount: new Prisma.Decimal(l.amount || 0),
      branch_id: l.branch_id || '',
      location_id: l.location_id || '',
      departmentId: l.departmentId,
      costCenterId: l.costCenterId,
      projectId: l.projectId,
      created_at: new Date(),
    }));
    this.postingLines.set(postingId, [...list, ...newLines]);
  }

  async updateStatus(tenant_id: string, company_id: string, postingId: string, status: LedgerPostingStatus, retryCount?: number, failureReason?: string): Promise<LedgerPosting> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.postings.get(scopeKey) || [];
    const index = list.findIndex(p => p.id === postingId);
    if (index === -1) throw new Error('Posting not found');

    const updated = { 
      ...list[index], 
      status, 
      updated_at: new Date() 
    };
    
    if (retryCount !== undefined) updated.retryCount = retryCount;
    if (failureReason) updated.failureReason = failureReason;
    if (status === LedgerPostingStatus.FAILED_TERMINAL) updated.failedAt = new Date();

    list[index] = updated;
    this.postings.set(scopeKey, list);
    return updated;
  }

  async getDeadLetterPostings(tenant_id: string, company_id: string): Promise<LedgerPosting[]> {
    const list = this.postings.get(`${tenant_id}:${company_id}`) || [];
    return list.filter(p => p.status === LedgerPostingStatus.FAILED_TERMINAL);
  }

  async findPending(tenant_id: string, company_id?: string): Promise<LedgerPosting[]> {
    if (company_id) {
      const list = this.postings.get(`${tenant_id}:${company_id}`) || [];
      return list.filter(p => p.status === LedgerPostingStatus.PENDING);
    }
    // Cross-company search
    return Array.from(this.postings.entries())
      .filter(([key]) => key.startsWith(`${tenant_id}:`))
      .map(([, list]) => list)
      .flat()
      .filter(p => p.status === LedgerPostingStatus.PENDING);
  }

  async claimPostings(tenant_id: string, company_id: string, batchSize: number): Promise<LedgerPosting[]> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const allPostings = this.postings.get(scopeKey) || [];
    const now = new Date();
    
    // Filter candidate PENDING postings (retry logic included)
    const candidates = allPostings.filter(p => 
      p.status === LedgerPostingStatus.PENDING &&
      (!p.nextRetryAt || p.nextRetryAt <= now)
    );

    const processable: LedgerPosting[] = [];
    
    for (const posting of candidates) {
      if (processable.length >= batchSize) break;

      if (!posting.sequenceKey) {
        // No sequence key, process normally
        posting.status = LedgerPostingStatus.PROCESSING;
        processable.push(posting);
        continue;
      }

      // Check if there are any PREVIOUS sequence numbers still NOT COMPLETED
      const previousSeqNum = (posting.sequenceNumber || 0) - 1;
      
      if (previousSeqNum > 0) {
        const previousIncomplete = allPostings.find(p => 
          p.sequenceKey === posting.sequenceKey && 
          p.sequenceNumber === previousSeqNum && 
          p.status !== LedgerPostingStatus.COMPLETED
        );

        if (previousIncomplete) {
          // Blocked by previous sequence number
          continue;
        }
      }

      // No blocking sequence, claim it
      posting.status = LedgerPostingStatus.PROCESSING;
      processable.push(posting);
    }

    this.postings.set(scopeKey, allPostings);
    return processable;
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<LedgerPosting | null> {
    const list = this.postings.get(`${tenant_id}:${company_id}`) || [];
    return list.find(p => p.id === id) || null;
  }

  async findLines(postingId: string): Promise<LedgerPostingLine[]> {
    return this.postingLines.get(postingId) || [];
  }

  async checkIdempotency(tenant_id: string, company_id: string, sourceEventId: string): Promise<boolean> {
    const list = this.idempotency.get(`${tenant_id}:${company_id}`) || [];
    return list.includes(sourceEventId);
  }

  async createIdempotency(tenant_id: string, company_id: string, sourceEventId: string): Promise<void> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.idempotency.get(scopeKey) || [];
    list.push(sourceEventId);
    this.idempotency.set(scopeKey, list);
  }

  async findByStatus(tenant_id: string, company_id: string, status: LedgerPostingStatus): Promise<LedgerPosting[]> {
    const list = this.postings.get(`${tenant_id}:${company_id}`) || [];
    return list.filter(p => p.status === status);
  }

  async findStuckProcessing(tenant_id: string, company_id: string, threshold: Date): Promise<LedgerPosting[]> {
    const list = this.postings.get(`${tenant_id}:${company_id}`) || [];
    return list.filter(p => p.status === LedgerPostingStatus.PROCESSING && p.updated_at && p.updated_at < threshold);
  }
}
