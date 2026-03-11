import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateRiskSignalDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(["PRICE_SPIKE", "DUPLICATE_INVOICE_PATTERN", "APPROVAL_BYPASS_RISK", "SUPPLIER_RISK"])
  code: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(["LOW", "MEDIUM", "HIGH"])
  severity: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsOptional()
  detail?: string;
}

export class UpdateRiskSignalStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(["OPEN", "ACKNOWLEDGED", "RESOLVED"])
  status: string;
}
