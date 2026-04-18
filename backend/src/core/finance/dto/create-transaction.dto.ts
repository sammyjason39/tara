import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
} from "class-validator";

export enum TransactionType {
  DEBIT = "debit",
  CREDIT = "credit",
}

/**
 * Create Transaction DTO
 * Data Transfer Object for creating new financial transactions
 * Includes validation rules using class-validator
 */
export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString()
  @IsOptional()
  location_id?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;
}
