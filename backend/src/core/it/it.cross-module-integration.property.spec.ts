// Feature: core-departments-stabilization, Property 8: Cross-module integration produces correct, tenant-scoped, complete data
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { NotFoundException } from "@nestjs/common";

import { ITService } from "./it.service";
import { IITRepository } from "./repositories/it.repository.interface";
import { AtomicOperationService } from "../shared/atomic";
import { TenantScope } from "../../shared/scope/tenant-scope";

/**
 * Property 8: Cross-module integration produces correct, tenant-scoped, complete
 * data.
 *
 * Validates: Requirements 6.3, 6.4, 6.7, 6.8, 6.9, 6.10, 8.10, 8.11, 8.12, 8.13,
 * 9.4, 10.8, 10.9, 10.10, 11.9, 11.10, 11.11
 *
 * For any core operation that reads from or writes to HR, Finance, Settings, the
 * Integration_Log, Audit, or Retail:
 *  - the data exchanged is scoped to the caller's `tenant_id` (no other tenant's
 *    records);
 *  - every field required by the consuming module's contract is populated from
 *    persisted data with no placeholder/mock/hardcoded values (Req 6.10, 8.10);
 *  - a cross-module domain event is recorded in the Integration_Log (outbox)
 *    BEFORE the originating operation reports success (Req 6.5/6.7 surface here);
 *  - a privileged action records an Audit_Trail entry capturing the actor
 *    `user_id`, the action, the affected resource id, and the caller's
 *    Tenant_Scope (Req 6.7);
 *  - Retail contributions appear on the overview/dashboard response IFF the
 *    Retail Module_Activation_State is active (Req 6.8, 6.9, 8.10, 8.11); and
 *  - a device event is recorded against an in-scope device and rejected without
 *    recording for an out-of-scope device (Req 8.12, 8.13).
 *
 * This property is introduced here in Phase 1 (IT) and is parameterized across
 * the later phases' cross-module boundaries (Procurement→Finance Payable_Record
 * 6.3/6.4/9.4, Sales/Marketing Retail dashboards 10.8–10.10/11.9, Payment→Finance
 * settlement 11.11). The Phase-1 slice exercised here is the IT module
 * (`it.service.ts` + `IITRepository`) over the live cross-module surfaces it
 * owns: Integration_Log outbox, Audit_Trail, Retail overview contributions, and
 * device-event ingestion.
 *
 * Strategy (per design "Isolation & atomicity" / "Generators"): the unmodified
 * {@link ITService} is driven through a mockable atomic/Prisma boundary — the
 * real {@link AtomicOperationService} runs over a fake `prisma.$transaction`
 * that stages every enrolled write (repository write, Audit_Trail entry,
 * Integration_Log outbox row) and commits them only when the body resolves, so
 * we can observe exactly what was recorded and in what order. A faithful
 * in-memory {@link IITRepository} seeds two tenants with per-tenant Retail
 * activation state, so reads/writes honour `tenant_id` and the Retail toggle.
 * The property asserts, across >= 100 generated cases, that the outbox event is
 * recorded before success, the audit entry captures actor/action/resource/scope,
 * Retail contributions appear iff active, every cross-module value is the
 * persisted tenant-scoped value (never a placeholder), and device events respect
 * device scope.
 */

/* -------------------------------------------------------------------------- */
/* Seed shapes                                                                */
/* -------------------------------------------------------------------------- */

interface TenantSeed {
  tenant_id: string;
  devices: any[];
  provisioning: any[];
  retailActive: boolean;
  /** POS/ecommerce stats the Retail module consumes off the IT overview. */
  retail: { posDevices: number; ecommerceConnectors: number } | null;
}

/**
 * A faithful in-memory IT repository. Every read filters by `scope.tenant_id`
 * so no other tenant's records can leak; the overview is assembled purely from
 * the persisted, tenant-scoped store (no placeholder/hardcoded values); and
 * Retail contributions are returned only when the tenant's Retail
 * Module_Activation_State is active.
 */
class FakeITRepository extends IITRepository {
  private devices: any[] = [];
  private provisioning: any[] = [];
  private deviceEvents: any[] = [];
  private readonly retailActive = new Map<string, boolean>();
  private readonly retailData = new Map<
    string,
    { posDevices: number; ecommerceConnectors: number } | null
  >();

  constructor(seeds: TenantSeed[]) {
    super();
    for (const s of seeds) {
      this.devices.push(...s.devices.map((d) => ({ ...d })));
      this.provisioning.push(...s.provisioning.map((p) => ({ ...p })));
      this.retailActive.set(s.tenant_id, s.retailActive);
      this.retailData.set(s.tenant_id, s.retail);
    }
  }

  async getProvisioningRequests(scope: TenantScope): Promise<any[]> {
    return this.provisioning.filter((p) => p.tenant_id === scope.tenant_id);
  }

  async getProvisioningRequest(
    scope: TenantScope,
    request_id: string,
  ): Promise<any> {
    const found = this.provisioning.find(
      (p) => p.tenant_id === scope.tenant_id && p.id === request_id,
    );
    if (!found) {
      throw new NotFoundException(
        `Provisioning request '${request_id}' was not found.`,
      );
    }
    return found;
  }

  async createProvisioningRequest(tenant_id: string, dto: any): Promise<any> {
    const created = {
      id: `${tenant_id}-prov-${this.provisioning.length + 1}`,
      tenant_id,
      status: "pending",
      ...dto,
    };
    this.provisioning.push(created);
    return created;
  }

  async markProvisioned(
    tenant_id: string,
    request_id: string,
    provisionedBy: string,
  ): Promise<any> {
    const req = this.provisioning.find(
      (p) => p.tenant_id === tenant_id && p.id === request_id,
    );
    if (!req) throw new NotFoundException("Provisioning request not found.");
    req.status = "provisioned";
    req.provisionedBy = provisionedBy;
    return req;
  }

  async updateProvisioningRequest(
    tenant_id: string,
    request_id: string,
    dto: any,
  ): Promise<any> {
    const req = this.provisioning.find(
      (p) => p.tenant_id === tenant_id && p.id === request_id,
    );
    if (!req) throw new NotFoundException("Provisioning request not found.");
    Object.assign(req, dto);
    return req;
  }

  async deleteProvisioningRequest(
    tenant_id: string,
    request_id: string,
  ): Promise<void> {
    const i = this.provisioning.findIndex(
      (p) => p.tenant_id === tenant_id && p.id === request_id,
    );
    if (i === -1) throw new NotFoundException("Provisioning request not found.");
    this.provisioning.splice(i, 1);
  }

  async getDevices(scope: TenantScope): Promise<any[]> {
    return this.devices.filter((d) => d.tenant_id === scope.tenant_id);
  }

  async createDevice(tenant_id: string, dto: any): Promise<any> {
    const created = {
      id: `${tenant_id}-dev-${this.devices.length + 1}`,
      tenant_id,
      status: "ONLINE",
      ...dto,
    };
    this.devices.push(created);
    return created;
  }

  async updateDevice(
    tenant_id: string,
    device_id: string,
    dto: any,
  ): Promise<any> {
    const d = this.devices.find(
      (x) => x.id === device_id && x.tenant_id === tenant_id,
    );
    if (!d) throw new NotFoundException("Device not found");
    Object.assign(d, dto);
    return d;
  }

  async getDevice(scope: TenantScope, device_id: string): Promise<any> {
    const d = this.devices.find(
      (x) => x.id === device_id && x.tenant_id === scope.tenant_id,
    );
    if (!d) throw new NotFoundException(`Device '${device_id}' was not found.`);
    return d;
  }

  async getDeviceEvents(scope: TenantScope): Promise<any[]> {
    return this.deviceEvents.filter((e) => e.tenant_id === scope.tenant_id);
  }

  async createDeviceEvent(tenant_id: string, dto: any): Promise<any> {
    const created = {
      id: `${tenant_id}-evt-${this.deviceEvents.length + 1}`,
      tenant_id,
      device_id: dto.device_id,
      event_type: dto.event_type,
      payload: dto.payload,
      processed: dto.processed ?? false,
    };
    this.deviceEvents.push(created);
    return created;
  }

  async getSystemHealth(scope: TenantScope): Promise<any[]> {
    void scope;
    return [];
  }

  async getProvisioningStats(scope: TenantScope): Promise<any> {
    const reqs = await this.getProvisioningRequests(scope);
    return { total: reqs.length };
  }

  async getAuditLogs(): Promise<any[]> {
    return [];
  }

  /**
   * Overview assembled ONLY from persisted, tenant-scoped data — no placeholder,
   * mock, or hardcoded values (Req 6.10, 8.10). Every metric is a scoped count.
   */
  async getOverview(scope: TenantScope): Promise<any> {
    const devices = await this.getDevices(scope);
    const provisioning = await this.getProvisioningRequests(scope);
    const pending = provisioning.filter(
      (p) => p.status === "pending" || p.status === "requested",
    ).length;
    return {
      tenant_id: scope.tenant_id,
      activeNodes: devices.length,
      pendingProvisioningRequests: pending,
    };
  }

  /**
   * Retail POS/ecommerce contributions, scoped to the caller's tenant and
   * returned ONLY when the Retail Module_Activation_State is active
   * (Req 6.8/8.10); `null` when inactive (Req 6.9/8.11).
   */
  async getRetailContributions(scope: TenantScope): Promise<any | null> {
    if (!this.retailActive.get(scope.tenant_id)) return null;
    const data = this.retailData.get(scope.tenant_id) ?? null;
    if (!data) return null;
    return { tenant_id: scope.tenant_id, ...data };
  }
}

/* -------------------------------------------------------------------------- */
/* Mockable atomic / Prisma boundary                                          */
/* -------------------------------------------------------------------------- */

type Committed = { kind: string; [k: string]: any };

/**
 * Build the IT service over the real {@link AtomicOperationService} wired to a
 * fake `prisma.$transaction` that stages enrolled writes (audit + outbox) and
 * commits them — in order — only when the body resolves. `committed` is the
 * persistent record we assert against; `order` lets us prove the outbox event is
 * recorded before the operation reports success.
 */
function buildHarness(seeds: TenantSeed[]) {
  const repo = new FakeITRepository(seeds);
  const committed: Committed[] = [];
  const order: string[] = [];

  const fakePrisma = {
    async $transaction<T>(cb: (tx: any) => Promise<T>): Promise<T> {
      const staging: Committed[] = [];
      const tx = {
        recordWrite(record: Committed) {
          staging.push(record);
        },
        sys_outbox_events: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            staging.push({ kind: "outbox", data });
            return { id: "outbox-1", ...data };
          },
        },
      };
      const result = await cb(tx);
      for (const s of staging) {
        committed.push(s);
        order.push(s.kind);
      }
      return result;
    },
  } as any;

  const fakeAudit = {
    log: async (params: any, tx: any) => {
      tx.recordWrite({ kind: "audit", params });
      return { ok: true };
    },
  } as any;

  const fakeTxEventBus = {
    publish: async (event: any, tx?: any) => {
      if (tx?.recordWrite) tx.recordWrite({ kind: "event", event });
      return { ok: true };
    },
  } as any;

  const atomic = new AtomicOperationService(
    fakePrisma,
    fakeAudit,
    fakeTxEventBus,
  );

  // Faithful async-rejection helper (BUG-13): attaches its handler before the
  // supervised work runs and swallows rejections so device-event publishing can
  // never surface an unhandled rejection.
  const asyncRejection = {
    fireAndForget: (_d: any, work: () => Promise<unknown>) =>
      Promise.resolve()
        .then(() => work())
        .then(
          () => undefined,
          () => undefined,
        ),
  } as any;

  // EventBus used by createDeviceEvent's fire-and-forget publish (no tx arg).
  const serviceEventBus = {
    publish: async (_event: any) => undefined,
  } as any;

  const service = new ITService(
    repo,
    fakeAudit,
    serviceEventBus,
    atomic,
    asyncRejection,
  );

  return { service, repo, committed, order };
}

/* -------------------------------------------------------------------------- */
/* Generators                                                                 */
/* -------------------------------------------------------------------------- */

function seedFor(
  tenant_id: string,
  cfg: {
    devices: number;
    provisioning: number;
    retailActive: boolean;
    pos: number;
    ecom: number;
  },
): TenantSeed {
  return {
    tenant_id,
    devices: Array.from({ length: cfg.devices }, (_v, n) => ({
      id: `${tenant_id}-dev-seed-${n}`,
      tenant_id,
      name: `Device ${n}`,
      type: "POS_TERMINAL",
      connection: "API",
      status: "ONLINE",
    })),
    provisioning: Array.from({ length: cfg.provisioning }, (_v, n) => ({
      id: `${tenant_id}-prov-seed-${n}`,
      tenant_id,
      scope: "full_portal",
      reason: "onboarding",
      status: "pending",
      requested_by: "admin",
    })),
    retailActive: cfg.retailActive,
    retail: { posDevices: cfg.pos, ecommerceConnectors: cfg.ecom },
  };
}

const tenantCfgArb = fc.record({
  devices: fc.nat({ max: 5 }),
  provisioning: fc.nat({ max: 4 }),
  retailActive: fc.boolean(),
  pos: fc.nat({ max: 50 }),
  ecom: fc.nat({ max: 20 }),
});

/* -------------------------------------------------------------------------- */
/* Property 8                                                                 */
/* -------------------------------------------------------------------------- */

describe("Property 8: Cross-module integration produces correct, tenant-scoped, complete data", () => {
  it("privileged IT actions record a scoped Audit_Trail entry and an Integration_Log event before success; Retail contributions appear iff active; device events respect device scope", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantA: fc.uuid(),
          tenantB: fc.uuid(),
          cfgA: tenantCfgArb,
          cfgB: tenantCfgArb,
          actor: fc.string({ minLength: 1, maxLength: 12 }),
        }),
        async (s) => {
          fc.pre(s.tenantA !== s.tenantB);
          const A = s.tenantA;
          const B = s.tenantB;
          const actor = `usr-${s.actor}`;

          const { service, repo, committed, order } = buildHarness([
            seedFor(A, s.cfgA),
            seedFor(B, s.cfgB),
          ]);
          const scopeA: TenantScope = { tenant_id: A, company_id: `${A}-co` };
          const scopeB: TenantScope = { tenant_id: B };

          /* ---- (1) Overview: Retail contribution iff active; every value is
                     the persisted, tenant-scoped value (no placeholder). ---- */
          const overviewA = await service.getOverview(scopeA);
          expect(overviewA.tenant_id).toBe(A);
          // Assembled from persisted scoped data, never another tenant's.
          expect(overviewA.activeNodes).toBe(s.cfgA.devices);
          const pendingA = s.cfgA.provisioning; // all seeded pending
          expect(overviewA.pendingProvisioningRequests).toBe(pendingA);

          if (s.cfgA.retailActive) {
            // Retail active -> contribution present, scoped to A, fully
            // populated from persisted data (Req 6.8, 8.10, 6.10).
            expect(overviewA.moduleContributions.retail).not.toBeNull();
            expect(overviewA.moduleContributions.retail.tenant_id).toBe(A);
            expect(overviewA.moduleContributions.retail.posDevices).toBe(
              s.cfgA.pos,
            );
            expect(
              overviewA.moduleContributions.retail.ecommerceConnectors,
            ).toBe(s.cfgA.ecom);
          } else {
            // Retail inactive -> no contribution, still a successful response
            // (Req 6.9, 8.11).
            expect(overviewA.moduleContributions.retail).toBeNull();
          }

          /* ---- (2) Privileged create-device: scoped Audit_Trail entry +
                     Integration_Log event recorded before success. ---- */
          const auditBefore = committed.filter((c) => c.kind === "audit").length;
          const device = await service.createDevice(
            scopeA,
            { name: "Reg-1", type: "POS_TERMINAL", connection: "API" } as any,
            actor,
          );
          order.push("success"); // marker appended only after the op resolves

          // Audit_Trail entry: actor / action / resource / scope (Req 6.7).
          const auditEntries = committed.filter((c) => c.kind === "audit");
          expect(auditEntries.length).toBe(auditBefore + 1);
          const audit = auditEntries[auditEntries.length - 1].params;
          expect(audit.user_id).toBe(actor);
          expect(audit.action).toBe("CREATE");
          expect(audit.entity_type).toBe("DEVICE");
          expect(audit.entity_id).toBe(device.id);
          expect(audit.tenant_id).toBe(A);
          expect(audit.metadata.tenant_scope.tenant_id).toBe(A);
          expect(audit.metadata.tenant_scope.company_id).toBe(`${A}-co`);

          // Integration_Log (outbox) event: scoped to A and recorded BEFORE the
          // originating operation reports success (Req 6.5/6.7 surface).
          const outboxEntries = committed.filter((c) => c.kind === "outbox");
          expect(outboxEntries.length).toBeGreaterThanOrEqual(1);
          const lastOutbox = outboxEntries[outboxEntries.length - 1].data;
          expect(lastOutbox.tenant_id).toBe(A);
          expect((lastOutbox.payload as any).tenant_scope.tenant_id).toBe(A);
          expect((lastOutbox.payload as any).actor_user_id).toBe(actor);
          // Ordering: the outbox row is committed before the success marker.
          expect(order.indexOf("outbox")).toBeGreaterThanOrEqual(0);
          expect(order.indexOf("outbox")).toBeLessThan(order.indexOf("success"));

          /* ---- (3) markProvisioned: privileged transition audits + emits a
                     scoped cross-module event, all scoped to A. ---- */
          if (s.cfgA.provisioning >= 1) {
            const reqId = `${A}-prov-seed-0`;
            const provAuditBefore = committed.filter(
              (c) => c.kind === "audit",
            ).length;
            await service.markProvisioned(scopeA, reqId, actor);
            const provAudits = committed.filter((c) => c.kind === "audit");
            expect(provAudits.length).toBe(provAuditBefore + 1);
            const pAudit = provAudits[provAudits.length - 1].params;
            expect(pAudit.action).toBe("PROVISION");
            expect(pAudit.entity_id).toBe(reqId);
            expect(pAudit.user_id).toBe(actor);
            expect(pAudit.metadata.tenant_scope.tenant_id).toBe(A);
            // The provisioned event is scoped to A, never B.
            const provOutbox = committed
              .filter((c) => c.kind === "outbox")
              .map((c) => c.data)
              .filter(
                (d: any) => d.type === "it.provisioning.provisioned.v1",
              );
            expect(provOutbox.length).toBeGreaterThanOrEqual(1);
            for (const ev of provOutbox) expect(ev.tenant_id).toBe(A);
          }

          /* ---- (4) Every recorded cross-module artefact is scoped to A; not a
                     single audit/outbox row references tenant B. ---- */
          for (const c of committed) {
            if (c.kind === "audit") expect(c.params.tenant_id).toBe(A);
            if (c.kind === "outbox") expect(c.data.tenant_id).toBe(A);
          }

          /* ---- (5) Device events: recorded against an in-scope device,
                     rejected without recording for an out-of-scope device
                     (Req 8.12, 8.13). ---- */
          const eventsBeforeA = (await repo.getDeviceEvents(scopeA)).length;
          // In-scope device (the one we just created) -> recorded.
          await service.createDeviceEvent(scopeA, {
            device_id: device.id,
            event_type: "HEARTBEAT",
            payload: { ok: true },
          } as any);
          const eventsAfterA = await repo.getDeviceEvents(scopeA);
          expect(eventsAfterA.length).toBe(eventsBeforeA + 1);
          expect(
            eventsAfterA.every((e: any) => e.tenant_id === A),
          ).toBe(true);

          // Out-of-scope device: a device owned by B (or a non-existent id)
          // referenced under A's scope -> rejected, nothing recorded anywhere.
          const foreignDeviceId =
            s.cfgB.devices >= 1 ? `${B}-dev-seed-0` : `${B}-nonexistent`;
          const beforeRejectA = (await repo.getDeviceEvents(scopeA)).length;
          const beforeRejectB = (await repo.getDeviceEvents(scopeB)).length;
          await expect(
            service.createDeviceEvent(scopeA, {
              device_id: foreignDeviceId,
              event_type: "HEARTBEAT",
              payload: {},
            } as any),
          ).rejects.toBeInstanceOf(NotFoundException);
          expect((await repo.getDeviceEvents(scopeA)).length).toBe(
            beforeRejectA,
          );
          expect((await repo.getDeviceEvents(scopeB)).length).toBe(
            beforeRejectB,
          );
        },
      ),
      { numRuns: 120 },
    );
  });
});
