import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Automatically match bank transactions for a specific statement or tenant
   */
  async autoMatch(tenant_id: string, statementId?: string) {
    this.logger.log(`[MatchingService] Starting auto-match for tenant ${tenant_id} ${statementId ? `Statement: ${statementId}` : ''}`);

    const unmatched = await this.prisma.finance_bank_transactions.findMany({
      where: {
        tenant_id,
        statement_id: statementId,
        status: { in: ['UNMATCHED', 'PARTIALLY_MATCHED'] },
      },
    });

    let matchCount = 0;

    for (const tx of unmatched) {
      // Find potential candidates (one-to-one auto-match for simplicity)
      const windowStart = new Date(tx.transaction_date);
      windowStart.setDate(windowStart.getDate() - 3);
      const windowEnd = new Date(tx.transaction_date);
      windowEnd.setDate(windowEnd.getDate() + 3);

      const candidates = await this.prisma.finance_journal_entries.findMany({
        where: {
          tenant_id,
          status: 'POSTED',
          posting_date: { gte: windowStart, lte: windowEnd },
          finance_journal_lines: {
            some: { amount: tx.amount }
          }
        },
        include: { finance_journal_lines: true }
      });

      if (candidates.length === 0) continue;

      let bestMatch = null;
      let highestScore = 0;

      for (const candidate of candidates) {
        let score = 0;
        const exactLineMatch = candidate.finance_journal_lines.some(l => l.amount.equals(tx.amount));
        if (exactLineMatch) score += 50;

        const dateDiff = Math.abs(candidate.posting_date.getTime() - tx.transaction_date.getTime());
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
        score += (3 - daysDiff) * 10;

        if (tx.reference && candidate.ref && candidate.ref.includes(tx.reference)) score += 40;
        else if (tx.description && candidate.description && candidate.description.includes(tx.description.substring(0, 10))) score += 20;

        if (score > highestScore) {
          highestScore = score;
          bestMatch = candidate;
        }
      }

      if (bestMatch && highestScore >= 60) {
        await this.prisma.$transaction(async (db) => {
          await db.finance_recon_matches.create({
            data: {
              tenant_id,
              bank_transaction_id: tx.id,
              ledger_journal_id: bestMatch.id,
              confidence_score: highestScore,
              match_type: 'AUTO',
              status: 'SUGGESTED',
            }
          });

          await db.finance_bank_transactions.update({
            where: { id: tx.id },
            data: { status: 'MATCHED' }
          });
        });
        matchCount++;
      }
    }

    return { processed: unmatched.length, matched: matchCount };
  }

  /**
   * Manually link a bank transaction to one or more journal entries
   */
  async linkManual(tenant_id: string, bankTxId: string, journalIds: string[]) {
    return this.prisma.$transaction(async (db) => {
      const tx = await db.finance_bank_transactions.findUniqueOrThrow({ where: { id: bankTxId } });

      for (const jId of journalIds) {
        await db.finance_recon_matches.upsert({
          where: {
            tenant_id_bank_transaction_id_ledger_journal_id: {
              tenant_id,
              bank_transaction_id: bankTxId,
              ledger_journal_id: jId
            }
          },
          create: {
            tenant_id,
            bank_transaction_id: bankTxId,
            ledger_journal_id: jId,
            confidence_score: 100,
            match_type: 'MANUAL',
            status: 'APPROVED',
          },
          update: { status: 'APPROVED' }
        });
      }

      const { status, totalMatched } = await this.recalculateTxStatus(db, tenant_id, bankTxId);
      return { totalMatched, status };
    });
  }

  /**
   * Remove a match link
   */
  async unlink(tenant_id: string, matchId: string) {
    return this.prisma.$transaction(async (db) => {
      const match = await db.finance_recon_matches.delete({
        where: { id: matchId, tenant_id }
      });

      await this.recalculateTxStatus(db, tenant_id, match.bank_transaction_id);
      return { success: true };
    });
  }

  private async recalculateTxStatus(db: Prisma.TransactionClient, tenant_id: string, bankTxId: string) {
    const tx = await db.finance_bank_transactions.findUniqueOrThrow({ where: { id: bankTxId } });
    const allMatches = await db.finance_recon_matches.findMany({
      where: { bank_transaction_id: bankTxId, tenant_id },
      include: { finance_journal_entries: { include: { finance_journal_lines: true } } }
    });

    if (allMatches.length === 0) {
      await db.finance_bank_transactions.update({
        where: { id: bankTxId },
        data: { status: 'UNMATCHED' }
      });
      return { status: 'UNMATCHED', totalMatched: 0 };
    }

    let totalMatched = 0;
    for (const m of allMatches as any[]) {
      if (m.finance_journal_entries) {
        // Sum total magnitude of lines in that journal
        totalMatched += (m.finance_journal_entries.finance_journal_lines as any[]).reduce((sum: number, l: any) => sum + Math.abs(Number(l.amount)), 0);
      }
    }

    const txAmount = Math.abs(Number(tx.amount));
    const status = totalMatched >= txAmount ? 'MATCHED' : 'PARTIALLY_MATCHED';

    await db.finance_bank_transactions.update({
      where: { id: bankTxId },
      data: { status }
    });

    return { status, totalMatched };
  }

}
