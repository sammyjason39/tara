import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { SystemHealth } from "@/core/services/it/itService";

/**
 * Component tests for a representative QueryBoundary-driven Core page (task 8.5).
 *
 * ITDashboard wires its infrastructure-health panel through `QueryBoundary`, so it is a
 * good proxy for verifying the Async_State behaviour every Core data view shares:
 * - populated render when data is present (Requirement 4.2),
 * - Empty_State on zero records (Requirement 4.3),
 * - Error_State with a retry control on failure, and the retry re-invokes the fetch
 *   (Requirements 4.4, 4.7),
 * - loading → populated transition (the view is never blank, Requirement 4.1).
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
// A STABLE session reference: ITDashboard derives `loadData` via useCallback([session])
// and re-runs its fetch effect when that identity changes. Returning a fresh object on
// every render would churn the effect and detach nodes mid-assertion, so we keep one ref.
const session = {
  user_id: "it-test-user",
  tenant_id: "tenant-demo",
  location_id: "LOC-HQ",
  role: "SUPERADMIN",
  department_id: "IT",
  permissions: [],
};

vi.mock("@/core/security/session", () => ({
  useSession: () => session,
  ensureTenant: vi.fn(),
}));

const { mockGetOverview, mockGetSystemHealth } = vi.hoisted(() => ({
  mockGetOverview: vi.fn(),
  mockGetSystemHealth: vi.fn(),
}));

vi.mock("@/core/services/it/itService", () => ({
  itService: {
    getOverview: mockGetOverview,
    getSystemHealth: mockGetSystemHealth,
  },
}));

import ITDashboard from "./ITDashboard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

const HEALTH: SystemHealth[] = [
  {
    id: "svc-1",
    tenantId: "tenant-demo",
    component: "Primary Database",
    status: "OPERATIONAL",
    latencyMs: 12,
    checkedAt: "2026-01-01T00:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOverview.mockResolvedValue({ healthScore: 99, activeNodes: 8 });
  mockGetSystemHealth.mockResolvedValue(HEALTH);
});

describe("ITDashboard — async states", () => {
  // Validates: Requirements 4.1, 4.2 (loading → populated; never blank)
  it("renders the populated infrastructure data once the fetch resolves", async () => {
    let resolveHealth: (value: SystemHealth[]) => void = () => {};
    mockGetSystemHealth.mockReturnValue(
      new Promise<SystemHealth[]>((resolve) => {
        resolveHealth = resolve;
      }),
    );

    renderWithProviders(<ITDashboard />);

    // While the request is in flight the populated content is not yet shown.
    expect(screen.queryByText("Primary Database")).not.toBeInTheDocument();

    resolveHealth(HEALTH);

    expect(await screen.findByText("Primary Database")).toBeInTheDocument();
  });

  // Validates: Requirements 4.3 (Empty_State on zero records)
  it("renders the Empty_State when no telemetry is reported", async () => {
    mockGetSystemHealth.mockResolvedValue([]);

    renderWithProviders(<ITDashboard />);

    expect(await screen.findByText(/no service telemetry/i)).toBeInTheDocument();
  });

  // Validates: Requirements 4.4, 4.7 (Error_State + retry re-invokes refetch)
  it("renders the Error_State on failure and retry re-invokes the fetch", async () => {
    mockGetSystemHealth.mockRejectedValueOnce(new Error("boom"));

    renderWithProviders(<ITDashboard />);

    const errorState = await screen.findByTestId("error-state");
    expect(errorState).toBeInTheDocument();

    // The failure path fetched once; the recovery path should succeed.
    expect(mockGetSystemHealth).toHaveBeenCalledTimes(1);
    mockGetSystemHealth.mockResolvedValue(HEALTH);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    // Retry re-invoked the data fetch and recovered to the populated state.
    await waitFor(() => expect(mockGetSystemHealth).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Primary Database")).toBeInTheDocument();
  });
});
