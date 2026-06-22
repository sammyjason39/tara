import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator to ensure delta is non-zero.
 */
@ValidatorConstraint({ name: 'isNonZero', async: false })
export class IsNonZeroConstraint implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments): boolean {
    return typeof value === 'number' && value !== 0;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'delta must be a non-zero number';
  }
}

/**
 * StockAdjustmentDto
 *
 * Validates stock adjustment operations on inventory items.
 *
 * Constraints:
 * - itemId: required, non-empty string
 * - delta: required, non-zero number (positive = add stock, negative = remove stock)
 * - reason: required, 1-500 characters
 *
 * Validates: Requirements 7.4, 10.9, 16.2
 */
export class StockAdjustmentDto {
  @IsString()
  @IsNotEmpty({ message: 'itemId is required' })
  itemId: string;

  @IsNumber({}, { message: 'delta must be a number' })
  @Validate(IsNonZeroConstraint)
  delta: number;

  @IsString()
  @IsNotEmpty({ message: 'reason is required' })
  @MinLength(1, { message: 'reason must be at least 1 character' })
  @MaxLength(500, { message: 'reason must be at most 500 characters' })
  reason: string;
}
