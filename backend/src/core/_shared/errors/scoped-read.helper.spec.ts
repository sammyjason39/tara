import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { NotFoundException } from "@nestjs/common";
import {
  findScoped,
  findScopedOrThrow,
  scopedWhere,
} from "./scoped-read.helper";

/**
 * Tests for the tenant-scoped composite-key read discipline
 * (Requirements 1.4, 4.5).
 *
 * A record outside the caller's Tenant_Scope must resolve to `null` and surface
 * as a 404 — never as cross-tenant leakage.
 */

interface FakeRecord {
  id: string;
  tenant_id: string;
  name: string;
}

/**
 * A fake `findFirst`-only delegate backed by an in-memory table. It applies
 * every key in the `where` clause as an equality filter, exactly as Prisma's
 * `findFirst` would for a composite-key read.
 */
function makeDelegate(rows: FakeRecord[]) {
  return {
    findFirst(args: { where: Record<string, unknown> }) {
      const match = rows.find((row) =>
        Object.entries(args.where).every(
          ([key, value]) => (row as Record<string, unknown>)[key] === value,
        ),
      );
      return Promise.resolve(match ?? null);
    },
  };
}

describe("scopedWhere", () => {
  it("always includes id and tenant_id and merges extra scope keys", () => {
    const where = scopedWhere("rec-1", {
      tenant_id: "t-1",
      company_id: "c-1",
      location_id: "l-1",
    });
    expect(where).toEqual({
      id: "rec-1",
      tenant_id: "t-1",
      company_id: "c-1",
      location_id: "l-1",
    });
  });
});

describe("findScoped", () => {
  it("returns the record when it exists within the Tenant_Scope", async () => {
    const delegate = makeDelegate([
      { id: "rec-1", tenant_id: "t-1", name: "Alpha" },
    ]);
    const result = await findScoped(delegate, "rec-1", { tenant_id: "t-1" });
    expect(result?.name).toBe("Alpha");
  });

  it("returns null for a record owned by another tenant (no leakage)", async () => {
    const delegate = makeDelegate([
      { id: "rec-1", tenant_id: "t-2", name: "Other tenant" },
    ]);
    const result = await findScoped(delegate, "rec-1", { tenant_id: "t-1" });
    expect(result).toBeNull();
  });
});

describe("findScopedOrThrow", () => {
  it("returns the record when present in scope", async () => {
    const delegate = makeDelegate([
      { id: "rec-1", tenant_id: "t-1", name: "Alpha" },
    ]);
    const result = await findScopedOrThrow(
      delegate,
      "rec-1",
      { tenant_id: "t-1" },
      "Device",
    );
    expect(result.name).toBe("Alpha");
  });

  it("throws NotFoundException for a cross-tenant id, naming only type and id", async () => {
    const delegate = makeDelegate([
      { id: "rec-1", tenant_id: "t-2", name: "secret-other-tenant-name" },
    ]);
    await expect(
      findScopedOrThrow(delegate, "rec-1", { tenant_id: "t-1" }, "Device"),
    ).rejects.toBeInstanceOf(NotFoundException);

    let caught: unknown;
    try {
      await findScopedOrThrow(delegate, "rec-1", { tenant_id: "t-1" }, "Device");
    } catch (e) {
      caught = e;
    }
    const message = (caught as NotFoundException).message;
    expect(message).toContain("Device");
    expect(message).toContain("rec-1");
    // Must not leak any field value of the out-of-scope record.
    expect(message).not.toContain("secret-other-tenant-name");
  });

  // Feature: core-departments-stabilization
  // Property: a get-by-id targeting a record owned by another tenant always
  // yields 404 (indistinguishable from a missing id), never the foreign record.
  it("property: cross-tenant or missing ids always surface as 404", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 12 }), // caller tenant
        fc.string({ minLength: 1, maxLength: 12 }), // owner tenant
        fc.string({ minLength: 1, maxLength: 12 }), // record id
        async (callerTenant, ownerTenant, id) => {
          const delegate = makeDelegate([
            { id, tenant_id: ownerTenant, name: "data" },
          ]);

          const result = await findScoped(delegate, id, {
            tenant_id: callerTenant,
          });

          if (callerTenant === ownerTenant) {
            expect(result).not.toBeNull();
          } else {
            expect(result).toBeNull();
            let caught: unknown;
            try {
              await findScopedOrThrow(
                delegate,
                id,
                { tenant_id: callerTenant },
                "Resource",
              );
            } catch (e) {
              caught = e;
            }
            expect(caught).toBeInstanceOf(NotFoundException);
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});
