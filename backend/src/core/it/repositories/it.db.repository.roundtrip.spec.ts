import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { ITDbRepository } from "./it.db.repository";
import { UnresolvedFieldError, serializeForResponse } from "../../common";
import type { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Task 2.7 — IT repository round-trip persistence property test.
 *
 * // Feature: core-departments-stabilization, Property 4: Round-trip persistence
 * of created and updated records
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 8.3, 8.6, 9.1, 10.1, 11.1,
 * 12.1, 13.5, 13.6**
 *
 * Property 4 (design.md): *For any valid create or update of any core record
 * type, reading the record back within the same Tenant_Scope yields a record
 * whose persisted fields equal the values supplied on the operation (correct
 * DTO-to-column mapping with no name/casing drops and no values written to a
 * wrong column), whose `tenant_id` equals the caller's context, with date fields
 * serialized in ISO 8601; and a request containing a field that resolves to no
 * schema column is rejected with that field named and nothing persisted.*
 *
 * This test introduces Property 4 in Phase 1 (IT) and exercises the IT
 * repository round-trip directly (the field-mapping utility itself is covered by
 * `core/common/field-mapping.spec.ts`). It drives `ITDbRepository` against an
 * in-memory fake Prisma client that behaves like the live DB for the operations
 * under test: a write stores the persisted `data` (plus server-managed columns),
 * and a scoped read returns exactly what was stored. If a DTO field were dropped,
 * written to the wrong column, or the tenant lost, the round-trip assertion would
 * fail.
 */

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/* -------------------------------------------------------------------------- */
/* In-memory fake Prisma client                                               */
/* -------------------------------------------------------------------------- */

type Row = Record<string, any>;

/** Equality match of a Prisma-style `where` clause against a stored row. Only
 * the plain-equality and `{ in: [...] }` forms used by the IT repository are
 * supported, which is all the round-trip paths exercise. */
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

/** Build a single fake model delegate backed by an array store. */
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

function buildPrismaFake() {
  return {
    it_devices: makeTable("dev"),
    it_provisioning_requests: makeTable("prov"),
    // Employee/supplier resolution lookups are only triggered for ids prefixed
    // EMP-/SUP-, which the generators never produce, so these return no match.
    employees: { findUnique: async () => null },
    supplier_masters: { findFirst: async () => null },
  } as any;
}

/* -------------------------------------------------------------------------- */
/* Generators                                                                 */
/* -------------------------------------------------------------------------- */

// Avoids the EMP-/SUP- prefixes that trigger cross-record resolution.
const plainId = fc
  .string({ minLength: 1, maxLength: 16 })
  .filter((s) => !s.startsWith("EMP-") && !s.startsWith("SUP-"));

const tenantId = fc
  .string({ minLength: 3, maxLength: 16 })
  .map((s) => `tnt-${s.replace(/\s/g, "")}`)
  .filter((s) => s.length > 4);

const metadataGen = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 8 }),
  fc.oneof(fc.string(), fc.integer(), fc.boolean()),
  { maxKeys: 5 },
);

const deviceDtoGen = fc.record(
  {
    name: fc.string({ minLength: 1, maxLength: 30 }),
    type: fc.constantFrom("POS_TERMINAL", "RFID_READER", "BARCODE_SCANNER"),
    connection: fc.constantFrom("API", "LAN", "USB", "MQTT"),
    location_id: fc.option(plainId, { nil: undefined }),
    owner_id: fc.option(plainId, { nil: undefined }),
    metadata: fc.option(metadataGen, { nil: undefined }),
  },
  { requiredKeys: ["name", "type", "connection"] },
);

const provisioningScope = fc.constantFrom(
  "quote",
  "invoice",
  "delivery_proof",
  "full_portal",
);

const provisioningDtoGen = fc.record(
  {
    scope: provisioningScope,
    reason: fc.string({ minLength: 1, maxLength: 40 }),
    supplierBranchId: fc.option(plainId, { nil: undefined }),
    priority: fc.option(fc.constantFrom("LOW", "MEDIUM", "HIGH"), {
      nil: undefined,
    }),
    // Non-empty: the repository read mapping intentionally normalizes a falsy
    // (empty-string) description to `undefined`, which is deliberate
    // normalization rather than a field-mapping name/casing drop. Property 4
    // concerns meaningful supplied values round-tripping without drops.
    description: fc.option(fc.string({ minLength: 1, maxLength: 40 }), {
      nil: undefined,
    }),
    type: fc.option(fc.string({ minLength: 1, maxLength: 12 }), {
      nil: undefined,
    }),
    requested_by: fc.option(plainId, { nil: undefined }),
  },
  { requiredKeys: ["scope", "reason"] },
);

// A camelCase field name guaranteed not to be a writable device/provisioning
// column, used to assert the unresolved-field rejection.
const unknownField = fc
  .string({ minLength: 1, maxLength: 8 })
  .map((s) => `zz${s.replace(/[^a-zA-Z]/g, "")}Field`);

function scopeOf(tenant_id: string): TenantScope {
  return { tenant_id };
}

/* -------------------------------------------------------------------------- */
/* Properties                                                                 */
/* -------------------------------------------------------------------------- */

describe("ITDbRepository round-trip persistence (Property 4)", () => {
  it("device create round-trips every supplied field within the same scope", async () => {
    await fc.assert(
      fc.asyncProperty(tenantId, deviceDtoGen, async (tenant_id, dto) => {
        const prisma = buildPrismaFake();
        const repo = new ITDbRepository(prisma);

        const created = await repo.createDevice(tenant_id, dto as any);
        const readBack = await repo.getDevice(scopeOf(tenant_id), created.id);

        // tenant_id equals the caller's context (Req 5.1, 8.3).
        expect(readBack.tenant_id).toBe(tenant_id);
        // Supplied values land in their corresponding column with no drops and
        // none in a wrong column (Req 5.1, 5.2, 5.3, 5.5).
        expect(readBack.name).toBe(dto.name);
        expect(readBack.type).toBe(dto.type);
        expect(readBack.connection).toBe(dto.connection);
        // A new device is forced ONLINE by the repository.
        expect(readBack.status).toBe("ONLINE");
        if (dto.location_id !== undefined)
          expect(readBack.location_id).toBe(dto.location_id);
        if (dto.owner_id !== undefined)
          expect(readBack.owner_id).toBe(dto.owner_id);
        expect(readBack.metadata).toEqual(dto.metadata ?? {});

        // Date fields serialize to ISO 8601 in the response (Req 13.5, 13.6).
        const serialized = serializeForResponse(readBack) as Record<
          string,
          unknown
        >;
        expect(typeof serialized.created_at).toBe("string");
        expect(serialized.created_at as string).toMatch(ISO_8601);
      }),
      { numRuns: 120 },
    );
  });

  it("device update round-trips the updated fields within the same scope", async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantId,
        deviceDtoGen,
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.option(plainId, { nil: undefined }),
        async (tenant_id, dto, newName, newLocation) => {
          const prisma = buildPrismaFake();
          const repo = new ITDbRepository(prisma);

          const created = await repo.createDevice(tenant_id, dto as any);
          const patch: Record<string, unknown> = { name: newName };
          if (newLocation !== undefined) patch.location_id = newLocation;

          await repo.updateDevice(tenant_id, created.id, patch as any);
          const readBack = await repo.getDevice(scopeOf(tenant_id), created.id);

          expect(readBack.tenant_id).toBe(tenant_id);
          expect(readBack.name).toBe(newName);
          if (newLocation !== undefined)
            expect(readBack.location_id).toBe(newLocation);
          // Untouched fields are preserved (no wrong-column writes).
          expect(readBack.type).toBe(dto.type);
          expect(readBack.connection).toBe(dto.connection);
        },
      ),
      { numRuns: 120 },
    );
  });

  it("provisioning create round-trips supplied fields, persists PENDING and context tenant", async () => {
    await fc.assert(
      fc.asyncProperty(tenantId, provisioningDtoGen, async (tenant_id, dto) => {
        const prisma = buildPrismaFake();
        const repo = new ITDbRepository(prisma);

        const created = await repo.createProvisioningRequest(
          tenant_id,
          dto as any,
        );
        const readBack = await repo.getProvisioningRequest(
          scopeOf(tenant_id),
          created.id,
        );

        expect(readBack.tenant_id).toBe(tenant_id);
        // A new provisioning request is always PENDING (Req 8.4), lowercased by
        // the entity contract on read.
        expect(readBack.status).toBe("pending");
        // camelCase DTO -> snake_case column -> camelCase field round-trip
        // (Req 5.2, 5.5) with no name/casing drops (Req 5.3).
        expect(readBack.scope).toBe(dto.scope);
        expect(readBack.reason).toBe(dto.reason);
        if (dto.supplierBranchId !== undefined)
          expect(readBack.supplierBranchId).toBe(dto.supplierBranchId);
        if (dto.priority !== undefined)
          expect(readBack.priority).toBe(dto.priority);
        if (dto.description !== undefined)
          expect(readBack.description).toBe(dto.description);
        expect(readBack.requested_by).toBe(dto.requested_by ?? "system");

        const serialized = serializeForResponse(readBack) as Record<
          string,
          unknown
        >;
        expect(serialized.created_at as string).toMatch(ISO_8601);
        expect(serialized.updated_at as string).toMatch(ISO_8601);
      }),
      { numRuns: 120 },
    );
  });

  it("rejects a device create with an unresolved field, naming it and persisting nothing (Req 5.4)", async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantId,
        deviceDtoGen,
        unknownField,
        async (tenant_id, dto, badField) => {
          const prisma = buildPrismaFake();
          const repo = new ITDbRepository(prisma);

          const payload = { ...(dto as any), [badField]: "x" };
          let caught: unknown;
          try {
            await repo.createDevice(tenant_id, payload);
          } catch (e) {
            caught = e;
          }
          expect(caught).toBeInstanceOf(UnresolvedFieldError);
          expect((caught as UnresolvedFieldError).field).toBe(badField);
          expect((caught as UnresolvedFieldError).getStatus()).toBe(400);
          // Nothing persisted: the store remains empty.
          expect(prisma.it_devices.rows.length).toBe(0);
        },
      ),
      { numRuns: 120 },
    );
  });

  it("rejects a provisioning create with an unresolved field, persisting nothing (Req 5.4)", async () => {
    await fc.assert(
      fc.asyncProperty(
        tenantId,
        provisioningDtoGen,
        unknownField,
        async (tenant_id, dto, badField) => {
          const prisma = buildPrismaFake();
          const repo = new ITDbRepository(prisma);

          const payload = { ...(dto as any), [badField]: "x" };
          let caught: unknown;
          try {
            await repo.createProvisioningRequest(tenant_id, payload);
          } catch (e) {
            caught = e;
          }
          expect(caught).toBeInstanceOf(UnresolvedFieldError);
          expect((caught as UnresolvedFieldError).field).toBe(badField);
          expect(prisma.it_provisioning_requests.rows.length).toBe(0);
        },
      ),
      { numRuns: 120 },
    );
  });
});
