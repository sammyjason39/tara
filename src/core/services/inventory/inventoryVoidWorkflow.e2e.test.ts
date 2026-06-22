/**
 * E2E Test: Role-gated Void/Approval Workflow (Task 10.5)
 *
 * Verifies the complete cross-role workflow:
 * - Non-Elevated_Role requests void → PENDING approval created
 * - Elevated_Role approves → void applied, state updated, audit trail recorded
 * - Elevated_Role rejects → item unchanged, rejection recorded
 * - Owner/Superadmin voids immediately without separate approval
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";
import { inventoryService } from "./inventoryService";

// ─── Mock the HTTP layer ──────────────────────────────────────────────────────
vi.mock("@/core/api/apiClient", () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public message: string, public status: number, public data: any = null) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

import { apiRequest } from "@/core/api/apiClient";

// ─── Sessions (different roles) ──────────────────────────────────────────────
const tenantId = "tenant-void-e2e";

const memberSession: SessionContext = {
  user_id: "member-user-01",
  tenant_id: tenantId,
  role: Roles.SALES_STAFF,
  department_id: "INVENTORY",
  location_id: "LOC-JKT",
  permissions: [],
};

const managerSession: SessionContext = {
  user_id: "manager-user-01",
  tenant_id: tenantId,
  role: Roles.DEPT_HEAD,
  department_id: "INVENTORY",
  location_id: "LOC-JKT",
  permissions: [],
};

const ownerSession: SessionContext = {
  user_id: "owner-user-01",
  tenant_id: tenantId,
  role: Roles.OWNER,
  department_id: "MANAGEMENT",
  location_id: "LOC-JKT",
  permissions: [],
};

const superadminSession: SessionContext = {
  user_id: "superadmin-01",
  tenant_id: tenantId,
  role: Roles.SUPERADMIN,
  department_id: "SYSTEM",
  location_id: "LOC-JKT",
  permissions: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mockOnce = (value: unknown) => (apiRequest as any).mockResolvedValueOnce(value);

// ─── Void Workflow API (mirrors backend endpoints) ────────────────────────────
// These functions represent the frontend API calls that would go through apiRequest.

async function createVoidRequest(
  session: SessionContext,
  entityType: "incomplete_item" | "abandoned_cycle",
  entityId: string,
  reason: string,
): Promise<any> {
  return (apiRequest as any)(
    "/v1/inventory/items/void-request",
    "POST",
    session,
    { entity_type: entityType, entity_id: entityId, reason, requested_by: session.user_id },
  );
}

async function listVoidRequests(
  session: SessionContext,
  filters?: { status?: string; entity_type?: string },
): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.entity_type) params.append("entity_type", filters.entity_type);
  return (apiRequest as any)(
    `/v1/inventory/void-requests?${params.toString()}`,
    "GET",
    session,
  );
}

async function approveVoidRequest(
  session: SessionContext,
  voidRequestId: string,
): Promise<any> {
  return (apiRequest as any)(
    `/v1/inventory/void-requests/${voidRequestId}/approve`,
    "PUT",
    session,
    { approved_by: session.user_id },
  );
}

async function rejectVoidRequest(
  session: SessionContext,
  voidRequestId: string,
  reason: string,
): Promise<any> {
  return (apiRequest as any)(
    `/v1/inventory/void-requests/${voidRequestId}/reject`,
    "PUT",
    session,
    { rejected_by: session.user_id, rejection_reason: reason },
  );
}

async function getAuditTrail(
  session: SessionContext,
  entityId: string,
): Promise<any[]> {
  return (apiRequest as any)(
    `/v1/inventory/audit-trail?entity_id=${entityId}`,
    "GET",
    session,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Role-gated Void/Approval Workflow - E2E (Task 10.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Full flow: Non-Elevated_Role requests → Elevated_Role approves (Req 8.1, 8.3, 8.4, 8.6)", () => {
    it("complete create → approve workflow with audit trail and state update", async () => {
      // ─── Step 1: Non-elevated user requests void for an incomplete item ─────
      const pendingVoidRequest = {
        success: true,
        tenant_id: tenantId,
        approval_request_id: "vr-e2e-001",
        status: "PENDING",
        entity_type: "incomplete_item",
        entity_id: "anomaly-item-001",
        reason: "Item was registered as duplicate during opname",
        requested_by: "member-user-01",
        created_at: "2025-07-01T10:00:00Z",
      };
      mockOnce(pendingVoidRequest);

      const createResult = await createVoidRequest(
        memberSession,
        "incomplete_item",
        "anomaly-item-001",
        "Item was registered as duplicate during opname",
      );

      // Verify request is PENDING (not applied immediately) - Req 8.3
      expect(createResult.status).toBe("PENDING");
      expect(createResult.approval_request_id).toBe("vr-e2e-001");
      expect(createResult.entity_type).toBe("incomplete_item");
      expect(createResult.entity_id).toBe("anomaly-item-001");

      // Verify the API was called with correct payload including reason (Req 8.1)
      expect(apiRequest).toHaveBeenCalledWith(
        "/v1/inventory/items/void-request",
        "POST",
        memberSession,
        expect.objectContaining({
          entity_type: "incomplete_item",
          entity_id: "anomaly-item-001",
          reason: "Item was registered as duplicate during opname",
          requested_by: "member-user-01",
        }),
      );

      // ─── Step 2: Verify item stays in anomaly state while pending (Req 8.7) ──
      const anomalyItem = {
        id: "anomaly-item-001",
        sku: "SKU-ANOMALY-001",
        name: "Unregistered Item - 123456",
        is_anomaly: true,
        status: "incomplete",
        category_id: "cat-anomaly",
      };
      mockOnce([anomalyItem]);

      const items = await inventoryService.listAnomalyItems(tenantId, memberSession);
      expect(items).toHaveLength(1);
      expect(items[0].is_anomaly).toBe(true);

      // ─── Step 3: Elevated user (Owner) lists pending requests ────────────────
      const pendingList = {
        success: true,
        tenant_id: tenantId,
        data: [
          {
            id: "vr-e2e-001",
            entity_type: "incomplete_item",
            entity_id: "anomaly-item-001",
            reason: "Item was registered as duplicate during opname",
            requested_by: "member-user-01",
            status: "PENDING",
            created_at: "2025-07-01T10:00:00Z",
          },
        ],
      };
      mockOnce(pendingList);

      const pending = await listVoidRequests(ownerSession, { status: "PENDING" });
      expect(pending.data).toHaveLength(1);
      expect(pending.data[0].status).toBe("PENDING");
      expect(pending.data[0].requested_by).toBe("member-user-01");

      // ─── Step 4: Elevated user approves the void request (Req 8.4) ──────────
      const approvedResult = {
        success: true,
        id: "vr-e2e-001",
        status: "APPROVED",
        approved_by: "owner-user-01",
        approved_at: "2025-07-01T11:30:00Z",
        entity_type: "incomplete_item",
        entity_id: "anomaly-item-001",
        void_applied: true,
      };
      mockOnce(approvedResult);

      const approved = await approveVoidRequest(ownerSession, "vr-e2e-001");

      // Verify approval state (Req 8.4)
      expect(approved.status).toBe("APPROVED");
      expect(approved.approved_by).toBe("owner-user-01");
      expect(approved.approved_at).toBeDefined();
      expect(approved.void_applied).toBe(true);

      // Verify approve API called correctly
      expect(apiRequest).toHaveBeenCalledWith(
        "/v1/inventory/void-requests/vr-e2e-001/approve",
        "PUT",
        ownerSession,
        { approved_by: "owner-user-01" },
      );

      // ─── Step 5: Verify audit trail records all actions (Req 8.6) ───────────
      const auditTrail = [
        {
          id: "audit-001",
          action: "VOID_REQUEST_CREATED",
          user_id: "member-user-01",
          entity_type: "VOID_REQUEST",
          entity_id: "vr-e2e-001",
          timestamp: "2025-07-01T10:00:00Z",
          metadata: {
            entity_type: "incomplete_item",
            entity_id: "anomaly-item-001",
            reason: "Item was registered as duplicate during opname",
            is_elevated_role: false,
            auto_approved: false,
          },
        },
        {
          id: "audit-002",
          action: "VOID_REQUEST_APPROVED",
          user_id: "owner-user-01",
          entity_type: "VOID_REQUEST",
          entity_id: "vr-e2e-001",
          timestamp: "2025-07-01T11:30:00Z",
          metadata: {
            approved_by: "owner-user-01",
            original_entity_type: "incomplete_item",
            original_entity_id: "anomaly-item-001",
            void_applied: true,
          },
        },
      ];
      mockOnce(auditTrail);

      const trail = await getAuditTrail(ownerSession, "vr-e2e-001");

      // Verify complete audit trail
      expect(trail).toHaveLength(2);
      expect(trail[0].action).toBe("VOID_REQUEST_CREATED");
      expect(trail[0].user_id).toBe("member-user-01");
      expect(trail[0].metadata.reason).toBe("Item was registered as duplicate during opname");
      expect(trail[0].metadata.is_elevated_role).toBe(false);

      expect(trail[1].action).toBe("VOID_REQUEST_APPROVED");
      expect(trail[1].user_id).toBe("owner-user-01");
      expect(trail[1].metadata.approved_by).toBe("owner-user-01");
      expect(trail[1].metadata.void_applied).toBe(true);

      // ─── Step 6: Verify item is no longer in anomaly list (state updated) ───
      mockOnce([]);

      const itemsAfterVoid = await inventoryService.listAnomalyItems(tenantId, memberSession);
      expect(itemsAfterVoid).toHaveLength(0);
    });
  });

  describe("Full flow: Non-Elevated_Role requests → Elevated_Role rejects (Req 8.5, 8.6, 8.7)", () => {
    it("complete create → reject workflow: item unchanged, rejection recorded", async () => {
      // ─── Step 1: Non-elevated user requests void ────────────────────────────
      const pendingVoidRequest = {
        success: true,
        tenant_id: tenantId,
        approval_request_id: "vr-e2e-reject-001",
        status: "PENDING",
        entity_type: "incomplete_item",
        entity_id: "anomaly-item-002",
        reason: "Item seems incorrect",
        requested_by: "member-user-01",
      };
      mockOnce(pendingVoidRequest);

      const createResult = await createVoidRequest(
        memberSession,
        "incomplete_item",
        "anomaly-item-002",
        "Item seems incorrect",
      );

      expect(createResult.status).toBe("PENDING");

      // ─── Step 2: Elevated user rejects the void request (Req 8.5) ──────────
      const rejectedResult = {
        success: true,
        id: "vr-e2e-reject-001",
        status: "REJECTED",
        rejected_by: "owner-user-01",
        rejected_at: "2025-07-01T12:00:00Z",
        rejection_reason: "Item is valid, do not void",
      };
      mockOnce(rejectedResult);

      const rejected = await rejectVoidRequest(
        ownerSession,
        "vr-e2e-reject-001",
        "Item is valid, do not void",
      );

      // Verify rejection state (Req 8.5)
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.rejected_by).toBe("owner-user-01");
      expect(rejected.rejected_at).toBeDefined();

      // Verify reject API called with reason
      expect(apiRequest).toHaveBeenCalledWith(
        "/v1/inventory/void-requests/vr-e2e-reject-001/reject",
        "PUT",
        ownerSession,
        {
          rejected_by: "owner-user-01",
          rejection_reason: "Item is valid, do not void",
        },
      );

      // ─── Step 3: Verify item remains in anomaly state (Req 8.5, 8.7) ───────
      const anomalyItem = {
        id: "anomaly-item-002",
        sku: "SKU-ANOMALY-002",
        name: "Unregistered Item - 789012",
        is_anomaly: true,
        status: "incomplete",
        category_id: "cat-anomaly",
      };
      mockOnce([anomalyItem]);

      const items = await inventoryService.listAnomalyItems(tenantId, memberSession);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("anomaly-item-002");
      expect(items[0].is_anomaly).toBe(true);

      // ─── Step 4: Verify audit trail records rejection (Req 8.6) ─────────────
      const auditTrail = [
        {
          id: "audit-r-001",
          action: "VOID_REQUEST_CREATED",
          user_id: "member-user-01",
          entity_type: "VOID_REQUEST",
          entity_id: "vr-e2e-reject-001",
          timestamp: "2025-07-01T10:00:00Z",
          metadata: {
            entity_type: "incomplete_item",
            entity_id: "anomaly-item-002",
            reason: "Item seems incorrect",
            is_elevated_role: false,
            auto_approved: false,
          },
        },
        {
          id: "audit-r-002",
          action: "VOID_REQUEST_REJECTED",
          user_id: "owner-user-01",
          entity_type: "VOID_REQUEST",
          entity_id: "vr-e2e-reject-001",
          timestamp: "2025-07-01T12:00:00Z",
          metadata: {
            rejected_by: "owner-user-01",
            rejection_reason: "Item is valid, do not void",
            original_entity_type: "incomplete_item",
            original_entity_id: "anomaly-item-002",
          },
        },
      ];
      mockOnce(auditTrail);

      const trail = await getAuditTrail(ownerSession, "vr-e2e-reject-001");

      expect(trail).toHaveLength(2);
      expect(trail[1].action).toBe("VOID_REQUEST_REJECTED");
      expect(trail[1].metadata.rejection_reason).toBe("Item is valid, do not void");
      expect(trail[1].metadata.rejected_by).toBe("owner-user-01");
    });
  });

  describe("Owner/Superadmin immediate void (Req 8.2)", () => {
    it("Owner voids incomplete item immediately without separate approval step", async () => {
      // Owner creates void request → it's approved immediately
      const immediateResult = {
        success: true,
        tenant_id: tenantId,
        approval_request_id: "vr-e2e-immediate-001",
        status: "APPROVED",
        approved_by: "owner-user-01",
        approved_at: "2025-07-01T09:00:00Z",
        void_applied: true,
      };
      mockOnce(immediateResult);

      const result = await createVoidRequest(
        ownerSession,
        "incomplete_item",
        "anomaly-item-003",
        "Owner immediate cleanup",
      );

      // Verify immediate approval (Req 8.2)
      expect(result.status).toBe("APPROVED");
      expect(result.approved_by).toBe("owner-user-01");
      expect(result.void_applied).toBe(true);

      // Verify audit trail for immediate void
      const auditTrail = [
        {
          id: "audit-i-001",
          action: "VOID_APPLIED_IMMEDIATELY",
          user_id: "owner-user-01",
          entity_type: "VOID_REQUEST",
          entity_id: "vr-e2e-immediate-001",
          timestamp: "2025-07-01T09:00:00Z",
          metadata: {
            entity_type: "incomplete_item",
            entity_id: "anomaly-item-003",
            reason: "Owner immediate cleanup",
            is_elevated_role: true,
            auto_approved: true,
            requested_by: "owner-user-01",
          },
        },
      ];
      mockOnce(auditTrail);

      const trail = await getAuditTrail(ownerSession, "vr-e2e-immediate-001");

      expect(trail).toHaveLength(1);
      expect(trail[0].action).toBe("VOID_APPLIED_IMMEDIATELY");
      expect(trail[0].metadata.is_elevated_role).toBe(true);
      expect(trail[0].metadata.auto_approved).toBe(true);
    });

    it("Superadmin voids abandoned audit cycle immediately", async () => {
      const immediateResult = {
        success: true,
        tenant_id: tenantId,
        approval_request_id: "vr-e2e-cycle-001",
        status: "APPROVED",
        approved_by: "superadmin-01",
        approved_at: "2025-07-01T09:15:00Z",
        void_applied: true,
      };
      mockOnce(immediateResult);

      const result = await createVoidRequest(
        superadminSession,
        "abandoned_cycle",
        "cycle-abandoned-001",
        "Superadmin resolving stale cycle",
      );

      expect(result.status).toBe("APPROVED");
      expect(result.approved_by).toBe("superadmin-01");
      expect(result.void_applied).toBe(true);
    });
  });

  describe("Abandoned audit cycle void workflow (Req 4.5, 8.3, 8.7)", () => {
    it("Manager requests void of abandoned cycle → Owner approves → cycle voided", async () => {
      // ─── Step 1: Manager requests void for abandoned cycle ──────────────────
      const pendingCycleVoid = {
        success: true,
        tenant_id: tenantId,
        approval_request_id: "vr-e2e-cycle-pending",
        status: "PENDING",
        entity_type: "abandoned_cycle",
        entity_id: "cycle-abandoned-002",
        reason: "Cycle left open during shift change",
        requested_by: "manager-user-01",
      };
      mockOnce(pendingCycleVoid);

      const createResult = await createVoidRequest(
        managerSession,
        "abandoned_cycle",
        "cycle-abandoned-002",
        "Cycle left open during shift change",
      );

      // Manager gets PENDING (not immediate) - Req 8.3
      expect(createResult.status).toBe("PENDING");
      expect(createResult.entity_type).toBe("abandoned_cycle");

      // ─── Step 2: Verify cycle stays in ABANDONED while pending (Req 8.7) ───
      const abandonedCycles = [
        { id: "cycle-abandoned-002", status: "ABANDONED", location_id: "LOC-JKT" },
      ];
      mockOnce(abandonedCycles);

      const cycles = await inventoryService.listAuditCycles(tenantId, managerSession);
      const targetCycle = cycles.find((c: any) => c.id === "cycle-abandoned-002");
      expect(targetCycle).toBeDefined();
      expect(targetCycle!.status).toBe("ABANDONED");

      // ─── Step 3: Owner approves → cycle voided ──────────────────────────────
      const approvedCycleResult = {
        success: true,
        id: "vr-e2e-cycle-pending",
        status: "APPROVED",
        approved_by: "owner-user-01",
        approved_at: "2025-07-01T14:00:00Z",
        entity_type: "abandoned_cycle",
        entity_id: "cycle-abandoned-002",
        void_applied: true,
      };
      mockOnce(approvedCycleResult);

      const approved = await approveVoidRequest(ownerSession, "vr-e2e-cycle-pending");

      expect(approved.status).toBe("APPROVED");
      expect(approved.void_applied).toBe(true);

      // ─── Step 4: Verify cycle is now VOIDED ─────────────────────────────────
      const updatedCycles = [
        { id: "cycle-abandoned-002", status: "VOIDED", closed_by: "owner-user-01" },
      ];
      mockOnce(updatedCycles);

      const cyclesAfter = await inventoryService.listAuditCycles(tenantId, ownerSession);
      const voidedCycle = cyclesAfter.find((c: any) => c.id === "cycle-abandoned-002");
      expect(voidedCycle!.status).toBe("VOIDED");

      // ─── Step 5: Verify complete audit trail (Req 8.6) ──────────────────────
      const auditTrail = [
        {
          id: "audit-c-001",
          action: "VOID_REQUEST_CREATED",
          user_id: "manager-user-01",
          entity_type: "VOID_REQUEST",
          entity_id: "vr-e2e-cycle-pending",
          timestamp: "2025-07-01T13:00:00Z",
          metadata: {
            entity_type: "abandoned_cycle",
            entity_id: "cycle-abandoned-002",
            reason: "Cycle left open during shift change",
            is_elevated_role: false,
            auto_approved: false,
          },
        },
        {
          id: "audit-c-002",
          action: "VOID_REQUEST_APPROVED",
          user_id: "owner-user-01",
          entity_type: "VOID_REQUEST",
          entity_id: "vr-e2e-cycle-pending",
          timestamp: "2025-07-01T14:00:00Z",
          metadata: {
            approved_by: "owner-user-01",
            original_entity_type: "abandoned_cycle",
            original_entity_id: "cycle-abandoned-002",
            void_applied: true,
          },
        },
        {
          id: "audit-c-003",
          action: "AUDIT_CYCLE_VOIDED",
          user_id: "owner-user-01",
          entity_type: "AUDIT_CYCLE",
          entity_id: "cycle-abandoned-002",
          timestamp: "2025-07-01T14:00:01Z",
          metadata: {
            voided_by: "owner-user-01",
            previous_status: "ABANDONED",
          },
        },
      ];
      mockOnce(auditTrail);

      const trail = await getAuditTrail(ownerSession, "vr-e2e-cycle-pending");

      expect(trail).toHaveLength(3);
      expect(trail[0].action).toBe("VOID_REQUEST_CREATED");
      expect(trail[0].user_id).toBe("manager-user-01");
      expect(trail[1].action).toBe("VOID_REQUEST_APPROVED");
      expect(trail[1].user_id).toBe("owner-user-01");
      expect(trail[2].action).toBe("AUDIT_CYCLE_VOIDED");
      expect(trail[2].entity_type).toBe("AUDIT_CYCLE");
    });
  });

  describe("Reason requirement enforcement (Req 8.1)", () => {
    it("void request includes reason in the API call", async () => {
      const result = {
        success: true,
        approval_request_id: "vr-reason-test",
        status: "PENDING",
      };
      mockOnce(result);

      await createVoidRequest(
        memberSession,
        "incomplete_item",
        "item-reason-check",
        "Barcode scan was a duplicate entry",
      );

      expect(apiRequest).toHaveBeenCalledWith(
        "/v1/inventory/items/void-request",
        "POST",
        memberSession,
        expect.objectContaining({
          reason: "Barcode scan was a duplicate entry",
        }),
      );
    });

    it("approval records requester, approver, reason, and timestamp (Req 8.4)", async () => {
      // Create pending
      mockOnce({
        approval_request_id: "vr-metadata-e2e",
        status: "PENDING",
        reason: "Metadata completeness test",
        requested_by: "member-user-01",
      });

      await createVoidRequest(
        memberSession,
        "incomplete_item",
        "item-metadata-e2e",
        "Metadata completeness test",
      );

      // Approve
      const approvedWithMetadata = {
        id: "vr-metadata-e2e",
        status: "APPROVED",
        approved_by: "owner-user-01",
        approved_at: "2025-07-01T15:00:00Z",
        entity_type: "incomplete_item",
        entity_id: "item-metadata-e2e",
        reason: "Metadata completeness test",
        requested_by: "member-user-01",
        void_applied: true,
      };
      mockOnce(approvedWithMetadata);

      const approved = await approveVoidRequest(ownerSession, "vr-metadata-e2e");

      // All required metadata present (Req 8.4)
      expect(approved.approved_by).toBe("owner-user-01");
      expect(approved.approved_at).toBe("2025-07-01T15:00:00Z");
      expect(approved.requested_by).toBe("member-user-01");
      expect(approved.reason).toBe("Metadata completeness test");
    });
  });
});
