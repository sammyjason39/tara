import { describe, it, expect, vi, beforeEach } from "vitest";

import { ITController } from "./it.controller";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { UserRole } from "../../shared/roles";

/**
 * Task 2.1 — Phase 1 IT controller migration.
 *
 * These focused unit tests assert the core guarantees of the migration:
 *   1. Tenant identity for every mutating handler is sourced from the verified
 *      `request.tenantContext`, resolved through `TenantScopeResolver`, NOT from
 *      a client-supplied header or body field (Requirements 2.10, 3.1).
 *   2. The mark-provisioned actor is the verified `tenantContext.user_id`, never
 *      a client-supplied `provisionedBy` value; a request without a verified
 *      identity is rejected (Requirements 2.3, 2.10).
 *
 * Framework-level role gating (`@Roles` + `RolesGuard`) is exercised by the
 * guard/e2e suites; here we verify the controller wiring and actor sourcing.
 */

function buildContext(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    tenant_id: "tnt-verified",
    company_id: "cmp-verified",
    location_id: "loc-verified",
    user_id: "usr-verified",
    role: UserRole.ADMIN,
    ...overrides,
  };
}

function buildRequest(ctx: TenantContext): any {
  // A spoofed header tenant / actor must never be used; identity comes from ctx.
  return {
    tenantContext: ctx,
    headers: { "x-tenant-id": "tnt-SPOOFED", "x-actor-id": "usr-SPOOFED" },
  };
}

describe("ITController (task 2.1 migration)", () => {
  let itService: any;
  let prisma: any;
  let scopeResolver: any;
  let controller: ITController;

  beforeEach(() => {
    itService = {
      createDevice: vi.fn().mockResolvedValue({ id: "dev-1" }),
      updateDevice: vi.fn().mockResolvedValue({ id: "dev-1" }),
      createDeviceEvent: vi.fn().mockResolvedValue({ id: "evt-1" }),
      createProvisioningRequest: vi.fn().mockResolvedValue({ id: "prov-1" }),
      markProvisioned: vi.fn().mockResolvedValue({ id: "prov-1" }),
      updateProvisioningRequest: vi.fn().mockResolvedValue({ id: "prov-1" }),
      deleteProvisioningRequest: vi.fn().mockResolvedValue(undefined),
    };
    prisma = {};
    // The resolver echoes the verified context tenant_id, proving the controller
    // routes identity through the resolved scope rather than a header/body.
    scopeResolver = {
      resolve: vi.fn(async (ctx: TenantContext) => ({
        tenant_id: ctx.tenant_id,
        location_id: ctx.location_id,
      })),
    };
    controller = new ITController(itService, prisma, scopeResolver);
  });

  it("createDevice resolves scope and delegates with verified tenant_id + actor", async () => {
    const ctx = buildContext();
    await controller.createDevice(buildRequest(ctx), { name: "Printer" } as any);

    expect(scopeResolver.resolve).toHaveBeenCalledWith(ctx);
    const [scope, dto, user_id] = itService.createDevice.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(scope.tenant_id).not.toBe("tnt-SPOOFED");
    expect(dto).toEqual({ name: "Printer" });
    expect(user_id).toBe("usr-verified");
    expect(user_id).not.toBe("usr-SPOOFED");
  });

  it("updateDevice resolves scope and delegates with verified tenant_id + actor", async () => {
    const ctx = buildContext();
    await controller.updateDevice(buildRequest(ctx), "dev-1", { name: "X" } as any);

    const [scope, device_id, dto, user_id] =
      itService.updateDevice.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(device_id).toBe("dev-1");
    expect(dto).toEqual({ name: "X" });
    expect(user_id).toBe("usr-verified");
  });

  it("createDeviceEvent ingests against the verified scope tenant_id", async () => {
    const ctx = buildContext();
    await controller.createDeviceEvent(buildRequest(ctx), {
      device_id: "dev-1",
      event_type: "HEARTBEAT",
    } as any);

    const [scope] = itService.createDeviceEvent.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(scope.tenant_id).not.toBe("tnt-SPOOFED");
  });

  it("createProvisioningRequest delegates with verified tenant_id + actor", async () => {
    const ctx = buildContext();
    await controller.createProvisioningRequest(buildRequest(ctx), {
      device_id: "dev-1",
    } as any);

    const [scope, , user_id] =
      itService.createProvisioningRequest.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(user_id).toBe("usr-verified");
  });

  it("markProvisioned uses the verified actor as provisionedBy, ignoring any body value", async () => {
    const ctx = buildContext({ user_id: "usr-provisioner" });
    await controller.markProvisioned(buildRequest(ctx), "prov-1");

    expect(itService.markProvisioned).toHaveBeenCalledTimes(1);
    const [scope, request_id, user_id] = itService.markProvisioned.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(request_id).toBe("prov-1");
    expect(user_id).toBe("usr-provisioner");
  });

  it("markProvisioned rejects a request without a verified user identity (Req 2.3)", async () => {
    const ctx = buildContext({ user_id: undefined });
    await expect(
      controller.markProvisioned(buildRequest(ctx), "prov-1"),
    ).rejects.toThrow();
    expect(itService.markProvisioned).not.toHaveBeenCalled();
  });

  it("updateProvisioningRequest delegates with verified tenant_id + actor", async () => {
    const ctx = buildContext();
    await controller.updateProvisioningRequest(buildRequest(ctx), "prov-1", {
      device_id: "dev-2",
    } as any);

    const [scope, request_id, , user_id] =
      itService.updateProvisioningRequest.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(request_id).toBe("prov-1");
    expect(user_id).toBe("usr-verified");
  });

  it("deleteProvisioningRequest delegates with verified tenant_id + actor", async () => {
    const ctx = buildContext();
    await controller.deleteProvisioningRequest(buildRequest(ctx), "prov-1");

    expect(itService.deleteProvisioningRequest).toHaveBeenCalledTimes(1);
    const [scope, request_id, user_id] =
      itService.deleteProvisioningRequest.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(request_id).toBe("prov-1");
    expect(user_id).toBe("usr-verified");
  });
});

describe("ITController (task 2.2 scoped reads)", () => {
  let itService: any;
  let prisma: any;
  let scopeResolver: any;
  let controller: ITController;

  beforeEach(() => {
    itService = {
      getDevices: vi.fn().mockResolvedValue([{ id: "dev-1" }]),
      getDevice: vi.fn().mockResolvedValue({ id: "dev-1" }),
      getDeviceEvents: vi.fn().mockResolvedValue([]),
      getProvisioningRequests: vi.fn().mockResolvedValue([]),
      getSystemHealth: vi.fn().mockResolvedValue([]),
      getMonitoringStats: vi.fn().mockResolvedValue({ total: 0 }),
      getAuditLogs: vi.fn().mockResolvedValue([]),
    };
    prisma = {};
    // The resolver returns a scope object distinct from the raw context to prove
    // the controller routes reads through the resolved scope.
    scopeResolver = {
      resolve: vi.fn(async (ctx: TenantContext) => ({
        tenant_id: ctx.tenant_id,
        company_id: ctx.company_id,
        location_id: ctx.location_id,
      })),
    };
    controller = new ITController(itService, prisma, scopeResolver);
  });

  it("getDevices filters by the resolved scope, not a raw header tenant", async () => {
    const ctx = buildContext();
    const result = await controller.getDevices(buildRequest(ctx));

    expect(scopeResolver.resolve).toHaveBeenCalledWith(ctx);
    const [scope] = itService.getDevices.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(scope.tenant_id).not.toBe("tnt-SPOOFED");
    expect(result.count).toBe(1);
  });

  it("getDevice performs a scoped composite-key read by id", async () => {
    const ctx = buildContext();
    await controller.getDevice(buildRequest(ctx), "dev-1");

    const [scope, device_id] = itService.getDevice.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(device_id).toBe("dev-1");
  });

  it("getDevice surfaces an out-of-scope id as a not-found error", async () => {
    const ctx = buildContext();
    itService.getDevice.mockRejectedValueOnce(
      new (require("@nestjs/common").NotFoundException)("Device 'dev-x' was not found."),
    );
    await expect(
      controller.getDevice(buildRequest(ctx), "dev-x"),
    ).rejects.toThrow(/not found/i);
  });

  it("getProvisioningRequests returns an empty array for no matches", async () => {
    const ctx = buildContext();
    const result = await controller.getProvisioningRequests(buildRequest(ctx));

    const [scope] = itService.getProvisioningRequests.mock.calls[0];
    expect(scope.tenant_id).toBe("tnt-verified");
    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("getSystemHealth and monitoring reads are scoped", async () => {
    const ctx = buildContext();
    await controller.getSystemHealth(buildRequest(ctx));
    await controller.getMonitoringStats(buildRequest(ctx));
    await controller.getAuditLogs(buildRequest(ctx), undefined);

    expect(itService.getSystemHealth.mock.calls[0][0].tenant_id).toBe(
      "tnt-verified",
    );
    expect(itService.getMonitoringStats.mock.calls[0][0].tenant_id).toBe(
      "tnt-verified",
    );
    expect(itService.getAuditLogs.mock.calls[0][0].tenant_id).toBe(
      "tnt-verified",
    );
  });
});
