/**
 * Business Rule Engine — Shared Utilities
 *
 * Pure functions used across multiple modules for:
 * - State machine transition validation (Procurement PO, IT Tickets)
 * - Stock balance enforcement (non-negative invariant)
 * - Double-entry accounting balance validation
 * - Quotation/POS line item arithmetic
 */

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface StateTransitionMap {
  [currentState: string]: string[];
}

export interface StockAdjustmentResult {
  valid: boolean;
  error?: string;
}

export interface JournalLineItem {
  accountCode: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

export interface JournalEntry {
  lineItems: JournalLineItem[];
}

export interface QuotationLineItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

// ─── State Machine Maps ────────────────────────────────────────────────────────

/**
 * Procurement Purchase Order state transitions.
 * draft → pending_approval → approved → received → closed
 * pending_approval may return to draft.
 */
export const PO_STATES: StateTransitionMap = {
  draft: ['pending_approval'],
  pending_approval: ['approved', 'draft'],
  approved: ['received'],
  received: ['closed'],
  closed: [],
};

/**
 * IT Support Ticket state transitions.
 * open → assigned → in_progress → resolved → closed
 * With escalation paths and re-open from resolved.
 */
export const TICKET_STATES: StateTransitionMap = {
  open: ['assigned'],
  assigned: ['in_progress'],
  in_progress: ['escalated', 'resolved'],
  escalated: ['in_progress', 'resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};

// ─── State Machine Validation ──────────────────────────────────────────────────

/**
 * Validates whether a state transition is allowed by the given state map.
 *
 * @param currentState - The entity's current state
 * @param targetState - The desired target state
 * @param stateMap - The adjacency map defining valid transitions
 * @returns true if the transition is valid, false otherwise
 */
export function validateTransition(
  currentState: string,
  targetState: string,
  stateMap: StateTransitionMap,
): boolean {
  const validTargets = stateMap[currentState];
  if (!validTargets) return false;
  return validTargets.includes(targetState);
}

// ─── Stock Balance Validation ──────────────────────────────────────────────────

/**
 * Validates that a stock adjustment will not result in a negative balance.
 *
 * @param currentBalance - The current stock level (must be >= 0)
 * @param delta - The adjustment amount (positive = add, negative = remove)
 * @returns Object with valid flag and optional error message
 */
export function validateStockAdjustment(
  currentBalance: number,
  delta: number,
): StockAdjustmentResult {
  const newBalance = currentBalance + delta;
  if (newBalance < 0) {
    return {
      valid: false,
      error: `Insufficient stock: current=${currentBalance}, delta=${delta}`,
    };
  }
  return { valid: true };
}

// ─── Double-Entry Accounting ───────────────────────────────────────────────────

/**
 * Checks whether a journal entry is balanced (total debits ≈ total credits).
 * Uses a tolerance of 0.01 to account for floating-point rounding.
 *
 * @param entry - The journal entry to validate
 * @returns true if the entry is balanced within tolerance
 */
export function isBalanced(entry: JournalEntry): boolean {
  const totalDebits = entry.lineItems.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredits = entry.lineItems.reduce((sum, line) => sum + line.creditAmount, 0);
  return Math.abs(totalDebits - totalCredits) <= 0.01;
}

// ─── Order Fulfillment ─────────────────────────────────────────────────────────

export interface FulfillmentLineItem {
  itemId: string;
  quantity: number;
}

export interface FulfillmentResult {
  success: boolean;
  updatedStock?: Record<string, number>;
  error?: string;
  insufficientItems?: string[];
}

/**
 * Attempts to fulfill an order atomically.
 *
 * If ALL line items have sufficient stock (stock[itemId] >= quantity),
 * deducts all quantities simultaneously and returns the updated stock map.
 *
 * If ANY line item has insufficient stock, rejects the entire fulfillment
 * and returns the stock map unchanged (no partial deduction).
 *
 * @param lineItems - Array of order line items with itemId and quantity
 * @param stockMap - Current stock levels keyed by itemId
 * @returns FulfillmentResult with success flag, updated stock, or error details
 */
export function fulfillOrder(
  lineItems: FulfillmentLineItem[],
  stockMap: Record<string, number>,
): FulfillmentResult {
  // First pass: check all items have sufficient stock
  const insufficientItems: string[] = [];

  for (const item of lineItems) {
    const available = stockMap[item.itemId] ?? 0;
    if (available < item.quantity) {
      insufficientItems.push(item.itemId);
    }
  }

  // If any item is insufficient, reject entirely — no partial deduction
  if (insufficientItems.length > 0) {
    return {
      success: false,
      error: `Insufficient stock for items: ${insufficientItems.join(', ')}`,
      insufficientItems,
    };
  }

  // Second pass: deduct all simultaneously (all checks passed)
  const updatedStock = { ...stockMap };
  for (const item of lineItems) {
    updatedStock[item.itemId] = (updatedStock[item.itemId] ?? 0) - item.quantity;
  }

  return {
    success: true,
    updatedStock,
  };
}

// ─── Quotation / POS Line Item Arithmetic ──────────────────────────────────────

/**
 * Calculates the total for a single line item after applying discount.
 *
 * - Percentage discount: subtotal × (1 - discountValue / 100)
 * - Fixed discount: subtotal - discountValue
 *
 * @param item - The quotation/POS line item
 * @returns The calculated line total
 */
export function calculateLineTotal(item: QuotationLineItem): number {
  const subtotal = item.quantity * item.unitPrice;
  if (item.discountType === 'percentage') {
    return subtotal * (1 - item.discountValue / 100);
  }
  return subtotal - item.discountValue;
}

/**
 * Calculates the grand total across all line items.
 *
 * @param items - Array of quotation/POS line items
 * @returns Sum of all line totals
 */
export function calculateGrandTotal(items: QuotationLineItem[]): number {
  return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}
