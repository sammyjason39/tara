import { describe, it, expect, vi, beforeEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { ITService } from "./it.service";
import { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Task 2.4 — atomic provisioning transition and device-event ingest.
 *
 * These focused unit tests assert the correctness guarantees of task 2.4:
 *   - markProvisioned transitions a PENDING/REQUESTED request to PROVISIONED
 *     inside a single Atomic_Operation, recording the actor from context in the
 *     Audit_Trail entry that shares the transaction (Requirements 8.5, 4.1, 4.4).
 *   - An invalid transition (e.g. an already-PROVISIONED request) is rejected
 *     with a client error before any write, leaving the status unchanged
 *     (Requirement 8.9).
 *   - A request outside the caller's Tenant_Scope surfaces as a 404
 *     (Requirement 8.8).
 *   - A device event is recorded against a device in scope and its downstream
 *     publish is supervised by the async-rejection helper (Requirements 8.12,
 *     7.1, 7.2); an event referencing a device not in scope is rejected without
 *     recording (Requirement 8.13).
 */

const scope: TenantScope = { tenant_id: "tnt-1", company_id: "cmp-1" };

function buildRepository(overrides: Record<string, any> = {}) {
  return {
    getProvisioningRequest: vi.fn(),
    markProvisioned: vi.fn(),
    getDevice: vi.fn(),
    createDeviceEvent: vi.fn(),
    ...overrides,
  };
}

/**
 * A fake Atomic_Operation that runs the body synchronously with a stub context,
 * mirroring `AtomicOperationService.run` so a throw inside the body propagates
 * (and would have rolled back) without touching a real database.
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

function buildAsyncRejection() {
  // Run the supervised work eagerly and swallow rejections, like fireAndForget.
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

describe("ITService.markProvisioned (task 2.4)", () => {
  let repository: any;
  let atomic: any;
  let asyncRejection: any;
  let eventBus: any;
  let auditService: any;
  let service: ITService;

  beforeEach(() => {
    repository = buildRepository();
    atomic = buildAtomic();
    asyncRejection = buildAsyncRejection();
    eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    auditService = { log: vi.fn().mockResolvedValue(undefined) };
    service = new ITService(
      repository,
      auditService,
      eventBus,
      atomic,
      asyncRejection,
    );
  });

  it("transitions a PENDING request to PROVISIONED inside one Atomic_Operation, recording the actor", async () => {
    repository.getProvisioningRequest.mockResolvedValue({
      id: "prov-1",
      tenant_id: "tnt-1",
      status: "pending",
    });
    repository.markProvisioned.mockResolvedValue({
      id: "prov-1",
      tenant_id: "tnt-1",
      status: "provisioned",
      provisionedBy: "usr-9",
    });

    const result = await service.markProvisioned(scope, "prov-1", "usr-9");

    // The whole operation runs through the Atomic_Operation helper.
    expect(atomic.run).toHaveBeenCalledTimes(1);
    // The status check and the write observe the same transaction client.
    expect(repository.getProvisioningRequest).toHaveBeenCalledWith(
      scope,
      "prov-1",
      atomic.tx,
    );
    expect(repository.markProvisioned).toHaveBeenCalledWith(
      "tnt-1",
      "prov-1",
      "usr-9",
      atomic.tx,
    );
    // The actor from context is recorded in the in-transaction Audit_Trail entry.
    expect(atomic.audit).toHaveBeenCalledTimes(1);
    const auditParams = atomic.audit.mock.calls[0][0];
    expect(auditParams.user_id).toBe("usr-9");
    expect(auditParams.action).toBe("PROVISION");
    expect(auditParams.entity_id).toBe("prov-1");
    expect(result.status).toBe("provisioned");
  });

  it("accepts the legacy REQUESTED status as a valid source state", async () => {
    repository.getProvisioningRequest.mockResolvedValue({
      id: "prov-2",
      tenant_id: "tnt-1",
      status: "requested",
    });
    repository.markProvisioned.mockResolvedValue({
      id: "prov-2",
      status: "provisioned",
    });

    await service.markProvisioned(scope, "prov-2", "usr-9");
    expect(repository.markProvisioned).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid transition with a 400 and never writes (status unchanged)", async () => {
    repository.getProvisioningRequest.mockResolvedValue({
      id: "prov-1",
      tenant_id: "tnt-1",
      status: "provisioned",
    });

    await expect(
      service.markProvisioned(scope, "prov-1", "usr-9"),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.markProvisioned).not.toHaveBeenCalled();
    expect(atomic.audit).not.toHaveBeenCalled();
  });

  it("surfaces an out-of-scope request as a 404", async () => {
    repository.getProvisioningRequest.mockRejectedValue(
      new NotFoundException("Provisioning request 'prov-x' was not found."),
    );

    await expect(
      service.markProvisioned(scope, "prov-x", "usr-9"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.markProvisioned).not.toHaveBeenCalled();
  });
});

describe("ITService.createDeviceEvent (task 2.4)", () => {
  let repository: any;
  let atomic: any;
  let asyncRejection: any;
  let eventBus: any;
  let auditService: any;
  let service: ITService;

  beforeEach(() => {
    repository = buildRepository();
    atomic = buildAtomic();
    asyncRejection = buildAsyncRejection();
    eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    auditService = { log: vi.fn().mockResolvedValue(undefined) };
    service = new ITService(
      repository,
      auditService,
      eventBus,
      atomic,
      asyncRejection,
    );
  });

  it("records an event against a device in scope and supervises the downstream publish", async () => {
    repository.getDevice.mockResolvedValue({ id: "dev-1", tenant_id: "tnt-1" });
    repository.createDeviceEvent.mockResolvedValue({
      id: "evt-1",
      tenant_id: "tnt-1",
      device_id: "dev-1",
      event_type: "HEARTBEAT",
      payload: { ok: true },
    });

    const result = await service.createDeviceEvent(scope, {
      device_id: "dev-1",
      event_type: "HEARTBEAT",
      payload: { ok: true },
    } as any);

    // Device is validated in scope BEFORE the event is recorded.
    expect(repository.getDevice).toHaveBeenCalledWith(scope, "dev-1");
    expect(repository.createDeviceEvent).toHaveBeenCalledWith(
      "tnt-1",
      expect.objectContaining({ device_id: "dev-1" }),
    );
    // The downstream publish is supervised by the async-rejection helper.
    expect(asyncRejection.fireAndForget).toHaveBeenCalledTimes(1);
    const [descriptor] = asyncRejection.fireAndForget.mock.calls[0];
    expect(descriptor.operation).toBe("it.device-event.publish");
    expect(descriptor.tenant_id).toBe("tnt-1");
    expect(result.id).toBe("evt-1");
  });

  it("does not crash ingestion when the supervised publish rejects", async () => {
    repository.getDevice.mockResolvedValue({ id: "dev-1", tenant_id: "tnt-1" });
    repository.createDeviceEvent.mockResolvedValue({
      id: "evt-2",
      tenant_id: "tnt-1",
      device_id: "dev-1",
      event_type: "HEARTBEAT",
      payload: {},
    });
    eventBus.publish.mockRejectedValue(new Error("delivery boom"));

    // Ingestion resolves with the recorded event regardless of the publish
    // outcome; the helper swallows the rejection (Requirements 7.1, 7.2).
    const result = await service.createDeviceEvent(scope, {
      device_id: "dev-1",
      event_type: "HEARTBEAT",
      payload: {},
    } as any);
    expect(result.id).toBe("evt-2");
  });

  it("rejects an event referencing a device not in scope WITHOUT recording it", async () => {
    repository.getDevice.mockRejectedValue(
      new NotFoundException("Device 'dev-x' was not found."),
    );

    await expect(
      service.createDeviceEvent(scope, {
        device_id: "dev-x",
        event_type: "HEARTBEAT",
        payload: {},
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repository.createDeviceEvent).not.toHaveBeenCalled();
    expect(asyncRejection.fireAndForget).not.toHaveBeenCalled();
  });
});

/**
 * Task 2.5 — IT overview cross-module contributions and audit/integration
 * logging.
 *
 * These focused unit tests assert the guarantees of task 2.5:
 *   - getOverview is assembled from persisted, tenant-scoped data and includes
 *     the Retail POS/ecommerce contribution ONLY when Retail is active, with a
 *     `null` contribution (and no error) when Retail is inactive
 *     (Requirements 6.8, 6.9, 6.10, 8.10, 8.11).
 *   - A privileged create/update/delete action records an Audit_Trail entry
 *     capturing the actor, action, resource id, and Tenant_Scope, AND an
 *     Integration_Log (outbox) event — both inside the same Atomic_Operation so
 *     the event is recorded before the operation reports success
 *     (Requirements 6.7, 6.5, 6.6).
 */
describe("ITService.getOverview (task 2.5)", () => {
  function buildService(repoOverrides: Record<string, any> = {}) {
    const repository = {
      getOverview: vi.fn(),
      getRetailContributions: vi.fn(),
      ...repoOverrides,
    } as any;
    const atomic = buildAtomic();
    const asyncRejection = buildAsyncRejection();
    const eventBus = { publish: vi.fn() };
    const auditService = { log: vi.fn() };
    const service = new ITService(
      repository,
      auditService as any,
      eventBus as any,
      atomic as any,
      asyncRejection as any,
    );
    return { service, repository };
  }

  it("includes the Retail contribution when Retail is active, scoped via the repository", async () => {
    const { service, repository } = buildService();
    repository.getOverview.mockResolvedValue({
      healthScore: "100%",
      activeNodes: 3,
      pendingUpdates: 1,
    });
    repository.getRetailContributions.mockResolvedValue({
      moduleId: "retail",
      posDevices: { total: 2, online: 1, offline: 1 },
    });

    const result = await service.getOverview(scope);

    expect(repository.getOverview).toHaveBeenCalledWith(scope);
    expect(repository.getRetailContributions).toHaveBeenCalledWith(scope);
    expect(result.activeNodes).toBe(3);
    expect(result.moduleContributions.retail).toEqual({
      moduleId: "retail",
      posDevices: { total: 2, online: 1, offline: 1 },
    });
  });

  it("returns a null Retail contribution without error when Retail is inactive", async () => {
    const { service, repository } = buildService();
    repository.getOverview.mockResolvedValue({
      healthScore: "100%",
      activeNodes: 0,
      pendingUpdates: 0,
    });
    repository.getRetailContributions.mockResolvedValue(null);

    const result = await service.getOverview(scope);

    expect(result.moduleContributions.retail).toBeNull();
  });
});

describe("ITService privileged audit + integration logging (task 2.5)", () => {
  function buildService() {
    const repository = {
      createDevice: vi.fn().mockResolvedValue({ id: "dev-1" }),
      updateProvisioningRequest: vi.fn().mockResolvedValue({ id: "prov-1" }),
      deleteProvisioningRequest: vi.fn().mockResolvedValue(undefined),
    } as any;
    const atomic = buildAtomic();
    const asyncRejection = buildAsyncRejection();
    const eventBus = { publish: vi.fn() };
    const auditService = { log: vi.fn() };
    const service = new ITService(
      repository,
      auditService as any,
      eventBus as any,
      atomic as any,
      asyncRejection as any,
    );
    return { service, repository, atomic };
  }

  it("createDevice records audit (with scope + actor) and an outbox event in one Atomic_Operation", async () => {
    const { service, repository, atomic } = buildService();

    await service.createDevice(scope, { name: "Front POS" } as any, "usr-9");

    // The whole privileged write runs through the Atomic_Operation helper.
    expect(atomic.run).toHaveBeenCalledTimes(1);
    // The repository write enrols in the transaction.
    expect(repository.createDevice).toHaveBeenCalledWith(
      "tnt-1",
      { name: "Front POS" },
      atomic.tx,
    );
    // Audit_Trail entry captures actor, action, resource id, and Tenant_Scope.
    expect(atomic.audit).toHaveBeenCalledTimes(1);
    const auditParams = atomic.audit.mock.calls[0][0];
    expect(auditParams.user_id).toBe("usr-9");
    expect(auditParams.action).toBe("CREATE");
    expect(auditParams.entity_type).toBe("DEVICE");
    expect(auditParams.entity_id).toBe("dev-1");
    expect(auditParams.metadata.tenant_scope).toEqual({
      tenant_id: "tnt-1",
      company_id: "cmp-1",
    });
    // Integration_Log (outbox) event recorded inside the same transaction.
    expect(atomic.outbox).toHaveBeenCalledTimes(1);
    const outboxEvent = atomic.outbox.mock.calls[0][0];
    expect(outboxEvent.type).toBe("it.device.created.v1");
    expect(outboxEvent.tenant_id).toBe("tnt-1");
    expect(outboxEvent.payload.entity_id).toBe("dev-1");
  });

  it("deleteProvisioningRequest records audit + outbox in one Atomic_Operation", async () => {
    const { service, repository, atomic } = buildService();

    await service.deleteProvisioningRequest(scope, "prov-1", "usr-9");

    expect(repository.deleteProvisioningRequest).toHaveBeenCalledWith(
      "tnt-1",
      "prov-1",
      atomic.tx,
    );
    expect(atomic.audit).toHaveBeenCalledTimes(1);
    expect(atomic.audit.mock.calls[0][0].action).toBe("DELETE");
    expect(atomic.outbox).toHaveBeenCalledTimes(1);
    expect(atomic.outbox.mock.calls[0][0].type).toBe(
      "it.provisioning.deleted.v1",
    );
  });
});
