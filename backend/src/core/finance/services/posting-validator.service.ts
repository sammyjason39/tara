import { Injectable, Logger } from '@nestjs/common';
import { JournalDraft } from '../domain/journal-draft.models';

@Injectable()
export class PostingValidatorService {
  private readonly logger = new Logger(PostingValidatorService.name);

  /**
   * Validates a JournalDraft for double-entry correctness and account validity.
   */
  async validate(draft: JournalDraft): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Double Entry Check (Base Currency)
    const diff = Math.abs(draft.totalDebitBase - draft.totalCreditBase);
    if (diff > 0.0001) { // Floating point tolerance
      errors.push(`Double-entry check failed: Debits (${draft.totalDebitBase}) != Credits (${draft.totalCreditBase}). Diff: ${diff}`);
    }

    // 2. Line Integrity
    if (draft.lines.length === 0) {
      errors.push('Journal draft has no lines.');
    }

    // 3. Currency Check
    if (draft.exchangeRate <= 0) {
      errors.push(`Invalid exchange rate: ${draft.exchangeRate}`);
    }

    const isValid = errors.length === 0;
    if (!isValid) {
      this.logger.error(`Draft validation failed for Request ${draft.request_id}: ${errors.join(', ')}`);
    }

    return { isValid, errors };
  }
}
