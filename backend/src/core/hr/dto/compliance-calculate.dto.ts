import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class ComplianceCalculateDto {
  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsNotEmpty()
  period: string;

  @IsEnum(['CSV', 'EXCEL', 'XML', 'PDF'])
  format: 'CSV' | 'EXCEL' | 'XML' | 'PDF';
}

export class ComplianceCalculateAllDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  period: string;
}
