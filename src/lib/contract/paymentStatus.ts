/**
 * Payment create-lifecycle contract enum.
 *
 * Tracks the current Backend_Contract for the payment create lifecycle state.
 * The backend renamed the initial state from the obsolete `APPROVAL_PENDING`
 * to `REQUEST_CREATED`; this module is the single source of truth for the
 * states the Backend_API now produces, so the Web_App gates controls and
 * formats labels against current contract values rather than stale literals.
 *
 * Requirements: 6.2 (gate approval on `REQUEST_CREATED`), 6.5 (send/track
 * value formats defined by the current Backend_Contract).
 */
export const PAYMENT_CREATE_STATE = {
  REQUEST_CREATED: "REQUEST_CREATED",
  APPROVED: "APPROVED",
  PROVIDER_SELECTED: "PROVIDER_SELECTED",
  EXECUTING: "EXECUTING",
  SETTLEMENT_PENDING: "SETTLEMENT_PENDING",
  SETTLED: "SETTLED",
  REJECTED: "REJECTED",
} as const;

/**
 * The payment create lifecycle state, derived from {@link PAYMENT_CREATE_STATE}
 * so the type and the runtime value set can never drift apart.
 */
export type PaymentCreateState =
  (typeof PAYMENT_CREATE_STATE)[keyof typeof PAYMENT_CREATE_STATE];
