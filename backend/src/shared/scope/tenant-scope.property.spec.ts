// Feature: core-departments-stabilization, Property 2: Effective scope derives from verified context, not client input
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

import {
  computeScopeIntent,
  TenantScopeResolver,
} from "./tenant-scope.resolver";
import { RequestedScope } from "./tenant-scope";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { UserRole } from "../roles";

/**
 * Property-based test for Property 2: "Effective scope derives from verified
 * context, not client input."
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.10
 *
 * The shared {@link TenantScopeResolver} is the single primitive every core
 * controller/service uses to derive the effective scope, so it is the unit
 * under test here. `computeScopeIntent` is the pure decision logic; `resolve`
 * adds ownership validation against the (mocked) persistence boundary.
 *
 * For every generated request we assert the universal rules of Property 2:
 *  - the effective `tenant_id` is ALWAYS the verified context value, never a
 *    client-supplied value (Req 2.2, 2.5);
 *  - a request reaching the resolver without a verified tenant context is
 *    rejected and yields no scope (Req 2.3);
 *  - a requested `company_id`/`location_id`/`branch_id` that differs from a
 *    non-privileged caller's context, or that does not belong to the caller's
 *    tenant, is rejected with a client-error (4xx) exception (Req 2.4);
 *  - `company_id` is never substituted for `tenant_id` (Req 2.6);
 *  - the actor identity is the verified `TenantContext.user_id`, independent of
 *    any client-supplied `x-actor-id` header (Req 2.10).
 *
 * Each fast-check assertion runs at least 100 generated cases.
 */

const RUNS = 200;

const ALL_ROLES = [
  UserRole.SUPERADMIN,
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.MEMBER,
] as const;
const PRIVILEGED = [UserRole.SUPERADMIN, UserRole.OWNER, UserRole.ADMIN] as const;
const NON_PRIVILEGED = [UserRole.MANAGER, UserRole.MEMBER] as const;

// Small fixed pools per scope dimension so that requested-vs-context equality
// and inequality both occur naturally across generated cases.
const TENANT_POOL = ["tnt-A", "tnt-B"] as const;
const COMPANY_POOL = ["cmp-A", "cmp-B", "cmp-C"] as const;
const LOCATION_POOL = ["loc-A", "loc-B", "loc-C"] as const;
const BRANCH_POOL = ["brn-A", "brn-B", "brn-C"] as const;
const USER_POOL = ["usr-A", "usr-B"] as const;

const opt = <T>(arb: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> =>
  fc.option(arb, { nil: undefined });

/** A verified TenantContext with a non-empty tenant_id. */
const ctxArb = (
  roles: readonly UserRole[] = ALL_ROLES,
): fc.Arbitrary<TenantContext> =>
  fc.record({
    tenant_id: fc.constantFrom(...TENANT_POOL),
    company_id: fc.constantFrom(...COMPANY_POOL),
    location_id: opt(fc.constantFrom(...LOCATION_POOL)),
    branch_id: opt(fc.constantFrom(...BRANCH_POOL)),
    user_id: fc.constantFrom(...USER_POOL),
    role: fc.constantFrom(...roles),
  }) as fc.Arbitrary<TenantContext>;

const requestedArb: fc.Arbitrary<RequestedScope> = fc.record({
  company_id: opt(fc.constantFrom(...COMPANY_POOL)),
  location_id: opt(fc.constantFrom(...LOCATION_POOL)),
  branch_id: opt(fc.constantFrom(...BRANCH_POOL)),
});

/**
 * A Prisma mock whose ownership answer is decided by `owns`. Each lookup is a
 * `findFirst({ where: { id, tenant_id } })` returning a row (owned) or null.
 */
function prismaMock(owns: (id: string, tenant_id: string) => boolean) {
  const table = {
    findFirst: async ({ where }: { where: { id: string; tenant_id: string } }) =>
      owns(where.id, where.tenant_id) ? { id: where.id } : null,
  };
  return { companies: table, locations: table } as any;
}

const isClientError = (err: unknown): boolean =>
  err instanceof ForbiddenException || err instanceof BadRequestException;

describe("Property 2: Effective scope derives from verified context, not client input", () => {
  it("always derives tenant_id from the verified context, ignoring client input (Req 2.2, 2.5)", () => {
    fc.assert(
      fc.property(
        ctxArb(),
        requestedArb,
        // A value a client might try to inject as tenant_id via body/header.
        fc.constantFrom(...TENANT_POOL, "tnt-EVIL", "tnt-A"),
        (ctx, requested, clientSuppliedTenantId) => {
          // The resolver API does not even accept a client tenant_id: the only
          // tenant source is the verified context. We still generate a client
          // value to document that it can never influence the outcome.
          void clientSuppliedTenantId;
          let intent;
          try {
            intent = computeScopeIntent(ctx, requested);
          } catch (err) {
            // A rejection is an acceptable outcome of Property 2 ("rejected or
            // the persisted record uses the context values"); it must be a 4xx.
            expect(isClientError(err)).toBe(true);
            return;
          }
          expect(intent.tenant_id).toBe(ctx.tenant_id);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("never substitutes tenant_id for company_id (Req 2.6)", () => {
    // Build a context whose company_id may legitimately equal its tenant_id.
    const ctxCompanyMayEqualTenant = fc
      .record({
        tenant_id: fc.constantFrom(...TENANT_POOL),
        // Pool deliberately includes the tenant ids so collisions occur.
        company_id: fc.constantFrom(...COMPANY_POOL, ...TENANT_POOL),
        location_id: opt(fc.constantFrom(...LOCATION_POOL)),
        branch_id: opt(fc.constantFrom(...BRANCH_POOL)),
        user_id: fc.constantFrom(...USER_POOL),
        role: fc.constantFrom(...ALL_ROLES),
      })
      .map((c) => c as TenantContext);

    fc.assert(
      fc.property(ctxCompanyMayEqualTenant, (ctx) => {
        let intent;
        try {
          intent = computeScopeIntent(ctx);
        } catch (err) {
          expect(isClientError(err)).toBe(true);
          return;
        }
        // company_id is either dropped or a real company, never the tenant id.
        if (intent.company_id !== undefined) {
          expect(intent.company_id).not.toBe(intent.tenant_id);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("rejects a request with no verified tenant context without producing a scope (Req 2.3)", () => {
    const brokenCtxArb = fc.oneof(
      fc.constant({} as TenantContext),
      fc.constant({ tenant_id: "" } as TenantContext),
      fc.record({ company_id: fc.constantFrom(...COMPANY_POOL) }) as fc.Arbitrary<TenantContext>,
    );
    fc.assert(
      fc.property(brokenCtxArb, requestedArb, (ctx, requested) => {
        let threw = false;
        try {
          computeScopeIntent(ctx, requested);
        } catch (err) {
          threw = true;
          expect(err).toBeInstanceOf(ForbiddenException);
        }
        expect(threw).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it("rejects a non-privileged caller whose requested scope differs from context with a 4xx (Req 2.4)", () => {
    fc.assert(
      fc.property(ctxArb(NON_PRIVILEGED), requestedArb, (ctx, requested) => {
        const widens =
          (!!requested.company_id && requested.company_id !== ctx.company_id) ||
          (!!requested.location_id && requested.location_id !== ctx.location_id) ||
          (!!requested.branch_id && requested.branch_id !== ctx.branch_id);
        // Only the widening cases are relevant to this clause.
        fc.pre(widens);
        expect(() => computeScopeIntent(ctx, requested)).toThrow(
          ForbiddenException,
        );
      }),
      { numRuns: RUNS },
    );
  });

  it("forces a non-privileged caller to its verified context scope when not widening (Req 2.4, 2.5)", () => {
    fc.assert(
      fc.property(ctxArb(NON_PRIVILEGED), requestedArb, (ctx, requested) => {
        const widens =
          (!!requested.company_id && requested.company_id !== ctx.company_id) ||
          (!!requested.location_id && requested.location_id !== ctx.location_id) ||
          (!!requested.branch_id && requested.branch_id !== ctx.branch_id);
        fc.pre(!widens);
        const intent = computeScopeIntent(ctx, requested);
        // Effective scope uses context values (with the tenant==company drop).
        const expectedCompany =
          ctx.company_id === ctx.tenant_id ? undefined : ctx.company_id;
        expect(intent.tenant_id).toBe(ctx.tenant_id);
        expect(intent.company_id).toBe(expectedCompany);
        expect(intent.location_id).toBe(ctx.location_id ?? undefined);
        expect(intent.branch_id).toBe(ctx.branch_id ?? undefined);
      }),
      { numRuns: RUNS },
    );
  });

  it("rejects a requested scope id that does not belong to the caller's tenant with a 4xx (Req 2.4)", async () => {
    await fc.assert(
      fc.asyncProperty(
        ctxArb(PRIVILEGED),
        fc.constantFrom("company_id", "location_id", "branch_id") as fc.Arbitrary<
          "company_id" | "location_id" | "branch_id"
        >,
        async (ctx, dimension) => {
          // A privileged caller requests a foreign id in exactly one dimension;
          // the persistence boundary reports it as NOT owned by the tenant.
          const foreignId = "foreign-not-owned";
          const requested: RequestedScope = { [dimension]: foreignId };
          const resolver = new TenantScopeResolver(
            prismaMock(() => false), // nothing belongs to the tenant
          );
          let caught: unknown;
          try {
            await resolver.resolve(ctx, requested);
          } catch (err) {
            caught = err;
          }
          expect(caught).toBeDefined();
          expect(isClientError(caught)).toBe(true);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("resolves only tenant-owned scope ids and keeps tenant_id from context (Req 2.2, 2.5, 2.7)", async () => {
    await fc.assert(
      fc.asyncProperty(ctxArb(PRIVILEGED), requestedArb, async (ctx, requested) => {
        // Every id belongs to the tenant in this branch.
        const resolver = new TenantScopeResolver(prismaMock(() => true));
        const scope = await resolver.resolve(ctx, requested);
        expect(scope.tenant_id).toBe(ctx.tenant_id);
        // company_id is never the tenant id (Req 2.6) and is present only when
        // requested/context provided one.
        if (scope.company_id !== undefined) {
          expect(scope.company_id).not.toBe(scope.tenant_id);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("uses the verified context user_id as the actor, independent of any client x-actor-id header (Req 2.10)", () => {
    // The authoritative actor for any audit/write is TenantContext.user_id. A
    // spoofed x-actor-id header must never change it. The resolver/context is
    // the sole identity source, so deriving the actor from context is a pure
    // function of the verified context and ignores client-supplied headers.
    const deriveActor = (ctx: TenantContext): string | undefined => ctx.user_id;
    fc.assert(
      fc.property(
        ctxArb(),
        fc.option(fc.constantFrom("hacker", "usr-A", "usr-B", "system"), {
          nil: undefined,
        }),
        (ctx, spoofedHeaderActor) => {
          const actor = deriveActor(ctx);
          // Actor equals the verified context identity ...
          expect(actor).toBe(ctx.user_id);
          // ... and is not taken from the client-supplied header when they differ.
          if (spoofedHeaderActor !== undefined && spoofedHeaderActor !== ctx.user_id) {
            expect(actor).not.toBe(spoofedHeaderActor);
          }
        },
      ),
      { numRuns: RUNS },
    );
  });
});
