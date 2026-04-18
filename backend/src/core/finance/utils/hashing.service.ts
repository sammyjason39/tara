import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

export interface HashInput {
  previousHash: string;
  journalId: string;
  timestamp: Date;
  lines: Array<{
    accountId: string;
    side: string;
    amount: Prisma.Decimal;
    dimensionKey?: string;
  }>;
}

@Injectable()
export class HashingService {
  /**
   * Generates a deterministic SHA-256 hash for a journal entry.
   * Hardened: Normalizes timestamps to SECONDS to avoid DB truncation drift.
   */
  generateJournalHash(input: HashInput): string {
    // 1. Sort lines by accountId then side to ensure determinism
    const sortedLines = [...input.lines].sort((a, b) => {
      if (a.accountId !== b.accountId) return a.accountId.localeCompare(b.accountId);
      return a.side.localeCompare(b.side);
    });

    // 2. Normalize lines into stable strings
    const linesString = sortedLines
      .map((l) => `${l.accountId}|${l.side}|${l.amount.toString()}|${l.dimensionKey || ''}`)
      .join(';');

    // 3. Normalize Timestamp (Critical for DB round-trip stability)
    // We truncate milliseconds to ensure the string is identical before and after DB storage
    const normalizedDate = new Date(Math.floor(input.timestamp.getTime() / 1000) * 1000);

    // 4. Construct the canonical payload
    const payload = [
      input.previousHash,
      input.journalId,
      normalizedDate.toISOString(),
      linesString,
    ].join('::');

    // 5. Generate SHA-256 hash
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Generates a deterministic SHA-256 hash for a Period Closing event.
   */
  generateClosingHash(input: {
    tenant_id: string;
    periodId: string;
    netIncome: Prisma.Decimal;
    closedAt: Date;
    closedBy: string;
  }): string {
    const payload = [
      input.tenant_id,
      input.periodId,
      input.netIncome.toString(),
      input.closedAt.toISOString(),
      input.closedBy,
    ].join('::');

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Verifies a hash against data.
   */
  verifyHash(input: HashInput, expectedHash: string): boolean {
    const actualHash = this.generateJournalHash(input);
    return actualHash === expectedHash;
  }
}
