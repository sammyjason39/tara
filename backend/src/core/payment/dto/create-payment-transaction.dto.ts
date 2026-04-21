import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreatePaymentTransactionDto {
  @IsString()
  @IsIn([
    "vendor_payout",
    "customer_collection",
    "treasury_transfer",
    "pos_payment",
    "payroll_payout",
    "refund_payout",
  ])
  type:
    | "vendor_payout"
    | "customer_collection"
    | "treasury_transfer"
    | "pos_payment"
    | "payroll_payout"
    | "refund_payout";

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: "IDR" | "USD";

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  channel?: "bank_transfer" | "card_online" | "card_pos" | "wallet" | "qr";

  @IsString()
  @IsOptional()
  method?: "CASH" | "EDC" | "GATEWAY";

  @IsString()
  @IsOptional()
  provider?: "STRIPE" | "MANUAL";

  @IsString()
  @IsOptional()
  externalRef?: string;

  @IsString()
  @IsOptional()
  externalReference?: string;

  @IsString()
  @IsOptional()
  idempotency_key?: string;
}
