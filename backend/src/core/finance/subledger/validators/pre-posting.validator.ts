import { Injectable, Logger } from '@nestjs/common';
import { InventorySubledgerEntry } from '../entities/inventory-subledger-entry.entity';

@Injectable()
export class PrePostingValidator {
  private readonly logger = new Logger(PrePostingValidator.name);

  async validate(entry: InventorySubledgerEntry): Promise<{ valid: boolean; error?: string }> {
    // 1. Debit Account Check
    if (!entry.debitAccountId) {
      return { valid: false, error: 'Missing debitAccountId' };
    }

    // 2. Credit Account Check
    if (!entry.creditAccountId) {
      return { valid: false, error: 'Missing creditAccountId' };
    }

    // 3. Amount Integrity Check
    if (!entry.amount || entry.amount.lte(0)) {
      return { valid: false, error: 'Invalid amount: must be positive and non-zero' };
    }

    // 4. Period Check (Mock Implementation)
    if (!entry.accountingPeriodId) {
       return { valid: false, error: 'Missing accounting period' };
    }

    // Simulate Period Open Check
    const isPeriodOpen = this.simulatePeriodCheck(entry.accountingPeriodId);
    if (!isPeriodOpen && !entry.periodOverrideBy) {
      return { valid: false, error: `Accounting period ${entry.accountingPeriodId} is CLOSED and no override provided` };
    }

    return { valid: true };
  }

  private simulatePeriodCheck(periodId: string): boolean {
    // In production, this calls a PeriodMasterService
    // For now, we assume current period is open, past periods might be closed
    return !periodId.includes('2025'); // Example: block 2025
  }
}
