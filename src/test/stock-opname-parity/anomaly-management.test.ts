/**
 * Component Tests — Anomaly Management
 * Spec: .kiro/specs/stock-opname-parity
 *
 * Task 6.3: Write component tests for Anomaly management
 * **Validates: Requirements 2.3, 2.4**
 *
 * Tests cover:
 *   1. Filter by is_anomaly: true returns correct items (listAnomalyItems service)
 *   2. Edit completion clears is_anomaly flag
 *   3. Item can be moved out of Anomaly category
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shouldClearAnomalyFlag,
  buildCompletionPayload,
  CompletionFormData,
} from "@/pages/retail/management/components/inventory/modals/AnomalyCompletionDialog";
import type { InventoryItemView } from "@/pages/retail/management/components/inventory/types";

// ─── Mock the HTTP layer ──────────────────────────────────────────────────────
vi.mock("@/core/api/apiClient", () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from "@/core/api/apiClient";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tenantId = "tenant-anomaly-mgmt";
const session: SessionContext = {
  user_id: "manager-001",
  tenant_id: tenantId,
  role: Roles.MANAGER,
  department_id: "INVENTORY",
  location_id: "LOC-JKT",
  permissions: [],
};

function makeAnomalyItemView(overrides?: Partial<InventoryItemView>): InventoryItemView {
  return {
    id: "item-anomaly-001",
    sku: "SKU-UNKNOWN-001",
    name: "Unregistered Item - BARCODE-001",
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

function makeNormalItemView(overrides?: Partial<InventoryItemView>): InventoryItemView {
  return {
    id: "item-normal-002",
    sku: "SKU-NORMAL-002",
    name: "Leather Jacket",
    category: "Clothing",
    categoryId: "cat-clothing-456",
    onHand: 20,
    reserved: 2,
    available: 18,
    minBuffer: 5,
    status: "ok",
    barcode: "BARCODE-002",
    price: 350000,
    ...overrides,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("Anomaly Management - Component Tests (Task 6.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Filter by is_anomaly: true returns correct items (Req 2.3, 2.5) ────

  describe("Filter by is_anomaly: true returns correct items", () => {
    it("listAnomalyItems sends is_anomaly=true query parameter", async () => {
      const anomalyItems = [
        { id: "item-1", sku: "SKU-A1", name: "Unregistered Item - X", is_anomaly: true, status: "incomplete" },
        { id: "item-2", sku: "SKU-A2", name: "Unregistered Item - Y", is_anomaly: true, status: "incomplete" },
      ];
      (apiRequest as any).mockResolvedValueOnce(anomalyItems);

      const result = await inventoryService.listAnomalyItems(tenantId, session);

      expect(apiRequest).toHaveBeenCalledWith(
        expect.stringContaining("is_anomaly=true"),
        "GET",
        session,
      );
      expect(result).toHaveLength(2);
      expect(result.every((item: any) => item.is_anomaly === true)).toBe(true);
    });

    it("listAnomalyItems excludes non-anomaly items from results", async () => {
      // Backend should filter; we verify the service passes correct params
      const anomalyOnly = [
        { id: "item-1", sku: "SKU-A1", name: "Anomaly Item", is_anomaly: true, status: "incomplete" },
      ];
      (apiRequest as any).mockResolvedValueOnce(anomalyOnly);

      const result = await inventoryService.listAnomalyItems(tenantId, session);

      // Verify the query correctly specifies is_anomaly=true
      const callUrl = (apiRequest as any).mock.calls[0][0] as string;
      expect(callUrl).toContain("is_anomaly=true");
      // Result should only contain anomaly items
      expect(result).toHaveLength(1);
      expect(result[0].is_anomaly).toBe(true);
    });

    it("listAnomalyItems supports search parameter for filtering within anomaly items", async () => {
      const searchedItems = [
        { id: "item-3", sku: "SKU-A3", name: "Anomaly Widget", is_anomaly: true, status: "incomplete" },
      ];
      (apiRequest as any).mockResolvedValueOnce(searchedItems);

      const result = await inventoryService.listAnomalyItems(tenantId, session, {
        search: "Widget",
      });

      const callUrl = (apiRequest as any).mock.calls[0][0] as string;
      expect(callUrl).toContain("is_anomaly=true");
      expect(callUrl).toContain("search=Widget");
      expect(result).toHaveLength(1);
    });

    it("listAnomalyItems supports pagination parameters", async () => {
      (apiRequest as any).mockResolvedValueOnce([]);

      await inventoryService.listAnomalyItems(tenantId, session, {
        page: 2,
        limit: 10,
      });

      const callUrl = (apiRequest as any).mock.calls[0][0] as string;
      expect(callUrl).toContain("is_anomaly=true");
      expect(callUrl).toContain("page=2");
      expect(callUrl).toContain("limit=10");
    });

    it("listAnomalyItems supports location filtering for branch-scoped queries", async () => {
      (apiRequest as any).mockResolvedValueOnce([]);

      await inventoryService.listAnomalyItems(tenantId, session, {
        locationId: "LOC-SBY",
      });

      const callUrl = (apiRequest as any).mock.calls[0][0] as string;
      expect(callUrl).toContain("is_anomaly=true");
      expect(callUrl).toContain("location_id=LOC-SBY");
    });
  });

  // ─── 2. Edit completion clears is_anomaly flag (Req 2.4) ───────────────────

  describe("Edit completion clears is_anomaly flag", () => {
    it("completeAnomalyItem sends PATCH with is_anomaly: false when category changes", async () => {
      const completedItem = {
        id: "item-anomaly-001",
        sku: "SKU-A1",
        name: "Leather Jacket",
        category_id: "cat-clothing-456",
        is_anomaly: false,
        status: "active",
      };
      (apiRequest as any).mockResolvedValueOnce(completedItem);

      const result = await inventoryService.completeAnomalyItem(
        tenantId,
        session,
        "item-anomaly-001",
        {
          name: "Leather Jacket",
          category_id: "cat-clothing-456",
          base_price: 350000,
          is_anomaly: false,
        },
      );

      expect(apiRequest).toHaveBeenCalledWith(
        "/v1/inventory/items/item-anomaly-001/complete",
        "PATCH",
        session,
        expect.objectContaining({ is_anomaly: false }),
      );
      expect(result.is_anomaly).toBe(false);
    });

    it("buildCompletionPayload includes is_anomaly: false when category changes from Anomaly", () => {
      const item = makeAnomalyItemView();
      const formData: CompletionFormData = {
        name: "Premium Widget",
        category_id: "cat-electronics-789",
        base_price: 250000,
      };

      const payload = buildCompletionPayload(formData, item, "cat-anomaly-123");

      expect(payload.is_anomaly).toBe(false);
      expect(payload.name).toBe("Premium Widget");
      expect(payload.category_id).toBe("cat-electronics-789");
    });

    it("buildCompletionPayload does NOT include is_anomaly when category stays as Anomaly", () => {
      const item = makeAnomalyItemView();
      const formData: CompletionFormData = {
        name: "Updated Name",
        category_id: "cat-anomaly-123",
        base_price: 10000,
      };

      const payload = buildCompletionPayload(formData, item, "cat-anomaly-123");

      expect(payload.is_anomaly).toBeUndefined();
    });

    it("shouldClearAnomalyFlag returns true only for items currently in Anomaly category with a changed category", () => {
      const anomalyItem = makeAnomalyItemView();
      const normalItem = makeNormalItemView();

      // Anomaly item with category change → clear flag
      expect(shouldClearAnomalyFlag(anomalyItem, "cat-electronics-789", "cat-anomaly-123")).toBe(true);

      // Anomaly item without category change → don't clear
      expect(shouldClearAnomalyFlag(anomalyItem, "cat-anomaly-123", "cat-anomaly-123")).toBe(false);

      // Normal item with category change → don't clear
      expect(shouldClearAnomalyFlag(normalItem, "cat-other-999", "cat-clothing-456")).toBe(false);
    });
  });

  // ─── 3. Item can be moved out of Anomaly category (Req 2.3, 2.4) ──────────

  describe("Item can be moved out of Anomaly category", () => {
    it("completing an item with a non-Anomaly category moves it out of Anomaly", async () => {
      const completedItem = {
        id: "item-anomaly-001",
        sku: "SKU-A1",
        name: "Leather Jacket",
        category_id: "cat-clothing-456",
        is_anomaly: false,
        status: "active",
      };
      (apiRequest as any).mockResolvedValueOnce(completedItem);

      const result = await inventoryService.completeAnomalyItem(
        tenantId,
        session,
        "item-anomaly-001",
        {
          name: "Leather Jacket",
          category_id: "cat-clothing-456",
          base_price: 350000,
          is_anomaly: false,
        },
      );

      // Item should no longer be in anomaly state
      expect(result.category_id).toBe("cat-clothing-456");
      expect(result.is_anomaly).toBe(false);
    });

    it("full completion flow: filter → edit → category change → flag cleared", () => {
      // Step 1: Item exists in anomaly state
      const anomalyItem = makeAnomalyItemView({
        id: "item-flow-001",
        name: "Unregistered Item - BARCODE-XYZ",
        price: 0,
      });

      // Step 2: User edits and provides complete details with new category
      const formData: CompletionFormData = {
        name: "Premium Widget",
        category_id: "cat-widgets-100",
        base_price: 250000,
      };

      // Step 3: Build the payload — should include is_anomaly: false
      const payload = buildCompletionPayload(formData, anomalyItem, anomalyItem.categoryId);

      expect(payload.is_anomaly).toBe(false);
      expect(payload.category_id).toBe("cat-widgets-100");
      expect(payload.name).toBe("Premium Widget");
      expect(payload.base_price).toBe(250000);
    });

    it("item remains in Anomaly if user edits but keeps the same category", () => {
      const anomalyItem = makeAnomalyItemView();
      const formData: CompletionFormData = {
        name: "Now Has a Name",
        category_id: "cat-anomaly-123", // Same category
        base_price: 50000,
      };

      const payload = buildCompletionPayload(formData, anomalyItem, "cat-anomaly-123");

      // Should NOT clear anomaly flag since category didn't change
      expect(payload.is_anomaly).toBeUndefined();
    });

    it("completeAnomalyItem API call includes category_id for moving out of Anomaly", async () => {
      (apiRequest as any).mockResolvedValueOnce({
        id: "item-move-001",
        category_id: "cat-food-200",
        is_anomaly: false,
      });

      await inventoryService.completeAnomalyItem(tenantId, session, "item-move-001", {
        name: "Organic Snack",
        category_id: "cat-food-200",
        base_price: 75000,
        is_anomaly: false,
      });

      expect(apiRequest).toHaveBeenCalledWith(
        "/v1/inventory/items/item-move-001/complete",
        "PATCH",
        session,
        expect.objectContaining({
          category_id: "cat-food-200",
          is_anomaly: false,
        }),
      );
    });
  });
});
