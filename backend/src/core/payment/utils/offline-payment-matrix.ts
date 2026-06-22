import { CreatePaymentTransactionDto } from "../dto/create-payment-transaction.dto";

/**
 * Offline_Payment_Matrix (BUG-11)
 *
 * Single shared definition of which payment method classes are permitted while a
 * payment context is offline. This is the ONE authoritative source consulted by
 * every payment-creation path; the previously duplicated/drifting block lists
 * (e.g. `['CARD','QRIS','E_WALLET','LOYALTY_POINTS']`) are removed in favour of it.
 *
 * Policy (Requirements 12.5, 12.6):
 *   - { CASH, VOUCHER } ............................ permitted offline
 *   - { CARD, QRIS, E_WALLET, and any other
 *       gateway-backed method } .................... blocked offline
 *
 * The matrix is default-deny: a method class that is not explicitly permitted
 * offline is treated as blocked offline, so any new or unrecognised gateway-backed
 * method is automatically blocked rather than silently allowed.
 */

/**
 * Canonical payment method classes recognised by the offline matrix.
 */
export enum PaymentMethodClass {
  CASH = "CASH",
  VOUCHER = "VOUCHER",
  CARD = "CARD",
  QRIS = "QRIS",
  E_WALLET = "E_WALLET",
  /** Generic gateway-backed method (any provider-routed online method). */
  GATEWAY = "GATEWAY",
}

/**
 * The single source of truth for the Offline_Payment_Matrix: the set of method
 * classes permitted while the payment context is offline. Everything else is
 * blocked offline (default-deny).
 */
export const OFFLINE_PERMITTED_METHOD_CLASSES: ReadonlySet<string> = new Set([
  PaymentMethodClass.CASH,
  PaymentMethodClass.VOUCHER,
]);

/**
 * Returns true when the given payment method class may be processed while the
 * payment context is offline. Unknown/empty classes are blocked (default-deny).
 */
export function isMethodPermittedOffline(methodClass: string | undefined | null): boolean {
  if (!methodClass) return false;
  return OFFLINE_PERMITTED_METHOD_CLASSES.has(methodClass.toUpperCase());
}

/**
 * Classifies an inbound payment-creation request into a single PaymentMethodClass
 * used by the offline matrix. Centralised here so every payment path classifies
 * identically (no per-path drift).
 *
 * Default-deny: anything not clearly CASH/VOUCHER is treated as gateway-backed and
 * therefore blocked offline.
 */
export function classifyPaymentMethod(dto: CreatePaymentTransactionDto): PaymentMethodClass {
  const channel = dto.channel;
  const method = (dto.method as string | undefined)?.toUpperCase();

  // Channel-driven classification (most specific signal first).
  if (channel === "card_online" || channel === "card_pos") return PaymentMethodClass.CARD;
  if (channel === "wallet") return PaymentMethodClass.E_WALLET;
  if (channel === "qr") return PaymentMethodClass.QRIS;

  // Method-driven classification.
  if (method === "CASH") return PaymentMethodClass.CASH;
  if (method === "VOUCHER") return PaymentMethodClass.VOUCHER;
  if (method === "EDC") return PaymentMethodClass.CARD;
  if (method === "GATEWAY") return PaymentMethodClass.GATEWAY;

  // Default-deny: unrecognised methods are treated as gateway-backed (blocked offline).
  return PaymentMethodClass.GATEWAY;
}

/**
 * Convenience helper: returns true when a request should be blocked because the
 * payment context is offline and the resolved method class is not offline-permitted.
 */
export function isBlockedOffline(
  isOffline: boolean,
  dto: CreatePaymentTransactionDto,
): boolean {
  if (!isOffline) return false;
  return !isMethodPermittedOffline(classifyPaymentMethod(dto));
}
