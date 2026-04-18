import { Prisma } from "@prisma/client";

/**
 * Money Value Object
 * Ensures 100% mathematical precision for currency transactions.
 * Internal engine: Prisma.Decimal (decimal.js)
 */
export class Money {
  private readonly value: Prisma.Decimal;

  constructor(input: string | number | Prisma.Decimal | Money) {
    if (input instanceof Money) {
      this.value = input.value;
    } else if (input instanceof Prisma.Decimal) {
      this.value = input;
    } else {
      // Handles string and number safely
      this.value = new Prisma.Decimal(input);
    }
  }

  static from(input: string | number | Prisma.Decimal | Money): Money {
    return new Money(input);
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: string | number | Prisma.Decimal | Money): Money {
    const otherVal = other instanceof Money ? other.value : new Prisma.Decimal(other as any);
    return new Money(this.value.plus(otherVal));
  }

  subtract(other: string | number | Prisma.Decimal | Money): Money {
    const otherVal = other instanceof Money ? other.value : new Prisma.Decimal(other as any);
    return new Money(this.value.minus(otherVal));
  }

  multiply(factor: string | number | Prisma.Decimal | Money): Money {
    const factorVal = factor instanceof Money ? factor.value : new Prisma.Decimal(factor as any);
    return new Money(this.value.times(factorVal));
  }

  divide(divisor: string | number | Prisma.Decimal | Money): Money {
    const divisorVal = divisor instanceof Money ? divisor.value : new Prisma.Decimal(divisor as any);
    return new Money(this.value.dividedBy(divisorVal));
  }

  equals(other: Money): boolean {
    return this.value.equals(other.value);
  }

  greaterThan(other: Money): boolean {
    return this.value.greaterThan(other.value);
  }

  lessThan(other: Money): boolean {
    return this.value.lessThan(other.value);
  }

  /**
   * Returns raw Prisma.Decimal for persistence
   */
  toDecimal(): Prisma.Decimal {
    return this.value;
  }

  /**
   * ONLY for API boundaries, UI display, or Charts.
   * High risk of precision loss if used for further calculations.
   */
  toNumber(): number {
    return this.value.toNumber();
  }

  toString(): string {
    return this.value.toString();
  }

  format(currency = "IDR"): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(this.toNumber());
  }
}
