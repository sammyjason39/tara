import { describe, it, expect, vi, beforeEach } from "vitest";

import { ProcurementDbRepository } from "./procurement.db.repository";
import { UnresolvedFieldError } from "../../common";
import type { TenantScope } from "../../../shared/scope/tenant-scope";

/**
 * Task 4.2 — Procurement create/update with explicit DTO-to-column mapping.
 *
 * These tests exercise the repository write paths directly (with a fake Prisma
 * client) to assert the field-mapping discipline introduced by task 4.2:
 *   - DTO camelCase fields bind to their single corresponding snake_case column
 *     (Requirements 5.1, 5.2, 5.3, 9.1).
 *   - A field that resolves to no schema column rejects the whole request and
 *     persists nothing (Requirements 5.4, 9.9).
 *   - Context-derived scope (`tenant_id`) and server-managed/derived defaults
 *     are bound explicitly rather than from the DTO (Requirement 2.2).
 */

const SCOPE: TenantScope = { tenant_id: "tnt-1" };

function buildPrismaMock() {
  // Each create echoes the persisted `data` back (plus server columns) so the
  // repository's column->DTO mapping can be asserted on the result.
  const echoCreate = (extra: Record<string, unknown> = {}) =>
    vi.fn(async ({ data }: any) => ({
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      ...extra,
      ...data,
    }));

  return {
    supplier_masters: { create: echoCreate({ id: "sup-1" }) },
    procurement_requisitions: { create: echoCreate({ id: "req-1" }) },
    procurement_risk_signals: { create: echoCreate({ id: "risk-1" }) },
    procurement_categories: { create: echoCreate({ id: "cat-1" }) },
    supplier_portal_messages: { create: echoCreate({ id: "msg-1" }) },
  } as any;
}

describe("ProcurementDbRepository — supplier create field mapping (task 4.2)", () => {
  let prisma: any;
  let repo: ProcurementDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new ProcurementDbRepository(prisma);
  });

  it("binds DTO fields to columns, folds category into categories[], forces context tenant", async () => {
    await repo.createSupplier(SCOPE, {
      name: "Acme Supplies",
      taxId: "TAX-99",
      category: "Hardware",
      branchCode: "HQ",
      website: "https://acme.test",
      contactPerson: "Jane",
      contact_email: "jane@acme.test",
      contactPhone: "0800",
      address: "1 Acme Way",
    } as any);

    const data = prisma.supplier_masters.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.name).toBe("Acme Supplies");
    // camelCase DTO -> snake_case column (Req 5.2)
    expect(data.tax_id).toBe("TAX-99");
    expect(data.contact_person).toBe("Jane");
    expect(data.contact_email).toBe("jane@acme.test");
    expect(data.contact_phone).toBe("0800");
    expect(data.website).toBe("https://acme.test");
    // single `category` DTO value folded into categories[] (Req 9.1)
    expect(data.categories).toEqual(["Hardware"]);
    // server-managed defaults bound explicitly
    expect(data.compliance_status).toBe("PENDING");
    expect(data.updated_at).toBeInstanceOf(Date);
    // transient `branchCode` is not written as a (nonexistent) column
    expect(data.branch_code).toBeUndefined();
    expect(data.branchCode).toBeUndefined();
  });

  it("rejects an unknown field and persists nothing (Req 5.4, 9.9)", async () => {
    await expect(
      repo.createSupplier(SCOPE, {
        name: "X",
        taxId: "T",
        category: "C",
        branchCode: "HQ",
        bogusField: "nope",
      } as any),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.supplier_masters.create).not.toHaveBeenCalled();
  });
});

describe("ProcurementDbRepository — requisition create field mapping (task 4.2)", () => {
  let prisma: any;
  let repo: ProcurementDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new ProcurementDbRepository(prisma);
  });

  it("maps requesterDept->department_id and createdBy->requester_id via aliases", async () => {
    await repo.createRequisition(SCOPE, {
      title: "Laptops",
      description: "10 dev laptops",
      requesterDept: "dept-eng",
      branchCode: "HQ",
      amount: 5000,
      currency: "USD",
      category: "IT",
      createdBy: "user-7",
    } as any);

    const data = prisma.procurement_requisitions.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.department_id).toBe("dept-eng");
    expect(data.requester_id).toBe("user-7");
    expect(data.branch_code).toBe("HQ");
    expect(data.title).toBe("Laptops");
    expect(data.amount).toBe(5000);
    expect(data.currency).toBe("USD");
    expect(data.status).toBe("PENDING_REQUESTER_HOD");
    expect(data.budget_class).toBe("OPEX");
  });

  it("rejects an unknown requisition field and persists nothing", async () => {
    await expect(
      repo.createRequisition(SCOPE, {
        title: "X",
        description: "Y",
        requesterDept: "d",
        branchCode: "HQ",
        amount: 1,
        notAColumn: true,
      } as any),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.procurement_requisitions.create).not.toHaveBeenCalled();
  });
});

describe("ProcurementDbRepository — risk/portal/category create field mapping (task 4.2)", () => {
  let prisma: any;
  let repo: ProcurementDbRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    repo = new ProcurementDbRepository(prisma);
  });

  it("createRiskSignal maps entity_id and defaults status to OPEN", async () => {
    await repo.createRiskSignal(SCOPE, {
      code: "PRICE_SPIKE",
      severity: "HIGH",
      entity_id: "po-1",
      detail: "price up 40%",
    } as any);
    const data = prisma.procurement_risk_signals.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.entity_id).toBe("po-1");
    expect(data.status).toBe("OPEN");
  });

  it("createPortalMessage maps supplierBranchId->supplier_branch_id and attachmentName->attachment_name", async () => {
    await repo.createPortalMessage(
      SCOPE,
      {
        supplierId: "sup-1",
        supplierBranchId: "br-1",
        direction: "OUTBOUND",
        type: "QUOTE",
        content: "Please quote",
        attachmentName: "rfq.pdf",
      } as any,
      "user-7",
    );
    const data = prisma.supplier_portal_messages.create.mock.calls[0][0].data;
    expect(data.supplier_id).toBe("sup-1");
    expect(data.supplier_branch_id).toBe("br-1");
    expect(data.attachment_name).toBe("rfq.pdf");
    expect(data.created_by).toBe("user-7");
  });

  it("createPortalMessage rejects an unknown field and persists nothing", async () => {
    await expect(
      repo.createPortalMessage(
        SCOPE,
        {
          supplierId: "sup-1",
          supplierBranchId: "br-1",
          direction: "OUTBOUND",
          type: "QUOTE",
          content: "Please quote",
          bogusField: 1,
        } as any,
        "user-7",
      ),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
    expect(prisma.supplier_portal_messages.create).not.toHaveBeenCalled();
  });

  it("upsertCategory create maps fields and rejects unknown ones", async () => {
    await repo.upsertCategory(SCOPE, {
      name: "Office",
      description: "Office supplies",
    } as any);
    const data = prisma.procurement_categories.create.mock.calls[0][0].data;
    expect(data.tenant_id).toBe("tnt-1");
    expect(data.name).toBe("Office");
    expect(data.description).toBe("Office supplies");
    expect(data.active).toBe(true);

    await expect(
      repo.upsertCategory(SCOPE, { name: "Bad", bogusField: 1 } as any),
    ).rejects.toBeInstanceOf(UnresolvedFieldError);
  });
});
