/**
 * Unit tests for AnomalyBrowser component
 *
 * Validates: Requirements 2.3, 2.5
 *   - List items where is_anomaly: true
 *   - Filter by category = "Anomaly"
 *   - Show incomplete status indicators
 *   - Include action to edit and complete item details
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AnomalyBrowser,
  AnomalyBrowserProps,
  getIncompleteFields,
} from "@/pages/retail/management/components/inventory/AnomalyBrowser";
import { InventoryItemView } from "@/pages/retail/management/components/inventory/types";

// ─── Test Fixtures ──────────────────────────────────────────────

function makeAnomalyItem(overrides: Partial<InventoryItemView> = {}): InventoryItemView {
  return {
    id: "item-1",
    sku: "SKU-001",
    name: "Unregistered Item - 123456",
    category: "Anomaly",
    categoryId: "cat-anomaly",
    onHand: 5,
    reserved: 0,
    available: 5,
    minBuffer: 0,
    status: "ok",
    barcode: "123456",
    price: 0,
    ...overrides,
  };
}

function makeCompletedAnomalyItem(overrides: Partial<InventoryItemView> = {}): InventoryItemView {
  return {
    id: "item-2",
    sku: "SKU-002",
    name: "Leather Wallet",
    category: "Anomaly",
    categoryId: "cat-anomaly",
    onHand: 3,
    reserved: 0,
    available: 3,
    minBuffer: 0,
    status: "ok",
    barcode: "789012",
    price: 150000,
    ...overrides,
  };
}

function renderBrowser(props: Partial<AnomalyBrowserProps> = {}) {
  const defaultProps: AnomalyBrowserProps = {
    items: [],
    isLoading: false,
    onComplete: vi.fn(),
    onRefresh: vi.fn(),
    ...props,
  };
  return render(<AnomalyBrowser {...defaultProps} />);
}

// ─── getIncompleteFields Tests ──────────────────────────────────

describe("getIncompleteFields", () => {
  it("marks item as incomplete when name starts with 'Unregistered Item'", () => {
    const item = makeAnomalyItem({ name: "Unregistered Item - ABC123" });
    const result = getIncompleteFields(item);
    expect(result.isIncomplete).toBe(true);
    expect(result.missingFields).toContain("Name");
  });

  it("marks item as incomplete when category is Anomaly", () => {
    const item = makeAnomalyItem({
      name: "Valid Name",
      category: "Anomaly",
      categoryId: "cat-anomaly",
      price: 50000,
    });
    const result = getIncompleteFields(item);
    expect(result.isIncomplete).toBe(true);
    expect(result.missingFields).toContain("Category");
  });

  it("marks item as incomplete when price is 0", () => {
    const item = makeAnomalyItem({
      name: "Valid Name",
      category: "Clothing",
      categoryId: "cat-clothing",
      price: 0,
    });
    const result = getIncompleteFields(item);
    expect(result.isIncomplete).toBe(true);
    expect(result.missingFields).toContain("Price");
  });

  it("marks item as complete when all required fields are present", () => {
    const item = makeAnomalyItem({
      name: "Leather Jacket",
      category: "Clothing",
      categoryId: "cat-clothing",
      price: 500000,
    });
    const result = getIncompleteFields(item);
    expect(result.isIncomplete).toBe(false);
    expect(result.missingFields).toHaveLength(0);
  });

  it("lists multiple missing fields", () => {
    const item = makeAnomalyItem({
      name: "Unregistered Item - 999",
      category: "Anomaly",
      categoryId: "cat-anomaly",
      price: 0,
    });
    const result = getIncompleteFields(item);
    expect(result.isIncomplete).toBe(true);
    expect(result.missingFields).toContain("Name");
    expect(result.missingFields).toContain("Category");
    expect(result.missingFields).toContain("Price");
  });
});

// ─── AnomalyBrowser Component Tests ────────────────────────────

describe("AnomalyBrowser", () => {
  it("renders empty state when no anomaly items", () => {
    renderBrowser({ items: [] });
    expect(screen.getByText("No Anomaly Items")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    renderBrowser({ isLoading: true });
    expect(screen.getByText("Loading anomaly items...")).toBeInTheDocument();
  });

  it("lists anomaly items with their SKU and name (Req 2.5)", () => {
    const items = [
      makeAnomalyItem({ id: "a1", sku: "SKU-A1", name: "Unregistered Item - X" }),
      makeCompletedAnomalyItem({ id: "a2", sku: "SKU-A2", name: "Leather Wallet" }),
    ];
    renderBrowser({ items });

    expect(screen.getByText("SKU-A1")).toBeInTheDocument();
    expect(screen.getByText("Unregistered Item - X")).toBeInTheDocument();
    expect(screen.getByText("SKU-A2")).toBeInTheDocument();
    expect(screen.getByText("Leather Wallet")).toBeInTheDocument();
  });

  it("shows incomplete status indicator for items missing fields (Req 2.3)", () => {
    const items = [makeAnomalyItem({ id: "inc-1" })];
    renderBrowser({ items });

    expect(screen.getByTestId("status-incomplete-inc-1")).toBeInTheDocument();
    expect(screen.getByText("Incomplete")).toBeInTheDocument();
  });

  it("shows ready status indicator for items with all fields filled", () => {
    const items = [
      makeCompletedAnomalyItem({
        id: "ready-1",
        name: "Complete Item",
        category: "Clothing",
        categoryId: "cat-clothing",
        price: 100000,
      }),
    ];
    renderBrowser({ items });

    expect(screen.getByTestId("status-ready-ready-1")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows missing fields info for incomplete items", () => {
    const items = [
      makeAnomalyItem({
        id: "miss-1",
        name: "Unregistered Item - 456",
        price: 0,
      }),
    ];
    renderBrowser({ items });

    expect(screen.getByText(/Missing:.*Name.*Category.*Price/)).toBeInTheDocument();
  });

  it("calls onComplete when Complete button is clicked (Req 2.3)", () => {
    const onComplete = vi.fn();
    const item = makeAnomalyItem({ id: "click-1" });
    renderBrowser({ items: [item], onComplete });

    const completeBtn = screen.getByTestId("complete-btn-click-1");
    fireEvent.click(completeBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(item);
  });

  it("shows item count and incomplete count in header", () => {
    const items = [
      makeAnomalyItem({ id: "h1" }),
      makeCompletedAnomalyItem({
        id: "h2",
        name: "Complete",
        category: "Clothing",
        categoryId: "cat-clothing",
        price: 100000,
      }),
    ];
    renderBrowser({ items });

    expect(screen.getByText(/2 items awaiting review/)).toBeInTheDocument();
    expect(screen.getByText(/1 incomplete/)).toBeInTheDocument();
  });

  it("filters items by search query (SKU)", () => {
    const items = [
      makeAnomalyItem({ id: "s1", sku: "SKU-ALPHA", name: "Alpha Item" }),
      makeAnomalyItem({ id: "s2", sku: "SKU-BETA", name: "Beta Item" }),
    ];
    renderBrowser({ items });

    const searchInput = screen.getByTestId("anomaly-search-input");
    fireEvent.change(searchInput, { target: { value: "ALPHA" } });

    expect(screen.getByText("Alpha Item")).toBeInTheDocument();
    expect(screen.queryByText("Beta Item")).not.toBeInTheDocument();
  });

  it("filters items by search query (barcode)", () => {
    const items = [
      makeAnomalyItem({ id: "b1", barcode: "1111111", name: "Barcode One" }),
      makeAnomalyItem({ id: "b2", barcode: "2222222", name: "Barcode Two" }),
    ];
    renderBrowser({ items });

    const searchInput = screen.getByTestId("anomaly-search-input");
    fireEvent.change(searchInput, { target: { value: "2222222" } });

    expect(screen.queryByText("Barcode One")).not.toBeInTheDocument();
    expect(screen.getByText("Barcode Two")).toBeInTheDocument();
  });

  it("filters to show only incomplete items", () => {
    const items = [
      makeAnomalyItem({ id: "f1", name: "Unregistered Item - X" }),
      makeCompletedAnomalyItem({
        id: "f2",
        name: "Fully Done Widget",
        category: "Clothing",
        categoryId: "cat-clothing",
        price: 100000,
      }),
    ];
    renderBrowser({ items });

    const incompleteBtn = screen.getByTestId("filter-incomplete");
    fireEvent.click(incompleteBtn);

    expect(screen.getByText("Unregistered Item - X")).toBeInTheDocument();
    expect(screen.queryByText("Fully Done Widget")).not.toBeInTheDocument();
  });

  it("filters to show only ready items", () => {
    const items = [
      makeAnomalyItem({ id: "r1", name: "Unregistered Item - X" }),
      makeCompletedAnomalyItem({
        id: "r2",
        name: "Ready Item",
        category: "Clothing",
        categoryId: "cat-clothing",
        price: 100000,
      }),
    ];
    renderBrowser({ items });

    const readyBtn = screen.getByTestId("filter-ready");
    fireEvent.click(readyBtn);

    expect(screen.queryByText("Unregistered Item - X")).not.toBeInTheDocument();
    expect(screen.getByText("Ready Item")).toBeInTheDocument();
  });

  it("calls onRefresh when refresh button is clicked", () => {
    const onRefresh = vi.fn();
    renderBrowser({ items: [], onRefresh });

    const refreshBtn = screen.getByText("Refresh");
    fireEvent.click(refreshBtn);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("displays barcode information for items", () => {
    const items = [makeAnomalyItem({ id: "bc-1", barcode: "9876543210" })];
    renderBrowser({ items });

    expect(screen.getByText("Barcode: 9876543210")).toBeInTheDocument();
  });

  it("displays price for items with price set", () => {
    const items = [makeCompletedAnomalyItem({ id: "pr-1", price: 250000 })];
    renderBrowser({ items });

    expect(screen.getByText("Rp 250,000")).toBeInTheDocument();
  });

  it("displays 'No price set' for items without price", () => {
    const items = [makeAnomalyItem({ id: "np-1", price: 0 })];
    renderBrowser({ items });

    expect(screen.getByText("No price set")).toBeInTheDocument();
  });
});
