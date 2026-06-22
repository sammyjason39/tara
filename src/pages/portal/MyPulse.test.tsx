import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * Component tests for the Portal page MyPulse (task 13.2).
 *
 * MyPulse is stabilized behind `QueryBoundary`: its `loadData` runs a `Promise.all`
 * over peopleService.getEmployee360, loanService.getMyLoans and
 * payrollService.getPerformanceSnapshot, mapping the result onto the loading /
 * populated / error presentations. These tests cover:
 * - Real_Data binding: fetched employee data renders once the load resolves
 *   (Requirement 17.2).
 * - Error_State + retry: a failed load surfaces `error-state`; clicking Retry
 *   re-invokes the services and recovers to the populated view
 *   (Requirements 17.3, 17.4).
 * - Portal action feedback: submitting a loan request disables the control while
 *   pending and emits toast feedback (Requirement 17.4).
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
// A STABLE session reference: MyPulse derives `loadData` via useCallback([session])
// and re-runs its fetch effect when that identity changes. Returning a fresh object
// on every render would churn the effect and detach nodes mid-assertion, so we keep
// a single ref for the whole test run.
const session = {
  user_id: "portal-test-user",
  tenant_id: "tenant-demo",
  location_id: "LOC-HQ",
  role: "STAFF",
  department_id: "OPS",
  permissions: [],
};

vi.mock("@/core/security/session", () => ({
  useSession: () => session,
  ensureTenant: vi.fn(),
}));

vi.mock("@/contexts/AppContext", () => ({
  useApp: () => ({ state: {} }),
}));

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast, dismiss: vi.fn(), toasts: [] }),
}));

const { mockGetEmployee360 } = vi.hoisted(() => ({
  mockGetEmployee360: vi.fn(),
}));
vi.mock("@/core/services/hr/peopleService", () => ({
  peopleService: { getEmployee360: mockGetEmployee360 },
}));

const { mockGetMyLoans, mockRequestLoan } = vi.hoisted(() => ({
  mockGetMyLoans: vi.fn(),
  mockRequestLoan: vi.fn(),
}));
vi.mock("@/core/services/finance/loanService", () => ({
  loanService: { getMyLoans: mockGetMyLoans, requestLoan: mockRequestLoan },
}));

const { mockGetPerformanceSnapshot } = vi.hoisted(() => ({
  mockGetPerformanceSnapshot: vi.fn(),
}));
vi.mock("@/core/services/hr/payrollService", () => ({
  payrollService: { getPerformanceSnapshot: mockGetPerformanceSnapshot },
}));

const { mockClockIn, mockValidateAccess } = vi.hoisted(() => ({
  mockClockIn: vi.fn(),
  mockValidateAccess: vi.fn(),
}));
vi.mock("@/core/services/hr/attendanceService", () => ({
  attendanceService: { clockIn: mockClockIn, validateAccess: mockValidateAccess },
}));

vi.mock("@/core/services/hr/leaveService", () => ({
  leaveService: {},
}));

import MyPulse from "./MyPulse";

const EMPLOYEE_RECORD = {
  employee: {
    fullName: "Ada Lovelace",
    roleTitle: "Operations Analyst",
    departmentId: "OPS",
    locationId: "HQ_ZONE_A",
    baseSalary: 5000,
    currency: "USD",
  },
  attendance: [],
};

const PERF_SNAPSHOT = {
  accruedBonus: 200,
  estimatedTax: 100,
  competencies: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetEmployee360.mockResolvedValue(EMPLOYEE_RECORD);
  mockGetMyLoans.mockResolvedValue([]);
  mockGetPerformanceSnapshot.mockResolvedValue(PERF_SNAPSHOT);
  mockRequestLoan.mockResolvedValue({ id: "loan-1" });
});

describe("MyPulse — Portal async states", () => {
  // Validates: Requirements 17.2 (Real_Data binding once the load resolves)
  it("renders fetched employee data once the load resolves", async () => {
    // Full shell renders the employee header (fullName/roleTitle), which is the
    // clearest Real_Data binding surfaced by the populated view.
    render(<MyPulse />);

    // The employee profile fields render only after the Promise.all settles.
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText(/Operations Analyst/)).toBeInTheDocument();

    // All three portal services participated in the load.
    expect(mockGetEmployee360).toHaveBeenCalledTimes(1);
    expect(mockGetMyLoans).toHaveBeenCalledTimes(1);
    expect(mockGetPerformanceSnapshot).toHaveBeenCalledTimes(1);
  });

  // Validates: Requirements 17.3, 17.4 (Error_State + retry re-invokes the services)
  it("renders the Error_State on a failed load and retry re-invokes the services", async () => {
    mockGetEmployee360.mockRejectedValueOnce(new Error("portal sync failure"));

    render(<MyPulse />);

    // Failure surfaces the shared error-state with a retry control.
    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
    expect(mockGetEmployee360).toHaveBeenCalledTimes(1);

    // Recovery path resolves successfully.
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    // Retry re-invoked the data load and recovered to the populated view.
    await waitFor(() => expect(mockGetEmployee360).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
  });
});

describe("MyPulse — Portal action feedback", () => {
  // Validates: Requirements 17.4 (action disables control while pending + toast feedback)
  it("disables the loan submit control while pending and emits toast feedback on success", async () => {
    // Hold the loan request pending so we can observe the disabled state.
    let resolveLoan: (value: { id: string }) => void = () => {};
    mockRequestLoan.mockReturnValue(
      new Promise<{ id: string }>((resolve) => {
        resolveLoan = resolve;
      }),
    );

    // Full shell renders the action dialogs (loan request lives outside noShell view).
    render(<MyPulse />);

    // Wait for data so the action controls are mounted.
    await screen.findByText("Ada Lovelace");

    // Open the loan request dialog.
    fireEvent.click(screen.getByRole("button", { name: /loan request/i }));

    // Fill required fields (amount + reason) to enable the submit control.
    const amountInput = await screen.findByPlaceholderText("0.00");
    const reasonInput = screen.getByPlaceholderText(/state the purpose/i);

    fireEvent.change(amountInput, { target: { value: "1000" } });
    fireEvent.change(reasonInput, { target: { value: "Medical expenses" } });

    const submit = screen.getByRole("button", { name: /transmit request/i });
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);

    // While the request is pending the control is disabled.
    await waitFor(() => expect(submit).toBeDisabled());
    expect(mockRequestLoan).toHaveBeenCalledTimes(1);

    // Settle the request: success emits toast feedback.
    resolveLoan({ id: "loan-1" });

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/loan request/i) }),
      ),
    );
  });
});
