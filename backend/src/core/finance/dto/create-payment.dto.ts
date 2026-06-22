import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CHECK = 'check',
  CREDIT_CARD = 'credit_card',
  WIRE = 'wire',
}

/**
 * CreatePaymentDto
 *
 * Validates payment creation operations.
 *
 * Constraints:
 * - recipient: required, non-empty string
 * - amount: required, must be > 0
 * - paymentMethod: required, must be a valid PaymentMethod enum value
 * - purpose: optional string
 * - scheduledDate: optional, must be valid ISO date string
 *
 * Validates: Requirements 14.2, 16.2, 17.5
 */
export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'recipient is required' })
  recipient: string;

  @IsNumber({}, { message: 'amount must be a number' })
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount: number;

  @IsEnum(PaymentMethod, {
    message: 'paymentMethod must be one of: bank_transfer, cash, check, credit_card, wire',
  })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsDateString({}, { message: 'scheduledDate must be a valid ISO date string' })
  scheduledDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
