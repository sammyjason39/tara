import { Injectable } from '@nestjs/common';
import { LedgerEventLog } from '../domain/finance.interfaces';
import { ILedgerEventLogRepository } from './interfaces/ledger-event-log.repository.interface';
import { v4 as uuid } from 'uuid';

@Injectable()
export class LedgerEventLogMockRepository implements ILedgerEventLogRepository {
  private logs: Map<string, LedgerEventLog[]> = new Map();

  async create(tenant_id: string, company_id: string, data: any): Promise<LedgerEventLog> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.logs.get(scopeKey) || [];

    // Check for existing event based on sourceEventId within the scope
    const existing = list.find(l => l.sourceEventId === data.sourceEventId);
    if (existing) {
      throw new Error(`Conflict: Event ${data.sourceEventId} already exists for tenant ${tenant_id} and company ${company_id}`);
    }

    const newLog: LedgerEventLog = {
      id: uuid(), // Reverted to uuid() as it's more robust than Math.random() for IDs
      tenant_id,
      company_id,
      event_type: data.event_type || '',
      sourceEventId: data.sourceEventId || '',
      status: data.status || 'PENDING',
      payload: data.payload || {},
      sequenceKey: data.sequenceKey,
      sequenceNumber: data.sequenceNumber,
      created_at: new Date(),
      updated_at: new Date(),
    };
    list.push(newLog);
    this.logs.set(scopeKey, list);
    return newLog;
  }

  async findBySourceEventId(tenant_id: string, company_id: string, sourceEventId: string): Promise<LedgerEventLog | null> {
    const list = this.logs.get(`${tenant_id}:${company_id}`) || [];
    return list.find(l => l.sourceEventId === sourceEventId) || null;
  }

  async updateStatus(tenant_id: string, company_id: string, id: string, status: 'PENDING' | 'POSTED' | 'FAILED'): Promise<void> {
    const scopeKey = `${tenant_id}:${company_id}`;
    const list = this.logs.get(scopeKey) || [];
    const index = list.findIndex(l => l.id === id);
    if (index !== -1) {
      const updatedLog = { ...list[index], status, updated_at: new Date() };
      if (status === 'POSTED') {
        updatedLog.processedAt = new Date();
      }
      list[index] = updatedLog;
      this.logs.set(scopeKey, list);
    }
  }

  async findUnprocessed(tenant_id: string, company_id: string, batchSize: number): Promise<LedgerEventLog[]> {
    const list = this.logs.get(`${tenant_id}:${company_id}`) || [];
    return list
      .filter(l => l.status === 'PENDING')
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime()) // Added sorting to match original behavior
      .slice(0, batchSize);
  }

  async markProcessed(tenant_id: string, company_id: string, id: string): Promise<void> {
    await this.updateStatus(tenant_id, company_id, id, 'POSTED');
  }

  async findProcessedBefore(tenant_id: string, company_id: string, date: Date): Promise<LedgerEventLog[]> {
    const list = this.logs.get(`${tenant_id}:${company_id}`) || [];
    return list.filter(l => l.status === 'POSTED' && l.processedAt && l.processedAt < date);
  }

  async deleteMany(tenant_id: string, company_id: string, ids: string[]): Promise<void> {
    const scopeKey = `${tenant_id}:${company_id}`;
    let list = this.logs.get(scopeKey) || [];
    list = list.filter(l => !ids.includes(l.id));
    this.logs.set(scopeKey, list);
  }
}
