import { IsBoolean, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";

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
}
