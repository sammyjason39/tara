export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'SETTLED' | 'REFUNDED';

export class PaymentStateMachine {
  private static readonly VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
    PENDING: ['PAID', 'FAILED', 'PENDING'],
    PAID: ['SETTLED', 'REFUNDED', 'PAID'],
    FAILED: [], // Terminal
    SETTLED: ['REFUNDED'], // Settled can still be disputed/refunded in some cases
    REFUNDED: [], // Terminal
  };

  /**
   * Validates if a transition from currentStatus to nextStatus is allowed.
   */
  static isValidTransition(current: string, next: string): boolean {
    const cur = (current || 'PENDING').toUpperCase() as PaymentStatus;
    const nxt = (next || 'PENDING').toUpperCase() as PaymentStatus;

    if (cur === nxt) return true;

    const allowed = this.VALID_TRANSITIONS[cur];
    if (!allowed) return false;

    return allowed.includes(nxt);
  }

  /**
   * Validates and enforces transition. Throws error if invalid.
   */
  static validate(current: string, next: string): void {
    if (!this.isValidTransition(current, next)) {
      throw new Error(`Invalid financial state transition: ${current} -> ${next}`);
    }
  }
}
