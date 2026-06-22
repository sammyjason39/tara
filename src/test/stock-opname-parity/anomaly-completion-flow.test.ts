/**
 * Unit Tests — Anomaly Completion Flow
 * Spec: .kiro/specs/stock-opname-parity
 *
 * Task 6.2: Implement completion flow
 * **Validates: Requirements 2.3, 2.4**
 *
 * Tests cover:
 *   - shouldClearAnomalyFlag logic
 *   - buildCompletionPayload construction
 *   - Proper clearing of is_anomaly flag when category changes from Anomaly
 *   - No clearing when category stays the same or item is not in Anomaly
 */

import { describe, it, expect } from "vitest";
import {
  shouldClearAnomalyFlag,
  buildCompletionPayload,
  CompletionFormData,
} from "@/pages/retail/management/components/inventory/modals/AnomalyCompletionDialog";
import type { InventoryItemView } from "@/pages/retail/management/components/inventory/types";

// --- Test Fixtures ----------------------------------------------------------

function makeAnomalyItem(overrides?: Partial<InventoryItemView>): InventoryItemView {
  return {
    id: "item-001",
    sku: "SKU-UNKNOWN-001",
    name: "Unregistered Item - SKU-UNKNOWN-001",
    category: "Anomaly",
    categoryId: "cat-anomaly-123",
    onHand: 5,
    reserved: 0,
    available: 5,
    minBuffer: 0,
    status: "ok",
    barcode: "BARCODE-001",
    price: 0,
    ...overrides,
  };
}

function makeNormalItem(overrides?: Partial<InventoryItemView>): InventoryItemView {
  return {
    id: "item-002",
    sku: "SKU-NORMAL-002",
    name: "Normal Product",
    category: "Electronics",
    categoryId: "cat-electronics-456",
    onHand: 20,
    reserved: 2,
    available: 18,
    minBuffer: 5,
    status: "ok",
    barcode: "BARCODE-002",
    price: 150000,
    ...overrides,
  };
}

// --- shouldClearAnomalyFlag -------------------------------------------------

describe("shouldClearAnomalyFlag", () => {
  it("returns true when item is in Anomaly category and category changes", () => {
    const item = makeAnomalyItem();
    const newCategoryId = "cat-electronics-456";
    const previousCategoryId = "cat-anomaly-123";

    expect(shouldClearAnomalyFlag(item, newCategoryId, previousCategoryId)).toBe(true);
  });

  it("returns false when item is in Anomaly category but category does not change", () => {
    const item = makeAnomalyItem();
    const categoryId = "cat-anomaly-123";

    expect(shouldClearAnomalyFlag(item, categoryId, categoryId)).toBe(false);
  });

  it("returns false when item is not in Anomaly category even if category changes", () => {
    const item = makeNormalItem();
    const newCategoryId = "cat-clothing-789";
    const previousCategoryId = "cat-electronics-456";

    expect(shouldClearAnomalyFlag(item, newCategoryId, previousCategoryId)).toBe(false);
  });

  it("returns false when item is null", () => {
    expect(shouldClearAnomalyFlag(null, "cat-123", "cat-456")).toBe(false);
  });

  it("handles case-insensitive Anomaly category name", () => {
    const item = makeAnomalyItem({ category: "ANOMALY" });
    const newCategoryId = "cat-electronics-456";
    const previousCategoryId = "cat-anomaly-123";

    expect(shouldClearAnomalyFlag(item, newCategoryId, previousCategoryId)).toBe(true);
  });

  it("handles mixed-case Anomaly category name", () => {
    const item = makeAnomalyItem({ category: "anomaly" });
    const newCategoryId = "cat-electronics-456";
    const previousCategoryId = "cat-anomaly-123";

    expect(shouldClearAnomalyFlag(item, newCategoryId, previousCategoryId)).toBe(true);
  });
});

// --- buildCompletionPayload -------------------------------------------------

describe("buildCompletionPayload", () => {
  it("includes is_anomaly: false when category changes from Anomaly (Req 2.4)", () => {
    const item = makeAnomalyItem();
    const formData: CompletionFormData = {
      name: "Leather Jacket",
      category_id: "cat-clothing-789",
      base_price: 350000,
    };
    const previousCategoryId = "cat-anomaly-123";

    const payload = buildCompletionPayload(formData, item, previousCategoryId);

    expect(payload.is_anomaly).toBe(false);
    expect(payload.name).toBe("Leather Jacket");
    expect(payload.category_id).toBe("cat-clothing-789");
    expect(payload.base_price).toBe(350000);
  });

  it("does not include is_anomaly field when category stays the same", () => {
    const item = makeAnomalyItem();
    const formData: CompletionFormData = {
      name: "Updated Name",
      category_id: "cat-anomaly-123",
      base_price: 10000,
    };
    const previousCategoryId = "cat-anomaly-123";

    const payload = buildCompletionPayload(formData, item, previousCategoryId);

    expect(payload.is_anomaly).toBeUndefined();
    expect(payload.name).toBe("Updated Name");
    expect(payload.category_id).toBe("cat-anomaly-123");
  });

  it("does not include is_anomaly field for non-Anomaly items", () => {
    const item = makeNormalItem();
    const formData: CompletionFormData = {
      name: "Normal Product Updated",
      category_id: "cat-clothing-789",
      base_price: 200000,
    };
    const previousCategoryId = "cat-electronics-456";

    const payload = buildCompletionPayload(formData, item, previousCategoryId);

    expect(payload.is_anomaly).toBeUndefined();
  });

  it("preserves all form fields in payload", () => {
    const item = makeAnomalyItem();
    const formData: CompletionFormData = {
      name: "Complete Product",
      category_id: "cat-food-999",
      base_price: "75000",
    };
    const previousCategoryId = "cat-anomaly-123";

    const payload = buildCompletionPayload(formData, item, previousCategoryId);

    expect(payload.name).toBe("Complete Product");
    expect(payload.category_id).toBe("cat-food-999");
    expect(payload.base_price).toBe("75000");
    expect(payload.is_anomaly).toBe(false);
  });

  it("handles empty form fields without error", () => {
    const item = makeAnomalyItem();
    const formData: CompletionFormData = {
      name: "",
      category_id: "",
      base_price: "",
    };
    const previousCategoryId = "cat-anomaly-123";

    const payload = buildCompletionPayload(formData, item, previousCategoryId);

    expect(payload.name).toBe("");
    expect(payload.category_id).toBe("");
    expect(payload.base_price).toBe("");
    // category_id is "" which !== previousCategoryId, but item is in Anomaly
    // so shouldClearAnomalyFlag will be true (empty string != cat-anomaly-123)
    expect(payload.is_anomaly).toBe(false);
  });

  it("handles null item gracefully", () => {
    const formData: CompletionFormData = {
      name: "Some Name",
      category_id: "cat-123",
      base_price: 100,
    };

    const payload = buildCompletionPayload(formData, null, "cat-anomaly-123");

    // No anomaly flag clearing since item is null
    expect(payload.is_anomaly).toBeUndefined();
    expect(payload.name).toBe("Some Name");
  });
});

// --- Integration: Completion flow scenario ----------------------------------

describe("Anomaly Completion Flow (Req 2.3, 2.4)", () => {
  it("Req 2.3: user can edit incomplete item and change category from Anomaly", () => {
    const incompleteItem = makeAnomalyItem({
      name: "Unregistered Item - BARCODE-XYZ",
      price: 0,
    });

    // User fills in required details
    const formData: CompletionFormData = {
      name: "Premium Widget",
      category_id: "cat-widgets-100",
      base_price: 250000,
    };

    const payload = buildCompletionPayload(formData, incompleteItem, incompleteItem.categoryId);

    // Should clear anomaly flag since category changed from Anomaly
    expect(payload.is_anomaly).toBe(false);
    expect(payload.category_id).toBe("cat-widgets-100");
    expect(payload.name).toBe("Premium Widget");
    expect(payload.base_price).toBe(250000);
  });

  it("Req 2.4: clearing anomaly flag when category changes away from Anomaly", () => {
    const item = makeAnomalyItem();

    // Category change from Anomaly to Electronics
    const result = shouldClearAnomalyFlag(item, "cat-electronics-456", "cat-anomaly-123");
    expect(result).toBe(true);
  });

  it("anomaly flag remains if user only updates name/price but keeps Anomaly category", () => {
    const item = makeAnomalyItem();

    const formData: CompletionFormData = {
      name: "Now Has a Name",
      category_id: "cat-anomaly-123", // Same category
      base_price: 50000,
    };

    const payload = buildCompletionPayload(formData, item, "cat-anomaly-123");

    // is_anomaly should NOT be set (stays as anomaly since category didn't change)
    expect(payload.is_anomaly).toBeUndefined();
  });
});
