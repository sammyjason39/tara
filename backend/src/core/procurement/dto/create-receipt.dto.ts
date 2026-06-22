import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * A single received line on a goods receipt. The received `quantity` is checked
 * against the outstanding ordered quantity for the matching purchase-order line
 * (`sku`); a line whose quantity exceeds what was ordered rejects the whole
 * receipt with a 400 before anything is persisted (Requirement 9.6). When a
 * `productId` and a location are resolvable, the received quantity is taken into
 * inventory within the same Atomic_Operation as the receipt (Requirement 9.5).
 */
export class ReceiptLineItemDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  /** Inventory product (item master) id used for the stock intake, if known. */
  @IsString()
  @IsOptional()
  productId?: string;

  /** Per-line receiving location; falls back to the receipt-level `location_id`. */
  @IsString()
  @IsOptional()
  location_id?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  unitCost?: number;
}

export class CreateReceiptDto {
  @IsString()
  @IsNotEmpty()
  finalPoId: string;

  @IsBoolean()
  deliveryOnTime: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  quantityAccuracy: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore: number;

  @IsNumber()
  @Min(0)
  issueCount: number;

  @IsBoolean()
  invoiceMismatch: boolean;

  /** Default receiving location applied to received lines that omit their own. */
  @IsString()
  @IsOptional()
  location_id?: string;

  /** Received lines; when present, each quantity is validated against the PO. */
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineItemDto)
  items?: ReceiptLineItemDto[];
}
