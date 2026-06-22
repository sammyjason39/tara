import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Component tests for FarmDesk — Industry Page_Group (task 12.2).
 *
 * Focus areas:
 * - Action feedback: "Log Activity" surfaces a Feedback_Message (toast) on success
 *   and the control is disabled while the mutation is pending (Requirements 16.3).
 * - Inactive-module unavailable presentation: when the Farming module is INACTIVE
 *   for the tenant, the page renders `ModuleInactiveState`
 *   (data-testid="module-inactive-state") and does NOT render the data workspace /
 *   tables (Requirement 16.4).
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
const session = {
  user_id: "farm-test-user",
  tenant_id: "tenant-demo",
  location_id: "LOC-FARM",
  role: "SUPERADMIN",
  department_id: "FARMING",
  permissions: [],
};

vi.mock("@/core/security/session", () => ({
  useSession: () => session,
  ensureTenant: vi.fn(),
}));

const { mockApiRequest, mockIsModuleActive, moduleState } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
  mockIsModuleActive: vi.fn(),
  moduleState: { loading: false },
}));

vi.mock("@/core/api/apiClient", () => ({
  apiRequest: mockApiRequest,
  ApiError: class ApiError extends Error {},
}));

vi.mock("@/hooks/useModuleActivation", () => ({
  useModuleActivation: () => ({
    isModuleActive: mockIsModuleActive,
    loading: moduleState.loading,
    refresh: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";
import FarmDesk from "./FarmDesk";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderFarm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FarmDesk />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  moduleState.loading = false;
  mockApiRequest.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FarmDesk — inactive-module unavailable presentation", () => {
  // Validates: Requirements 16.4
  it("renders ModuleInactiveState and no data workspace when the module is inactive", async () => {
    mockIsModuleActive.mockReturnValue(false);

    renderFarm();

    const inactive = await screen.findByTestId("module-inactive-state");
    expect(inactive).toBeInTheDocument();
    expect(screen.getByText(/farm & livestock is not active/i)).toBeInTheDocument();

    // Data workspace tabs / tables must NOT render while the module is inactive.
    expect(screen.queryByRole("tab", { name: /livestock/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /iot sensors/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/livestock inventory/i)).not.toBeInTheDocument();

    // Inactive gating means the data queries are never fired.
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  // Validates: Requirements 16.4 (the primary action is unavailable while inactive)
  it("disables the Log Activity action while the module is inactive", async () => {
    mockIsModuleActive.mockReturnValue(false);

    renderFarm();

    await screen.findByTestId("module-inactive-state");
    expect(screen.getByRole("button", { name: /log activity/i })).toBeDisabled();
  });
});

describe("FarmDesk — action feedback", () => {
  // Validates: Requirements 16.3
  it("renders the data workspace and surfaces success toast feedback after Log Activity", async () => {
    mockIsModuleActive.mockReturnValue(true);

    renderFarm();

    // Active module renders the workspace tabs (not the inactive surface).
    expect(await screen.findByRole("tab", { name: /livestock/i })).toBeInTheDocument();
    expect(screen.queryByTestId("module-inactive-state")).not.toBeInTheDocument();

    // Wait for the initial fetch to settle (empty livestock inventory).
    await screen.findByRole("heading", { name: /no livestock records/i });

    fireEvent.click(screen.getByRole("button", { name: /log activity/i }));

    // The activity-log mutation fires and a success Feedback_Message is surfaced.
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/farming/activity-log",
        "POST",
        session,
        expect.objectContaining({ type: "manual" }),
      ),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  });

  // Validates: Requirements 16.3 (disabled-while-pending)
  it("disables the Log Activity control while the mutation is pending", async () => {
    mockIsModuleActive.mockReturnValue(true);

    renderFarm();
    await screen.findByRole("heading", { name: /no livestock records/i });

    // Hold the mutation in a pending state to assert disable-while-pending.
    // The mutation's onSuccess refetches livestock through the same client, so
    // resolve with a valid array to keep the data table consistent.
    const pending = deferred<unknown[]>();
    mockApiRequest.mockReturnValue(pending.promise);

    const logButton = screen.getByRole("button", { name: /log activity/i });
    fireEvent.click(logButton);

    await waitFor(() => expect(logButton).toBeDisabled());
    expect(screen.getByText(/logging/i)).toBeInTheDocument();

    // Resolve the in-flight mutation — success feedback fires and control re-enables.
    pending.resolve([]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(logButton).toBeEnabled());
  });
});
