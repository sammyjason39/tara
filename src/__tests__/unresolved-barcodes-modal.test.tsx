/**
 * Component Tests: UnresolvedBarcodesModal
 *
 * Task 9.1 — stock-opname-parity spec
 * **Requirements: 1.1, 1.2, 3.1, 3.4**
 *
 * Tests:
 * - Quick Register creates items correctly (Req 1.1, 1.2)
 * - Modal close restores page interactivity (Req 3.1, 3.4)
 * - Toggle select all works (Req 1.1)
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSession = {
  tenant_id: "test-tenant",
  user_id: "test-user",
  role: "admin",
  first_name: "Test",
  last_name: "User",
};

vi.mock("@/core/security/session", () => ({
  useSession: () => mockSession,
}));

const mockBatchCreateItemsJson = vi.fn();
vi.mock("@/core/services/retail/retailService", () => ({
  retailService: {
    batchCreateItemsJson: (...args: any[]) => mockBatchCreateItemsJson(...args),
  },
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/components/shared/ItemCreationTab", () => ({
  ItemCreationTab: ({ onSuccess }: { onSuccess: (items: any[]) => void }) =>
    React.createElement(
      "div",
      { "data-testid": "item-creation-tab" },
      React.createElement(
        "button",
        {
          "data-testid": "item-creation-success",
          onClick: () => onSuccess([{ id: "created-1", barcode: "BC1" }]),
        },
        "Submit"
      )
    ),
}));

vi.mock("@/lib/quick-register", () => ({
  ANOMALY_CATEGORY_NAME: "Anomaly",
  buildQuickRegisterPayload: (barcodes: string[]) =>
    barcodes.map((b) => ({
      barcode: b,
      sku: b,
      name: `Unregistered Item - ${b}`,
      category: "Anomaly",
      is_anomaly: true,
      status: "incomplete",
      base_price: 0,
      uom: "pcs",
      active: false,
      type: "ITEM",
    })),
  resolveQuickRegisterResponse: (barcodes: string[], created: any[]) =>
    barcodes.map((b, i) => ({
      barcode: b,
      is_anomaly: true,
      status: "incomplete",
      ...(created[i] || {}),
    })),
}));

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import { UnresolvedBarcodesModal } from "@/components/shared/UnresolvedBarcodesModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderModal(
  props: Partial<React.ComponentProps<typeof UnresolvedBarcodesModal>> = {}
) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    unresolvedBarcodes: ["BC001", "BC002", "BC003"],
    onFlagAnomalies: vi.fn(),
    onItemsRegistered: vi.fn(),
    categoryOptions: [{ id: "cat-1", name: "General" }],
  };
  const merged = { ...defaultProps, ...props };
  return { ...render(React.createElement(UnresolvedBarcodesModal, merged)), props: merged };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.style.pointerEvents = "auto";
  mockToast.mockClear();
  mockBatchCreateItemsJson.mockReset();
  mockBatchCreateItemsJson.mockResolvedValue({
    success: true,
    data: [],
  });
});

afterEach(() => {
  cleanup();
  document.body.style.pointerEvents = "auto";
});

// ---------------------------------------------------------------------------
// Test: Quick Register creates items correctly (Req 1.1, 1.2)
// ---------------------------------------------------------------------------

describe("UnresolvedBarcodesModal - Quick Register creates items correctly", () => {
  test("clicking Quick Register calls batchCreateItemsJson with anomaly payload", async () => {
    const onItemsRegistered = vi.fn();
    renderModal({ onItemsRegistered, unresolvedBarcodes: ["BC001", "BC002"] });

    const quickRegBtn = screen.getByRole("button", { name: /Quick Register/i });
    await act(async () => {
      fireEvent.click(quickRegBtn);
    });

    await waitFor(() => {
      expect(mockBatchCreateItemsJson).toHaveBeenCalledTimes(1);
    });

    // Verify payload structure: items have anomaly category and flag
    const [tenantId, session, payload] = mockBatchCreateItemsJson.mock.calls[0];
    expect(tenantId).toBe("test-tenant");
    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({
      barcode: "BC001",
      category: "Anomaly",
      is_anomaly: true,
      status: "incomplete",
    });
    expect(payload[1]).toMatchObject({
      barcode: "BC002",
      category: "Anomaly",
      is_anomaly: true,
      status: "incomplete",
    });
  });

  test("Quick Register success calls onItemsRegistered with resolved items", async () => {
    const onItemsRegistered = vi.fn();
    mockBatchCreateItemsJson.mockResolvedValue({
      success: true,
      data: [
        { id: "item-1", barcode: "BC001" },
        { id: "item-2", barcode: "BC002" },
      ],
    });

    renderModal({
      onItemsRegistered,
      unresolvedBarcodes: ["BC001", "BC002"],
    });

    const quickRegBtn = screen.getByRole("button", { name: /Quick Register/i });
    await act(async () => {
      fireEvent.click(quickRegBtn);
    });

    await waitFor(() => {
      expect(onItemsRegistered).toHaveBeenCalledTimes(1);
    });

    // Resolved items should have anomaly flag and status
    const resolvedItems = onItemsRegistered.mock.calls[0][0];
    expect(resolvedItems).toHaveLength(2);
    expect(resolvedItems[0]).toMatchObject({
      barcode: "BC001",
      is_anomaly: true,
      status: "incomplete",
    });
    expect(resolvedItems[1]).toMatchObject({
      barcode: "BC002",
      is_anomaly: true,
      status: "incomplete",
    });
  });

  test("Quick Register success shows toast with anomaly category info", async () => {
    renderModal({ unresolvedBarcodes: ["BC001"] });

    const quickRegBtn = screen.getByRole("button", { name: /Quick Register/i });
    await act(async () => {
      fireEvent.click(quickRegBtn);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Items Registered as Anomalies",
          description: expect.stringContaining("Anomaly"),
        })
      );
    });
  });

  test("Quick Register failure shows error toast and keeps barcodes unresolved", async () => {
    mockBatchCreateItemsJson.mockResolvedValue({ success: false });
    const onItemsRegistered = vi.fn();
    const onClose = vi.fn();

    renderModal({
      onItemsRegistered,
      onClose,
      unresolvedBarcodes: ["BC001", "BC002"],
    });

    const quickRegBtn = screen.getByRole("button", { name: /Quick Register/i });
    await act(async () => {
      fireEvent.click(quickRegBtn);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Registration Failed",
          variant: "destructive",
        })
      );
    });

    // Items should NOT have been registered, modal should NOT close
    expect(onItemsRegistered).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("Quick Register with exception shows error toast and keeps barcodes", async () => {
    mockBatchCreateItemsJson.mockRejectedValue(new Error("Network error"));
    const onItemsRegistered = vi.fn();
    const onClose = vi.fn();

    renderModal({
      onItemsRegistered,
      onClose,
      unresolvedBarcodes: ["BC001"],
    });

    const quickRegBtn = screen.getByRole("button", { name: /Quick Register/i });
    await act(async () => {
      fireEvent.click(quickRegBtn);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Registration Failed",
          variant: "destructive",
        })
      );
    });

    expect(onItemsRegistered).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Test: Modal close restores page interactivity (Req 3.1, 3.4)
// ---------------------------------------------------------------------------

describe("UnresolvedBarcodesModal - Modal close restores page interactivity", () => {
  test("closing modal via close button resets pointer-events to auto", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    const closeBtn = screen.getByRole("button", { name: /close/i });
    await act(async () => {
      fireEvent.click(closeBtn);
    });

    expect(onClose).toHaveBeenCalled();
    const pe = document.body.style.pointerEvents;
    expect(pe === "" || pe === "auto").toBe(true);
  });

  test("unmounting modal resets pointer-events even if body was locked", () => {
    const { unmount } = renderModal();

    // Simulate buggy locked state
    document.body.style.pointerEvents = "none";

    unmount();

    const pe = document.body.style.pointerEvents;
    expect(pe === "" || pe === "auto").toBe(true);
  });

  test("Quick Register success that closes modal resets pointer-events", async () => {
    const onClose = vi.fn();
    renderModal({ onClose, unresolvedBarcodes: ["BC001"] });

    // Simulate pointer-events being set to none (as Radix might do)
    document.body.style.pointerEvents = "none";

    const quickRegBtn = screen.getByRole("button", { name: /Quick Register/i });
    await act(async () => {
      fireEvent.click(quickRegBtn);
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    const pe = document.body.style.pointerEvents;
    expect(pe === "" || pe === "auto").toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Toggle select all works (Req 1.1)
// ---------------------------------------------------------------------------

describe("UnresolvedBarcodesModal - Toggle select all works", () => {
  test("all barcodes are pre-selected when modal opens", () => {
    renderModal({ unresolvedBarcodes: ["BC001", "BC002", "BC003"] });

    // The counter should show all 3 selected
    expect(screen.getByText("3 Selected")).toBeInTheDocument();
  });

  test("clicking toggle select all deselects all when all are selected", async () => {
    renderModal({ unresolvedBarcodes: ["BC001", "BC002", "BC003"] });

    // Initially all are selected
    expect(screen.getByText("3 Selected")).toBeInTheDocument();

    // Click the toggle select all button (CheckSquare icon button)
    const toggleBtn = screen.getByText("3 Selected").parentElement!.querySelector("button")!;
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    // Now none should be selected
    expect(screen.getByText("0 Selected")).toBeInTheDocument();
  });

  test("clicking toggle select all selects all when none are selected", async () => {
    renderModal({ unresolvedBarcodes: ["BC001", "BC002", "BC003"] });

    // First deselect all
    const toggleBtn = screen.getByText("3 Selected").parentElement!.querySelector("button")!;
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByText("0 Selected")).toBeInTheDocument();

    // Now select all again
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByText("3 Selected")).toBeInTheDocument();
  });

  test("clicking toggle select all selects all when some are selected", async () => {
    renderModal({ unresolvedBarcodes: ["BC001", "BC002", "BC003"] });

    // Start with all selected (3), then click one barcode to deselect it
    const barcodeItem = screen.getByText("BC001");
    await act(async () => {
      fireEvent.click(barcodeItem);
    });

    // Now 2 should be selected
    expect(screen.getByText("2 Selected")).toBeInTheDocument();

    // Click toggle select all - should select all since not all are selected
    const toggleBtn = screen.getByText("2 Selected").parentElement!.querySelector("button")!;
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByText("3 Selected")).toBeInTheDocument();
  });

  test("Quick Register button is disabled when no barcodes are selected", async () => {
    renderModal({ unresolvedBarcodes: ["BC001", "BC002"] });

    // Deselect all
    const toggleBtn = screen.getByText("2 Selected").parentElement!.querySelector("button")!;
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    const quickRegBtn = screen.getByRole("button", { name: /Quick Register/i });
    expect(quickRegBtn).toBeDisabled();
  });
});
