// Feature: core-departments-stabilization, Task 1.1: TenantScope resolver
import { describe, it, expect } from "vitest";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

import {
  computeScopeIntent,
  TenantScopeResolver,
} from "./tenant-scope.resolver";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { UserRole } from "../roles";

/**
 * Unit tests for the shared TenantScope resolver.
 *
 * Validates: Requirements 2.1, 2.4, 2.5, 2.6, 2.7, 2.8
 *
 * The pure decision logic (`computeScopeIntent`) is exercised directly; the
 * ownership validation (`TenantScopeResolver.resolve`) is exercised with a
 * mocked Prisma boundary so no live DB is required.
 */

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    tenant_id: "tnt-1",
    company_id: "cmp-1",
    location_id: "loc-1",
    branch_id: "brn-1",
    user_id: "usr-1",
    role: UserRole.MEMBER,
    ...overrides,
  } as TenantContext;
}

/** A Prisma mock whose company/location lookups are decided by `owned`. */
function prismaMock(owned: boolean) {
  const findFirst = async ({ where }: { where: { id: string } }) =>
    owned ? { id: where.id } : null;
  return {
    companies: { findFirst },
    locations: { findFirst },
  } as any;
}

describe("computeScopeIntent (pure decision logic)", () => {
  it("always derives tenant_id from the verified context (Req 2.1, 2.5)", () => {
    const intent = computeScopeIntent(ctx({ tenant_id: "tnt-real" }));
    expect(intent.tenant_id).toBe("tnt-real");
  });

  it("throws Forbidden when the context has no tenant_id (Req 2.5)", () => {
    expect(() => computeScopeIntent({} as TenantContext)).toThrow(
      ForbiddenException,
    );
  });

  it("never substitutes tenant_id for company_id (Req 2.6)", () => {
    // company_id equal to tenant_id must be dropped, never carried as scope.
    const intent = computeScopeIntent(
      ctx({ tenant_id: "tnt-1", company_id: "tnt-1" }),
    );
    expect(intent.company_id).toBeUndefined();
    expect(intent.tenant_id).toBe("tnt-1");
  });

  it("pins a non-privileged caller to its context scope (Req 2.8)", () => {
    const intent = computeScopeIntent(
      ctx({ role: UserRole.MEMBER }),
      // requested filters equal to context are allowed (no widening)
      { company_id: "cmp-1", location_id: "loc-1", branch_id: "brn-1" },
    );
    expect(intent.company_id).toBe("cmp-1");
    expect(intent.location_id).toBe("loc-1");
    expect(intent.branch_id).toBe("brn-1");
  });

  it("rejects a non-privileged caller widening company scope (Req 2.4, 2.8)", () => {
    expect(() =>
      computeScopeIntent(ctx({ role: UserRole.MEMBER }), {
        company_id: "cmp-other",
      }),
    ).toThrow(ForbiddenException);
  });

  it("rejects a non-privileged caller widening location scope (Req 2.4, 2.8)", () => {
    expect(() =>
      computeScopeIntent(ctx({ role: UserRole.MANAGER }), {
        location_id: "loc-other",
      }),
    ).toThrow(ForbiddenException);
  });

  it("rejects a non-privileged caller widening branch scope (Req 2.4, 2.8)", () => {
    expect(() =>
      computeScopeIntent(ctx({ role: UserRole.MEMBER }), {
        branch_id: "brn-other",
      }),
    ).toThrow(ForbiddenException);
  });

  it("lets a privileged caller widen scope with requested filters (Req 3.4)", () => {
    const intent = computeScopeIntent(ctx({ role: UserRole.ADMIN }), {
      company_id: "cmp-2",
      location_id: "loc-2",
      branch_id: "brn-2",
    });
    expect(intent.company_id).toBe("cmp-2");
    expect(intent.location_id).toBe("loc-2");
    expect(intent.branch_id).toBe("brn-2");
  });

  it("falls a privileged caller back to context scope when nothing requested", () => {
    const intent = computeScopeIntent(ctx({ role: UserRole.OWNER }));
    expect(intent.company_id).toBe("cmp-1");
    expect(intent.location_id).toBe("loc-1");
    expect(intent.branch_id).toBe("brn-1");
  });
});

describe("TenantScopeResolver.resolve (ownership validation)", () => {
  it("returns a scope owned by the tenant (Req 2.7)", async () => {
    const resolver = new TenantScopeResolver(prismaMock(true));
    const scope = await resolver.resolve(ctx({ role: UserRole.ADMIN }), {
      company_id: "cmp-2",
      location_id: "loc-2",
      branch_id: "brn-2",
    });
    expect(scope).toEqual({
      tenant_id: "tnt-1",
      company_id: "cmp-2",
      location_id: "loc-2",
      branch_id: "brn-2",
    });
  });

  it("rejects a requested company not belonging to the tenant (Req 2.7)", async () => {
    const resolver = new TenantScopeResolver(prismaMock(false));
    await expect(
      resolver.resolve(ctx({ role: UserRole.ADMIN }), { company_id: "cmp-x" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects a requested location not belonging to the tenant (Req 2.7)", async () => {
    const resolver = new TenantScopeResolver(prismaMock(false));
    await expect(
      resolver.resolve(ctx({ role: UserRole.OWNER, company_id: undefined }), {
        location_id: "loc-x",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects a requested branch not belonging to the tenant (Req 2.7)", async () => {
    const resolver = new TenantScopeResolver(prismaMock(false));
    await expect(
      resolver.resolve(
        ctx({ role: UserRole.SUPERADMIN, company_id: undefined, location_id: undefined }),
        { branch_id: "brn-x" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("never carries company_id == tenant_id through to the resolved scope (Req 2.6)", async () => {
    const resolver = new TenantScopeResolver(prismaMock(true));
    const scope = await resolver.resolve(
      ctx({ tenant_id: "tnt-1", company_id: "tnt-1", location_id: undefined, branch_id: undefined }),
    );
    expect(scope.company_id).toBeUndefined();
    expect(scope.tenant_id).toBe("tnt-1");
  });

  it("throws BadRequest when no usable tenant_id resolves (Req 2.5)", async () => {
    const resolver = new TenantScopeResolver(prismaMock(true));
    await expect(
      resolver.resolve({ tenant_id: "" } as TenantContext),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // empty-string tenant_id is caught earlier by computeScopeIntent as Forbidden;
    // a whitespace-only id surfaces the BadRequest guard.
    await expect(
      resolver.resolve({ tenant_id: 123 as unknown as string } as TenantContext),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
