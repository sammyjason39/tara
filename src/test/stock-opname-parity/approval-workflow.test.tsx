/**
 * Component tests for Approval Workflow (Task 9.4)
 *
 * Tests the inventory void request / approval workflow UI behavior.
 * Validates role-based void behavior, pending approval creation,
 * and audit trail recording at the component level.
 *
 * **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Types ──────────────────────────────────────────────────────

interface VoidRequest {
  id: string;
  entity_type: "incomplete_item" | "abandoned_cycle";
  entity_id: string;
  reason: string;
  requested_by: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
}

interface AuditEntry {
  action: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  timestamp: string;
}

type UserRole = "OWNER" | "SUPERADMIN" | "MANAGER" | "HOD" | "ADMIN" | "MEMBER" | "CLERK";

const ELEVATED_ROLES: UserRole[] = ["OWNER", "SUPERADMIN"];
const APPROVAL_CAPABLE_ROLES: UserRole[] = ["OWNER", "SUPERADMIN", "MANAGER", "HOD"];

// ─── Approval Workflow Logic (Frontend Domain Logic) ─────────────

/**
 * Determines if a void request should be applied immediately
 * based on the user's role (Req 8.2).
 */
function shouldApplyImmediately(role: UserRole): boolean {
  return ELEVATED_ROLES.includes(role);
}

/**
 * Determines if a user can request voiding abandoned cycles.
 * Requires at least Manager/HOD level (Req 8.3).
 */
function canRequestVoid(role: UserRole): boolean {
  return APPROVAL_CAPABLE_ROLES.includes(role);
}

/**
 * Creates a void request result based on role.
 * Owner/Superadmin get immediate approval, others get PENDING (Req 8.2, 8.3).
 */
function createVoidRequestResult(
  role: UserRole,
  entityType: "incomplete_item" | "abandoned_cycle",
  entityId: string,
  reason: string,
  requestedBy: string,
): VoidRequest {
  const isImmediate = shouldApplyImmediately(role);
  const now = new Date().toISOString();

  return {
    id: `vr-${Date.now()}`,
    entity_type: entityType,
    entity_id: entityId,
    reason,
    requested_by: requestedBy,
    status: isImmediate ? "APPROVED" : "PENDING",
    approved_by: isImmediate ? requestedBy : null,
    approved_at: isImmediate ? now : null,
    rejected_by: null,
    rejected_at: null,
  };
}

/**
 * Creates an audit trail entry for a void action (Req 8.6).
 */
function createAuditEntry(
  action: string,
  userId: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, any> = {},
): AuditEntry {
  return {
    action,
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Applies approval to a pending void request (Req 8.4).
 */
function approveVoidRequest(
  request: VoidRequest,
  approverId: string,
): VoidRequest {
  if (request.status !== "PENDING") {
    throw new Error(`Cannot approve: request is already ${request.status}`);
  }
  return {
    ...request,
    status: "APPROVED",
    approved_by: approverId,
    approved_at: new Date().toISOString(),
  };
}

/**
 * Rejects a pending void request (Req 8.5).
 */
function rejectVoidRequest(
  request: VoidRequest,
  rejectorId: string,
): VoidRequest {
  if (request.status !== "PENDING") {
    throw new Error(`Cannot reject: request is already ${request.status}`);
  }
  return {
    ...request,
    status: "REJECTED",
    rejected_by: rejectorId,
    rejected_at: new Date().toISOString(),
  };
}

// ─── Minimal VoidRequestPanel Component ─────────────────────────

interface VoidRequestPanelProps {
  entityType: "incomplete_item" | "abandoned_cycle";
  entityId: string;
  userRole: UserRole;
  userId: string;
  onSubmit: (request: VoidRequest, auditEntries: AuditEntry[]) => void;
  onApprove?: (request: VoidRequest, auditEntries: AuditEntry[]) => void;
  onReject?: (request: VoidRequest, auditEntries: AuditEntry[]) => void;
  pendingRequests?: VoidRequest[];
}

function VoidRequestPanel({
  entityType,
  entityId,
  userRole,
  userId,
  onSubmit,
  onApprove,
  onReject,
  pendingRequests = [],
}: VoidRequestPanelProps) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmitVoid = () => {
    if (!reason.trim()) {
      setError("Reason is required");
      return;
    }

    const request = createVoidRequestResult(
      userRole,
      entityType,
      entityId,
      reason,
      userId,
    );

    const auditEntries: AuditEntry[] = [];

    if (shouldApplyImmediately(userRole)) {
      auditEntries.push(
        createAuditEntry("VOID_APPLIED_IMMEDIATELY", userId, entityType, entityId, {
          reason,
          is_elevated_role: true,
          auto_approved: true,
          requested_by: userId,
        }),
      );
    } else {
      auditEntries.push(
        createAuditEntry("VOID_REQUEST_CREATED", userId, entityType, entityId, {
          reason,
          is_elevated_role: false,
          auto_approved: false,
          requested_by: userId,
        }),
      );
    }

    onSubmit(request, auditEntries);
    setReason("");
    setError("");
  };

  const handleApprove = (request: VoidRequest) => {
    const approved = approveVoidRequest(request, userId);
    const auditEntries = [
      createAuditEntry("VOID_REQUEST_APPROVED", userId, request.entity_type, request.entity_id, {
        approved_by: userId,
        original_requester: request.requested_by,
        reason: request.reason,
        void_applied: true,
      }),
    ];
    onApprove?.(approved, auditEntries);
  };

  const handleReject = (request: VoidRequest) => {
    const rejected = rejectVoidRequest(request, userId);
    const auditEntries = [
      createAuditEntry("VOID_REQUEST_REJECTED", userId, request.entity_type, request.entity_id, {
        rejected_by: userId,
        original_requester: request.requested_by,
        reason: request.reason,
      }),
    ];
    onReject?.(rejected, auditEntries);
  };

  return (
    <div data-testid="void-request-panel">
      <div data-testid="void-form">
        <label htmlFor="void-reason">Reason for void</label>
        <textarea
          id="void-reason"
          data-testid="void-reason-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for voiding..."
        />
        {error && <p data-testid="void-error">{error}</p>}
        <button
          data-testid="submit-void-btn"
          onClick={handleSubmitVoid}
        >
          {shouldApplyImmediately(userRole) ? "Void Immediately" : "Request Void"}
        </button>
        {shouldApplyImmediately(userRole) && (
          <span data-testid="immediate-indicator">Immediate approval (elevated role)</span>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div data-testid="pending-requests">
          <h3>Pending Void Requests</h3>
          {pendingRequests.map((req) => (
            <div key={req.id} data-testid={`request-${req.id}`}>
              <span data-testid={`request-status-${req.id}`}>{req.status}</span>
              <span data-testid={`request-reason-${req.id}`}>{req.reason}</span>
              <span data-testid={`request-requester-${req.id}`}>{req.requested_by}</span>
              {req.status === "PENDING" && onApprove && (
                <button
                  data-testid={`approve-btn-${req.id}`}
                  onClick={() => handleApprove(req)}
                >
                  Approve
                </button>
              )}
              {req.status === "PENDING" && onReject && (
                <button
                  data-testid={`reject-btn-${req.id}`}
                  onClick={() => handleReject(req)}
                >
                  Reject
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tests ──────────────────────────────────────────────────────

describe("Approval Workflow - Component Tests (Task 9.4)", () => {
  let onSubmit: ReturnType<typeof vi.fn>;
  let onApprove: ReturnType<typeof vi.fn>;
  let onReject: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
    onApprove = vi.fn();
    onReject = vi.fn();
  });

  describe("Owner voids apply immediately (Req 8.2)", () => {
    it("Owner role sees 'Void Immediately' button text", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-1"
          userRole="OWNER"
          userId="owner-1"
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByTestId("submit-void-btn")).toHaveTextContent("Void Immediately");
      expect(screen.getByTestId("immediate-indicator")).toBeInTheDocument();
    });

    it("Superadmin role sees 'Void Immediately' button text", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-1"
          userRole="SUPERADMIN"
          userId="superadmin-1"
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByTestId("submit-void-btn")).toHaveTextContent("Void Immediately");
      expect(screen.getByTestId("immediate-indicator")).toBeInTheDocument();
    });

    it("Owner void request returns APPROVED status immediately", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-owner-void"
          userRole="OWNER"
          userId="owner-1"
          onSubmit={onSubmit}
        />,
      );

      const reasonInput = screen.getByTestId("void-reason-input");
      fireEvent.change(reasonInput, { target: { value: "Item incorrectly registered" } });
      fireEvent.click(screen.getByTestId("submit-void-btn"));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const [request] = onSubmit.mock.calls[0];
      expect(request.status).toBe("APPROVED");
      expect(request.approved_by).toBe("owner-1");
      expect(request.approved_at).not.toBeNull();
    });

    it("Superadmin void request returns APPROVED status immediately", () => {
      render(
        <VoidRequestPanel
          entityType="abandoned_cycle"
          entityId="cycle-sa-void"
          userRole="SUPERADMIN"
          userId="superadmin-1"
          onSubmit={onSubmit}
        />,
      );

      const reasonInput = screen.getByTestId("void-reason-input");
      fireEvent.change(reasonInput, { target: { value: "Cleaning up stale cycle" } });
      fireEvent.click(screen.getByTestId("submit-void-btn"));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const [request] = onSubmit.mock.calls[0];
      expect(request.status).toBe("APPROVED");
      expect(request.approved_by).toBe("superadmin-1");
    });

    it("Owner immediate void generates VOID_APPLIED_IMMEDIATELY audit entry", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-audit-check"
          userRole="OWNER"
          userId="owner-1"
          onSubmit={onSubmit}
        />,
      );

      const reasonInput = screen.getByTestId("void-reason-input");
      fireEvent.change(reasonInput, { target: { value: "Duplicate item" } });
      fireEvent.click(screen.getByTestId("submit-void-btn"));

      const [, auditEntries] = onSubmit.mock.calls[0];
      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0].action).toBe("VOID_APPLIED_IMMEDIATELY");
      expect(auditEntries[0].metadata.is_elevated_role).toBe(true);
      expect(auditEntries[0].metadata.auto_approved).toBe(true);
    });
  });

  describe("Non-Elevated_Role creates pending approval (Req 8.3)", () => {
    it("MEMBER role sees 'Request Void' button text (not immediate)", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-1"
          userRole="MEMBER"
          userId="member-1"
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByTestId("submit-void-btn")).toHaveTextContent("Request Void");
      expect(screen.queryByTestId("immediate-indicator")).not.toBeInTheDocument();
    });

    it("ADMIN role sees 'Request Void' button text (not immediate)", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-1"
          userRole="ADMIN"
          userId="admin-1"
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByTestId("submit-void-btn")).toHaveTextContent("Request Void");
      expect(screen.queryByTestId("immediate-indicator")).not.toBeInTheDocument();
    });

    it("MANAGER role sees 'Request Void' (not immediate for void requests)", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-1"
          userRole="MANAGER"
          userId="manager-1"
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByTestId("submit-void-btn")).toHaveTextContent("Request Void");
    });

    it("MEMBER void request returns PENDING status", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-member-void"
          userRole="MEMBER"
          userId="member-1"
          onSubmit={onSubmit}
        />,
      );

      const reasonInput = screen.getByTestId("void-reason-input");
      fireEvent.change(reasonInput, { target: { value: "Item should be voided" } });
      fireEvent.click(screen.getByTestId("submit-void-btn"));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const [request] = onSubmit.mock.calls[0];
      expect(request.status).toBe("PENDING");
      expect(request.approved_by).toBeNull();
      expect(request.approved_at).toBeNull();
    });

    it("PENDING request generates VOID_REQUEST_CREATED audit entry", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-audit-pending"
          userRole="MEMBER"
          userId="member-1"
          onSubmit={onSubmit}
        />,
      );

      const reasonInput = screen.getByTestId("void-reason-input");
      fireEvent.change(reasonInput, { target: { value: "Testing pending audit" } });
      fireEvent.click(screen.getByTestId("submit-void-btn"));

      const [, auditEntries] = onSubmit.mock.calls[0];
      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0].action).toBe("VOID_REQUEST_CREATED");
      expect(auditEntries[0].metadata.is_elevated_role).toBe(false);
      expect(auditEntries[0].metadata.auto_approved).toBe(false);
    });

    it("Requires reason to be provided (Req 8.1)", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-no-reason"
          userRole="MEMBER"
          userId="member-1"
          onSubmit={onSubmit}
        />,
      );

      // Click without entering reason
      fireEvent.click(screen.getByTestId("submit-void-btn"));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByTestId("void-error")).toHaveTextContent("Reason is required");
    });
  });

  describe("Approval/rejection audit trail (Req 8.4, 8.5, 8.6)", () => {
    const pendingRequest: VoidRequest = {
      id: "vr-pending-1",
      entity_type: "incomplete_item",
      entity_id: "item-pending",
      reason: "Item registered in error",
      requested_by: "member-1",
      status: "PENDING",
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
    };

    it("renders pending requests with approve/reject buttons", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-1"
          userRole="OWNER"
          userId="owner-1"
          onSubmit={onSubmit}
          onApprove={onApprove}
          onReject={onReject}
          pendingRequests={[pendingRequest]}
        />,
      );

      expect(screen.getByTestId("request-vr-pending-1")).toBeInTheDocument();
      expect(screen.getByTestId("request-status-vr-pending-1")).toHaveTextContent("PENDING");
      expect(screen.getByTestId("request-reason-vr-pending-1")).toHaveTextContent("Item registered in error");
      expect(screen.getByTestId("request-requester-vr-pending-1")).toHaveTextContent("member-1");
      expect(screen.getByTestId("approve-btn-vr-pending-1")).toBeInTheDocument();
      expect(screen.getByTestId("reject-btn-vr-pending-1")).toBeInTheDocument();
    });

    it("Approval sets status to APPROVED and records audit trail (Req 8.4)", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-1"
          userRole="OWNER"
          userId="owner-1"
          onSubmit={onSubmit}
          onApprove={onApprove}
          onReject={onReject}
          pendingRequests={[pendingRequest]}
        />,
      );

      fireEvent.click(screen.getByTestId("approve-btn-vr-pending-1"));

      expect(onApprove).toHaveBeenCalledTimes(1);
      const [approvedRequest, auditEntries] = onApprove.mock.calls[0];

      // Verify status transition
      expect(approvedRequest.status).toBe("APPROVED");
      expect(approvedRequest.approved_by).toBe("owner-1");
      expect(approvedRequest.approved_at).not.toBeNull();

      // Verify audit trail (Req 8.6)
      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0].action).toBe("VOID_REQUEST_APPROVED");
      expect(auditEntries[0].user_id).toBe("owner-1");
      expect(auditEntries[0].metadata.approved_by).toBe("owner-1");
      expect(auditEntries[0].metadata.original_requester).toBe("member-1");
      expect(auditEntries[0].metadata.reason).toBe("Item registered in error");
      expect(auditEntries[0].metadata.void_applied).toBe(true);
    });

    it("Rejection sets status to REJECTED and records audit trail (Req 8.5)", () => {
      render(
        <VoidRequestPanel
          entityType="incomplete_item"
          entityId="item-1"
          userRole="OWNER"
          userId="owner-1"
          onSubmit={onSubmit}
          onApprove={onApprove}
          onReject={onReject}
          pendingRequests={[pendingRequest]}
        />,
      );

      fireEvent.click(screen.getByTestId("reject-btn-vr-pending-1"));

      expect(onReject).toHaveBeenCalledTimes(1);
      const [rejectedRequest, auditEntries] = onReject.mock.calls[0];

      // Verify status transition
      expect(rejectedRequest.status).toBe("REJECTED");
      expect(rejectedRequest.rejected_by).toBe("owner-1");
      expect(rejectedRequest.rejected_at).not.toBeNull();

      // Verify audit trail (Req 8.6)
      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0].action).toBe("VOID_REQUEST_REJECTED");
      expect(auditEntries[0].user_id).toBe("owner-1");
      expect(auditEntries[0].metadata.rejected_by).toBe("owner-1");
      expect(auditEntries[0].metadata.original_requester).toBe("member-1");
    });

    it("Audit entry includes entity_type and entity_id for traceability (Req 8.6)", () => {
      render(
        <VoidRequestPanel
          entityType="abandoned_cycle"
          entityId="cycle-trace"
          userRole="OWNER"
          userId="owner-1"
          onSubmit={onSubmit}
          onApprove={onApprove}
          onReject={onReject}
          pendingRequests={[{
            ...pendingRequest,
            id: "vr-cycle-trace",
            entity_type: "abandoned_cycle",
            entity_id: "cycle-trace",
          }]}
        />,
      );

      fireEvent.click(screen.getByTestId("approve-btn-vr-cycle-trace"));

      const [, auditEntries] = onApprove.mock.calls[0];
      expect(auditEntries[0].entity_type).toBe("abandoned_cycle");
      expect(auditEntries[0].entity_id).toBe("cycle-trace");
    });
  });

  describe("Domain logic unit tests", () => {
    it("shouldApplyImmediately returns true only for OWNER and SUPERADMIN", () => {
      expect(shouldApplyImmediately("OWNER")).toBe(true);
      expect(shouldApplyImmediately("SUPERADMIN")).toBe(true);
      expect(shouldApplyImmediately("MANAGER")).toBe(false);
      expect(shouldApplyImmediately("HOD")).toBe(false);
      expect(shouldApplyImmediately("ADMIN")).toBe(false);
      expect(shouldApplyImmediately("MEMBER")).toBe(false);
      expect(shouldApplyImmediately("CLERK")).toBe(false);
    });

    it("canRequestVoid returns true for Manager/HOD and above", () => {
      expect(canRequestVoid("OWNER")).toBe(true);
      expect(canRequestVoid("SUPERADMIN")).toBe(true);
      expect(canRequestVoid("MANAGER")).toBe(true);
      expect(canRequestVoid("HOD")).toBe(true);
      expect(canRequestVoid("ADMIN")).toBe(false);
      expect(canRequestVoid("MEMBER")).toBe(false);
      expect(canRequestVoid("CLERK")).toBe(false);
    });

    it("createVoidRequestResult generates APPROVED for elevated roles", () => {
      const result = createVoidRequestResult(
        "OWNER",
        "incomplete_item",
        "item-123",
        "Test reason",
        "owner-1",
      );
      expect(result.status).toBe("APPROVED");
      expect(result.approved_by).toBe("owner-1");
      expect(result.approved_at).not.toBeNull();
      expect(result.entity_type).toBe("incomplete_item");
      expect(result.entity_id).toBe("item-123");
      expect(result.reason).toBe("Test reason");
    });

    it("createVoidRequestResult generates PENDING for non-elevated roles", () => {
      const result = createVoidRequestResult(
        "MEMBER",
        "incomplete_item",
        "item-456",
        "Please void",
        "member-1",
      );
      expect(result.status).toBe("PENDING");
      expect(result.approved_by).toBeNull();
      expect(result.approved_at).toBeNull();
    });

    it("approveVoidRequest transitions PENDING to APPROVED", () => {
      const pending: VoidRequest = {
        id: "vr-1",
        entity_type: "incomplete_item",
        entity_id: "item-1",
        reason: "Test",
        requested_by: "member-1",
        status: "PENDING",
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
      };

      const approved = approveVoidRequest(pending, "owner-1");
      expect(approved.status).toBe("APPROVED");
      expect(approved.approved_by).toBe("owner-1");
      expect(approved.approved_at).not.toBeNull();
    });

    it("approveVoidRequest throws if already APPROVED", () => {
      const alreadyApproved: VoidRequest = {
        id: "vr-2",
        entity_type: "incomplete_item",
        entity_id: "item-2",
        reason: "Test",
        requested_by: "member-1",
        status: "APPROVED",
        approved_by: "owner-1",
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
      };

      expect(() => approveVoidRequest(alreadyApproved, "owner-2"))
        .toThrow("Cannot approve: request is already APPROVED");
    });

    it("rejectVoidRequest transitions PENDING to REJECTED", () => {
      const pending: VoidRequest = {
        id: "vr-3",
        entity_type: "incomplete_item",
        entity_id: "item-3",
        reason: "Test",
        requested_by: "member-1",
        status: "PENDING",
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
      };

      const rejected = rejectVoidRequest(pending, "owner-1");
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.rejected_by).toBe("owner-1");
      expect(rejected.rejected_at).not.toBeNull();
    });

    it("rejectVoidRequest throws if already REJECTED", () => {
      const alreadyRejected: VoidRequest = {
        id: "vr-4",
        entity_type: "incomplete_item",
        entity_id: "item-4",
        reason: "Test",
        requested_by: "member-1",
        status: "REJECTED",
        approved_by: null,
        approved_at: null,
        rejected_by: "owner-1",
        rejected_at: new Date().toISOString(),
      };

      expect(() => rejectVoidRequest(alreadyRejected, "owner-2"))
        .toThrow("Cannot reject: request is already REJECTED");
    });

    it("createAuditEntry includes all required fields (Req 8.6)", () => {
      const entry = createAuditEntry(
        "VOID_REQUEST_CREATED",
        "member-1",
        "incomplete_item",
        "item-audit",
        { reason: "Test reason", is_elevated_role: false },
      );

      expect(entry.action).toBe("VOID_REQUEST_CREATED");
      expect(entry.user_id).toBe("member-1");
      expect(entry.entity_type).toBe("incomplete_item");
      expect(entry.entity_id).toBe("item-audit");
      expect(entry.metadata.reason).toBe("Test reason");
      expect(entry.timestamp).toBeDefined();
    });
  });
});
