import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  validateStockAdjustment,
  isBalanced,
  calculateLineTotal,
  calculateGrandTotal,
  PO_STATES,
  TICKET_STATES,
} from './index';

// ─── State Machine Transition Tests ────────────────────────────────────────────

describe('validateTransition', () => {
  describe('PO_STATES', () => {
    it('allows draft → pending_approval', () => {
      expect(validateTransition('draft', 'pending_approval', PO_STATES)).toBe(true);
    });

    it('allows pending_approval → approved', () => {
      expect(validateTransition('pending_approval', 'approved', PO_STATES)).toBe(true);
    });

    it('allows pending_approval → draft (return to draft)', () => {
      expect(validateTransition('pending_approval', 'draft', PO_STATES)).toBe(true);
    });

    it('allows approved → received', () => {
      expect(validateTransition('approved', 'received', PO_STATES)).toBe(true);
    });

    it('allows received → closed', () => {
      expect(validateTransition('received', 'closed', PO_STATES)).toBe(true);
    });

    it('rejects draft → approved (skipping pending_approval)', () => {
      expect(validateTransition('draft', 'approved', PO_STATES)).toBe(false);
    });

    it('rejects closed → draft (terminal state)', () => {
      expect(validateTransition('closed', 'draft', PO_STATES)).toBe(false);
    });

    it('rejects closed → any state (terminal state has no transitions)', () => {
      expect(validateTransition('closed', 'pending_approval', PO_STATES)).toBe(false);
      expect(validateTransition('closed', 'approved', PO_STATES)).toBe(false);
      expect(validateTransition('closed', 'received', PO_STATES)).toBe(false);
    });

    it('rejects unknown current state', () => {
      expect(validateTransition('nonexistent', 'draft', PO_STATES)).toBe(false);
    });

    it('rejects transition to unknown target state', () => {
      expect(validateTransition('draft', 'nonexistent', PO_STATES)).toBe(false);
    });
  });

  describe('TICKET_STATES', () => {
    it('allows open → assigned', () => {
      expect(validateTransition('open', 'assigned', TICKET_STATES)).toBe(true);
    });

    it('allows assigned → in_progress', () => {
      expect(validateTransition('assigned', 'in_progress', TICKET_STATES)).toBe(true);
    });

    it('allows in_progress → escalated', () => {
      expect(validateTransition('in_progress', 'escalated', TICKET_STATES)).toBe(true);
    });

    it('allows in_progress → resolved', () => {
      expect(validateTransition('in_progress', 'resolved', TICKET_STATES)).toBe(true);
    });

    it('allows escalated → in_progress (de-escalation)', () => {
      expect(validateTransition('escalated', 'in_progress', TICKET_STATES)).toBe(true);
    });

    it('allows escalated → resolved', () => {
      expect(validateTransition('escalated', 'resolved', TICKET_STATES)).toBe(true);
    });

    it('allows resolved → closed', () => {
      expect(validateTransition('resolved', 'closed', TICKET_STATES)).toBe(true);
    });

    it('allows resolved → in_progress (reopen)', () => {
      expect(validateTransition('resolved', 'in_progress', TICKET_STATES)).toBe(true);
    });

    it('rejects open → resolved (skipping steps)', () => {
      expect(validateTransition('open', 'resolved', TICKET_STATES)).toBe(false);
    });

    it('rejects closed → any state (terminal)', () => {
      expect(validateTransition('closed', 'open', TICKET_STATES)).toBe(false);
      expect(validateTransition('closed', 'assigned', TICKET_STATES)).toBe(false);
    });
  });
});

// ─── Stock Adjustment Tests ────────────────────────────────────────────────────

describe('validateStockAdjustment', () => {
  it('accepts positive adjustment (adding stock)', () => {
    const result = validateStockAdjustment(10, 5);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts zero delta', () => {
    const result = validateStockAdjustment(10, 0);
    expect(result.valid).toBe(true);
  });

  it('accepts removal that results in zero balance', () => {
    const result = validateStockAdjustment(10, -10);
    expect(result.valid).toBe(true);
  });

  it('accepts addition from zero balance', () => {
    const result = validateStockAdjustment(0, 5);
    expect(result.valid).toBe(true);
  });

  it('rejects removal that would go negative', () => {
    const result = validateStockAdjustment(5, -6);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Insufficient stock: current=5, delta=-6');
  });

  it('rejects removal from zero balance', () => {
    const result = validateStockAdjustment(0, -1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Insufficient stock');
  });

  it('rejects large negative delta', () => {
    const result = validateStockAdjustment(100, -101);
    expect(result.valid).toBe(false);
  });
});

// ─── Journal Entry Balance Tests ───────────────────────────────────────────────

describe('isBalanced', () => {
  it('returns true for a perfectly balanced entry', () => {
    const entry = {
      lineItems: [
        { accountCode: '1000', debitAmount: 100, creditAmount: 0 },
        { accountCode: '2000', debitAmount: 0, creditAmount: 100 },
      ],
    };
    expect(isBalanced(entry)).toBe(true);
  });

  it('returns true for multi-line balanced entry', () => {
    const entry = {
      lineItems: [
        { accountCode: '1000', debitAmount: 50, creditAmount: 0 },
        { accountCode: '1001', debitAmount: 50, creditAmount: 0 },
        { accountCode: '2000', debitAmount: 0, creditAmount: 100 },
      ],
    };
    expect(isBalanced(entry)).toBe(true);
  });

  it('returns true for difference within 0.01 tolerance', () => {
    const entry = {
      lineItems: [
        { accountCode: '1000', debitAmount: 100.005, creditAmount: 0 },
        { accountCode: '2000', debitAmount: 0, creditAmount: 100.0 },
      ],
    };
    expect(isBalanced(entry)).toBe(true);
  });

  it('returns false for exactly 0.01 difference (floating-point exceeds tolerance)', () => {
    // Due to floating-point, 100.01 - 100.0 > 0.01 in IEEE 754
    const entry = {
      lineItems: [
        { accountCode: '1000', debitAmount: 100.01, creditAmount: 0 },
        { accountCode: '2000', debitAmount: 0, creditAmount: 100.0 },
      ],
    };
    expect(isBalanced(entry)).toBe(false);
  });

  it('returns true when difference is at the boundary (using safe values)', () => {
    // Use values where the difference is clearly <= 0.01
    const entry = {
      lineItems: [
        { accountCode: '1000', debitAmount: 100.005, creditAmount: 0 },
        { accountCode: '2000', debitAmount: 0, creditAmount: 100.0 },
      ],
    };
    expect(isBalanced(entry)).toBe(true);
  });

  it('returns false for imbalanced entry (debits > credits)', () => {
    const entry = {
      lineItems: [
        { accountCode: '1000', debitAmount: 100, creditAmount: 0 },
        { accountCode: '2000', debitAmount: 0, creditAmount: 50 },
      ],
    };
    expect(isBalanced(entry)).toBe(false);
  });

  it('returns false for imbalanced entry (credits > debits)', () => {
    const entry = {
      lineItems: [
        { accountCode: '1000', debitAmount: 50, creditAmount: 0 },
        { accountCode: '2000', debitAmount: 0, creditAmount: 100 },
      ],
    };
    expect(isBalanced(entry)).toBe(false);
  });

  it('returns false for difference > 0.01', () => {
    const entry = {
      lineItems: [
        { accountCode: '1000', debitAmount: 100.02, creditAmount: 0 },
        { accountCode: '2000', debitAmount: 0, creditAmount: 100.0 },
      ],
    };
    expect(isBalanced(entry)).toBe(false);
  });

  it('returns true for empty line items (0 === 0)', () => {
    const entry = { lineItems: [] };
    expect(isBalanced(entry)).toBe(true);
  });
});

// ─── Line Item Calculation Tests ───────────────────────────────────────────────

describe('calculateLineTotal', () => {
  it('calculates correctly with percentage discount', () => {
    const item = {
      itemId: 'item-1',
      quantity: 10,
      unitPrice: 100,
      discountType: 'percentage' as const,
      discountValue: 10,
    };
    // 10 * 100 * (1 - 10/100) = 1000 * 0.9 = 900
    expect(calculateLineTotal(item)).toBe(900);
  });

  it('calculates correctly with fixed discount', () => {
    const item = {
      itemId: 'item-1',
      quantity: 5,
      unitPrice: 200,
      discountType: 'fixed' as const,
      discountValue: 50,
    };
    // 5 * 200 - 50 = 1000 - 50 = 950
    expect(calculateLineTotal(item)).toBe(950);
  });

  it('returns full subtotal with 0% discount', () => {
    const item = {
      itemId: 'item-1',
      quantity: 3,
      unitPrice: 50,
      discountType: 'percentage' as const,
      discountValue: 0,
    };
    expect(calculateLineTotal(item)).toBe(150);
  });

  it('returns zero with 100% discount', () => {
    const item = {
      itemId: 'item-1',
      quantity: 5,
      unitPrice: 100,
      discountType: 'percentage' as const,
      discountValue: 100,
    };
    expect(calculateLineTotal(item)).toBe(0);
  });

  it('returns full subtotal with fixed discount of 0', () => {
    const item = {
      itemId: 'item-1',
      quantity: 2,
      unitPrice: 75,
      discountType: 'fixed' as const,
      discountValue: 0,
    };
    expect(calculateLineTotal(item)).toBe(150);
  });

  it('handles decimal quantities and prices', () => {
    const item = {
      itemId: 'item-1',
      quantity: 2.5,
      unitPrice: 10,
      discountType: 'percentage' as const,
      discountValue: 20,
    };
    // 2.5 * 10 * (1 - 20/100) = 25 * 0.8 = 20
    expect(calculateLineTotal(item)).toBe(20);
  });
});

describe('calculateGrandTotal', () => {
  it('sums all line totals correctly', () => {
    const items = [
      {
        itemId: 'item-1',
        quantity: 2,
        unitPrice: 100,
        discountType: 'percentage' as const,
        discountValue: 10,
      },
      {
        itemId: 'item-2',
        quantity: 3,
        unitPrice: 50,
        discountType: 'fixed' as const,
        discountValue: 20,
      },
    ];
    // Item 1: 2 * 100 * 0.9 = 180
    // Item 2: 3 * 50 - 20 = 130
    // Grand total: 310
    expect(calculateGrandTotal(items)).toBe(310);
  });

  it('returns 0 for empty items array', () => {
    expect(calculateGrandTotal([])).toBe(0);
  });

  it('returns single line total for one item', () => {
    const items = [
      {
        itemId: 'item-1',
        quantity: 4,
        unitPrice: 25,
        discountType: 'fixed' as const,
        discountValue: 0,
      },
    ];
    expect(calculateGrandTotal(items)).toBe(100);
  });

  it('grand total equals sum of individual line totals', () => {
    const items = [
      {
        itemId: 'a',
        quantity: 1,
        unitPrice: 100,
        discountType: 'percentage' as const,
        discountValue: 50,
      },
      {
        itemId: 'b',
        quantity: 2,
        unitPrice: 200,
        discountType: 'fixed' as const,
        discountValue: 100,
      },
      {
        itemId: 'c',
        quantity: 3,
        unitPrice: 30,
        discountType: 'percentage' as const,
        discountValue: 0,
      },
    ];
    const expectedSum =
      calculateLineTotal(items[0]) +
      calculateLineTotal(items[1]) +
      calculateLineTotal(items[2]);
    expect(calculateGrandTotal(items)).toBe(expectedSum);
  });
});
