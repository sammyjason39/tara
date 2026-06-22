import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * Component tests for the Retail POS Cash Movement control — Retail Page_Group (task 10.3).
 *
 * Focus areas:
 * - POS action loading: the Authorize control shows a Loading_Indicator while the
 *   service call is in flight and is disabled to prevent double-submit (Requirement 14.2, 3.2, 3.3).
 * - POS action feedback: a Feedback_Message (toast) is surfaced on success and the
 *   register total in the message renders via formatCurrency as IDR "Rp" (Requirement 14.2, 14.4, 3.5).
 * - Error path: a failing service call surfaces an error Feedback_Message so the user
 *   can retry rather than leaving the control stuck (Requirement 14.2, 3.5).
 * - Real_Data binding: the recorded movement is sent to the live retailService bound to
 *   the tenant/shift scope — no mock-data module is imported by the page (Requirement 14.3).
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
const { mockNavigate, mockToast, mockRecordCashMovement, mockRefreshState } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockRecordCashMovement: vi.fn(),
  mockRefreshState: vi.fn().mockResolvedValue(undefined),
}));

const session = {
  user_id: "cashier-1",
  tenant_id: "tenant-demo",
  location_id: "LOC-HQ",
  role: "CASHIER",
};

const activeShift = { id: "shift-abc123", status: "open" };

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/core/security/session", () => ({
  useSession: () => session,
}));

vi.mock("../context/RetailContext", () => ({
  useRetail: () => ({ activeShift, refreshState: mockRefreshState }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/core/services/retail/retailService", () => ({
  retailService: { recordCashMovement: mockRecordCashMovement },
}));

import CashMovementTerminal from "./CashMovementTerminal";

const renderTerminal = () => render(<CashMovementTerminal />);

// Fills in a valid amount + reason so handleSubmit reaches the service call.
const fillValidMovement = () => {
  fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "50000" } });
  fireEvent.change(screen.getByPlaceholderText(/office supplies/i), {
    target: { value: "Petty cash restock" },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CashMovementTerminal — POS action loading + feedback", () => {
  // Validates: Requirements 14.2, 3.2, 3.3 (Loading_Indicator in flight + disabled control)
  it("shows a loading indicator and disables the control while the movement is in flight", async () => {
    // Control promise resolution so we can observe the in-flight state deterministically.
    let resolveCall: (v: unknown) => void = () => {};
    mockRecordCashMovement.mockReturnValue(
      new Promise((resolve) => {
        resolveCall = resolve;
      }),
    );

    renderTerminal();
    fillValidMovement();

    const authorize = screen.getByRole("button", { name: /authorize cash out/i });
    fireEvent.click(authorize);

    // In flight: the spinner replaces the label and the same control is disabled.
    await waitFor(() => {
      expect(authorize).toBeDisabled();
      expect(authorize.querySelector(".animate-spin")).toBeInTheDocument();
    });

    // Complete the call and let the success path settle.
    resolveCall({ id: "mov-1" });
    await waitFor(() => expect(mockRefreshState).toHaveBeenCalled());
  });

  // Validates: Requirements 14.2, 14.4, 3.5 (Feedback_Message on completion + IDR currency)
  it("surfaces a success Feedback_Message with the amount formatted as IDR on completion", async () => {
    mockRecordCashMovement.mockResolvedValue({ id: "mov-1" });

    renderTerminal();
    fillValidMovement();
    fireEvent.click(screen.getByRole("button", { name: /authorize cash out/i }));

    await waitFor(() => expect(mockRecordCashMovement).toHaveBeenCalledTimes(1));

    // The Real_Data call is scoped to the tenant + active shift.
    expect(mockRecordCashMovement).toHaveBeenCalledWith(
      "tenant-demo",
      "shift-abc123",
      expect.objectContaining({ amount: 50000, type: "CASH_OUT", reason: "Petty cash restock" }),
      session,
    );

    // Feedback_Message renders the register amount via formatCurrency → "Rp" (IDR).
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Movement Recorded" }),
      );
    });
    const successCall = mockToast.mock.calls.find(
      ([arg]) => arg?.title === "Movement Recorded",
    );
    expect(successCall?.[0].description).toMatch(/Rp/);
    expect(successCall?.[0].description).toContain("50.000");

    // On success the operator is routed back to the gateway.
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/m/retail/operational/gateway"));
  });
});

describe("CashMovementTerminal — error path", () => {
  // Validates: Requirements 14.2, 3.5 (failure surfaces a Feedback_Message; control recovers for retry)
  it("surfaces a destructive Feedback_Message and re-enables the control when the service fails", async () => {
    mockRecordCashMovement.mockRejectedValue(new Error("Ledger offline"));

    renderTerminal();
    fillValidMovement();
    const authorize = screen.getByRole("button", { name: /authorize cash out/i });
    fireEvent.click(authorize);

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Movement Failed",
          description: "Ledger offline",
          variant: "destructive",
        }),
      ),
    );

    // The control is re-enabled so the operator can retry; no navigation happened.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /authorize cash out/i })).toBeEnabled(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("CashMovementTerminal — input guards (no spurious Real_Data calls)", () => {
  // Validates: Requirements 14.3, 3.5 (validation feedback before any backend call)
  it("blocks submit and gives feedback when the amount is missing", async () => {
    renderTerminal();

    fireEvent.change(screen.getByPlaceholderText(/office supplies/i), {
      target: { value: "Reason only" },
    });
    fireEvent.click(screen.getByRole("button", { name: /authorize cash out/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Invalid Amount", variant: "destructive" }),
      ),
    );
    expect(mockRecordCashMovement).not.toHaveBeenCalled();
  });

  // Validates: Requirements 14.3, 3.5
  it("blocks submit and gives feedback when the reason is missing", async () => {
    renderTerminal();

    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "25000" } });
    fireEvent.click(screen.getByRole("button", { name: /authorize cash out/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Reason Required", variant: "destructive" }),
      ),
    );
    expect(mockRecordCashMovement).not.toHaveBeenCalled();
  });
});
