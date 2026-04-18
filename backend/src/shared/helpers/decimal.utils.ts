import { Decimal } from 'decimal.js';
import { Prisma } from '@prisma/client';

/**
 * Enterprise Precision Utility
 * Ensures all financial calculations are performed with high-precision Decimal
 */
export class DecimalUtils {
  /**
   * Safe conversion of any number-like value to Decimal
   */
  static toDecimal(value: number | string | Prisma.Decimal | any): Decimal {
    if (value === null || value === undefined) return new Decimal(0);
    return new Decimal(value.toString());
  }

  /**
   * Convert back to Prisma.Decimal for database storage
   */
  static toPrisma(value: Decimal): Prisma.Decimal {
    return new Prisma.Decimal(value.toString());
  }

  /**
   * Safe summary of multiple decimals
   */
  static sum(...values: (number | string | Prisma.Decimal | any)[]): Decimal {
    return values.reduce((acc, current) => acc.add(this.toDecimal(current)), new Decimal(0));
  }

  /**
   * Standardized formatting for currency
   */
  static format(value: Decimal | Prisma.Decimal, places: number = 2): string {
    return this.toDecimal(value).toFixed(places);
  }
}
