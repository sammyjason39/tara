import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateOpportunityDto {
  @IsString()
  @IsOptional()
  lead_id?: string;

  @IsString()
  @IsNotEmpty()
  account_name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: "IDR" | "USD";

  @IsString()
  @IsOptional()
  owner_id?: string;

  @IsString()
  @IsOptional()
  owner_name?: string;

  @IsString()
  @IsOptional()
  nextAction?: string;
}
