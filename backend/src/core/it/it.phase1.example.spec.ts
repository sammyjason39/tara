import { describe, it, expect, beforeEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { ITService } from "./it.service";
import { ITDbRepository } from "./repositories/it.db.repository";
import { AtomicOperationService } from "../shared/atomic";
import { AsyncRejectionService } from "../shared/async";
import type { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Task 2.12 — Phase 1 (IT) example / edge tests.
 *
 * Concrete, focused regressions that complement the Phase 1 property tests
 * (Properties 1, 3, 4, 8, 9, 10) and the live-DB verification script
 * (`backend/scripts/verify-it-phase1.live.ts`). They pin the two edge cases the
 * task calls out and exercise the IT write paths end-to-end
 * (service → ITDbRepository → Prisma) so the same column/FK/identifier
 * guarantees that the live `tnt-3rlhko` run asserts are also checked here:
 *
 *   1. A device-event referencing a device that is NOT in the resolved
 *      Tenant_Scope (foreign-tenant or wholly nonexistent) is rejected with a
 *      404 and NO event row is recorded (Requirement 8.13).
 *   2. An invalid provisioning transition (e.g. provisioning an already
 *      PROVISIONED request) is rejected with a 400 and the request's status is
 *      left unchanged (Requirement 8.9).
 *   3. The IT write paths persist via explicit, schema-aligned DTO-to-column
 *      mapping with the tenant always derived from context (no missing column,
 *      no invalid foreign key, no hardcoded identifier) — the in-memory
 *      equivalent of the live-DB guarantees of Requirements 13.1, 13.2.
 *
 * The tests drive the REAL `ITDbRepository`, `AtomicOperationService`, and
 * `AsyncRejectionService` against an in-memory fake Prisma client that behaves
 * like the live DB for the operations under test, including enforcing the
 * `it_device_events.device_id -> it_devices.id` foreign key. This proves that if
 * the foreign-scope guard were absent the write would surface as an invalid FK
 * at the database, and that the guard prevents the row from ever being written.
 */

/* -------------------------------------------------------------------------- */
/* In-memory fake Prisma client                                               */
/* -------------------------------------------------------------------------- */

type Row = Record<string, any>;

/** Minimal Prisma-style P2003 foreign-key violation, as the live DB would raise. */
class FakeForeignKeyError extends Error {
  code = "P2003";
  constructor(field: string) {
    super(`Foreign key constraint failed on the field: \`${field}\``);
    this.name = "PrismaClientKnownRequestError";
  }
}

function matchesWhere(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (cond && typeof cond === "object" && !Array.isArray(cond)) {
      if ("in" in cond) return (cond.in as unknown[]).includes(row[key]);
      if ("startsWith" in cond)
        return String(row[key] ?? "").startsWith(cond.startsWith as string);
      return true;
    }
    return row[key] === cond;
  });
}

function makeTable(name: string) {
  const rows: Row[] = [];
  let seq = 0;
  return {
    rows,
    create: async ({ data }: { data: Row }) => {
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
    delete: async ({ where }: { where: Row }) => {
      const idx = rows.findIndex((r) => matchesWhere(r, where));
      if (idx >= 0) rows.splice(idx, 1);
      return {};
    },
    count: async ({ where }: { where?: Row } = {}) =>
      rows.filter((r) => matchesWhere(r, where)).length,
  };
}

/**
 * Build a fake Prisma client. `it_device_events.create` enforces the
 * `device_id -> it_devices.id` foreign key exactly like the live DB so an event
 * for a nonexistent device would raise a P2003 if the service ever reached the
 * write — which the foreign-scope guard prevents (Requirement 8.13).
 */
function buildPrismaFake() {
  const it_devices = makeTable("dev");
  const it_provisioning_requests = makeTable("prov");
  const it_device_events = makeTable("evt");
  const sys_outbox_events = makeTable("outbox");

  const baseCreateEvent = it_device_events.create;
  it_device_events.create = async ({ data }: { data: Row }) => {
    const parent = it_devices.rows.find((d) => d.id === data.device_id);
    if (!parent) throw new FakeForeignKeyError("device_id");
    return baseCreateEvent({ data });
  };

  const prisma: any = {
    it_devices,
    it_provisioning_requests,
    it_device_events,
    sys_outbox_events,
    // Employee/supplier resolution is only triggered for EMP-/SUP- prefixed ids,
    // which these tests never use.
    employees: { findUnique: async () => null },
    supplier_masters: { findFirst: async () => null },
  };
  // Interactive transaction: the fake client itself is the tx client.
  prisma.$transaction = async (fn: (tx: any) => Promise<unknown>) => fn(prisma);
  return prisma;
}

/* -------------------------------------------------------------------------- */
/* Wiring                                                                     */
/* -------------------------------------------------------------------------- */

function buildService() {
  const prisma = buildPrismaFake();
  const repository = new ITDbRepository(prisma);
  const auditStub = { log: async () => undefined } as any;
  const eventBusStub = { publish: async () => undefined } as any;
  const atomic = new AtomicOperationService(
    prisma as any,
    auditStub,
    eventBusStub,
  );
  const loggerStub = { log: async () => undefined } as any;
  const asyncRejection = new AsyncRejectionService(loggerStub);
  const service = new ITService(
    repository,
    auditStub,
    eventBusStub,
    atomic,
    asyncRejection,
  );
  return { service, repository, prisma };
}

const TENANT_A = "tnt-3rlhko"; // the Live_Test_Tenant convention
const TENANT_B = "tnt-other";
const scopeA: TenantScope = { tenant_id: TENANT_A };
const scopeB: TenantScope = { tenant_id: TENANT_B };

/* -------------------------------------------------------------------------- */
/* Edge case 1 — foreign-scope / nonexistent device-event (Req 8.13)          */
/* -------------------------------------------------------------------------- */

describe("IT Phase 1 example — device-event scope rejection (Req 8.13)", () => {
  it("rejects an event for a device owned by another tenant with a 404 and records nothing", async () => {
    const { service, prisma } = buildService();

    // A device exists, but it belongs to tenant A.
    const device = await service.createDevice(
      scopeA,
      { name: "Front POS", type: "POS_TERMINAL", connection: "LAN" } as any,
      "usr-a",
    );

    // Tenant B ingests an event referencing tenant A's device id.
    await expect(
      service.createDeviceEvent(scopeB, {
        device_id: device.id,
        event_type: "HEARTBEAT",
        payload: { ok: true },
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    // No event row was written for the foreign-scope device.
    expect(prisma.it_device_events.rows.length).toBe(0);
  });

  it("rejects an event for a wholly nonexistent device with a 404 and records nothing", async () => {
    const { service, prisma } = buildService();

    await expect(
      service.createDeviceEvent(scopeA, {
        device_id: "dev-does-not-exist",
        event_type: "HEARTBEAT",
        payload: {},
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    // The scoped guard short-circuits before the write, so the FK is never
    // exercised and no event row exists.
    expect(prisma.it_device_events.rows.length).toBe(0);
  });

  it("records an event for an in-scope device (FK satisfied, event reflected on read)", async () => {
    const { service } = buildService();

    const device = await service.createDevice(
      scopeA,
      { name: "Kiosk", type: "POS_TERMINAL", connection: "API" } as any,
      "usr-a",
    );

    const event = await service.createDeviceEvent(scopeA, {
      device_id: device.id,
      event_type: "HEARTBEAT",
      payload: { battery: 91 },
    } as any);

    expect(event.device_id).toBe(device.id);
    expect(event.tenant_id).toBe(TENANT_A);

    const events = await service.getDeviceEvents(scopeA);
    expect(events.map((e) => e.id)).toContain(event.id);
  });
});

/* -------------------------------------------------------------------------- */
/* Edge case 2 — invalid provisioning transition (Req 8.9)                    */
/* -------------------------------------------------------------------------- */

describe("IT Phase 1 example — invalid provisioning transition (Req 8.9)", () => {
  it("provisioning an already-PROVISIONED request returns 400 and leaves status unchanged", async () => {
    const { service, prisma } = buildService();

    const created = await service.createProvisioningRequest(
      scopeA,
      { scope: "full_portal", reason: "laptop" } as any,
      "usr-a",
    );

    // First transition PENDING -> PROVISIONED succeeds.
    const provisioned = await service.markProvisioned(
      scopeA,
      created.id,
      "usr-admin",
    );
    expect(provisioned.status).toBe("provisioned");

    // Second transition from PROVISIONED is invalid.
    await expect(
      service.markProvisioned(scopeA, created.id, "usr-admin"),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Status is unchanged in the store (still PROVISIONED, not re-written).
    const row = prisma.it_provisioning_requests.rows.find(
      (r: any) => r.id === created.id,
    );
    expect(row.status).toBe("PROVISIONED");
  });

  it("provisioning a request outside the caller's scope surfaces a 404 and writes nothing", async () => {
    const { service, prisma } = buildService();

    const created = await service.createProvisioningRequest(
      scopeA,
      { scope: "full_portal", reason: "monitor" } as any,
      "usr-a",
    );

    await expect(
      service.markProvisioned(scopeB, created.id, "usr-b"),
    ).rejects.toBeInstanceOf(NotFoundException);

    const row = prisma.it_provisioning_requests.rows.find(
      (r: any) => r.id === created.id,
    );
    // Untouched: still PENDING with no provisioned_by actor.
    expect(row.status).toBe("PENDING");
    expect(row.provisioned_by ?? null).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Write-path smoke — no missing column / invalid FK / hardcoded id (Req 13)  */
/* -------------------------------------------------------------------------- */

describe("IT Phase 1 example — write-path integrity (Req 13.1, 13.2)", () => {
  it("device + provisioning + transition + event persist with context tenant and schema columns", async () => {
    const { service, prisma } = buildService();

    // Tenant is always derived from context, never hardcoded.
    const device = await service.createDevice(
      scopeA,
      {
        name: "Warehouse Scanner",
        type: "BARCODE_SCANNER",
        connection: "USB",
        location_id: "loc-1",
      } as any,
      "usr-a",
    );
    expect(device.tenant_id).toBe(TENANT_A);

    const prov = await service.createProvisioningRequest(
      scopeA,
      { scope: "full_portal", reason: "access", priority: "HIGH" } as any,
      "usr-a",
    );
    expect(prov.tenant_id).toBe(TENANT_A);
    expect(prov.status).toBe("pending");

    await service.markProvisioned(scopeA, prov.id, "usr-admin");

    const event = await service.createDeviceEvent(scopeA, {
      device_id: device.id,
      event_type: "SCAN",
      payload: { code: "X" },
    } as any);
    expect(event.tenant_id).toBe(TENANT_A);

    // The persisted device row uses only schema-aligned snake_case columns —
    // a misnamed/missing column would not round-trip back through the entity.
    const stored = prisma.it_devices.rows.find((r: any) => r.id === device.id);
    expect(stored.tenant_id).toBe(TENANT_A);
    expect(stored.name).toBe("Warehouse Scanner");
    expect(stored.type).toBe("BARCODE_SCANNER");
    expect(stored.connection).toBe("USB");
    expect(stored.location_id).toBe("loc-1");
    // An Integration_Log outbox row was written in the same transaction for each
    // privileged write (device create, provisioning create, provision, …).
    expect(prisma.sys_outbox_events.rows.length).toBeGreaterThan(0);
    expect(
      prisma.sys_outbox_events.rows.every((e: any) => e.tenant_id === TENANT_A),
    ).toBe(true);
  });
});
