import { Injectable, Inject, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IJVRepository } from '../repositories/interfaces/jv.repository.interface';
import { JVParticipantRole } from '../domain/finance.constants';

@Injectable()
export class JVAllocationService {
  private readonly logger = new Logger(JVAllocationService.name);

  constructor(
    @Inject('IJVRepository')
    private readonly jvRepo: IJVRepository
  ) {}

  /**
   * Main entry point for JV allocation hook.
   * Resolves scope, locks config, freezes snapshot, and writes shadow ledger.
   */
  async allocate(tenant_id: string, journalEntry: any, lines: any[], tx?: Prisma.TransactionClient): Promise<void> {
    try {
      // 1. Resolve Scope Precedence
      const scope = {
        ecommerce_id: journalEntry.metadata?.ecommerce_id,
        branch_id: lines[0]?.branch_id || journalEntry.metadata?.branch_id,
        company_id: journalEntry.company_id
      };

      const profile = await this.jvRepo.findProfileByScope(tenant_id, scope);
      if (!profile) {
        this.logger.debug(`No JV profile resolved for journal ${journalEntry.id} in scope ${JSON.stringify(scope)}`);
        return;
      }

      // 1b. Check Date Eligibility (Mid-Month Strategy)
      const journalDate = new Date(journalEntry.posting_date || journalEntry.created_at || new Date());
      const effectiveFrom = new Date(profile.effective_from);
      const effectiveTo = profile.effective_to ? new Date(profile.effective_to) : null;

      if (journalDate < effectiveFrom) {
        this.logger.debug(`Journal ${journalEntry.id} date is before JV profile ${profile.code} activation.`);
        return;
      }

      if (effectiveTo && journalDate > effectiveTo) {
        this.logger.debug(`Journal ${journalEntry.id} date is after JV profile ${profile.code} expiration.`);
        return;
      }

      // 2. Lock Configuration (Fetch Participants)
      const participants = await this.jvRepo.getParticipants(profile.id);
      if (participants.length === 0) {
        this.logger.warn(`JV profile ${profile.code} (v${profile.version}) has no participants.`);
        return;
      }

      // 3. Freeze Snapshot (Immutable Audit)
      await this.jvRepo.createSnapshot({
        jv_profile_id: profile.id,
        journal_id: journalEntry.id,
        config_json: {
          profile,
          participants
        }
      }, tx);

      // 4. Write Shadow Ledger Distribution
      const shadowEntries: any[] = [];
      for (const line of lines) {
        for (const participant of participants) {
          const allocatedAmt = line.amount.mul(participant.share_pct).div(100);
          shadowEntries.push({
            tenant_id,
            jv_profile_id: profile.id,
            journal_id: journalEntry.id,
            line_id: line.id,
            participant_id: participant.participant_id,
            allocated_amt: allocatedAmt,
            side: line.side,
            account_code: line.account_code || line.accountCode,
            type: 'PROFIT',
            period_id: journalEntry.period_id || journalEntry.fiscal_period_id
          });
        }
      }

      await this.jvRepo.writeLedger(shadowEntries, tx);
      this.logger.log(`Successfully allocated JV for journal ${journalEntry.id} via profile ${profile.code}`);
    } catch (error) {
      this.logger.error(`JV Allocation Failed for journal ${journalEntry.id}: ${error.message}`, error.stack);
      // We don't throw here to avoid blocking primary posting if JV fails?
      // Actually, user said "Transactional Hook", so it SHOULD be part of the transaction.
      throw error; 
    }
  }
}
