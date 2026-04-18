/**
 * Ledger Posting Context
 * ─────────────────────
 * HMAC-signed write token issued exclusively by LedgerPostingService.
 * All journal repository write methods require a valid context.
 */

// ── Custom Errors ────────────────────────────────────────────────────────────

export class TokenForgeryError extends Error {
  constructor(detail: string) {
    super(`LEDGER_TOKEN_FORGERY: ${detail}`);
    this.name = 'TokenForgeryError';
  }
}

export class TokenExpiredError extends Error {
  constructor(issuedAt: Date, expiresAt: Date) {
    super(
      `LEDGER_TOKEN_EXPIRED: token issued at ${issuedAt.toISOString()} expired at ${expiresAt.toISOString()}`,
    );
    this.name = 'TokenExpiredError';
  }
}

export class ImmutableJournalError extends Error {
  constructor(journalId: string, operation: string) {
    super(
      `IMMUTABLE_JOURNAL: cannot perform '${operation}' on journal ${journalId} — journals are append-only`,
    );
    this.name = 'ImmutableJournalError';
  }
}

// ── Context Interface ────────────────────────────────────────────────────────

export interface LedgerPostingContext {
  /** HMAC-SHA256 signature of tokenPayload */
  token: string;
  /** Raw payload used for signing: uuid.tenant_id.issuedAtMs */
  tokenPayload: string;
  /** Tenant this context is scoped to */
  tenant_id: string;
  /** Company this context is scoped to */
  company_id: string;
  /** Must always be 'LedgerPostingService' */
  originService: string;
  issuedAt: Date;
  expiresAt: Date;
  valid: boolean;
}
