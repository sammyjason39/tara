// Feature: core-departments-stabilization, Property 3: Mutating endpoints enforce their Role_Gate and module activation
import "reflect-metadata";
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RolesGuard } from "../../shared/guards/roles.guard";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { Roles, ROLES_KEY } from "../../shared/decorators/roles.decorator";
import { UserRole } from "../../shared/roles";
import { ITController } from "./it.controller";

/**
 * Property-based test for Property 3: "Mutating endpoints enforce their
 * Role_Gate and module activation."
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 *
 * The unit under test is the *real* enforcement wiring of the IT controller
 * (Phase 1): the `RolesGuard` reading the actual `@Roles(...)` metadata declared
 * on each mutating handler, and the `ModuleStateGuard` that rejects requests to
 * an inactive module. Guards run *before* the handler body, so a guard that
 * denies a request inherently performs no create/update/delete/approve/release
 * operation and leaves department data unchanged (Req 3.2, 3.3, 3.6).
 *
 * For every generated (endpoint, caller role) pair we assert the universal
 * rules of Property 3:
 *  - the request is permitted iff the caller holds a privileged bypass
 *    (SUPERADMIN global, OWNER tenant-scoped) or the caller's role is in the
 *    endpoint's `@Roles` gate (Req 3.1, 3.4);
 *  - otherwise the request is rejected with a forbidden (403) response and the
 *    handler never executes (Req 3.2);
 *  - a request with no role present is rejected with 403 (Req 3.3);
 *  - every mutating handler declares a non-empty `@Roles` gate (Req 3.5);
 *  - a request to a module whose activation state is inactive is rejected with
 *    no operation on data (Req 3.6).
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

// Non-superadmin roles: SUPERADMIN bypasses ModuleStateGuard entirely, so it is
// excluded from the module-activation property.
const NON_SUPERADMIN = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.MEMBER,
] as const;

/**
 * Every mutating IT handler (create/update/delete/transition). These are the
 * `@Post`/`@Put`/`@Delete` handlers on the IT controller — exactly the surface
 * a Role_Gate must cover (Req 3.5). Read-only `@Get` handlers are excluded.
 */
const MUTATING_HANDLERS = [
  "createDevice",
  "updateDevice",
  "createDeviceEvent",
  "createProvisioningRequest",
  "markProvisioned",
  "updateProvisioningRequest",
  "deleteProvisioningRequest",
] as const;

type MutatingHandler = (typeof MUTATING_HANDLERS)[number];

const handlerOf = (name: MutatingHandler): (...args: unknown[]) => unknown =>
  (ITController.prototype as Record<string, unknown>)[name] as (
    ...args: unknown[]
  ) => unknown;

/** Reads the declared `@Roles` gate for a handler exactly as a guard would. */
function declaredRoles(name: MutatingHandler): UserRole[] | undefined {
  const reflector = new Reflector();
  return reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
    handlerOf(name),
    ITController,
  ]);
}

/**
 * A minimal ExecutionContext pointing at a real IT controller handler and the
 * controller class, so guards resolve the *actual* declared metadata.
 */
function makeContext(name: MutatingHandler, request: unknown): ExecutionContext {
  return {
    getHandler: () => handlerOf(name),
    getClass: () => ITController,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getType: () => "http",
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}) as never,
    switchToWs: () => ({}) as never,
  } as unknown as ExecutionContext;
}

/** The Property-3 oracle for the role gate. */
function shouldPermit(required: UserRole[] | undefined, role: UserRole): boolean {
  // SUPERADMIN: global platform-wide bypass (Req 3.4).
  if (role === UserRole.SUPERADMIN) return true;
  // OWNER: tenant-scoped bypass for non-system routes (Req 3.4). IT routes are
  // not system routes.
  if (role === UserRole.OWNER) return true;
  // ADMIN/MANAGER/MEMBER: permitted iff in the declared gate (Req 3.1).
  return !!required && required.includes(role);
}

/** Runs the real RolesGuard, normalizing allow/deny + the thrown error. */
function evalRoleGate(
  name: MutatingHandler,
  request: unknown,
): { allowed: boolean; error?: unknown } {
  const guard = new RolesGuard(new Reflector());
  try {
    const allowed = guard.canActivate(makeContext(name, request));
    return { allowed };
  } catch (error) {
    return { allowed: false, error };
  }
}

const NON_SYSTEM_IT_URL = "/v1/it/devices";

describe("Property 3: Mutating endpoints enforce their Role_Gate and module activation", () => {
  it("declares a non-empty @Roles gate on every mutating IT handler (Req 3.5)", () => {
    for (const name of MUTATING_HANDLERS) {
      const roles = declaredRoles(name);
      expect(Array.isArray(roles), `handler ${name} must declare @Roles`).toBe(
        true,
      );
      expect((roles ?? []).length, `handler ${name} gate must be non-empty`).toBeGreaterThan(
        0,
      );
    }
  });

  it("permits a request iff the caller has a privileged bypass or a gated role, else rejects with 403 (Req 3.1, 3.2, 3.4)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MUTATING_HANDLERS),
        fc.constantFrom(...ALL_ROLES),
        (name, role) => {
          const request = {
            url: NON_SYSTEM_IT_URL,
            tenantContext: { tenant_id: "tnt-A", user_id: "usr-A", role },
          };
          const { allowed, error } = evalRoleGate(name, request);
          const expected = shouldPermit(declaredRoles(name), role);
          expect(allowed).toBe(expected);
          // A rejection is always a forbidden (403) response; because the guard
          // runs before the handler, no create/update/delete/approve/release
          // operation is performed (Req 3.2).
          if (!allowed) {
            expect(error).toBeInstanceOf(ForbiddenException);
          }
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("rejects a Role_Gate-guarded request with no role present with a 403 (Req 3.3)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MUTATING_HANDLERS),
        // Either a context with an absent role, or no verified context at all.
        fc.constantFrom("absent-role", "no-context"),
        (name, mode) => {
          const request =
            mode === "no-context"
              ? { url: NON_SYSTEM_IT_URL }
              : {
                  url: NON_SYSTEM_IT_URL,
                  tenantContext: { tenant_id: "tnt-A", user_id: "usr-A" },
                };
          const { allowed, error } = evalRoleGate(name, request);
          expect(allowed).toBe(false);
          expect(error).toBeInstanceOf(ForbiddenException);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it("rejects a mutating request to an inactive module with no data operation (Req 3.6)", async () => {
    // A Prisma stub whose module-activation lookup reports the module inactive,
    // either by an explicit disabled row or a missing row.
    const makeGuard = (state: "disabled" | "missing") => {
      const prisma = {
        admin_module_statuses: {
          findUnique: async () =>
            state === "missing" ? null : { enabled: false },
        },
      } as never;
      return new ModuleStateGuard(new Reflector(), prisma);
    };

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...MUTATING_HANDLERS),
        fc.constantFrom(...NON_SUPERADMIN),
        fc.constantFrom("disabled", "missing") as fc.Arbitrary<
          "disabled" | "missing"
        >,
        async (name, role, state) => {
          const guard = makeGuard(state);
          const request = {
            headers: {},
            url: NON_SYSTEM_IT_URL,
            tenantContext: { tenant_id: "tnt-A", user_id: "usr-A", role },
          };
          let allowed = false;
          let error: unknown;
          try {
            allowed = await guard.canActivate(makeContext(name, request));
          } catch (err) {
            error = err;
          }
          // The module is inactive, so the request must be rejected and the
          // handler body (the data operation) never reached.
          expect(allowed).toBe(false);
          expect(error).toBeInstanceOf(ForbiddenException);
        },
      ),
      { numRuns: RUNS },
    );
  });
});

// A type-level reference so unused-import discipline keeps `Roles` meaningful in
// this spec's intent (the decorator under test); it is exercised indirectly via
// the controller's declared metadata.
void Roles;
