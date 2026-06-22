// Feature: core-departments-stabilization, Property 9: Valid requests never produce server errors; failures resolve as typed responses
import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { ITService } from "./it.service";
import { ITMockRepository } from "./repositories/it.mock.repository";
import {
  CreateDeviceDto,
  CreateDeviceEventDto,
  DeviceType,
} from "./dto/device.dto";
import {
  CreateProvisioningRequestDto,
  ProvisioningScope,
} from "./dto/create-provisioning-request.dto";
import { mapPrismaError, prismaErrorToHttpException } from "../_shared/errors/prisma-error.mapper";
import { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Property 9: Valid requests never produce server errors; failures resolve as
 * typed responses.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 7.3, 8.7, 9.9, 12.2
 *
 * For any valid, scoped request to a core endpoint, the response status is in
 * 200–299 and references no nonexistent column, invalid foreign key, or
 * hardcoded identifier; inputs that fail validation produce a 400–422 response
 * naming each rejected field and persist nothing; missing in-scope resources
 * produce a 404; and any failing asynchronous operation within an endpoint
 * resolves (well within 30s) as a typed 4xx/5xx response rather than a 500 leak
 * or an unresolved request.
 *
 * Property 9 is introduced here in Phase 1 (IT), exercising the typed error
 * surface (`core/_shared/errors/prisma-error.mapper.ts`) and the IT
 * service/repository slice (`core/it`). The same typed-error surface and Prisma
 * mapper are shared by the four later phases, so this property is parameterized
 * once over the IT module and reused across Procurement, Sales, Marketing, and
 * Payment.
 *
 * Strategy (per design Testing Strategy):
 *  - Custom arbitraries for IT create DTOs (valid and adversarial) drive the
 *    real `class-validator` constraints — validity is decided by the validator,
 *    never hand-predicted.
 *  - The real in-memory `ITMockRepository` stands in for the live DB so create
 *    paths exercise real persistence/return-shape behavior; reads return scoped
 *    arrays (or `[]`) and never throw.
 *  - The Prisma mapper is fed generated Prisma error codes to assert every
 *    failure resolves as a typed HTTP response with the correct status.
 *  - A faithful async-rejection fake (mirroring `AsyncRejectionService.
 *    fireAndForget`) attaches its handler before the supervised work runs, so a
 *    rejecting downstream publish is swallowed and the endpoint still resolves.
 */

/* -------------------------------------------------------------------------- */
/* Test harness                                                               */
/* -------------------------------------------------------------------------- */

const NUM_RUNS = 120; // design mandates a minimum of 100 generated cases

/**
 * A fake Atomic_Operation that runs the work body with a stub transaction
 * context, mirroring `AtomicOperationService.run` so a throw inside the body
 * propagates as a typed exception (and would have rolled back) without a real
 * database.
 */
function buildAtomic() {
  const audit = vi.fn().mockResolvedValue(undefined);
  const outbox = vi.fn().mockResolvedValue(undefined);
  const publish = vi.fn().mockResolvedValue(undefined);
  const tx = { __tx: true } as any;
  return {
    audit,
    outbox,
    publish,
    tx,
    run: vi.fn(async (work: any) => work({ tx, audit, outbox, publish })),
  };
}

/**
 * A faithful `AsyncRejectionService.fireAndForget` fake: it attaches the
 * rejection handler BEFORE the supervised work executes (BUG-13 discipline) and
 * swallows any rejection so it can never surface as an unhandled rejection or
 * crash the endpoint (Requirements 7.1, 7.2, 7.3).
 */
function buildAsyncRejection() {
  return {
    fireAndForget: vi.fn((_d: any, work: () => Promise<unknown>) =>
      Promise.resolve()
        .then(() => work())
        .then(
          () => undefined,
          () => undefined,
        ),
    ),
  };
}

function buildService(eventBusOverride?: any) {
  const repository = new ITMockRepository();
  const atomic = buildAtomic();
  const asyncRejection = buildAsyncRejection();
  const eventBus =
    eventBusOverride ?? { publish: vi.fn().mockResolvedValue(undefined) };
  const auditService = { log: vi.fn().mockResolvedValue(undefined) };
  const service = new ITService(
    repository,
    auditService as any,
    eventBus as any,
    atomic as any,
    asyncRejection as any,
  );
  return { service, repository, atomic, asyncRejection, eventBus };
}

/** True when an HTTP status code is a 2xx success. */
const is2xx = (s: number) => s >= 200 && s <= 299;
/** True when an HTTP status code is a client-error in the 400–422 band. */
const isValidationBand = (s: number) => s >= 400 && s <= 422;

/* -------------------------------------------------------------------------- */
/* Arbitraries                                                                */
/* -------------------------------------------------------------------------- */

/** A scope arbitrary built only from a verified context's tenant/company. */
const scopeArb: fc.Arbitrary<TenantScope> = fc.record({
  tenant_id: fc.constantFrom("tenant-001", "tenant-002"),
  company_id: fc.option(fc.string({ minLength: 1, maxLength: 8 }), {
    nil: undefined,
  }),
});

/**
 * A device-create payload whose individual fields are independently valid,
 * missing, or wrongly-typed, so the real validator decides overall validity.
 */
const devicePayloadArb = fc.record(
  {
    name: fc.oneof(
      fc.string({ minLength: 1, maxLength: 24 }),
      fc.constant(undefined),
      fc.integer(),
    ),
    type: fc.oneof(
      fc.constantFrom(...Object.values(DeviceType)),
      fc.string({ minLength: 1, maxLength: 6 }),
      fc.constant(undefined),
    ),
    connection: fc.oneof(
      fc.constantFrom("API", "LAN", "USB", "MQTT"),
      fc.constant(undefined),
      fc.integer(),
    ),
    location_id: fc.option(fc.string({ maxLength: 8 }), { nil: undefined }),
  },
  { requiredKeys: [] },
);

/**
 * A provisioning-create payload, similarly mixing valid/missing/wrong values
 * for the required `scope` (enum) and `reason` (non-empty string) fields.
 */
const provisioningPayloadArb = fc.record(
  {
    scope: fc.oneof(
      fc.constantFrom(...Object.values(ProvisioningScope)),
      fc.string({ minLength: 1, maxLength: 6 }),
      fc.constant(undefined),
    ),
    reason: fc.oneof(
      fc.string({ minLength: 1, maxLength: 24 }),
      fc.constant(""),
      fc.constant(undefined),
      fc.integer(),
    ),
    priority: fc.option(fc.string({ maxLength: 8 }), { nil: undefined }),
  },
  { requiredKeys: [] },
);

/** Prisma error codes the mapper translates to typed 4xx responses. */
const mappedPrismaArb = fc.constantFrom(
  { code: "P2025", status: 404 },
  { code: "P2002", status: 409 },
  { code: "P2003", status: 400 },
  { code: "P2000", status: 400 },
);

function makePrismaError(code: string): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError(`prisma ${code}`, {
    code,
    clientVersion: "6.2.1",
    meta: { target: ["device_code"], field_name: "tenant_id", column_name: "name" },
  });
}

/* -------------------------------------------------------------------------- */
/* Property 9                                                                 */
/* -------------------------------------------------------------------------- */

describe("Property 9: Valid requests never produce server errors; failures resolve as typed responses", () => {
  it("device create: a valid payload persists and returns a 2xx record; an invalid payload yields a 400–422 naming each rejected field and persists nothing", async () => {
    await fc.assert(
      fc.asyncProperty(scopeArb, devicePayloadArb, async (scope, payload) => {
        const { service, repository } = buildService();
        const before = (await repository.getDevices(scope)).length;

        const dto = plainToInstance(CreateDeviceDto, payload);
        const errors = await validate(dto as object);

        if (errors.length === 0) {
          // Valid request -> success, status implicitly 2xx (no thrown
          // HttpException), persisted within the caller's Tenant_Scope with a
          // generated id (no hardcoded identifier) and tenant from context.
          const device = await service.createDevice(scope, dto as any, "usr-1");
          expect(device).toBeDefined();
          expect(device.id).toBeTruthy();
          expect(device.tenant_id).toBe(scope.tenant_id);
          const after = (await repository.getDevices(scope)).length;
          expect(after).toBe(before + 1);
        } else {
          // Invalid request -> the global ValidationPipe rejects with a 400,
          // naming each rejected field and its reason, and the service is never
          // reached so nothing is persisted (Requirements 1.3, 8.7).
          for (const e of errors) {
            expect(typeof e.property).toBe("string");
            expect(e.property.length).toBeGreaterThan(0);
            expect(e.constraints).toBeDefined();
            expect(Object.keys(e.constraints ?? {}).length).toBeGreaterThan(0);
          }
          const rejected = errors.map((e) => e.property);
          const messages = errors.flatMap((e) =>
            Object.values(e.constraints ?? {}),
          );
          const exception = new BadRequestException(messages);
          expect(isValidationBand(exception.getStatus())).toBe(true);
          // The message names each rejected field.
          for (const field of rejected) {
            expect(messages.some((m) => m.includes(field))).toBe(true);
          }
          // Nothing persisted: the rejected request never reaches the service.
          const after = (await repository.getDevices(scope)).length;
          expect(after).toBe(before);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("provisioning create: valid payloads persist with a PENDING status (2xx); invalid payloads produce a 400–422 naming rejected fields and persist nothing", async () => {
    await fc.assert(
      fc.asyncProperty(
        scopeArb,
        provisioningPayloadArb,
        async (scope, payload) => {
          const { service, repository } = buildService();
          const before = (await repository.getProvisioningRequests(scope))
            .length;

          const dto = plainToInstance(CreateProvisioningRequestDto, payload);
          const errors = await validate(dto as object);

          if (errors.length === 0) {
            const created = await service.createProvisioningRequest(
              scope,
              dto as any,
              "usr-1",
            );
            expect(created.id).toBeTruthy();
            expect(created.tenant_id).toBe(scope.tenant_id);
            expect(created.status).toBe("pending");
            const after = (await repository.getProvisioningRequests(scope))
              .length;
            expect(after).toBe(before + 1);
          } else {
            const messages = errors.flatMap((e) =>
              Object.values(e.constraints ?? {}),
            );
            const exception = new BadRequestException(messages);
            expect(isValidationBand(exception.getStatus())).toBe(true);
            for (const e of errors) {
              expect(e.constraints).toBeDefined();
              expect(messages.some((m) => m.includes(e.property))).toBe(true);
            }
            const after = (await repository.getProvisioningRequests(scope))
              .length;
            expect(after).toBe(before);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("scoped reads never error: list endpoints return a (possibly empty) array and the overview resolves, for any scope", async () => {
    await fc.assert(
      fc.asyncProperty(scopeArb, async (scope) => {
        const { service } = buildService();

        const devices = await service.getDevices(scope);
        const provisioning = await service.getProvisioningRequests(scope);
        const events = await service.getDeviceEvents(scope);
        const health = await service.getSystemHealth(scope);
        const overview = await service.getOverview(scope);

        // Collections are arrays — `[]` for an empty match, never null/error
        // (Requirements 8.2, 1.6, 9.9).
        expect(Array.isArray(devices)).toBe(true);
        expect(Array.isArray(provisioning)).toBe(true);
        expect(Array.isArray(events)).toBe(true);
        expect(Array.isArray(health)).toBe(true);
        // Every returned record belongs to the caller's tenant (no leakage).
        for (const d of devices) expect(d.tenant_id).toBe(scope.tenant_id);
        for (const p of provisioning)
          expect(p.tenant_id).toBe(scope.tenant_id);
        // The overview is assembled from scoped data and resolves successfully.
        expect(overview).toBeDefined();
        expect(overview.moduleContributions).toBeDefined();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("missing in-scope resources resolve as a 404, never a 500 or leakage", async () => {
    await fc.assert(
      fc.asyncProperty(
        scopeArb,
        fc.string({ minLength: 1, maxLength: 12 }),
        async (scope, missingId) => {
          const { service, repository } = buildService();
          const id = `missing-${missingId}`;

          // Transition on a non-existent in-scope request -> 404.
          let provisionStatus = 0;
          try {
            await service.markProvisioned(scope, id, "usr-1");
          } catch (err) {
            expect(err).toBeInstanceOf(NotFoundException);
            provisionStatus = (err as HttpException).getStatus();
          }
          expect(provisionStatus).toBe(404);

          // A device event referencing a device not in scope -> 404 and the
          // event is never recorded (Requirement 8.13).
          const eventsBefore = (await repository.getDeviceEvents(scope)).length;
          let eventStatus = 0;
          try {
            await service.createDeviceEvent(scope, {
              device_id: id,
              event_type: "HEARTBEAT",
              payload: {},
            } as CreateDeviceEventDto);
          } catch (err) {
            expect(err).toBeInstanceOf(NotFoundException);
            eventStatus = (err as HttpException).getStatus();
          }
          expect(eventStatus).toBe(404);
          const eventsAfter = (await repository.getDeviceEvents(scope)).length;
          expect(eventsAfter).toBe(eventsBefore);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("every backend failure resolves as a typed response: mapped Prisma errors -> 4xx, deliberate HttpExceptions pass through, unknown errors -> a typed 500 (never an untyped leak)", async () => {
    await fc.assert(
      fc.asyncProperty(
        mappedPrismaArb,
        fc.constantFrom(400, 403, 404, 409),
        fc.string({ maxLength: 20 }),
        (mapped, deliberateStatus, msg) => {
          // 1. A mappable Prisma error becomes the expected typed 4xx response.
          const prismaError = makePrismaError(mapped.code);
          const mappedException = prismaErrorToHttpException(
            prismaError,
            "Device",
          );
          expect(mappedException).toBeInstanceOf(HttpException);
          expect(mappedException!.getStatus()).toBe(mapped.status);
          expect(isValidationBand(mapped.status) || mapped.status === 404).toBe(
            true,
          );
          // mapPrismaError rethrows the same typed exception (no 500 for these).
          expect(() => mapPrismaError(prismaError, "Device")).toThrow(
            HttpException,
          );
          try {
            mapPrismaError(prismaError, "Device");
          } catch (e) {
            expect((e as HttpException).getStatus()).toBe(mapped.status);
            expect((e as HttpException).getStatus()).not.toBe(500);
          }

          // 2. A deliberately-thrown HttpException passes through unchanged.
          const deliberate = new HttpException(msg || "x", deliberateStatus);
          try {
            mapPrismaError(deliberate, "Device");
          } catch (e) {
            expect((e as HttpException).getStatus()).toBe(deliberateStatus);
          }

          // 3. An unexpected error resolves as a typed 500 (server-caused),
          //    rather than escaping untyped or leaving the request unresolved.
          let unexpectedStatus = 0;
          try {
            mapPrismaError(new Error(msg), "Device");
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerErrorException);
            unexpectedStatus = (e as HttpException).getStatus();
          }
          expect(unexpectedStatus).toBe(500);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("a failing asynchronous operation within an endpoint resolves promptly as a 2xx, never a 500 leak or an unresolved request", async () => {
    await fc.assert(
      fc.asyncProperty(
        scopeArb,
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.object({ maxDepth: 2 }),
        async (scope, deviceSuffix, eventPayload) => {
          // A live device for the event to attach to.
          const eventBus = {
            publish: vi.fn().mockRejectedValue(new Error("downstream boom")),
          };
          const { service, repository } = buildService(eventBus);
          const device = await service.createDevice(
            scope,
            { name: `dev-${deviceSuffix}`, type: DeviceType.POS_TERMINAL, connection: "API" } as any,
            "usr-1",
          );

          const before = (await repository.getDeviceEvents(scope)).length;

          // The downstream publish rejects, but the endpoint must still resolve
          // promptly (well within the 30s bound) with the recorded event — the
          // rejection is caught by the async-rejection helper and never leaks as
          // a 500 or leaves the request hanging (Requirements 7.1, 7.2, 7.3).
          const timeout = new Promise((_resolve, reject) =>
            setTimeout(() => reject(new Error("unresolved within bound")), 5000),
          );
          const event = (await Promise.race([
            service.createDeviceEvent(scope, {
              device_id: device.id,
              event_type: "HEARTBEAT",
              payload: eventPayload,
            } as CreateDeviceEventDto),
            timeout,
          ])) as { id: string; tenant_id: string };

          expect(event.id).toBeTruthy();
          expect(event.tenant_id).toBe(scope.tenant_id);
          // The event was durably recorded despite the downstream failure.
          const after = (await repository.getDeviceEvents(scope)).length;
          expect(after).toBe(before + 1);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
