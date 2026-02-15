import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";
import { procurementIntegrationAdapters } from "@/core/services/procurement/procurementIntegrationAdapters";
import LexBoard from "@/pages/core/HR/LexBoard";
import InventoryReceiving from "@/pages/core/inventory/InventoryReceiving";
import AccountDesk from "@/pages/core/it/AccountDesk";

const tenantId = "tenant-demo";

const session: SessionContext = {
  userId: "proc-test-user",
  tenantId,
  role: Roles.SUPERADMIN,
  departmentId: "PROCUREMENT",
};

describe("procurement cross-workspace queue actions", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("acknowledges a legal handoff from LexBoard queue", () => {
    const handoff = procurementIntegrationAdapters.requestLegalContractHandoff(
      tenantId,
      session,
      {
        requisitionId: "req-legal-01",
        contractId: "ctr-legal-01",
        supplierId: "sup-01",
        notes: "Procurement to legal handoff",
      },
    );

    render(<LexBoard />);

    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));

    const updated = procurementIntegrationAdapters
      .listLegalHandoffs(tenantId)
      .find((item) => item.id === handoff.id);
    expect(updated?.status).toBe("ACKNOWLEDGED");
  });

  it("confirms a goods receipt sync from Inventory queue", () => {
    const sync = procurementIntegrationAdapters.queueGoodsReceiptSync(
      tenantId,
      session,
      {
        finalPoId: "po-001",
        requisitionId: "req-001",
        supplierId: "sup-001",
        supplierBranchId: "sup-001-jkt",
        branchCode: "JKT",
        expectedDeliveryDate: "2026-03-15",
      },
    );

    render(<InventoryReceiving />);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    const updated = procurementIntegrationAdapters
      .listGoodsReceiptSyncs(tenantId)
      .find((item) => item.id === sync.id);
    expect(updated?.status).toBe("SYNCED");
  });

  it("marks supplier portal provisioning as provisioned from IT queue", () => {
    const request = procurementIntegrationAdapters.requestSupplierAccessProvisioning(
      tenantId,
      session,
      {
        supplierId: "sup-001",
        supplierBranchId: "sup-001-jkt",
        portalScope: "FULL_PORTAL",
        reason: "Supplier collaboration activation",
      },
    );

    render(<AccountDesk />);

    fireEvent.click(screen.getByRole("button", { name: "Mark provisioned" }));

    const updated = procurementIntegrationAdapters
      .listSupplierAccessProvisioning(tenantId)
      .find((item) => item.id === request.id);
    expect(updated?.status).toBe("PROVISIONED");
  });
});
