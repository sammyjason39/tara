import { describe, it, expect } from "vitest";
import {
  createLeadSchema,
  createOpportunitySchema,
  createQuotationSchema,
  createSimpleQuoteSchema,
  createOrderSchema,
  createTimelineEventSchema,
  createSalesTaskSchema,
  convertLeadSchema,
  calculateLineTotal,
  calculateGrandTotal,
} from "./index";

describe("Sales Zod Schemas", () => {
  describe("createLeadSchema", () => {
    it("validates a minimal valid lead", () => {
      const result = createLeadSchema.safeParse({
        companyName: "Acme Corp",
        contactName: "John Doe",
        potentialValue: 50000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects company name shorter than 2 chars", () => {
      const result = createLeadSchema.safeParse({
        companyName: "A",
        contactName: "John",
        potentialValue: 100,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("companyName");
      }
    });

    it("rejects negative potential value", () => {
      const result = createLeadSchema.safeParse({
        companyName: "Acme Corp",
        contactName: "John",
        potentialValue: -1,
      });
      expect(result.success).toBe(false);
    });

    it("allows empty email string", () => {
      const result = createLeadSchema.safeParse({
        companyName: "Test Co",
        contactName: "Test",
        contactEmail: "",
        potentialValue: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createOpportunitySchema", () => {
    it("validates a valid opportunity", () => {
      const result = createOpportunitySchema.safeParse({
        accountName: "Big Corp",
        contactName: "Jane",
        amount: 100000,
        expectedCloseDate: "2025-03-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing expectedCloseDate", () => {
      const result = createOpportunitySchema.safeParse({
        accountName: "Big Corp",
        contactName: "Jane",
        amount: 100000,
        expectedCloseDate: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createQuotationSchema", () => {
    it("validates a quotation with one line item", () => {
      const result = createQuotationSchema.safeParse({
        opportunityId: "opp-123",
        lineItems: [
          { itemId: "item-1", quantity: 5, unitPrice: 100, discountType: "percentage", discountValue: 10 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects an empty lineItems array", () => {
      const result = createQuotationSchema.safeParse({
        opportunityId: "opp-123",
        lineItems: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects line item with quantity <= 0", () => {
      const result = createQuotationSchema.safeParse({
        opportunityId: "opp-123",
        lineItems: [
          { itemId: "item-1", quantity: 0, unitPrice: 100, discountType: "fixed", discountValue: 0 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects line item with negative discount", () => {
      const result = createQuotationSchema.safeParse({
        opportunityId: "opp-123",
        lineItems: [
          { itemId: "item-1", quantity: 2, unitPrice: 50, discountType: "percentage", discountValue: -5 },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createSimpleQuoteSchema", () => {
    it("validates a simple quote", () => {
      const result = createSimpleQuoteSchema.safeParse({
        opportunityId: "opp-123",
        amount: 5000,
        discountPercent: 15,
      });
      expect(result.success).toBe(true);
    });

    it("rejects discount over 100%", () => {
      const result = createSimpleQuoteSchema.safeParse({
        opportunityId: "opp-123",
        amount: 5000,
        discountPercent: 101,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createOrderSchema", () => {
    it("validates a valid order", () => {
      const result = createOrderSchema.safeParse({
        opportunityId: "opp-1",
        customerName: "Client Inc",
        paymentTerms: "NET_30",
      });
      expect(result.success).toBe(true);
    });

    it("rejects customer name shorter than 2 chars", () => {
      const result = createOrderSchema.safeParse({
        opportunityId: "opp-1",
        customerName: "X",
        paymentTerms: "NET_30",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createTimelineEventSchema", () => {
    it("validates a valid timeline event", () => {
      const result = createTimelineEventSchema.safeParse({
        opportunityId: "opp-1",
        channel: "EMAIL",
        direction: "OUTBOUND",
        summary: "Sent pricing document",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty summary", () => {
      const result = createTimelineEventSchema.safeParse({
        opportunityId: "opp-1",
        channel: "NOTE",
        direction: "INTERNAL",
        summary: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createSalesTaskSchema", () => {
    it("validates a valid task", () => {
      const result = createSalesTaskSchema.safeParse({
        title: "Follow up with prospect",
        dueDate: "2025-02-15",
        priority: "HIGH",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("convertLeadSchema", () => {
    it("validates a conversion input", () => {
      const result = convertLeadSchema.safeParse({
        leadId: "lead-123",
        probability: 25,
      });
      expect(result.success).toBe(true);
    });

    it("rejects probability > 100", () => {
      const result = convertLeadSchema.safeParse({
        leadId: "lead-123",
        probability: 150,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Line Item Calculations", () => {
  describe("calculateLineTotal", () => {
    it("calculates percentage discount correctly", () => {
      const total = calculateLineTotal({
        quantity: 10,
        unitPrice: 100,
        discountType: "percentage",
        discountValue: 20,
      });
      // 10 * 100 * (1 - 20/100) = 1000 * 0.8 = 800
      expect(total).toBe(800);
    });

    it("calculates fixed discount correctly", () => {
      const total = calculateLineTotal({
        quantity: 5,
        unitPrice: 200,
        discountType: "fixed",
        discountValue: 50,
      });
      // 5 * 200 - 50 = 1000 - 50 = 950
      expect(total).toBe(950);
    });

    it("handles zero discount", () => {
      const total = calculateLineTotal({
        quantity: 3,
        unitPrice: 50,
        discountType: "percentage",
        discountValue: 0,
      });
      expect(total).toBe(150);
    });

    it("handles 100% discount", () => {
      const total = calculateLineTotal({
        quantity: 10,
        unitPrice: 100,
        discountType: "percentage",
        discountValue: 100,
      });
      expect(total).toBe(0);
    });
  });

  describe("calculateGrandTotal", () => {
    it("sums multiple line items", () => {
      const total = calculateGrandTotal([
        { quantity: 2, unitPrice: 100, discountType: "percentage" as const, discountValue: 10 },
        { quantity: 3, unitPrice: 50, discountType: "fixed" as const, discountValue: 20 },
      ]);
      // Line 1: 2 * 100 * 0.9 = 180
      // Line 2: 3 * 50 - 20 = 130
      // Total: 310
      expect(total).toBe(310);
    });

    it("returns 0 for empty array", () => {
      expect(calculateGrandTotal([])).toBe(0);
    });
  });
});
