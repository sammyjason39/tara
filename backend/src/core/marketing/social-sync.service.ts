import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../persistence/prisma.service";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantScope } from "../../shared/scope/tenant-scope";
import { MultiTenancyUtil } from "../../shared/utils/multi-tenancy.util";
import { EncryptionUtil } from "../../shared/utils/encryption.util";
import { LoggerService } from "../../shared/logger/logger.service";
import { AsyncRejectionService } from "../shared/async";
import { AtomicOperationService } from "../shared/atomic";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

/**
 * Social Sync Service (Phase 4 — Marketing)
 *
 * OAuth callbacks and social-sync runs are asynchronous external integrations.
 * Per BUG-13 / Requirement 7 they must never emit an unhandled rejection, must
 * never leave a partially connected account, and must record both their success
 * and failure outcomes in the Integration_Log (Requirements 11.10, 11.11).
 *
 * Discipline applied here:
 *   - OAuth callbacks run under {@link AsyncRejectionService.runWithDeadline} so a
 *     request-bound callback always resolves within the deadline as a typed
 *     response and any rejection is captured + recorded in the Integration_Log
 *     (Req 7.1, 7.2, 7.3, 11.10). The token exchange happens BEFORE the account
 *     write and the account write + its Integration_Log outbox event commit in a
 *     single {@link AtomicOperationService} transaction, so a failure can never
 *     leave a partially connected account (Req 11.10).
 *   - On a successful callback / sync the outcome is recorded in the
 *     Integration_Log (`system_logs`) with a timestamp, the operation id, and the
 *     connected/updated account (Req 11.11).
 *   - {@link syncAccount} records its own SUCCESS outcome; its failure outcome is
 *     recorded by the async-rejection helper at every call site (the cron worker
 *     uses {@link AsyncRejectionService.runBatch}; the manual-sync endpoint uses
 *     {@link AsyncRejectionService.runWithDeadline}).
 */
@Injectable()
export class SocialSyncService {
  private readonly logger = new Logger(SocialSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly asyncRejection: AsyncRejectionService,
    private readonly atomic: AtomicOperationService,
    private readonly integrationLog: LoggerService,
  ) {}

  /**
   * Exchange Meta code for an access token and connect the account.
   */
  async handleMetaCallback(ctx: TenantContext, code: string) {
    const clientId = this.configService.get("META_APP_ID");
    const clientSecret = this.configService.get("META_APP_SECRET");
    const backendUrl = this.configService.get("BACKEND_URL") || "http://localhost:3001";
    const redirectUri = `${backendUrl}/marketing/oauth/callback/meta`;

    return this.connectProviderAccount(ctx, {
      provider: "META",
      operation: "marketing.oauth.callback.meta",
      accountName: "Meta Ads Account",
      exchange: async () => {
        const response = await axios.get(
          "https://graph.facebook.com/v17.0/oauth/access_token",
          {
            params: {
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
              code,
            },
          },
        );
        return response.data;
      },
    });
  }

  /**
   * Exchange Google code for an access token and connect the account.
   */
  async handleGoogleCallback(ctx: TenantContext, code: string) {
    const clientId = this.configService.get("GOOGLE_ADS_CLIENT_ID");
    const clientSecret = this.configService.get("GOOGLE_ADS_CLIENT_SECRET");
    const backendUrl = this.configService.get("BACKEND_URL") || "http://localhost:3001";
    const redirectUri = `${backendUrl}/marketing/oauth/callback/google`;

    return this.connectProviderAccount(ctx, {
      provider: "GOOGLE",
      operation: "marketing.oauth.callback.google",
      accountName: "Google Ads Account",
      exchange: async () => {
        const response = await axios.post("https://oauth2.googleapis.com/token", {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          code,
        });
        return response.data;
      },
    });
  }

  /**
   * Exchange TikTok code for an access token and connect the account.
   */
  async handleTikTokCallback(ctx: TenantContext, code: string) {
    const clientKey = this.configService.get("TIKTOK_CLIENT_ID");
    const clientSecret = this.configService.get("TIKTOK_CLIENT_SECRET");

    return this.connectProviderAccount(ctx, {
      provider: "TIKTOK",
      operation: "marketing.oauth.callback.tiktok",
      accountName: "TikTok Account",
      exchange: async () => {
        const response = await axios.post(
          "https://open.tiktokapis.com/v2/oauth/token/",
          {
            client_key: clientKey,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
          },
        );
        return response.data;
      },
    });
  }

  /**
   * Exchange YouTube code for an access token and connect the account.
   */
  async handleYoutubeCallback(ctx: TenantContext, code: string) {
    // YouTube usually shares the same project as Google Ads
    const clientId = this.configService.get("GOOGLE_ADS_CLIENT_ID");
    const clientSecret = this.configService.get("GOOGLE_ADS_CLIENT_SECRET");
    const backendUrl = this.configService.get("BACKEND_URL") || "http://localhost:3001";
    const redirectUri = `${backendUrl}/marketing/oauth/callback/youtube`;

    return this.connectProviderAccount(ctx, {
      provider: "YOUTUBE",
      operation: "marketing.oauth.callback.youtube",
      accountName: "YouTube Channel",
      exchange: async () => {
        const response = await axios.post("https://oauth2.googleapis.com/token", {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          code,
        });
        return response.data;
      },
    });
  }

  /**
   * Shared rejection-safe OAuth connect flow.
   *
   * The whole callback runs under the async-rejection deadline guard so it always
   * resolves as a typed response and any failure is captured + recorded in the
   * Integration_Log without an unhandled rejection (Req 7.1–7.3, 11.10). The
   * provider token exchange runs first; only on success do we write the
   * `marketing_accounts` row together with its Integration_Log outbox event in a
   * single Atomic_Operation, so a failure never leaves a partially connected
   * account (Req 11.10). A success is recorded in the Integration_Log (Req 11.11).
   */
  private async connectProviderAccount(
    ctx: TenantContext,
    params: {
      provider: string;
      operation: string;
      accountName: string;
      exchange: () => Promise<any>;
    },
  ): Promise<{ success: true; account_id: string }> {
    return this.asyncRejection.runWithDeadline(
      {
        module: "MARKETING",
        operation: params.operation,
        tenant_id: ctx.tenant_id,
        user_id: ctx.user_id,
        metadata: { provider: params.provider },
      },
      async () => {
        // 1. External token exchange (no DB write yet — a failure here leaves no
        //    account at all).
        const data = await params.exchange();
        const { access_token, refresh_token, expires_in } = data ?? {};

        if (!access_token) {
          throw new Error(
            `${params.provider} OAuth token exchange returned no access token.`,
          );
        }

        // 2. Persist the connected account and its Integration_Log outbox event
        //    atomically: both commit or neither does, so no partial connection.
        const account = await this.atomic.run(async ({ tx, outbox }) => {
          const created = await tx.marketing_accounts.create({
            data: MultiTenancyUtil.wrapCreate(ctx, {
              id: uuidv4(),
              provider: params.provider,
              account_name: params.accountName,
              status: "CONNECTED",
              access_token: EncryptionUtil.encrypt(access_token),
              refresh_token: refresh_token
                ? EncryptionUtil.encrypt(refresh_token)
                : null,
              token_expires_at: new Date(Date.now() + (expires_in ?? 0) * 1000),
              last_sync_at: new Date(),
            }),
          });
          await outbox({
            tenant_id: ctx.tenant_id,
            type: "marketing.account.connected.v1",
            payload: { account_id: created.id, provider: params.provider },
            company_id: ctx.company_id,
          });
          return created;
        });

        // 3. Record the success outcome in the Integration_Log (Req 11.11).
        await this.recordOutcome({
          tenant_id: ctx.tenant_id,
          user_id: ctx.user_id,
          operation: params.operation,
          event: "OAUTH_CALLBACK_SUCCESS",
          message: `OAuth callback connected ${params.provider} account ${account.id}.`,
          payload: { provider: params.provider, account_id: account.id },
        });

        return { success: true as const, account_id: account.id };
      },
    );
  }

  /**
   * Unified entry point for syncing an account.
   *
   * Records its SUCCESS outcome in the Integration_Log (Req 11.11). On failure it
   * marks the sync log + account FAILED (never a partial state) and rethrows; the
   * failure outcome is recorded in the Integration_Log by the async-rejection
   * helper that wraps every call site (cron worker → `runBatch`, manual sync →
   * `runWithDeadline`), satisfying Req 11.10 / 7.1–7.5.
   */
  async syncAccount(ctx: TenantScope, accountId: string, actorId: string) {
    const account = await this.prisma.marketing_accounts.findFirst({
      where: { id: accountId, ...MultiTenancyUtil.getScope(ctx) },
    });

    if (!account) throw new NotFoundException("Account not found");

    // Initialize sync log
    const logId = uuidv4();
    await this.prisma.marketing_sync_logs.create({
      data: MultiTenancyUtil.wrapCreate(ctx, {
        id: logId,
        account_id: accountId,
        status: "RUNNING",
        triggered_by: actorId,
        started_at: new Date(),
      }),
    });

    // Update account status
    await this.prisma.marketing_accounts.update({
      where: { id: accountId },
      data: { sync_status: "SYNCING" },
    });

    try {
      let dataPointsCount = 0;
      if (account.provider === "META" || account.provider === "meta") {
        dataPointsCount = await this.syncMetaAds(ctx, account);
      } else if (account.provider === "GOOGLE" || account.provider === "google") {
        dataPointsCount = await this.syncGoogleAds(ctx, account);
      } else if (account.provider === "TIKTOK") {
        dataPointsCount = await this.syncTikTok(ctx, account);
      } else if (account.provider === "YOUTUBE") {
        dataPointsCount = await this.syncYoutube(ctx, account);
      }

      // Finalize log
      await this.prisma.marketing_sync_logs.update({
        where: { id: logId },
        data: {
          status: "SUCCESS",
          finished_at: new Date(),
          data_points_count: dataPointsCount,
        },
      });

      // Update account status
      await this.prisma.marketing_accounts.update({
        where: { id: accountId },
        data: {
          sync_status: "IDLE",
          last_sync_at: new Date(),
        },
      });

      // Record the success outcome in the Integration_Log (Req 11.11).
      await this.recordOutcome({
        tenant_id: ctx.tenant_id,
        user_id: actorId,
        operation: "marketing.social.sync",
        event: "SOCIAL_SYNC_SUCCESS",
        message: `Social sync succeeded for account ${accountId} (${dataPointsCount} data points).`,
        payload: {
          account_id: accountId,
          provider: account.provider,
          data_points_count: dataPointsCount,
          sync_log_id: logId,
        },
      });

      return { success: true, dataPoints: dataPointsCount };
    } catch (error) {
      this.logger.error(`Sync failed for account ${accountId}: ${error.message}`);

      // Leave the account in a defined FAILED state, never a partial one.
      await this.prisma.marketing_sync_logs.update({
        where: { id: logId },
        data: {
          status: "FAILED",
          finished_at: new Date(),
          error_msg: error.message,
        },
      });

      await this.prisma.marketing_accounts.update({
        where: { id: accountId },
        data: { sync_status: "FAILED" },
      });

      // Rethrow: the wrapping async-rejection helper records the failure outcome
      // in the Integration_Log and guarantees no unhandled rejection escapes
      // (Req 11.10, 7.1, 7.2).
      throw error;
    }
  }

  /**
   * Record a success/non-failure outcome in the Integration_Log (`system_logs`)
   * with a timestamp, the operation id, and structured detail (Req 11.11). The
   * underlying logger never throws, so recording an outcome can never itself
   * crash the flow.
   */
  private async recordOutcome(params: {
    tenant_id?: string;
    user_id?: string;
    operation: string;
    event: string;
    message: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    await this.integrationLog.log({
      tenant_id: params.tenant_id,
      module: "MARKETING",
      level: "INFO",
      event: params.event,
      message: params.message,
      user_id: params.user_id,
      payload: {
        operation: params.operation,
        succeeded_at: new Date().toISOString(),
        ...params.payload,
      },
    });
  }

  /**
   * Sync Ads data from Meta
   */
  private async syncMetaAds(ctx: TenantScope, account: any): Promise<number> {
    const accessToken = EncryptionUtil.decrypt(account.access_token);
    this.logger.log(`Syncing Meta Ads for account ${account.id}`);

    // In a real implementation, we would call:
    // const response = await axios.get(`https://graph.facebook.com/v17.0/${account.external_id}/insights`, {
    //   headers: { Authorization: `Bearer ${accessToken}` }
    // });

    // Mocking 1-10 synced records
    const recordsToSync = 1 + Math.floor(Math.random() * 5);
    for (let i = 0; i < recordsToSync; i++) {
      await this.prisma.marketing_executions.create({
        data: MultiTenancyUtil.wrapCreate(ctx, {
          id: uuidv4(),
          campaign_id: `campaign-${Math.random().toString(36).substring(7)}`,
          channel: "SOCIAL",
          status: "COMPLETED",
          leads_generated: Math.floor(Math.random() * 50),
          spend: 50 + Math.random() * 200,
          notes: "Auto-synced from Meta Ads API",
          scheduled_at: new Date(),
        }),
      });
    }

    return recordsToSync;
  }

  /**
   * Sync Ads data from Google
   */
  private async syncGoogleAds(ctx: TenantScope, account: any): Promise<number> {
    this.logger.log(`Syncing Google Ads for account ${account.id}`);
    // Implementation for Google Ads API would go here
    return 0;
  }

  /**
   * Sync data from TikTok
   */
  private async syncTikTok(ctx: TenantScope, account: any): Promise<number> {
    this.logger.log(`Syncing TikTok for account ${account.id}`);
    // Simulated sync
    return 5;
  }

  /**
   * Sync data from YouTube
   */
  private async syncYoutube(ctx: TenantScope, account: any): Promise<number> {
    this.logger.log(`Syncing YouTube for account ${account.id}`);
    // Simulated sync
    return 3;
  }
}
