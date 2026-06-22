import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

/**
 * Movement type enum for inventory movements.
 */
export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
}

/**
 * CreateMovementDto
 *
 * Validates creation of inventory stock movements.
 *
 * Constraints:
 * - itemId: required, non-empty string
 * - quantity: required, positive number (> 0)
 * - type: required, must be one of IN, OUT, TRANSFER
 * - notes: optional string
 *
 * Validates: Requirements 10.9, 16.2
 */
export class CreateMovementDto {
  @IsString()
  @IsNotEmpty({ message: 'itemId is required' })
  itemId: string;

  @IsNumber({}, { message: 'quantity must be a number' })
  @IsPositive({ message: 'quantity must be a positive number' })
  quantity: number;

  @IsEnum(MovementType, { message: 'type must be one of: IN, OUT, TRANSFER' })
  type: MovementType;

  @IsOptional()
  @IsString()
  notes?: string;
}
