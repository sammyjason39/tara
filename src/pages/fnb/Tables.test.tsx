import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Table } from "@/lib/mock-data";

// ── Mocks ──────────────────────────────────────────────────────────────────
const { mockToast, tablesRef } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  tablesRef: { current: [] as Table[] },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast, toasts: [], dismiss: vi.fn() }),
}));

// Override mockTables with a mutable ref so each test controls the dataset,
// while keeping every other export (mockCafeProducts, types) intact.
vi.mock("@/lib/mock-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mock-data")>();
  return {
    ...actual,
    get mockTables() {
      return tablesRef.current;
    },
  };
});

// The order/billing surfaces are exercised separately; stub them with simple
// controls that drive the parent callbacks deterministically.
vi.mock("@/components/pos-cafe/OrderPad", () => ({
  OrderPad: ({ onComplete }: { onComplete: (items: unknown[]) => void }) => (
    <button
      onClick={() =>
        onComplete([
          { product: { id: "c1", name: "Espresso", price: 2.5, category: "Hot Drinks" }, quantity: 1, modifiers: [] },
        ])
      }
    >
      stub-send-to-kitchen
    </button>
  ),
}));

vi.mock("@/components/pos-cafe/TableBilling", () => ({
  TableBilling: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={() => onComplete()}>stub-settle-bill</button>
  ),
}));

import CafeTables from "./Tables";

const occupiedTable: Table = {
  id: "t-occ",
  number: 9,
  capacity: 4,
  status: "occupied",
  occupiedSince: new Date(Date.now() - 10 * 60000).toISOString(),
  currentOrder: {
    items: [{ productId: "c1", name: "Espresso", quantity: 1, price: 2.5 }],
    total: 2.5,
  },
  position: { x: 0, y: 0 },
};

const availableTable: Table = {
  id: "t-avail",
  number: 4,
  capacity: 2,
  status: "available",
  position: { x: 1, y: 0 },
};

describe("F&B Tables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tablesRef.current = [];
  });

  // Validates: Requirements 15.4 (Empty_State on zero records)
  it("renders an Empty_State when no tables are configured", () => {
    tablesRef.current = [];
    render(<CafeTables />);

    expect(screen.getByText(/no tables configured/i)).toBeInTheDocument();
  });

  // Validates: Requirements 15.2 (action feedback)
  it("surfaces a Feedback_Message when an order is sent to the kitchen", async () => {
    tablesRef.current = [availableTable];
    render(<CafeTables />);

    // Tapping an available table opens the order pad (stubbed) directly.
    fireEvent.click(screen.getByRole("button", { name: /^4/ }));

    const send = await screen.findByRole("button", { name: /stub-send-to-kitchen/i });
    fireEvent.click(send);

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    const call = mockToast.mock.calls.at(-1)?.[0];
    expect(call.title).toMatch(/order sent to kitchen/i);
  });

  // Validates: Requirements 15.2 (action feedback)
  it("surfaces a Feedback_Message when an occupied table bill is settled", async () => {
    tablesRef.current = [occupiedTable];
    render(<CafeTables />);

    // Tapping an occupied table opens the action dialog with a Bill control.
    fireEvent.click(screen.getByRole("button", { name: /^9/ }));

    const billBtn = await screen.findByRole("button", { name: /^bill$/i });
    fireEvent.click(billBtn);

    const settle = await screen.findByRole("button", { name: /stub-settle-bill/i });
    fireEvent.click(settle);

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    const call = mockToast.mock.calls.at(-1)?.[0];
    expect(call.title).toMatch(/payment complete/i);
  });
});
