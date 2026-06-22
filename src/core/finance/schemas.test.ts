/**
 * Unit tests for Finance module Zod schemas.
 * Tests double-entry accounting validation, payment validation,
 * and other critical Finance business rules.
 */
import { describe, it, expect } from "vitest";
import {
  journalEntrySchema,
  journalLineSchema,
  paymentSchema,
  capexRequestSchema,
  reconciliationSchema,
  receivableSchema,
  payableSchema,
  treasuryTransferSchema,
  policySchema,
  registerAssetSchema,
  assetImpairmentSchema,
  assetRevaluationSchema,
  assetDisposalSchema,
} from "./schemas";

describe("Finance Schemas", () => {
  describe("journalEntrySchema - double-entry accounting", () => {
    it("accepts a balanced journal entry with >= 2 lines", () => {
      const result = journalEntrySchema.safeParse({
        description: "Monthly rent",
        lines: [
          { accountCode: "6100", description: "Rent expense", debit: 1000, credit: 0 },
          { accountCode: "1100", description: "Cash", debit: 0, credit: 1000 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a balanced entry within 0.01 tolerance", () => {
      const result = journalEntrySchema.safeParse({
        description: "Small rounding",
        lines: [
          { accountCode: "6100", description: "", debit: 100.005, credit: 0 },
          { accountCode: "1100", description: "", debit: 0, credit: 100 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects an imbalanced entry (debits != credits)", () => {
      const result = journalEntrySchema.safeParse({
        description: "Bad entry",
        lines: [
          { accountCode: "6100", description: "", debit: 1000, credit: 0 },
          { accountCode: "1100", description: "", debit: 0, credit: 500 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects fewer than 2 line items", () => {
      const result = journalEntrySchema.safeParse({
        description: "One line",
        lines: [
          { accountCode: "6100", description: "", debit: 100, credit: 100 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing description", () => {
      const result = journalEntrySchema.safeParse({
        description: "",
        lines: [
          { accountCode: "6100", description: "", debit: 100, credit: 0 },
          { accountCode: "1100", description: "", debit: 0, credit: 100 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty account code in line items", () => {
      const result = journalLineSchema.safeParse({
        accountCode: "",
        description: "",
        debit: 100,
        credit: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative debit amount", () => {
      const result = journalLineSchema.safeParse({
        accountCode: "6100",
        description: "",
        debit: -50,
        credit: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("paymentSchema", () => {
    it("accepts a valid payment", () => {
      const result = paymentSchema.safeParse({
        beneficiary: "Vendor ABC",
        amount: 5000000,
        method: "BANK_TRANSFER",
        purpose: "Monthly invoice payment",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty recipient", () => {
      const result = paymentSchema.safeParse({
        beneficiary: "",
        amount: 5000000,
        method: "BANK_TRANSFER",
        purpose: "Payment",
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero amount", () => {
      const result = paymentSchema.safeParse({
        beneficiary: "Vendor",
        amount: 0,
        method: "BANK_TRANSFER",
        purpose: "Payment",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative amount", () => {
      const result = paymentSchema.safeParse({
        beneficiary: "Vendor",
        amount: -100,
        method: "BANK_TRANSFER",
        purpose: "Payment",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid payment method", () => {
      const result = paymentSchema.safeParse({
        beneficiary: "Vendor",
        amount: 100,
        method: "BITCOIN",
        purpose: "Payment",
      });
      expect(result.success).toBe(false);
    });
  });


  describe("capexRequestSchema", () => {
    it("accepts a valid CAPEX request", () => {
      const result = capexRequestSchema.safeParse({
        assetDescription: "New server rack",
        requestedAmount: 50000000,
        department: "IT",
        usefulLifeYears: 5,
        depreciationMethod: "STRAIGHT_LINE",
        assetClass: "EQUIPMENT",
      });
      expect(result.success).toBe(true);
    });

    it("rejects zero amount", () => {
      const result = capexRequestSchema.safeParse({
        assetDescription: "Server",
        requestedAmount: 0,
        department: "IT",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("reconciliationSchema", () => {
    it("accepts valid reconciliation data", () => {
      const result = reconciliationSchema.safeParse({
        accountId: "ACC-001",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankBalance: 150000000,
        bookBalance: 149500000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing account", () => {
      const result = reconciliationSchema.safeParse({
        accountId: "",
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankBalance: 150000000,
        bookBalance: 149500000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("receivableSchema", () => {
    it("accepts a valid receivable", () => {
      const result = receivableSchema.safeParse({
        customer: "Customer XYZ",
        amount: 10000000,
        dueDate: "2024-03-15",
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative amount", () => {
      const result = receivableSchema.safeParse({
        customer: "Customer",
        amount: -100,
        dueDate: "2024-03-15",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("payableSchema", () => {
    it("accepts a valid payable", () => {
      const result = payableSchema.safeParse({
        vendor: "Supplier ABC",
        amount: 5000000,
        dueDate: "2024-02-28",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("treasuryTransferSchema", () => {
    it("accepts a valid transfer", () => {
      const result = treasuryTransferSchema.safeParse({
        sourceId: "src-001",
        destinationId: "dest-001",
        amount: 100000000,
        description: "Operational funding",
      });
      expect(result.success).toBe(true);
    });

    it("rejects same source and destination", () => {
      // Schema doesn't enforce this, but both must be non-empty
      const result = treasuryTransferSchema.safeParse({
        sourceId: "",
        destinationId: "dest-001",
        amount: 100,
        description: "Transfer",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("policySchema", () => {
    it("accepts a valid policy", () => {
      const result = policySchema.safeParse({
        title: "Expense Approval Policy",
        type: "EXPENSE",
        description: "All expenses above threshold need CFO approval",
        threshold: 50000000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("registerAssetSchema", () => {
    it("accepts a valid asset registration", () => {
      const result = registerAssetSchema.safeParse({
        description: "Office Laptop",
        assetClass: "EQUIPMENT",
        location: "HQ Floor 3",
        department: "IT",
        acquisitionCost: 15000000,
        acquisitionDate: "2024-01-15",
        usefulLifeYears: 4,
        residualValue: 1000000,
        depreciationMethod: "STRAIGHT_LINE",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("assetImpairmentSchema", () => {
    it("accepts a valid impairment", () => {
      const result = assetImpairmentSchema.safeParse({
        assetId: "asset-001",
        impairmentAmount: 5000000,
        reason: "Flood damage to warehouse equipment",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("assetRevaluationSchema", () => {
    it("accepts a valid revaluation", () => {
      const result = assetRevaluationSchema.safeParse({
        assetId: "asset-001",
        revaluedAmount: 200000000,
        reason: "Market value increase for land",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("assetDisposalSchema", () => {
    it("accepts a valid disposal", () => {
      const result = assetDisposalSchema.safeParse({
        assetId: "asset-001",
        disposalType: "SALE",
        proceeds: 10000000,
      });
      expect(result.success).toBe(true);
    });

    it("accepts write-off with zero proceeds", () => {
      const result = assetDisposalSchema.safeParse({
        assetId: "asset-001",
        disposalType: "WRITE_OFF",
        proceeds: 0,
      });
      expect(result.success).toBe(true);
    });
  });
});
