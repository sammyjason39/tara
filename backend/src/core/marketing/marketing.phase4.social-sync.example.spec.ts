import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpException } from "@nestjs/common";

// Mock axios so the OAuth token exchange never touches the network: each test
// configures `get`/`post` to either reject (transport failure) or resolve with a
// token-less body (a failed exchange). The default export shape mirrors how
// `social-sync.service.ts` imports it (`import axios from "axios"`).
vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
import axios from "axios";

import { SocialSyncService } from "./social-sync.service";
import { AsyncRejectionService } from "../shared/async";
import { AtomicOperationService } from "../shared/atomic";

/**
 * Task 8.6 — OAuth callback / social-sync rejection safety (Requirement 11.10).
 *
 * Per Requirement 11.10, IF a Marketing OAuth callback or social-sync operation
 * fails, THEN the Marketing_System SHALL handle the failure WITHOUT an unhandled
 * rejection, SHALL NOT leave a partially connected account, and SHALL record the
 * failure outcome in the Integration_Log.
 *
 * These example/edge tests drive the REAL {@link SocialSyncService},
 * {@link AsyncRejectionService}, and {@link AtomicOperationService} against an
 * in-memory fake Prisma client (no live DB), exercising the same code paths the
 * `tnt-3rlhko` run exercises:
 *
 *   - An OAuth callback whose token exchange REJECTS resolves as a typed
 *     {@link HttpException} (never an unhandled rejection), writes NO
 *     `marketing_accounts` row (no partially connected account), and records the
 *     failure outcome in the Integration_Log (Req 11.10, 7.1–7.3).
 *   - An OAuth callback whose exchange returns NO access token fails the same
 *     way: no account row, a recorded failure, a typed error.
 *   - A social-sync run whose provider sync THROWS leaves the account in a
 *     defined FAILED state (never a partial one), records the per-item failure in
 *     the Integration_Log, and the batch run continues without an unhandled
 *     rejection (Req 11.10, 7.4, 7.5).
 */

type Row = Record<string, any>;

function matchesWhere(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      if ("in" in cond) return (cond.in as unknown[]).includes(row[key]);
      return true;
    }
    return row[key] === cond;
  });
}

interface FakeTableOpts {
  failCreate?: boolean;
}

function makeTable(name: string, opts: FakeTableOpts = {}) {
  const rows: Row[] = [];
  let seq = 0;
  return {
    rows,
    create: async ({ data }: { data: Row }) => {
      if (opts.failCreate) throw new Error(`Injected failure creating ${name}`);
      const row: Row = {
        id: data.id ?? `${name}-${++seq}`,
        created_at: data.created_at ?? new Date(),
        ...data,
      };
      rows.push(row);
      return { ...row };
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = rows.find((r) => matchesWhere(r, where));
      if (!row) throw new Error(`Record not found for update in ${name}`);
      Object.assign(row, data);
      return { ...row };
    },
    findFirst: async ({ where }: { where?: Row } = {}) => {
      const row = rows.find((r) => matchesWhere(r, where));
      return row ? { ...row } : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).map((r) => ({ ...r })),
  };
}

function buildPrismaFake(opts: { failExecutionCreate?: boolean } = {}) {
  const prisma: any = {};
  prisma.marketing_accounts = makeTable("marketing_accounts");
  prisma.marketing_sync_logs = makeTable("marketing_sync_logs");
  prisma.marketing_executions = makeTable("marketing_executions", {
    failCreate: opts.failExecutionCreate,
  });
  prisma.sys_outbox_events = makeTable("sys_outbox_events");

  // Interactive-transaction shim: the body receives the same client; a throw
  // propagates so the Atomic_Operation rolls back (no partial writes).
  prisma.$transaction = async (fn: (tx: any) => Promise<unknown>) => fn(prisma);
  return prisma;
}

/** Integration_Log spy. `LoggerService.log` never throws in production. */
function makeIntegrationLog() {
  const entries: Row[] = [];
  return {
    entries,
    log: vi.fn(async (params: Row) => {
      entries.push(params);
    }),
  };
}

function buildService(
  prisma: any,
  integrationLog: ReturnType<typeof makeIntegrationLog>,
) {
  const configStub = { get: (_key: string) => undefined } as any;
  // Real async-rejection helper, wired to the Integration_Log spy so a captured
  // failure is recorded exactly as it would be in production.
  const asyncRejection = new AsyncRejectionService(integrationLog as any);
  const auditStub = { log: async () => undefined } as any;
  const eventBusStub = { publish: async () => undefined } as any;
  const atomic = new AtomicOperationService(prisma, auditStub, eventBusStub);
  const service = new SocialSyncService(
    prisma,
    configStub,
    asyncRejection,
    atomic,
    integrationLog as any,
  );
  return { service, asyncRejection };
}

const TENANT = "tnt-3rlhko";
const ctx = { tenant_id: TENANT, user_id: "usr-mkt" } as any;

beforeEach(() => {
  vi.clearAllMocks();
});

/* -------------------------------------------------------------------------- */
/* OAuth callback failure (Req 11.10)                                         */
/* -------------------------------------------------------------------------- */

describe("Marketing Phase 4 — OAuth callback failure is rejection-safe (Req 11.10)", () => {
  it("a token exchange that REJECTS yields a typed error, no account, and a recorded failure", async () => {
    const prisma = buildPrismaFake();
    const integrationLog = makeIntegrationLog();
    const { service } = buildService(prisma, integrationLog);

    // Transport failure during the provider token exchange.
    (axios.get as any).mockRejectedValue(new Error("ECONNREFUSED graph.facebook.com"));

    let caught: unknown;
    try {
      await service.handleMetaCallback(ctx, "auth-code-123");
    } catch (e) {
      caught = e;
    }

    // Resolved as a typed HttpException — never an unhandled rejection (Req 7.3).
    expect(caught).toBeInstanceOf(HttpException);
    // No partially connected account: the write only happens after a successful
    // exchange, so nothing was persisted (Req 11.10).
    expect(prisma.marketing_accounts.rows.length).toBe(0);
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
    // The failure outcome was recorded in the Integration_Log with the failed
    // operation id, a timestamp, and the cause (Req 11.10, 7.5).
    const failure = integrationLog.entries.find((e) => e.event === "ASYNC_REJECTION");
    expect(failure).toBeTruthy();
    expect(failure!.level).toBe("ERROR");
    expect(failure!.payload.operation).toBe("marketing.oauth.callback.meta");
    expect(typeof failure!.payload.failed_at).toBe("string");
    expect(failure!.payload.cause).toContain("ECONNREFUSED");
  });

  it("an exchange that returns NO access token fails the same way (no partial account)", async () => {
    const prisma = buildPrismaFake();
    const integrationLog = makeIntegrationLog();
    const { service } = buildService(prisma, integrationLog);

    // Provider responded, but without an access token — a failed exchange.
    (axios.get as any).mockResolvedValue({ data: { error: "invalid_grant" } });

    let caught: unknown;
    try {
      await service.handleMetaCallback(ctx, "auth-code-123");
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(HttpException);
    expect(prisma.marketing_accounts.rows.length).toBe(0);
    expect(prisma.sys_outbox_events.rows.length).toBe(0);
    const failure = integrationLog.entries.find((e) => e.event === "ASYNC_REJECTION");
    expect(failure).toBeTruthy();
    expect(failure!.payload.operation).toBe("marketing.oauth.callback.meta");
    expect(failure!.payload.cause).toContain("no access token");
  });
});

/* -------------------------------------------------------------------------- */
/* Social-sync failure (Req 11.10, 7.4, 7.5)                                  */
/* -------------------------------------------------------------------------- */

describe("Marketing Phase 4 — social-sync failure is rejection-safe (Req 11.10)", () => {
  it("a failing provider sync leaves the account FAILED (not partial), records the failure, and the batch continues", async () => {
    // Provider sync writes execution rows; injecting a create failure makes the
    // sync throw the way a real provider/API failure would.
    const prisma = buildPrismaFake({ failExecutionCreate: true });
    const integrationLog = makeIntegrationLog();
    const { service, asyncRejection } = buildService(prisma, integrationLog);

    prisma.marketing_accounts.rows.push({
      id: "acc-1",
      tenant_id: TENANT,
      provider: "META",
      account_name: "Acme",
      status: "CONNECTED",
      access_token: Buffer.from("token").toString("base64"),
      sync_status: "IDLE",
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Drive the sync exactly as the cron worker does: through runBatch, so a
    // per-item rejection is recorded and the run continues (Req 7.4, 7.5).
    const result = await asyncRejection.runBatch(
      { module: "MARKETING", operation: "marketing.social.sync.cron" },
      prisma.marketing_accounts.rows.map((r: Row) => ({ ...r })),
      (account: Row) =>
        service.syncAccount({ tenant_id: account.tenant_id } as any, account.id, "system"),
    );

    // The batch attempted every item, recorded the failure, and never threw
    // (no unhandled rejection at the process level).
    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(0);

    // The account is left in a DEFINED FAILED state — never a partial one.
    const account = prisma.marketing_accounts.rows.find((r: Row) => r.id === "acc-1");
    expect(account.sync_status).toBe("FAILED");
    // The sync log row is finalised as FAILED with the error captured.
    const log = prisma.marketing_sync_logs.rows[0];
    expect(log.status).toBe("FAILED");
    expect(log.error_msg).toContain("Injected failure");

    // The failure outcome was recorded in the Integration_Log (Req 11.10, 7.5).
    const failure = integrationLog.entries.find((e) => e.event === "ASYNC_REJECTION");
    expect(failure).toBeTruthy();
    expect(failure!.payload.operation).toBe("marketing.social.sync.cron");
    expect(typeof failure!.payload.failed_at).toBe("string");
  });
});
