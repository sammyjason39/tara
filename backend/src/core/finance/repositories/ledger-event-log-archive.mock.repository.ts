import { Injectable } from '@nestjs/common';
import { LedgerEventLogArchive } from '../domain/finance.interfaces';
import { ILedgerEventLogArchiveRepository } from './interfaces/ledger-event-log-archive.repository.interface';

@Injectable()
export class LedgerEventLogArchiveMockRepository implements ILedgerEventLogArchiveRepository {
  private archives: LedgerEventLogArchive[] = [];

  async createArchiveEntries(events: any[]): Promise<void> {
    const newEntries = events.map(e => ({
      ...e,
      archivedAt: new Date(),
    }));
    this.archives.push(...newEntries);
  }

  async findAll(tenant_id: string): Promise<LedgerEventLogArchive[]> {
    return this.archives.filter(a => a.tenant_id === tenant_id);
  }
}
