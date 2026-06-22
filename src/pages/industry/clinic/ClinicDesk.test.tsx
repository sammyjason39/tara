import React, { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Component tests for ClinicDesk — Industry Page_Group (task 12.2).
 *
 * Focus areas:
 * - Action feedback: "Sync Records" surfaces a Feedback_Message (toast) and the
 *   control is disabled while the sync is in flight (Requirements 16.3).
 * - Inactive-module unavailable presentation: when the Clinic module is INACTIVE
 *   for the tenant, the page conveys the unavailable state via `ModuleInactiveState`
 *   (data-testid="module-inactive-state") and does NOT render the data workspace /
 *   tables (Requirement 16.4).
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
const session = {
  user_id: "clinic-test-user",
  tenant_id: "tenant-demo",
  location_id: "LOC-HQ",
  role: "SUPERADMIN",
  department_id: "CLINIC",
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
import ClinicDesk from "./ClinicDesk";

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

function renderClinic(): ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClinicDesk />
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

describe("ClinicDesk — inactive-module unavailable presentation", () => {
  // Validates: Requirements 16.4
  it("renders ModuleInactiveState and no data workspace when the module is inactive", async () => {
    mockIsModuleActive.mockReturnValue(false);

    renderClinic();

    const inactive = await screen.findByTestId("module-inactive-state");
    expect(inactive).toBeInTheDocument();
    expect(screen.getByText(/clinic operations is not active/i)).toBeInTheDocument();

    // Data workspace tabs / tables must NOT render while the module is inactive.
    expect(screen.queryByRole("tab", { name: /patients/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /billing/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/patient directory/i)).not.toBeInTheDocument();

    // Inactive gating means the data queries are never fired.
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  // Validates: Requirements 16.4 (the primary action is unavailable while inactive)
  it("disables the Sync Records action while the module is inactive", async () => {
    mockIsModuleActive.mockReturnValue(false);

    renderClinic();

    await screen.findByTestId("module-inactive-state");
    expect(screen.getByRole("button", { name: /sync/i })).toBeDisabled();
  });
});

describe("ClinicDesk — action feedback", () => {
  // Validates: Requirements 16.3
  it("renders the data workspace and surfaces toast feedback after Sync Records", async () => {
    mockIsModuleActive.mockReturnValue(true);

    renderClinic();

    // Active module renders the workspace tabs (not the inactive surface).
    expect(await screen.findByRole("tab", { name: /patients/i })).toBeInTheDocument();
    expect(screen.queryByTestId("module-inactive-state")).not.toBeInTheDocument();

    // Wait for the initial fetch to settle (empty patient directory).
    await screen.findByText(/no patients yet/i);

    fireEvent.click(screen.getByRole("button", { name: /sync/i }));

    // A loading Feedback_Message is shown immediately on action start.
    expect(toast.loading).toHaveBeenCalledTimes(1);

    // On completion, a success Feedback_Message is surfaced.
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  });

  // Validates: Requirements 16.3 (disabled-while-pending)
  it("disables the Sync Records control while the sync is in flight", async () => {
    mockIsModuleActive.mockReturnValue(true);

    renderClinic();
    await screen.findByText(/no patients yet/i);

    // Hold the refetch in a pending state to assert disable-while-pending.
    const pending = deferred<unknown[]>();
    mockApiRequest.mockReturnValue(pending.promise);

    const syncButton = screen.getByRole("button", { name: /sync/i });
    fireEvent.click(syncButton);

    await waitFor(() => expect(syncButton).toBeDisabled());
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();

    // Resolve the in-flight refetch — the control re-enables and reports success.
    pending.resolve([]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(syncButton).toBeEnabled());
  });
});
