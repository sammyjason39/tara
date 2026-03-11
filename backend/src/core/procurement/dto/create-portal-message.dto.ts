import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePortalMessageDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsNotEmpty()
  supplierBranchId: string;

  @IsString()
  @IsNotEmpty()
  direction: "INBOUND" | "OUTBOUND";

  @IsString()
  @IsNotEmpty()
  type: "QUOTE" | "INVOICE" | "DELIVERY_PROOF" | "DISPUTE" | "GENERAL";

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  attachmentName?: string;
}
