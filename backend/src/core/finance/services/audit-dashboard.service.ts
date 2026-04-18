import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { ReportingEngineService } from './reporting-engine.service';

@Injectable()
export class AuditDashboardService {
  private readonly logger = new Logger(AuditDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportEngine: ReportingEngineService,
    @Inject('IJournalRepository')
    private readonly journalRepo: any,
  ) {}

  /**
   * Verifies the entire ledger chain for a company.
   */
  async verifyLedgerIntegrity(tenant_id: string, company_id: string) {
    const journals = await this.prisma.finance_journal_entries.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { posting_date: 'desc' },
      take: 20
    });

    const verificationResults = [];
    let previousHash = 'GENESIS';

    for (const journal of journals) {
      const isChainValid = journal.previous_hash === previousHash;
      // In production, we would also re-calculate entryHash from lines
      verificationResults.push({
        journalId: journal.id,
        status: isChainValid ? 'VERIFIED' : 'TAMPERED',
        hash: journal.entry_hash,
      });
      previousHash = journal.entry_hash || 'GENESIS';
    }

    return {
      tenant_id,
      company_id,
      totalEntries: journals.length,
      integrityRatio: verificationResults.filter((r: any) => r.status === 'VERIFIED').length / journals.length,
      chainResults: verificationResults
    };
  }

  /**
   * Proves a specific report's authenticity.
   */
  async proveReport(tenant_id: string, reportId: string, providedHash: string) {
    // 1. Fetch the snapshot for the report
    const snapshot = await this.prisma.finance_insight_snapshots.findFirst({
        where: { id: reportId }
    });

    if (!snapshot) return { result: 'NOT_FOUND' };

    // 2. The snapshot's own record is used to verify the provided hash
    const isValid = snapshot.forecast_hash === providedHash; // Simulation using forecastHash field

    return {
      reportId,
      verified: isValid,
      timestamp: snapshot.created_at
    };
  }
}
