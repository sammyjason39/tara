import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import {
  LedgerPostingContext,
  TokenForgeryError,
  TokenExpiredError,
} from './ledger-posting-context';

/**
 * PostingContextFactory
 * ────────────────────
 * Issues and validates HMAC-SHA256 signed posting context tokens.
 *
 * Token payload format: `<uuid>.<tenant_id>.<issuedAtMs>`
 * Token: HMAC_SHA256(LEDGER_SIGNING_SECRET, tokenPayload)
 *
 * DEV_MOCK_MODE: falls back to a default secret if env var not set.
 */
export class PostingContextFactory {
  private static readonly ORIGIN_SERVICE = 'LedgerPostingService';
  private static readonly TTL_MS = 30_000; // 30 seconds

  private static get secret(): string {
    return (
      process.env.LEDGER_SIGNING_SECRET ??
      'zenvix-dev-ledger-secret-do-not-use-in-production-32ch'
    );
  }

  private static sign(payload: string): string {
    return crypto
      .createHmac('sha256', PostingContextFactory.secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Issue a new HMAC-signed posting context for a tenant and company.
   * Must only be called from LedgerPostingService.
   */
  static issue(tenant_id: string, company_id: string): LedgerPostingContext {
    const nonce = uuid();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + PostingContextFactory.TTL_MS);

    const tokenPayload = `${nonce}.${tenant_id}.${company_id}.${issuedAt.getTime()}`;
    const token = PostingContextFactory.sign(tokenPayload);

    return {
      token,
      tokenPayload,
      tenant_id,
      company_id,
      originService: PostingContextFactory.ORIGIN_SERVICE,
      issuedAt,
      expiresAt,
      valid: true,
    };
  }

  /**
   * Validate a LedgerPostingContext.
   * Throws TokenForgeryError or TokenExpiredError on failure.
   */
  static validate(ctx: LedgerPostingContext): void {
    // 1. Verify HMAC signature
    const expectedToken = PostingContextFactory.sign(ctx.tokenPayload);
    if (
      !crypto.timingSafeEqual(
        Buffer.from(ctx.token, 'hex'),
        Buffer.from(expectedToken, 'hex'),
      )
    ) {
      throw new TokenForgeryError('HMAC signature mismatch');
    }

    // 2. Verify originService
    if (ctx.originService !== PostingContextFactory.ORIGIN_SERVICE) {
      throw new TokenForgeryError(
        `originService must be '${PostingContextFactory.ORIGIN_SERVICE}', got '${ctx.originService}'`,
      );
    }

    // 3. Verify expiry
    if (new Date() > ctx.expiresAt) {
      throw new TokenExpiredError(ctx.issuedAt, ctx.expiresAt);
    }

    // 4. Verify valid flag
    if (!ctx.valid) {
      throw new TokenForgeryError('context marked as invalid');
    }
  }
}
