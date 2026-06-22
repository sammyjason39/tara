import { describe, it, expect, vi, beforeEach } from "vitest";

import { ITDbRepository } from "./it.db.repository";
import { UnresolvedFieldError } from "../../common";

/**
 * Task 2.3 — IT device & provisioning create/update with field mapping.
 *
 * These tests exercise the repository write paths directly (with a fake Prisma
 * client) to assert the field-mapping discipline introduced by task 2.3:
 *   - DTO fields bind to their single corresponding snake_case column
 *     (Requirements 5.1, 5.2, 5.3).
 *   - A field that resolves to no schema column rejects the whole request and
 *     persists nothing (Requirements 5.4, 8.7).
 *   - A new provisioning request is always created with PENDING status
 *     (Requirement 8.4) and round-trips on read (Requirements 8.3, 8.6).
 */

function buildPrismaMock() {
  // Each create/update echoes the persisted `data` back (plus server columns)
  // so the repository's column->DTO mapping can be asserted on the result.
  const itDevices = {
    create: vi.fn(async ({ data }: any) => ({
      id: "dev-1",
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      ...data,
    })),
    update: vi.fn(async ({ data }: any) => ({
      id: "dev-1",
      tenant_id: "tnt-1",
      name: "n",
      type: "POS_TERMINAL",
      connection: "API",
      status: "ONLINE",
      location_id: null,
      owner_id: null,
      metadata: {},
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      ...data,
    })),
  };
  const itProvisioning = {
    create: vi.fn(async ({ data }: any) => ({
      id: "prov-1",
      provisioned_by: null,
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      ...data,
    })),
  };
  return {
    it_devices: itDevices,
    it_provisioning_requests: itProvisioning,
    employees: { findUnique: vi.fn() },
    supplier_masters: { findFirst: vi.fn() },
  } as any;
}

describe("ITDbRepository — device create/update field mapping (task 2.3)", () => {
  let prisma: any;
  let repo: ITDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new ITDbRepository(prisma);
  });

  it("createDevice binds DTO fields to columns, forces ONLINE status and context tenant", async () => {
    const result = await repo.createDevice("tnt-1", {
      name: "Front POS",
      type: "POS_TERMINAL",
      connection: "API",
      location_id: "loc-1",
      owner_id: "emp-1",
      metadata: { rack: 3 },
    } as any);

    const data = prisma.it_devices.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.name).toBe("Front POS");
    expect(data.location_id).toBe("loc-1");
    expect(data.owner_id).toBe("emp-1");
    expect(data.status).toBe("ONLINE");
    expect(data.updated_at).toBeInstanceOf(Date);
    // Returned record reflects persisted values (round-trip).
    expect(result.name).toBe("Front POS");
    expect(result.status).toBe("ONLINE");
  });

  it("createDevice rejects an unknown field and persists nothing (Req 5.4, 8.7)", async () => {
    await expect(
      repo.createDevice("tnt-1", {
        name: "X",
        type: "POS_TERMINAL",
        connection: "API",
        bogusField: "nope",
      } as any),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.it_devices.create).not.toHaveBeenCalled();
  });

  it("updateDevice maps fields explicitly instead of a blind spread", async () => {
    await repo.updateDevice("tnt-1", "dev-1", { name: "Renamed" } as any);
    const args = prisma.it_devices.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: "dev-1", tenant_id: "tnt-1" });
    expect(args.data.name).toBe("Renamed");
    expect(args.data.updated_at).toBeInstanceOf(Date);
  });

  it("updateDevice rejects an unknown field and persists nothing", async () => {
    await expect(
      repo.updateDevice("tnt-1", "dev-1", { notAColumn: 1 } as any),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.it_devices.update).not.toHaveBeenCalled();
  });
});

describe("ITDbRepository — provisioning create field mapping (task 2.3)", () => {
  let prisma: any;
  let repo: ITDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new ITDbRepository(prisma);
  });

  it("createProvisioningRequest persists PENDING status and round-trips as pending (Req 8.4)", async () => {
    const result = await repo.createProvisioningRequest("tnt-1", {
      scope: "full_portal",
      reason: "Onboard supplier",
      supplierBranchId: "br-1",
    } as any);

    const data = prisma.it_provisioning_requests.create.mock.calls[0][0].data;
    expect(data.status).toBe("PENDING");
    expect(data.tenant_id).toBe("tnt-1");
    // camelCase DTO -> snake_case column mapping (Req 5.2).
    expect(data.supplier_branch_id).toBe("br-1");
    expect(data.reason).toBe("Onboard supplier");
    expect(data.updated_at).toBeInstanceOf(Date);
    // Read reflects the persisted PENDING status, lowercased per entity contract.
    expect(result.status).toBe("pending");
    expect(result.supplierBranchId).toBe("br-1");
  });

  it("createProvisioningRequest drops the transient metadata field without rejecting", async () => {
    await repo.createProvisioningRequest("tnt-1", {
      scope: "full_portal",
      reason: "r",
      metadata: { note: "transient" },
    } as any);
    const data = prisma.it_provisioning_requests.create.mock.calls[0][0].data;
    expect(data.metadata).toBeUndefined();
    expect(data.status).toBe("PENDING");
  });

  it("createProvisioningRequest rejects an unknown field and persists nothing (Req 5.4)", async () => {
    await expect(
      repo.createProvisioningRequest("tnt-1", {
        scope: "full_portal",
        reason: "r",
        bogusField: "nope",
      } as any),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.it_provisioning_requests.create).not.toHaveBeenCalled();
  });
});
