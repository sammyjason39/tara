import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum ProvisioningScope {
  QUOTE = "quote",
  INVOICE = "invoice",
  DELIVERY_PROOF = "delivery_proof",
  FULL_PORTAL = "full_portal",
}

export class CreateProvisioningRequestDto {
  @IsString()
  @IsOptional()
  employee_id?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  supplierBranchId?: string;

  @IsEnum(ProvisioningScope)
  scope: ProvisioningScope;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  requested_by?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  metadata?: any;
}
