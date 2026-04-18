import { IsNumber, IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateCompensationDto {
  @IsNumber()
  base_salary: number;

  @IsString()
  currency: string;

  @IsString()
  payFrequency: "monthly" | "bi_weekly" | "weekly";

  @IsArray()
  @IsOptional()
  allowances?: { type: string; amount: number }[];

  @IsArray()
  @IsOptional()
  bonuses?: { type: string; amount: number }[];

  @IsString()
  effectiveDate: string;
}
