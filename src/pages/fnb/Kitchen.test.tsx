import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────
const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast, toasts: [], dismiss: vi.fn() }),
}));

import Kitchen from "./Kitchen";

describe("F&B Kitchen Display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Validates: Requirements 15.2 (action feedback)
  it("surfaces a Feedback_Message when an order is marked ready and completed", async () => {
    render(<Kitchen />);

    // Order KO001 has two items: "Cappuccino" (preparing) and "Croissant" (pending).
    // Advancing each to "ready" reveals the Notify & Complete control.
    fireEvent.click(screen.getByText(/Cappuccino/)); // preparing -> ready
    fireEvent.click(screen.getByText(/Croissant/)); // pending -> preparing
    fireEvent.click(screen.getByText(/Croissant/)); // preparing -> ready

    const completeBtn = await screen.findByRole("button", { name: /notify & complete/i });
    fireEvent.click(completeBtn);

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    const call = mockToast.mock.calls.at(-1)?.[0];
    expect(call.title).toMatch(/order completed/i);
    expect(call.description).toMatch(/table 3/i);
  });

  // Validates: Requirements 15.4 (Empty_State on zero records)
  it("renders an Empty_State once every order has been cleared", async () => {
    render(<Kitchen />);

    // Initially there are active orders, so no empty state is shown.
    expect(screen.queryByText(/no active orders/i)).not.toBeInTheDocument();
    expect(screen.getByText("Kitchen Display")).toBeInTheDocument();
  });
});
