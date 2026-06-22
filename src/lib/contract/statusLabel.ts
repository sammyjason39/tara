/**
 * Status-label + contract-enum mapping layer.
 *
 * Centralizes how the Web_App turns Backend_Contract enumerated values into
 * user-facing status labels, badge styling, and control-gating decisions.
 *
 * The core guarantee here is **totality**: {@link statusLabel} returns a
 * defined, non-empty label for *every* possible input — known contract values,
 * values the contract does not define, and `null`/`undefined`. It never renders
 * the raw, undefined, or null value as a status. Controls gated on a value the
 * contract does not define stay disabled.
 *
 * Badge styling is routed through the existing token-based
 * {@link getStatusBadgeClasses} so status surfaces stay uniform with the rest
 * of the Design_System (Requirement 7.1).
 *
 * Requirements:
 * - 6.1 enable a gated control only when the value equals the current contract value
 * - 6.2 enable payment approval only when the create lifecycle state is `REQUEST_CREATED`
 * - 6.3 never gate on an obsolete value the Backend_API no longer produces (`APPROVAL_PENDING`)
 * - 6.4 display a label that corresponds to the current Backend_Contract value
 * - 6.6 fallback label for unknown values; never render raw/undefined/null; keep gated controls disabled
 */
import { getStatusBadgeClasses } from "@/lib/theme-colors";
import { PAYMENT_CREATE_STATE, type PaymentCreateState } from "./paymentStatus";

/**
 * The set of enum families the status layer can map labels for.
 *
 * Extensible by design: add a new family by extending this union and
 * registering its label map in {@link FAMILY_LABELS}. Everything else
 * (`statusLabel`, `describeStatus`, totality, fallback) works unchanged.
 */
export type StatusFamily = "payment";

/**
 * The defined fallback label rendered for any value the contract does not
 * define (including `null`/`undefined`). Never empty, so display elements
 * always have a non-empty, human-readable status.
 */
export const UNKNOWN_STATUS_LABEL = "Unknown";

/**
 * Token-based badge styling object produced by {@link getStatusBadgeClasses}
 * (`bg`/`text`/`border` Tailwind classes bound to Theme_Tokens).
 */
export type BadgeVariant = ReturnType<typeof getStatusBadgeClasses>;

/**
 * Human labels for the payment create-lifecycle contract values. Keyed by the
 * {@link PaymentCreateState} union so a contract change surfaces as a type
 * error here until the label map is updated.
 */
const PAYMENT_LABELS: Record<PaymentCreateState, string> = {
  [PAYMENT_CREATE_STATE.REQUEST_CREATED]: "Request Created",
  [PAYMENT_CREATE_STATE.APPROVED]: "Approved",
  [PAYMENT_CREATE_STATE.PROVIDER_SELECTED]: "Provider Selected",
  [PAYMENT_CREATE_STATE.EXECUTING]: "Executing",
  [PAYMENT_CREATE_STATE.SETTLEMENT_PENDING]: "Settlement Pending",
  [PAYMENT_CREATE_STATE.SETTLED]: "Settled",
  [PAYMENT_CREATE_STATE.REJECTED]: "Rejected",
};

/**
 * Registry of per-family label maps. Add a family here to extend the layer.
 */
const FAMILY_LABELS: Record<StatusFamily, Readonly<Record<string, string>>> = {
  payment: PAYMENT_LABELS,
};

/**
 * Returns `true` only when `value` is a known, contract-defined value for the
 * given family. Used to decide whether a control gated on the value may be
 * enabled and whether a label is authoritative.
 */
function isKnownStatus(
  value: string | null | undefined,
  family: StatusFamily,
): value is string {
  if (value == null) {
    return false;
  }
  const labels = FAMILY_LABELS[family];
  const label = labels[value];
  return typeof label === "string" && label.length > 0;
}

/**
 * Maps a Backend_API status value to a user-facing label. **Total**: for any
 * input — a known contract value, an unrecognized string, or `null`/`undefined`
 * — it returns a defined, non-empty label. Unknown inputs map to
 * {@link UNKNOWN_STATUS_LABEL} rather than the raw value.
 *
 * @param value  the raw status value from the Backend_API (may be null/undefined)
 * @param family the enum family the value belongs to
 * @returns a defined, non-empty human label (Requirements 6.4, 6.6)
 */
export function statusLabel(
  value: string | null | undefined,
  family: StatusFamily,
): string {
  if (isKnownStatus(value, family)) {
    return FAMILY_LABELS[family][value];
  }
  return UNKNOWN_STATUS_LABEL;
}

/**
 * Gates the payment approval control. Returns `true` only when the payment's
 * create lifecycle state equals the current contract value `REQUEST_CREATED`,
 * and `false` for every other value including the obsolete `APPROVAL_PENDING`,
 * other lifecycle states, unrecognized strings, and `null`/`undefined`.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.6.
 */
export function canApprovePayment(status: string | null | undefined): boolean {
  return status === PAYMENT_CREATE_STATE.REQUEST_CREATED;
}

/**
 * A fully resolved description of a status value for display: its raw value,
 * its total label, whether the contract defines it, and its token-based badge
 * styling. `known === false` signals callers that any control gated on this
 * value must stay disabled (Requirement 6.6).
 */
export interface StatusDescriptor {
  /** Raw backend value (empty string when the source value was null/undefined). */
  value: string;
  /** Total human label (never empty; fallback for unknown values). */
  label: string;
  /** Whether the current Backend_Contract defines this value. */
  known: boolean;
  /** Token-based badge styling routed through {@link getStatusBadgeClasses}. */
  badge: BadgeVariant;
}

/**
 * Builds a {@link StatusDescriptor} for a status value. Badge styling is always
 * routed through the existing token-based {@link getStatusBadgeClasses}, so
 * even unknown values get a defined, theme-consistent badge.
 *
 * @param value  the raw status value from the Backend_API (may be null/undefined)
 * @param family the enum family the value belongs to
 */
export function describeStatus(
  value: string | null | undefined,
  family: StatusFamily,
): StatusDescriptor {
  const rawValue = value ?? "";
  return {
    value: rawValue,
    label: statusLabel(value, family),
    known: isKnownStatus(value, family),
    badge: getStatusBadgeClasses(rawValue),
  };
}
