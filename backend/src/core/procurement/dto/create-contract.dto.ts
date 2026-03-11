import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  requisitionId: string;

  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachmentIds?: string[];
}
