import { IsString, IsOptional, IsDateString, IsUrl, IsObject } from "class-validator";

export class UploadComplianceDocumentDto {
  @IsString()
  employee_id: string;

  @IsString()
  documentType: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsUrl()
  fileUrl: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
