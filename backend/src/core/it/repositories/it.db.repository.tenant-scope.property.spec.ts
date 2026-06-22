// Feature: core-departments-stabilization, Property 1: Tenant-scoped reads never leak other tenants
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { NotFoundException } from "@nestjs/common";

import { ITDbRepository } from "./it.db.repository";
import { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Property 1: Tenant-scoped reads never leak other tenants
 *
 * Validates: Requirements 1.4, 1.6, 2.1, 2.7, 2.8, 2.9, 6.1, 6.2, 8.1, 8.2,
 * 8.8, 9.8, 9.11, 10.7, 11.12, 12.13
 *
 * For any two distinct tenants seeded with IT records (devices, device events,
 * provisioning requests, system health), any read issued by a non-privileged
 * caller of one tenant — a list, a filtered list, or a get-by-id — returns only
 * records belonging to that caller's `tenant_id` and permitted scope; an empty
 * match yields `[]` (not an error, Requirement 1.6); and a get-by-id or a
 * mutation targeting a record owned by the OTHER tenant returns a not-found
 * response (404) leaving the other tenant's record unchanged (Requirements 8.8,
 * 1.4, 2.9).
 *
 * Strategy (per design "Generators" / "Isolation & atomicity"): seed two
 * tenants into a fake Prisma boundary that honours the repository's `where`
 * clause filtering — notably `tenant_id`, the resolved scope keys, and the
 * `findFirst({ where: { id, tenant_id, ... } })` composite-key reads
 * (Requirement 4.5). The unmodified {@link ITDbRepository} is exercised through
 * its tenant-scoped read methods; the property asserts no read ever surfaces a
 * row whose `tenant_id` differs from the calling tenant, cross-tenant get-by-id
 * is a 404, and a cross-tenant mutation is a 404 that leaves the target record
 * unchanged.
 *
 * This single property is the Phase-1 (IT) introduction of the cross-cutting
 * tenant-isolation property; it is parameterized across the IT record types
 * reachable through the repository's scoped reads (devices 8.1/8.8, device
 * events 8.2, provisioning requests 8.8, system health 8.1) and is reused
 * across the later phases' record types.
 */

type Row = Record<string, any>;

/**
 * Minimal Prisma `where` matcher: supports scalar equality, explicit `null`,
 * the `in` set operator, and `OR`/`AND` arrays. Nested relation filters are
 * ignored — tenant isolation is always decided by `tenant_id`, which the
 * generators below always express as a scalar.
 */
function matchWhere(row: Row, where: any): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR") {
      if (!(cond as any[]).some((sub) => matchWhere(row, sub))) return false;
      continue;
    }
    if (key === "AND") {
      if (!(cond as any[]).every((sub) => matchWhere(row, sub))) return false;
      continue;
    }
    if (cond === null) {
      if (row[key] !== null && row[key] !== undefined) return false;
      continue;
    }
    if (typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as Record<string, any>;
      if ("in" in c) {
        if (!(c.in as any[]).includes(row[key])) return false;
        continue;
      }
      // Unsupported nested filter — not used for tenant isolation; skip.
      continue;
    }
    if (row[key] !== cond) return false;
  }
  return true;
}

/**
 * Build a fake Prisma model delegate backed by an in-memory row array. Supports
 * the read and write surface the IT repository touches: `findMany`, `findFirst`,
 * `count`, `groupBy`, and `update`. `update` mirrors Prisma's behaviour of
 * throwing when the `where` clause matches no row (the P2025 → 404 contract),
 * so a cross-tenant mutation surfaces as not-found and persists nothing.
 */
function makeTable(rows: Row[]) {
  const filtered = (args: any) => rows.filter((r) => matchWhere(r, args?.where));
  return {
    findMany: async (args: any = {}) => {
      let res = filtered(args);
      if (args.orderBy) {
        const [k, dir] = Object.entries(args.orderBy)[0] as [string, string];
        res = [...res].sort((a, b) => {
          if (a[k] < b[k]) return dir === "desc" ? 1 : -1;
          if (a[k] > b[k]) return dir === "desc" ? -1 : 1;
          return 0;
        });
      }
      if (typeof args.take === "number") res = res.slice(0, args.take);
      return res;
    },
    findFirst: async (args: any = {}) => filtered(args)[0] ?? null,
    count: async (args: any = {}) => filtered(args).length,
    groupBy: async (args: any = {}) => {
      const matched = filtered(args);
      const by: string[] = args.by ?? [];
      const groups = new Map<string, Row>();
      for (const r of matched) {
        const key = by.map((k) => String(r[k])).join("|");
        const existing = groups.get(key);
        if (existing) {
          existing._count += 1;
        } else {
          const g: Row = { _count: 1 };
          for (const k of by) g[k] = r[k];
          groups.set(key, g);
        }
      }
      return [...groups.values()];
    },
    update: async (args: any = {}) => {
      const target = filtered({ where: args.where })[0];
      if (!target) {
        // Mirror Prisma P2025: an update whose where matches no row throws.
        throw new NotFoundException("Record to update not found.");
      }
      Object.assign(target, args.data);
      return target;
    },
  };
}

// ----- Row builders (one per seeded IT record type) -------------------------

function deviceRow(tenant_id: string, n: number): Row {
  return {
    id: `${tenant_id}__dev__${n}`,
    tenant_id,
    company_id: `${tenant_id}__co`,
    location_id: `${tenant_id}__loc`,
    name: `Device ${n}`,
    type: n % 2 === 0 ? "POS_TERMINAL" : "BARCODE_SCANNER",
    connection: "API",
    status: "ONLINE",
    owner_id: null,
    metadata: {},
    created_at: new Date("2024-01-01T00:00:00.000Z"),
    updated_at: new Date("2024-01-01T00:00:00.000Z"),
    last_heartbeat: null,
  };
}

function deviceEventRow(tenant_id: string, n: number): Row {
  return {
    id: `${tenant_id}__evt__${n}`,
    tenant_id,
    company_id: `${tenant_id}__co`,
    device_id: `${tenant_id}__dev__${n}`,
    event_type: "BARCODE_SCAN",
    payload: { code: `c-${n}` },
    processed: false,
    created_at: new Date("2024-01-02T00:00:00.000Z"),
    updated_at: new Date("2024-01-02T00:00:00.000Z"),
  };
}

function provisioningRow(tenant_id: string, n: number): Row {
  return {
    id: `${tenant_id}__prov__${n}`,
    tenant_id,
    company_id: `${tenant_id}__co`,
    employee_id: null,
    supplier_id: null,
    supplier_branch_id: null,
    scope: "full_portal",
    priority: "MEDIUM",
    description: null,
    reason: "onboarding",
    status: "PENDING",
    requested_by: "admin",
    provisioned_by: null,
    created_at: new Date("2024-01-03T00:00:00.000Z"),
    updated_at: new Date("2024-01-03T00:00:00.000Z"),
  };
}

function healthRow(tenant_id: string, n: number): Row {
  return {
    id: `${tenant_id}__health__${n}`,
    tenant_id,
    company_id: `${tenant_id}__co`,
    component: "database",
    status: "healthy",
    latency_ms: 40 + n,
    checked_at: new Date("2024-01-04T00:00:00.000Z"),
  };
}

function buildRows<T>(
  tenant_id: string,
  count: number,
  fn: (t: string, n: number) => T,
): T[] {
  return Array.from({ length: count }, (_v, n) => fn(tenant_id, n));
}

/** Non-privileged caller scope: tenant only (forced to its context scope). */
const scopeOf = (tenant_id: string): TenantScope => ({ tenant_id });

describe("Property 1: Tenant-scoped reads never leak other tenants", () => {
  it("IT scoped reads return only the caller's tenant; cross-tenant get-by-id and mutation are not-found and leave records unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantA: fc.uuid(),
          tenantB: fc.uuid(),
          devA: fc.nat({ max: 5 }),
          devB: fc.nat({ max: 5 }),
          evtA: fc.nat({ max: 4 }),
          evtB: fc.nat({ max: 4 }),
          provA: fc.nat({ max: 4 }),
          provB: fc.nat({ max: 4 }),
          healthA: fc.nat({ max: 4 }),
          healthB: fc.nat({ max: 4 }),
        }),
        async (s) => {
          // Two genuinely distinct tenants.
          fc.pre(s.tenantA !== s.tenantB);
          const A = s.tenantA;
          const B = s.tenantB;

          const devices = [
            ...buildRows(A, s.devA, deviceRow),
            ...buildRows(B, s.devB, deviceRow),
          ];
          const events = [
            ...buildRows(A, s.evtA, deviceEventRow),
            ...buildRows(B, s.evtB, deviceEventRow),
          ];
          const provisioning = [
            ...buildRows(A, s.provA, provisioningRow),
            ...buildRows(B, s.provB, provisioningRow),
          ];
          const health = [
            ...buildRows(A, s.healthA, healthRow),
            ...buildRows(B, s.healthB, healthRow),
          ];

          const prisma = {
            it_devices: makeTable(devices),
            it_device_events: makeTable(events),
            it_provisioning_requests: makeTable(provisioning),
            it_system_health: makeTable(health),
          } as any;

          const repo = new ITDbRepository(prisma);
          const scopeA = scopeOf(A);

          // --- (1) List reads: every returned record belongs to caller A. ---
          const devList = await repo.getDevices(scopeA);
          for (const d of devList) expect(d.tenant_id).toBe(A);
          expect(devList).toHaveLength(s.devA);

          const evtList = await repo.getDeviceEvents(scopeA);
          for (const e of evtList) expect(e.tenant_id).toBe(A);
          expect(evtList).toHaveLength(s.evtA);

          const provList = await repo.getProvisioningRequests(scopeA);
          for (const p of provList) expect(p.tenant_id).toBe(A);
          expect(provList).toHaveLength(s.provA);

          const healthList = await repo.getSystemHealth(scopeA);
          for (const h of healthList) expect(h.tenant_id).toBe(A);
          expect(healthList).toHaveLength(s.healthA);

          // --- (2) Filtered list read: A's own scope key stays A-only; a
          //         foreign scope key yields [] (empty match, not an error). ---
          const devOwnScope = await repo.getDevices({
            tenant_id: A,
            company_id: `${A}__co`,
            location_id: `${A}__loc`,
          });
          for (const d of devOwnScope) expect(d.tenant_id).toBe(A);
          expect(devOwnScope).toHaveLength(s.devA);

          const devForeignScope = await repo.getDevices({
            tenant_id: A,
            company_id: `${B}__co`,
          });
          expect(devForeignScope).toEqual([]);

          // --- (3) Empty match yields [] (Requirement 1.6), never an error. ---
          const emptyScope = scopeOf(`${A}-no-such-tenant`);
          expect(await repo.getDevices(emptyScope)).toEqual([]);
          expect(await repo.getDeviceEvents(emptyScope)).toEqual([]);
          expect(await repo.getProvisioningRequests(emptyScope)).toEqual([]);
          expect(await repo.getSystemHealth(emptyScope)).toEqual([]);

          // --- (4) get-by-id for the OTHER tenant's records => 404. ---
          for (let n = 0; n < s.devB; n++) {
            await expect(
              repo.getDevice(scopeA, `${B}__dev__${n}`),
            ).rejects.toBeInstanceOf(NotFoundException);
          }
          for (let n = 0; n < s.provB; n++) {
            await expect(
              repo.getProvisioningRequest(scopeA, `${B}__prov__${n}`),
            ).rejects.toBeInstanceOf(NotFoundException);
          }

          // --- (5) get-by-id for the caller's OWN records => found, A-scoped. ---
          for (let n = 0; n < s.devA; n++) {
            const own = await repo.getDevice(scopeA, `${A}__dev__${n}`);
            expect(own.tenant_id).toBe(A);
          }
          for (let n = 0; n < s.provA; n++) {
            const own = await repo.getProvisioningRequest(scopeA, `${A}__prov__${n}`);
            expect(own.tenant_id).toBe(A);
          }

          // --- (6) Cross-tenant MUTATION => not-found, target left unchanged. ---
          for (let n = 0; n < s.provB; n++) {
            const before = provisioning.find(
              (r) => r.id === `${B}__prov__${n}`,
            )!;
            const beforeStatus = before.status;
            const beforeProvisionedBy = before.provisioned_by;
            // Caller A attempts to provision tenant B's request.
            await expect(
              repo.markProvisioned(A, `${B}__prov__${n}`, "attacker"),
            ).rejects.toBeInstanceOf(NotFoundException);
            // Tenant B's record is observably unchanged.
            expect(before.status).toBe(beforeStatus);
            expect(before.provisioned_by).toBe(beforeProvisionedBy);
          }
          for (let n = 0; n < s.devB; n++) {
            const before = devices.find((r) => r.id === `${B}__dev__${n}`)!;
            const beforeName = before.name;
            await expect(
              repo.updateDevice(A, `${B}__dev__${n}`, { name: "hijacked" }),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(before.name).toBe(beforeName);
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});
