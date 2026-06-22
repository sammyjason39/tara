import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────
// Capture toast invocations so we can assert Feedback_Message behavior.
const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast, toasts: [], dismiss: vi.fn() }),
}));

// Cashier reads the current user from AppContext; provide an inert session.
vi.mock("@/contexts/AppContext", () => ({
  useApp: () => ({ state: { currentUser: { id: "u1", name: "Barista", role: "cashier" } } }),
}));

import CafeCashier from "./Cashier";

describe("F&B Cashier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Validates: Requirements 15.2 (action feedback)
  it("surfaces a Feedback_Message when a menu item is added to the order", async () => {
    render(<CafeCashier />);

    // "Americano" is in a category with no modifiers, so a tap adds it directly.
    fireEvent.click(screen.getByText("Americano"));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    const call = mockToast.mock.calls[0][0];
    expect(call.title).toMatch(/item added/i);
    expect(call.description).toMatch(/americano/i);
  });

  // Validates: Requirements 15.2 (checkout completion feedback)
  it("surfaces a payment Feedback_Message after completing a cash transaction", async () => {
    render(<CafeCashier />);

    // Add an item, open checkout, then complete payment with sufficient cash.
    fireEvent.click(screen.getByText("Americano"));
    mockToast.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /checkout/i }));

    const cashInput = await screen.findByPlaceholderText("0.00");
    fireEvent.change(cashInput, { target: { value: "100" } });

    const payButton = await screen.findByRole("button", { name: /^pay/i });
    fireEvent.click(payButton);

    await waitFor(
      () => {
        expect(mockToast).toHaveBeenCalled();
        const call = mockToast.mock.calls.at(-1)?.[0];
        expect(call.title).toMatch(/order complete/i);
      },
      { timeout: 3000 },
    );
  });

  // Validates: Requirements 15.4 (Empty_State on zero records)
  it("renders an Empty_State when the search matches no menu items", () => {
    render(<CafeCashier />);

    fireEvent.change(screen.getByPlaceholderText(/search menu items/i), {
      target: { value: "zzz-nonexistent-item" },
    });

    expect(screen.getByText(/no menu items found/i)).toBeInTheDocument();
  });
});
