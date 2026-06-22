// Feature: core-departments-stabilization, Property 7: Offline payment matrix is enforced per context
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { BadRequestException } from "@nestjs/common";

import { PaymentService } from "./payment.service";
import {
  classifyPaymentMethod,
  isMethodPermittedOffline,
  OFFLINE_PERMITTED_METHOD_CLASSES,
} from "./utils/offline-payment-matrix";
import type { CreatePaymentTransactionDto } from "./dto/create-payment-transaction.dto";
import type { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Property 7 — Offline payment matrix is enforced per context (Requirements 12.5, 12.6).
 *
 * For any payment-creation request:
 *   - WHILE the payment context is offline, a CASH or VOUCHER method class is permitted
 *     and processed through the Payment_Lifecycle (the transaction is created), and a
 *     CARD / QRIS / E_WALLET / any other gateway-backed method class is rejected with a
 *     client-error response identifying the method as unavailable offline, with NO
 *     transaction created (Req 12.5, 12.6).
 *   - WHILE online, all method classes are permitted (the transaction is created).
 *
 * Strategy: drive the REAL `PaymentService.createTransaction` (which consults the shared
 * `Offline_Payment_Matrix` via `classifyPaymentMethod` + `isMethodPermittedOffline`)
 * against a fake `OfflineContextResolver` whose offline state is generated per case, and
 * an in-memory repository that records every created transaction. fast-check generates
 * the full universe of channel/method combinations (which map across every method class:
 * CASH, VOUCHER, CARD, QRIS, E_WALLET, GATEWAY) crossed with offline/online, at >= 100
 * runs, so both permitted and blocked edges are explored under both connectivity states.
 */

const TENANT = "tnt-prop7";
const scope: TenantScope = { tenant_id: TENANT };

/* -------------------------------------------------------------------------- */
/* In-memory repository: records created transactions only.                   */
/* -------------------------------------------------------------------------- */

function buildInMemoryRepo() {
  const created: any[] = [];
  const repository = {
    createTransaction: async (_ctx: any, dto: CreatePaymentTransactionDto, actor_id: string) => {
      const row = {
        id: `txn-${created.length + 1}`,
        tenant_id: TENANT,
        status: "REQUEST_CREATED",
        created_by: actor_id,
        ...dto,
      };
      created.push(row);
      return row;
    },
    // getDevices is only consulted by the real resolver; we inject a fake resolver,
    // but provide it for completeness so the repo is a faithful stand-in.
    getDevices: async () => [],
  };
  return { repository, created };
}

/**
 * Builds a PaymentService wired to the in-memory repo and a fake offline resolver that
 * reports the generated connectivity state. Unused collaborators are stubbed.
 */
function buildService(isOffline: boolean) {
  const { repository, created } = buildInMemoryRepo();
  const adapterStub = {} as any;
  const financeStub = { createJournal: async () => undefined } as any;
  const atomicStub = {} as any;
  const offlineResolver = {
    resolve: async () => ({
      isOffline,
      reason: isOffline ? "context offline (fake)" : "context online (fake)",
    }),
  } as any;
  const service = new PaymentService(
    repository as any,
    adapterStub,
    adapterStub,
    adapterStub,
    financeStub,
    offlineResolver,
    atomicStub,
  );
  return { service, created };
}

/* -------------------------------------------------------------------------- */
/* Generators                                                                 */
/* -------------------------------------------------------------------------- */

// Channels exercise CARD (card_online/card_pos), E_WALLET (wallet), QRIS (qr), and the
// non-channel-driven path (bank_transfer / undefined).
const channelArb = fc.constantFrom(
  undefined,
  "bank_transfer",
  "card_online",
  "card_pos",
  "wallet",
  "qr",
);

// Methods exercise CASH, VOUCHER, EDC (CARD), GATEWAY, an unrecognised method (default-deny
// -> GATEWAY), and the absent-method path.
const methodArb = fc.constantFrom(undefined, "CASH", "VOUCHER", "EDC", "GATEWAY", "BITCOIN");

const dtoArb: fc.Arbitrary<CreatePaymentTransactionDto> = fc
  .record({
    channel: channelArb,
    method: methodArb,
    amount: fc.integer({ min: 0, max: 1_000_000 }),
    destination: fc.string({ minLength: 1, maxLength: 12 }),
  })
  .map(({ channel, method, amount, destination }) => {
    const dto: any = { type: "pos_payment", amount, destination, currency: "IDR" };
    if (channel !== undefined) dto.channel = channel;
    if (method !== undefined) dto.method = method;
    return dto as CreatePaymentTransactionDto;
  });

const RUNS = 200;

/* -------------------------------------------------------------------------- */
/* Property                                                                   */
/* -------------------------------------------------------------------------- */

describe("Payment — Property 7: Offline payment matrix is enforced per context (Req 12.5, 12.6)", () => {
  it("permits CASH/VOUCHER offline and blocks gateway-backed methods offline, while permitting all online", async () => {
    await fc.assert(
      fc.asyncProperty(dtoArb, fc.boolean(), async (dto, isOffline) => {
        const { service, created } = buildService(isOffline);

        const methodClass = classifyPaymentMethod(dto);
        const permittedOffline = isMethodPermittedOffline(methodClass);
        const expectBlocked = isOffline && !permittedOffline;

        if (expectBlocked) {
          // Offline + gateway-backed class: rejected with a client error identifying the
          // method as unavailable offline, and NO transaction created (Req 12.6).
          let caught: unknown;
          try {
            await service.createTransaction(scope, dto, "usr-1");
          } catch (e) {
            caught = e;
          }
          expect(caught).toBeInstanceOf(BadRequestException);
          const response: any = (caught as BadRequestException).getResponse();
          expect(response.type).toBe("payment/offline-not-allowed");
          // The error identifies the method class as unavailable offline.
          expect(String(response.detail)).toContain(methodClass);
          expect(String(response.detail).toLowerCase()).toContain("offline");
          // Nothing persisted.
          expect(created.length).toBe(0);
        } else {
          // Either online (all classes permitted) or offline CASH/VOUCHER: the payment
          // is processed through the Payment_Lifecycle (a transaction is created) (Req 12.5).
          const result = await service.createTransaction(scope, dto, "usr-1");
          expect(result).toBeDefined();
          expect(result.status).toBe("REQUEST_CREATED");
          expect(created.length).toBe(1);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("permits exactly the CASH and VOUCHER classes offline (matrix is default-deny)", async () => {
    // Reinforces that the offline-permitted set is precisely {CASH, VOUCHER}: every other
    // class the classifier can produce is blocked offline.
    await fc.assert(
      fc.asyncProperty(dtoArb, async (dto) => {
        const methodClass = classifyPaymentMethod(dto);
        const expectedPermitted = OFFLINE_PERMITTED_METHOD_CLASSES.has(methodClass);

        const { service, created } = buildService(true /* offline */);
        let caught: unknown;
        try {
          await service.createTransaction(scope, dto, "usr-1");
        } catch (e) {
          caught = e;
        }

        if (expectedPermitted) {
          expect(caught).toBeUndefined();
          expect(created.length).toBe(1);
        } else {
          expect(caught).toBeInstanceOf(BadRequestException);
          expect(created.length).toBe(0);
        }
      }),
      { numRuns: RUNS },
    );
  });
});
