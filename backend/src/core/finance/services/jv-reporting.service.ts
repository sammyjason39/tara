import { Injectable, Inject } from '@nestjs/common';
import { IJVRepository } from '../repositories/interfaces/jv.repository.interface';

@Injectable()
export class JVReportingService {
  constructor(
    @Inject('IJVRepository')
    private readonly jvRepo: IJVRepository
  ) {}

  /**
   * Aggregates JV allocations for a specific participant within a time range.
   */
  async getParticipantMTD(tenant_id: string, participant_id: string, month: number, year: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const entries = await this.jvRepo.getLedgerEntries(tenant_id, {
      participant_id,
      created_at: {
        gte: startDate,
        lte: endDate
      }
    });

    return this.aggregateEntries(entries);
  }

  private aggregateEntries(entries: any[]): any {
    const summary = {
      total_allocated: 0,
      debits: 0,
      credits: 0,
      count: entries.length
    };

    for (const entry of entries) {
      const amt = Number(entry.allocated_amt);
      if (entry.side === 'DEBIT') {
        summary.debits += amt;
      } else {
        summary.credits += amt;
      }
    }

    summary.total_allocated = summary.debits - summary.credits;
    return summary;
  }
}
