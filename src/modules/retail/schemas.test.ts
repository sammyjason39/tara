/**
 * Retail Module — Zod Schema Unit Tests
 *
 * Validates all Retail domain schemas for correct validation behavior.
 * Tests cover Requirements 8.1, 8.2, 8.5, 8.6, 16.1.
 */

import { describe, it, expect } from "vitest";
import {
  createPosTransactionSchema,
  posLineItemSchema,
  createPricingRuleSchema,
  openShiftSchema,
  closeShiftSchema,
  createChannelSchema,
  createPromotionSchema,
  createStoreSchema,
  editProductSchema,
  stockEditSchema,
  createCustomerSchema,
  createRefundSchema,
  cashMovementSchema,
  roleModificationSchema,
  registerDeviceSchema,
  registerCctvSchema,
  registerSensorSchema,
  calculateLineTotal,
  calculateGrandTotal,
} from "./schemas";

describe("Retail Zod Schemas", () => {
  // ─── POS Transaction ─────────────────────────────────────────────────────────

  describe("createPosTransactionSchema", () => {
    it("validates a minimal valid POS transaction", () => {
      const result = createPosTransactionSchema.safeParse({
        lineItems: [{ itemId: "SKU001", quantity: 1 }],
        paymentMethod: "cash",
      });
      expect(result.success).toBe(true);
    });

    it("rejects transaction with no line items", () => {
      const result = createPosTransactionSchema.safeParse({
        lineItems: [],
        paymentMethod: "cash",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid payment method", () => {
      const result = createPosTransactionSchema.safeParse({
        lineItems: [{ itemId: "SKU001", quantity: 1 }],
        paymentMethod: "bitcoin",
      });
      expect(result.success).toBe(false);
    });

    it("accepts electronic payment method", () => {
      const result = createPosTransactionSchema.safeParse({
        lineItems: [{ itemId: "SKU001", quantity: 2, unitPrice: 50000 }],
        paymentMethod: "electronic",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("posLineItemSchema", () => {
    it("validates quantity between 1 and 9999", () => {
      expect(posLineItemSchema.safeParse({ itemId: "X", quantity: 1 }).success).toBe(true);
      expect(posLineItemSchema.safeParse({ itemId: "X", quantity: 9999 }).success).toBe(true);
    });

    it("rejects quantity of 0", () => {
      const result = posLineItemSchema.safeParse({ itemId: "X", quantity: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects quantity above 9999", () => {
      const result = posLineItemSchema.safeParse({ itemId: "X", quantity: 10000 });
      expect(result.success).toBe(false);
    });

    it("rejects empty itemId", () => {
      const result = posLineItemSchema.safeParse({ itemId: "", quantity: 1 });
      expect(result.success).toBe(false);
    });

    it("accepts percentage discount 0-100", () => {
      const result = posLineItemSchema.safeParse({
        itemId: "SKU001",
        quantity: 2,
        discountType: "percentage",
        discountValue: 50,
      });
      expect(result.success).toBe(true);
    });

    it("rejects discount value above 100", () => {
      const result = posLineItemSchema.safeParse({
        itemId: "SKU001",
        quantity: 2,
        discountType: "percentage",
        discountValue: 150,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Pricing Rule ────────────────────────────────────────────────────────────

  describe("createPricingRuleSchema", () => {
    it("validates a complete pricing rule", () => {
      const result = createPricingRuleSchema.safeParse({
        name: "Weekend Sale",
        discountType: "percentage",
        discountValue: 10,
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });
      expect(result.success).toBe(true);
    });

    it("rejects end date before start date", () => {
      const result = createPricingRuleSchema.safeParse({
        name: "Bad Rule",
        discountType: "percentage",
        discountValue: 10,
        startDate: "2025-02-01",
        endDate: "2025-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createPricingRuleSchema.safeParse({
        name: "",
        discountType: "fixed",
        discountValue: 5000,
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Shift ───────────────────────────────────────────────────────────────────

  describe("openShiftSchema", () => {
    it("validates a valid shift open", () => {
      const result = openShiftSchema.safeParse({
        storeId: "store-1",
        terminalId: "terminal-1",
        openingCash: 500000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing store ID", () => {
      const result = openShiftSchema.safeParse({
        storeId: "",
        terminalId: "t-1",
        openingCash: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative opening cash", () => {
      const result = openShiftSchema.safeParse({
        storeId: "s-1",
        terminalId: "t-1",
        openingCash: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("closeShiftSchema", () => {
    it("validates a valid shift close", () => {
      const result = closeShiftSchema.safeParse({ closingCash: 750000 });
      expect(result.success).toBe(true);
    });

    it("rejects negative closing cash", () => {
      const result = closeShiftSchema.safeParse({ closingCash: -1 });
      expect(result.success).toBe(false);
    });
  });

  // ─── Channel ─────────────────────────────────────────────────────────────────

  describe("createChannelSchema", () => {
    it("validates a valid channel", () => {
      const result = createChannelSchema.safeParse({
        name: "Tokopedia Store",
        type: "MARKETPLACE",
        syncFrequency: "hourly",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid channel type", () => {
      const result = createChannelSchema.safeParse({
        name: "Bad Channel",
        type: "UNKNOWN",
        syncFrequency: "daily",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Promotion ───────────────────────────────────────────────────────────────

  describe("createPromotionSchema", () => {
    it("validates a valid promotion", () => {
      const result = createPromotionSchema.safeParse({
        title: "Black Friday",
        type: "percentage",
        value: 50,
        startDate: "2025-11-25",
        endDate: "2025-11-30",
      });
      expect(result.success).toBe(true);
    });

    it("rejects end date before start date", () => {
      const result = createPromotionSchema.safeParse({
        title: "Invalid",
        type: "fixed_amount",
        value: 10000,
        startDate: "2025-12-01",
        endDate: "2025-11-01",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Store ───────────────────────────────────────────────────────────────────

  describe("createStoreSchema", () => {
    it("validates a valid store", () => {
      const result = createStoreSchema.safeParse({
        name: "Main Branch",
        code: "JKT-01",
        locationId: "loc-1",
        type: "flagship",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty store name", () => {
      const result = createStoreSchema.safeParse({
        name: "",
        code: "X",
        locationId: "loc-1",
        type: "express",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Product ─────────────────────────────────────────────────────────────────

  describe("editProductSchema", () => {
    it("validates a valid product edit", () => {
      const result = editProductSchema.safeParse({
        name: "Widget A",
        sku: "WDG-001",
        categoryId: "cat-1",
        basePrice: 15000,
        unit: "pcs",
      });
      expect(result.success).toBe(true);
    });

    it("rejects SKU over 50 chars", () => {
      const result = editProductSchema.safeParse({
        name: "Widget",
        sku: "A".repeat(51),
        categoryId: "cat-1",
        basePrice: 100,
        unit: "pcs",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Stock Edit ──────────────────────────────────────────────────────────────

  describe("stockEditSchema", () => {
    it("validates a valid stock adjustment", () => {
      const result = stockEditSchema.safeParse({
        productId: "prod-1",
        quantity: -5,
        reason: "Damaged goods removed",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty reason", () => {
      const result = stockEditSchema.safeParse({
        productId: "prod-1",
        quantity: 10,
        reason: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects reason over 500 characters", () => {
      const result = stockEditSchema.safeParse({
        productId: "prod-1",
        quantity: 1,
        reason: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Customer ────────────────────────────────────────────────────────────────

  describe("createCustomerSchema", () => {
    it("validates a minimal customer", () => {
      const result = createCustomerSchema.safeParse({ name: "John Doe" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createCustomerSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });

  // ─── Refund ──────────────────────────────────────────────────────────────────

  describe("createRefundSchema", () => {
    it("validates a valid refund", () => {
      const result = createRefundSchema.safeParse({
        transactionId: "txn-001",
        reason: "Defective product",
        items: [{ itemId: "item-1", quantity: 1 }],
        refundMethod: "cash",
      });
      expect(result.success).toBe(true);
    });

    it("rejects refund with no items", () => {
      const result = createRefundSchema.safeParse({
        transactionId: "txn-001",
        reason: "Defective",
        items: [],
        refundMethod: "cash",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Cash Movement ───────────────────────────────────────────────────────────

  describe("cashMovementSchema", () => {
    it("validates a valid deposit", () => {
      const result = cashMovementSchema.safeParse({
        type: "deposit",
        amount: 1000000,
        reason: "Opening float",
      });
      expect(result.success).toBe(true);
    });

    it("rejects zero amount", () => {
      const result = cashMovementSchema.safeParse({
        type: "withdrawal",
        amount: 0,
        reason: "Test",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Device ──────────────────────────────────────────────────────────────────

  describe("registerDeviceSchema", () => {
    it("validates a valid device registration", () => {
      const result = registerDeviceSchema.safeParse({
        name: "POS Terminal #1",
        storeId: "store-1",
        type: "pos_terminal",
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── CCTV ────────────────────────────────────────────────────────────────────

  describe("registerCctvSchema", () => {
    it("validates a valid CCTV registration", () => {
      const result = registerCctvSchema.safeParse({
        name: "Front Door Cam",
        provider: "hikvision",
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── Sensor ──────────────────────────────────────────────────────────────────

  describe("registerSensorSchema", () => {
    it("validates a valid sensor registration", () => {
      const result = registerSensorSchema.safeParse({
        name: "Cold Room Temp",
        type: "temperature",
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── Role Modification ───────────────────────────────────────────────────────

  describe("roleModificationSchema", () => {
    it("validates a valid role change", () => {
      const result = roleModificationSchema.safeParse({
        employeeId: "emp-1",
        role: "Senior Cashier",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty role", () => {
      const result = roleModificationSchema.safeParse({
        employeeId: "emp-1",
        role: "",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Line Item Arithmetic ────────────────────────────────────────────────────

  describe("calculateLineTotal", () => {
    it("calculates subtotal without discount", () => {
      expect(calculateLineTotal(3, 10000)).toBe(30000);
    });

    it("calculates percentage discount", () => {
      expect(calculateLineTotal(2, 50000, "percentage", 10)).toBe(90000);
    });

    it("calculates fixed discount", () => {
      expect(calculateLineTotal(1, 100000, "fixed", 15000)).toBe(85000);
    });

    it("clamps fixed discount to not go below zero", () => {
      expect(calculateLineTotal(1, 10000, "fixed", 50000)).toBe(0);
    });

    it("handles zero discount value", () => {
      expect(calculateLineTotal(5, 20000, "percentage", 0)).toBe(100000);
    });
  });

  describe("calculateGrandTotal", () => {
    it("sums all line totals", () => {
      const items = [
        { quantity: 2, unitPrice: 10000 },
        { quantity: 1, unitPrice: 50000, discountType: "percentage" as const, discountValue: 20 },
      ];
      // 2*10000 = 20000 + 1*50000*(1-0.2) = 40000 = 60000
      expect(calculateGrandTotal(items)).toBe(60000);
    });

    it("returns 0 for empty items", () => {
      expect(calculateGrandTotal([])).toBe(0);
    });
  });
});
