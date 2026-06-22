import { describe, it, expect } from "vitest";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { PaymentDbRepository } from "./repositories/payment.db.repository";
import { OfflineContextResolver } from "./utils/offline-context.resolver";
import { AtomicOperationService } from "../shared/atomic/atomic-operation.service";
import { UserRole } from "../../shared/roles";
import type { TenantScope } from "../../shared/scope/tenant-scope";
import type { CreatePaymentTransactionDto } from "./dto/create-payment-transaction.dto";

/**
 * Task 10.7 — Phase 5 (Payment) example/edge regression tests.
 *
 * Two regressions are pinned here, complementing the lifecycle/settlement
 * coverage in `payment.phase5.transitions.spec.ts` and
 * `payment.phase5.settlement.spec.ts`:
 *
 *   1. BUG-11 — the Offline_Payment_Matrix is enforced at the backend against
 *      the resolved offline state of the SPECIFIC payment context (device/branch
 *      connectivity), not a global flag. While the context is offline, a
 *      CARD/QRIS/E_WALLET (gateway-backed) request is rejected with a 400 and NO
 *      transaction is created, while a CASH/VOUCHER request is permitted and
 *      processed (Requirements 12.5, 12.6).
 *
 *   2. Actor-identity — the Payment controller derives the actor exclusively from
 *      the verified `TenantContext.user_id`; it never reads a spoofable
 *      `x-actor-id` header and never falls back to a literal `"system"`. The
 *      verified `user_id` is what the service (and therefore the persisted
 *      `created_by`/audit actor) receives (Requirements 2.10, 12.1).
 *
 * The BUG-11 cases drive the REAL `PaymentService`, the REAL
 * `OfflineContextResolver`, and the REAL `PaymentDbRepository` over an in-memory
 * fake Prisma client seeded with an OFFLINE POS device, so the offline state is
 * genuinely derived from device connectivity. The actor-identity cases drive the
 * REAL `PaymentController` with a recording service stub, asserting the verified
 * identity is the one passed through.
 */

/* -------------------------------------------------------------------------- */
/* In-memory fake Prisma client                                               */
/* -------------------------------------------------------------------------- */

type Row = Record<string, any>;

function matchesWhere(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      if ("in" in cond) return (cond.in as unknown[]).includes(row[key]);
      if ("notIn" in cond) return !(cond.notIn as unknown[]).includes(row[key]);
      return true;
    }
    return row[key] === cond;
  });
}

function applyData(target: Row, data: Row): void {
  for (const [key, value] of Object.entries(data)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      "create" in value
    ) {
      continue;
    }
    target[key] = value;
  }
}

function makeTable(name: string) {
  const rows: Row[] = [];
  let seq = 0;
  return {
    rows,
    create: async ({ data }: { data: Row }) => {
      const clean: Row = {};
      applyData(clean, data);
      const row: Row = {
        id: data.id ?? `${name}-${++seq}`,
        created_at: data.created_at ?? new Date(),
        ...clean,
      };
      rows.push(row);
      return { ...row };
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = rows.find((r) => matchesWhere(r, where));
      if (!row) throw new Error(`Record not found for update in ${name}`);
      applyData(row, data);
      return { ...row };
    },
    findFirst: async ({ where }: { where?: Row } = {}) => {
      const row = rows.find((r) => matchesWhere(r, where));
      return row ? { ...row } : null;
    },
    findUnique: async ({ where }: { where?: Row } = {}) => {
      const row = rows.find((r) => matchesWhere(r, where));
      return row ? { ...row } : null;
    },
    findMany: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).map((r) => ({ ...r })),
    count: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).length,
  };
}

function buildPrismaFake() {
  const tableNames = [
    "payment_transactions",
    "payment_pos_devices",
    "payment_audit_events",
    "sys_outbox_events",
  ];
  const prisma: any = {};
  for (const n of tableNames) prisma[n] = makeTable(n);
  prisma.$transaction = async (fn: (tx: any) => Promise<unknown>) => fn(prisma);
  return prisma;
}

const TENANT = "tnt-3rlhko";
const scope: TenantScope = { tenant_id: TENANT };

/** Seed exactly one POS device in the caller's scope with the given status. */
function seedDevice(prisma: any, status: "online" | "offline") {
  prisma.payment_pos_devices.rows.push({
    id: "dev-1",
    tenant_id: TENANT,
    location_id: null,
    device_code: "POS-1",
    approved: true,
    status,
    provider_id: null,
    last_used_at: null,
  });
}

function buildService(prisma: any) {
  const repository = new PaymentDbRepository(prisma);
  const offlineResolver = new OfflineContextResolver(repository as any);
  const auditStub = { log: async () => undefined } as any;
  const eventBusStub = { publish: async () => undefined } as any;
  const atomic = new AtomicOperationService(prisma, auditStub, eventBusStub);
  const adapterStub = {} as any;
  const financeStub = { createJournal: async () => undefined } as any;
  const service = new PaymentService(
    repository as any,
    adapterStub,
    adapterStub,
    adapterStub,
    financeStub,
    offlineResolver,
    atomic,
  );
  return { service };
}

/* -------------------------------------------------------------------------- */
/* BUG-11 — Offline_Payment_Matrix enforcement (Req 12.5, 12.6)               */
/* -------------------------------------------------------------------------- */

describe("Payment Phase 5 — BUG-11 offline matrix regression (Req 12.5, 12.6)", () => {
  // Gateway-backed method classes that must be blocked while the context is offline.
  const blocked: Array<{ label: string; dto: Partial<CreatePaymentTransactionDto> }> = [
    { label: "CARD (card_online)", dto: { channel: "card_online" } },
    { label: "CARD (card_pos)", dto: { channel: "card_pos" } },
    { label: "QRIS (qr)", dto: { channel: "qr" } },
    { label: "E_WALLET (wallet)", dto: { channel: "wallet" } },
    { label: "GATEWAY (method)", dto: { method: "GATEWAY" } },
  ];

  for (const { label, dto } of blocked) {
    it(`rejects an offline ${label} payment with a 400 and creates no transaction`, async () => {
      const prisma = buildPrismaFake();
      seedDevice(prisma, "offline");
      const { service } = buildService(prisma);

      const payload = {
        type: "customer_collection",
        amount: 1000,
        destination: "acct-1",
        ...dto,
      } as CreatePaymentTransactionDto;

      let caught: unknown;
      try {
        await service.createTransaction(scope, payload, "usr-1");
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      // Requirement 12.6: nothing persisted — no transaction created for the request.
      expect(prisma.payment_transactions.rows.length).toBe(0);
    });
  }

  // Method classes permitted offline.
  const permitted: Array<{ label: string; dto: Partial<CreatePaymentTransactionDto> }> = [
    { label: "CASH", dto: { method: "CASH" } },
    { label: "VOUCHER", dto: { method: "VOUCHER" as any } },
  ];

  for (const { label, dto } of permitted) {
    it(`permits an offline ${label} payment and persists it in the REQUEST state`, async () => {
      const prisma = buildPrismaFake();
      seedDevice(prisma, "offline");
      const { service } = buildService(prisma);

      const payload = {
        type: "pos_payment",
        amount: 1000,
        destination: "acct-1",
        ...dto,
      } as CreatePaymentTransactionDto;

      const created = await service.createTransaction(scope, payload, "usr-1");

      // Requirement 12.5: permitted and processed through the Payment_Lifecycle.
      expect(prisma.payment_transactions.rows.length).toBe(1);
      expect(created.status).toBe("REQUEST_CREATED");
      expect(prisma.payment_transactions.rows[0].tenant_id).toBe(TENANT);
    });
  }

  it("permits a gateway-backed payment when the same context is ONLINE (matrix is per-context, not global)", async () => {
    const prisma = buildPrismaFake();
    seedDevice(prisma, "online");
    const { service } = buildService(prisma);

    const created = await service.createTransaction(
      scope,
      {
        type: "customer_collection",
        amount: 1000,
        destination: "acct-1",
        channel: "card_online",
      } as CreatePaymentTransactionDto,
      "usr-1",
    );

    expect(prisma.payment_transactions.rows.length).toBe(1);
    expect(created.status).toBe("REQUEST_CREATED");
  });
});

/* -------------------------------------------------------------------------- */
/* Actor-identity regression (Req 2.10, 12.1)                                 */
/* -------------------------------------------------------------------------- */

interface RecordedCall {
  scope: TenantScope;
  dto: unknown;
  actorId: string;
}

function buildController() {
  const calls: RecordedCall[] = [];
  const serviceStub = {
    createTransaction: async (s: TenantScope, dto: unknown, actorId: string) => {
      calls.push({ scope: s, dto, actorId });
      return { id: "txn-1", status: "REQUEST_CREATED", created_by: actorId };
    },
  } as any;
  const prismaStub = {} as any;
  const scopeResolverStub = {
    resolve: async (ctx: any) => ({ tenant_id: ctx.tenant_id }) as TenantScope,
  } as any;
  const controller = new PaymentController(serviceStub, prismaStub, scopeResolverStub);
  return { controller, calls };
}

/** Build a request whose verified identity differs from a spoofed header. */
function buildRequest(opts: {
  tenantId: string;
  userId?: string;
  spoofedActorHeader?: string;
}): any {
  return {
    tenantContext: {
      tenant_id: opts.tenantId,
      user_id: opts.userId,
      role: UserRole.ADMIN,
    },
    headers: opts.spoofedActorHeader
      ? { "x-actor-id": opts.spoofedActorHeader }
      : {},
  };
}

describe("Payment Phase 5 — actor identity comes from TenantContext, not x-actor-id (Req 2.10)", () => {
  it("passes the verified TenantContext.user_id to the service as the actor", async () => {
    const { controller, calls } = buildController();
    const request = buildRequest({ tenantId: TENANT, userId: "usr-verified" });

    await controller.createTransaction(request, {
      type: "customer_collection",
      amount: 1000,
      destination: "acct-1",
      method: "CASH",
    } as CreatePaymentTransactionDto);

    expect(calls.length).toBe(1);
    expect(calls[0].actorId).toBe("usr-verified");
    expect(calls[0].scope.tenant_id).toBe(TENANT);
  });

  it("ignores a spoofed x-actor-id header, using the verified user_id instead", async () => {
    const { controller, calls } = buildController();
    const request = buildRequest({
      tenantId: TENANT,
      userId: "usr-verified",
      spoofedActorHeader: "attacker-spoofed-id",
    });

    await controller.createTransaction(request, {
      type: "customer_collection",
      amount: 1000,
      destination: "acct-1",
      method: "CASH",
    } as CreatePaymentTransactionDto);

    expect(calls.length).toBe(1);
    // The spoofed header must never reach the service; the verified id is used.
    expect(calls[0].actorId).toBe("usr-verified");
    expect(calls[0].actorId).not.toBe("attacker-spoofed-id");
  });

  it("rejects a mutating request that carries no verified user identity (no 'system' fallback)", async () => {
    const { controller, calls } = buildController();
    const request = buildRequest({
      tenantId: TENANT,
      userId: undefined,
      spoofedActorHeader: "attacker-spoofed-id",
    });

    let caught: unknown;
    try {
      await controller.createTransaction(request, {
        type: "customer_collection",
        amount: 1000,
        destination: "acct-1",
        method: "CASH",
      } as CreatePaymentTransactionDto);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ForbiddenException);
    // No actor was derived and no service mutation was attempted.
    expect(calls.length).toBe(0);
  });
});
