import { Decimal } from '@prisma/client/runtime/library';

export type LeaveDaysInput = number | string | Decimal | null | undefined;

/** Normalize to a number rounded to 0.5-day precision */
export function toLeaveDays(value: LeaveDaysInput): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 2) / 2;
}

/** Format for display (e.g. 9.5 → "9.5", 10 → "10") */
export function formatLeaveDays(value: LeaveDaysInput): string {
  const n = toLeaveDays(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Validate leave duration is a positive multiple of 0.5 */
export function assertValidLeaveDays(days: number, label = 'total_days'): void {
  if (days <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }
  if (Math.abs(days * 2 - Math.round(days * 2)) > 1e-9) {
    throw new Error(`${label} must be in 0.5-day increments`);
  }
}

export function compareLeaveDays(a: LeaveDaysInput, b: LeaveDaysInput): number {
  return toLeaveDays(a) - toLeaveDays(b);
}
